import { Employee, IEmployee } from './employee.model';
import { EmployeeSkill, IEmployeeSkill } from './employee-skill.model';
import { Skill } from '../skills/skill.model';
import { Role } from '../roles/role.model';
import { ProjectAllocation } from '../allocations/allocation.model';
import {
    computeEmployeeAvailabilityPercent,
    type AllocationCapacitySlice,
} from '../allocations/allocation-availability.util';
import { Types } from 'mongoose';
import { AppError } from '../../common/errors/app-error';
import { getEmployeesAllocatedToManagedProjects } from '../../common/utils/pm-scope.util';

export interface EmployeeListParams {
    skill?: string;
    minLevel?: string;
    isActive?: boolean;
    employeeIds?: string[];
}

export interface EmployeeResponse {
    id: string;
    employeeCode?: string;
    name: string;
    email: string;
    status: string;
    role?: string;
    roleId?: string;
    jobRole?: string;
    jobRoleId?: string;
    department?: string;
    position?: string;
    skills: {
        name: string;
        skillLevel: string;
        yearsOfExperience: number;
        isPrimary: boolean;
    }[];
    availability: number;
    maxAllocationPercent: number;
    profileImage?: string;
    joinDate?: string;
}

interface PopulatedEmployee {
    _id: Types.ObjectId;
    first_name: string;
    last_name: string;
    email: string;
    employee_code?: string;
    status: string;
    role_id?: { _id: Types.ObjectId; role_name: string } | Types.ObjectId;
    job_role_id?: { _id: Types.ObjectId; role_name: string } | Types.ObjectId;
    department?: string;
    position?: string;
    max_allocation_percent?: number;
    profile_image?: string;
    join_date?: Date;
}

interface PopulatedEmployeeSkill {
    _id: Types.ObjectId;
    employee_id: Types.ObjectId;
    skill_id: { _id: Types.ObjectId; name: string } | Types.ObjectId;
    skill_level: string;
    experience_years: number;
    is_primary: boolean;
}

export class EmployeeService {
    async findAllocatedToProjectManager(pmEmployeeId: string, params: EmployeeListParams = {}): Promise<EmployeeResponse[]> {
        const employeeIds = await getEmployeesAllocatedToManagedProjects(pmEmployeeId);
        return this.findAll({ ...params, employeeIds });
    }

    async findAll(params: EmployeeListParams = {}): Promise<EmployeeResponse[]> {
        const query: Record<string, unknown> = {};

        if (params.employeeIds !== undefined) {
            if (params.employeeIds.length === 0) {
                return [];
            }
            query._id = { $in: params.employeeIds.map((id) => new Types.ObjectId(id)) };
        }

        if (typeof params.isActive === 'boolean') {
            if (params.isActive) {
                query.$or = [{ is_active: true }, { status: 'Active' }];
            } else {
                query.$or = [{ is_active: false }, { status: { $ne: 'Active' } }];
            }
        }

        const employees = await Employee.find(query)
            .populate('role_id', 'role_name')
            .populate('job_role_id', 'role_name')
            .lean() as unknown as PopulatedEmployee[];

        // Get skills for all employees in one query
        const employeeIds = employees.map(e => e._id);
        const allSkills = await EmployeeSkill.find({ employee_id: { $in: employeeIds } })
            .populate('skill_id', 'name')
            .lean() as unknown as PopulatedEmployeeSkill[];

        // Group skills by employee
        const skillsByEmployee = new Map<string, PopulatedEmployeeSkill[]>();
        allSkills.forEach(skill => {
            const empId = skill.employee_id.toString();
            if (!skillsByEmployee.has(empId)) {
                skillsByEmployee.set(empId, []);
            }
            skillsByEmployee.get(empId)!.push(skill);
        });

        const availabilityByEmployee = await this.loadAvailabilityByEmployee(employeeIds);

        return employees.map(emp =>
            this.mapToResponse(
                emp,
                skillsByEmployee.get(emp._id.toString()) || [],
                availabilityByEmployee.get(emp._id.toString()) ?? 100
            )
        );
    }

    async findById(id: string): Promise<EmployeeResponse | null> {
        if (!Types.ObjectId.isValid(id)) {
            return null;
        }

        const employee = await Employee.findById(id)
            .populate('role_id', 'role_name')
            .populate('job_role_id', 'role_name')
            .lean() as unknown as PopulatedEmployee | null;

        if (!employee) {
            return null;
        }

        // Get skills for this employee
        const skills = await EmployeeSkill.find({ employee_id: id })
            .populate('skill_id', 'name')
            .lean() as unknown as PopulatedEmployeeSkill[];

        const availabilityByEmployee = await this.loadAvailabilityByEmployee([new Types.ObjectId(id)]);

        return this.mapToResponse(
            employee,
            skills,
            availabilityByEmployee.get(id) ?? 100
        );
    }

    async update(id: string, data: any): Promise<EmployeeResponse> {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError('Invalid employee ID', 400);
        }

        // 1. Update basic info
        const employee = await Employee.findByIdAndUpdate(id, data, { new: true });
        if (!employee) {
            throw new AppError('Employee not found', 404);
        }

        // 2. Update skills if provided
        if (data.skills && Array.isArray(data.skills)) {
            // Simplistic approach: delete all and re-create
            // This is safer for synchronization when the entire skill set is sent from frontend
            await EmployeeSkill.deleteMany({ employee_id: id });

            const skillInserts = data.skills.map((s: any) => ({
                employee_id: id,
                skill_id: s.skillId,
                skill_level: s.level || s.skillLevel,
                experience_years: s.experienceYears || s.yearsOfExperience,
                is_primary: s.skillType === 'Primary' || s.isPrimary
            }));

            if (skillInserts.length > 0) {
                await EmployeeSkill.insertMany(skillInserts);
            }
        }

        return this.findById(id) as Promise<EmployeeResponse>;
    }

    async create(data: Partial<IEmployee>): Promise<EmployeeResponse> {
        // Verify Role existence if provided
        if (data.role_id) {
            const roleExists = await Role.exists({ _id: data.role_id });
            if (!roleExists) {
                throw new AppError('Specified Role does not exist.', 400);
            }
        }

        // Hash password before saving
        if (data.password) {
            const bcrypt = await import('bcryptjs');
            data.password = await bcrypt.hash(data.password, 12);
        }

        const employee = new Employee(data);
        await employee.save();

        const populated = await Employee.findById(employee._id)
            .populate('role_id', 'role_name')
            .populate('job_role_id', 'role_name')
            .lean() as unknown as PopulatedEmployee;

        return this.mapToResponse(populated, [], 100);
    }

    private async loadAvailabilityByEmployee(
        employeeIds: Types.ObjectId[]
    ): Promise<Map<string, number>> {
        const result = new Map<string, number>();
        if (employeeIds.length === 0) return result;

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const horizonEnd = new Date(today);
        horizonEnd.setUTCDate(horizonEnd.getUTCDate() + 90);

        const allocations = await ProjectAllocation.find({
            employee_id: { $in: employeeIds },
            is_active: true,
            end_date: { $gte: today },
            start_date: { $lte: horizonEnd },
        })
            .select('employee_id start_date end_date allocation_percent')
            .lean();

        const slicesByEmployee = new Map<string, AllocationCapacitySlice[]>();
        for (const alloc of allocations) {
            const empId = alloc.employee_id.toString();
            if (!slicesByEmployee.has(empId)) {
                slicesByEmployee.set(empId, []);
            }
            slicesByEmployee.get(empId)!.push({
                start_date: new Date(alloc.start_date),
                end_date: new Date(alloc.end_date),
                allocation_percent: alloc.allocation_percent || 0,
            });
        }

        for (const empId of employeeIds) {
            const id = empId.toString();
            const slices = slicesByEmployee.get(id) ?? [];
            result.set(id, computeEmployeeAvailabilityPercent(slices));
        }

        return result;
    }

    private mapToResponse(
        emp: PopulatedEmployee,
        skills: PopulatedEmployeeSkill[],
        availability: number
    ): EmployeeResponse {
        const role = emp.role_id as { _id: Types.ObjectId; role_name: string } | undefined;
        const jobRole = emp.job_role_id as { _id: Types.ObjectId; role_name: string } | undefined;

        // Format join_date safely
        const formatDate = (date: Date | undefined): string | undefined => {
            if (!date) return undefined;
            return date.toISOString().split('T')[0];
        };

        return {
            id: emp._id.toString(),
            employeeCode: emp.employee_code,
            name: `${emp.first_name} ${emp.last_name}`,
            email: emp.email,
            status: emp.status || 'Active',
            role: role?.role_name,
            roleId: role?._id?.toString(),
            jobRole: jobRole?.role_name,
            jobRoleId: jobRole?._id?.toString(),
            department: emp.department,
            position: emp.position,
            skills: skills.map(s => ({
                name: (s.skill_id as { name: string })?.name || 'Unknown',
                skillLevel: s.skill_level,
                yearsOfExperience: s.experience_years || 0,
                isPrimary: s.is_primary || false
            })),
            availability,
            maxAllocationPercent: emp.max_allocation_percent || 100,
            profileImage: emp.profile_image,
            joinDate: formatDate(emp.join_date)
        };
    }
}

export const employeeService = new EmployeeService();
