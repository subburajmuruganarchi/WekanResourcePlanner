import { Employee, IEmployee } from './employee.model';
import { EmployeeSkill, IEmployeeSkill } from './employee-skill.model';
import { Skill } from '../skills/skill.model';
import { Role } from '../roles/role.model';
import { ProjectAllocation } from '../allocations/allocation.model';
import type { CreateEmployeeDto, UpdateEmployeeDto } from './employee.schema';
import { PASSWORD_PLAIN } from '../../services/planner-import/planner-import.utils';
import {
    computeEmployeeAvailabilityPercent,
    type AllocationCapacitySlice,
} from '../allocations/allocation-availability.util';
import { Types } from 'mongoose';
import { AppError } from '../../common/errors/app-error';
import { SkillLevel } from '../../common/types/enums';
import { getEmployeesAllocatedToManagedProjects, getManagedProjectIds } from '../../common/utils/pm-scope.util';
import { activeEmployeeMongoFilter } from '../../common/utils/employee-status.util';
import { getEmployeesAllocatedToPortfolioProjects, getPortfolioProjectIds } from '../../common/utils/delivery-scope.util';

export interface EmployeeListParams {
    skill?: string;
    minLevel?: string;
    isActive?: boolean;
    employeeIds?: string[];
    /** Include active project assignments for each employee. */
    includeAssignments?: boolean;
}

export interface EmployeeProjectAssignment {
    projectId: string;
    projectName: string;
    projectCode: string;
    allocationPercent: number;
    startDate: string;
    endDate: string;
    /** True when the project is managed by the requesting PM/DM. */
    onYourProjects: boolean;
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
    is_active?: boolean;
    projectAssignments?: EmployeeProjectAssignment[];
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
    is_active?: boolean;
}

interface PopulatedEmployeeSkill {
    _id: Types.ObjectId;
    employee_id: Types.ObjectId;
    skill_id: { _id: Types.ObjectId; name: string } | Types.ObjectId;
    skill_level: string;
    experience_years: number;
    is_primary: boolean;
}

type EmployeeSkillInput = NonNullable<CreateEmployeeDto['skills']>[number];

function mapEmployeeDtoToDocument(
    data: CreateEmployeeDto | UpdateEmployeeDto
): { employeeFields: Partial<IEmployee>; skills?: EmployeeSkillInput[] } {
    const employeeFields: Partial<IEmployee> = {};

    if (data.firstName !== undefined) employeeFields.first_name = data.firstName;
    if (data.lastName !== undefined) employeeFields.last_name = data.lastName;
    if (data.email !== undefined) employeeFields.email = data.email;
    if (data.password !== undefined) employeeFields.password = data.password;
    if (data.employeeCode !== undefined) employeeFields.employee_code = data.employeeCode;
    if (data.status !== undefined) employeeFields.status = data.status;
    if (data.roleId !== undefined) employeeFields.role_id = new Types.ObjectId(data.roleId);
    if (data.department !== undefined) employeeFields.department = data.department;
    if (data.designation !== undefined) employeeFields.position = data.designation;
    if (data.maxAllocationPercent !== undefined) {
        employeeFields.max_allocation_percent = data.maxAllocationPercent;
    }
    if (data.joiningDate !== undefined) employeeFields.join_date = new Date(data.joiningDate);
    if (data.exitDate !== undefined) employeeFields.exit_date = new Date(data.exitDate);

    return {
        employeeFields,
        skills: 'skills' in data ? data.skills : undefined,
    };
}

async function resolveJobRoleId(designation?: string): Promise<Types.ObjectId | undefined> {
    if (!designation?.trim()) return undefined;
    const doc = await Role.findOneAndUpdate(
        { role_name: designation.trim() },
        {
            $setOnInsert: {
                role_name: designation.trim(),
                is_active: true,
                department: 'Engineering',
            },
        },
        { upsert: true, new: true }
    );
    return doc?._id as Types.ObjectId;
}

async function insertEmployeeSkills(
    employeeId: string,
    skills: EmployeeSkillInput[]
): Promise<void> {
    if (skills.length === 0) return;

    const skillInserts = skills.map((s) => ({
        employee_id: employeeId,
        skill_id: s.skillId,
        skill_level: s.level,
        experience_years: s.experienceYears ?? 0,
        is_primary: s.skillType === 'Primary',
    }));

    await EmployeeSkill.insertMany(skillInserts);
}

export class EmployeeService {
    async findAllocatedToProjectManager(pmEmployeeId: string, params: EmployeeListParams = {}): Promise<EmployeeResponse[]> {
        const employeeIds = await getEmployeesAllocatedToManagedProjects(pmEmployeeId);
        const employees = await this.findAll({ ...params, employeeIds });
        const managedProjectIds = new Set(await getManagedProjectIds(pmEmployeeId));
        return this.attachProjectAssignments(employees, managedProjectIds);
    }

    async findAllocatedToDeliveryManager(dmEmployeeId: string, params: EmployeeListParams = {}): Promise<EmployeeResponse[]> {
        const employeeIds = await getEmployeesAllocatedToPortfolioProjects(dmEmployeeId);
        const employees = await this.findAll({ ...params, employeeIds });
        const portfolioIds = new Set(await getPortfolioProjectIds(dmEmployeeId));
        return this.attachProjectAssignments(employees, portfolioIds);
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
                Object.assign(query, activeEmployeeMongoFilter());
            } else {
                query.$or = [{ is_active: false }, { status: { $regex: /^(inactive|terminated)$/i } }];
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

        let responses = employees.map((emp) =>
            this.mapToResponse(
                emp,
                skillsByEmployee.get(emp._id.toString()) || [],
                availabilityByEmployee.get(emp._id.toString()) ?? 100
            )
        );

        if (params.includeAssignments) {
            responses = await this.attachProjectAssignments(responses, new Set());
        }

        return responses;
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

    async update(id: string, data: UpdateEmployeeDto): Promise<EmployeeResponse> {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError('Invalid employee ID', 400);
        }

        const { employeeFields, skills } = mapEmployeeDtoToDocument(data);

        if (data.designation) {
            const jobRoleId = await resolveJobRoleId(data.designation);
            if (jobRoleId) employeeFields.job_role_id = jobRoleId;
        }

        if (Object.keys(employeeFields).length > 0) {
            const employee = await Employee.findByIdAndUpdate(id, employeeFields, { new: true });
            if (!employee) {
                throw new AppError('Employee not found', 404);
            }
        }

        if (skills && Array.isArray(skills)) {
            await EmployeeSkill.deleteMany({ employee_id: id });
            await insertEmployeeSkills(id, skills);
        }

        return this.findById(id) as Promise<EmployeeResponse>;
    }

    async create(data: CreateEmployeeDto): Promise<EmployeeResponse> {
        const { employeeFields, skills } = mapEmployeeDtoToDocument(data);

        if (!employeeFields.role_id) {
            const employeeRole = await Role.findOne({ role_name: 'Employee' }).select('_id').lean();
            if (employeeRole?._id) {
                employeeFields.role_id = employeeRole._id as Types.ObjectId;
            }
        }

        if (employeeFields.role_id) {
            const roleExists = await Role.exists({ _id: employeeFields.role_id });
            if (!roleExists) {
                throw new AppError('Specified Role does not exist.', 400);
            }
        }

        if (!employeeFields.employee_code) {
            const suffix = Date.now().toString(36).toUpperCase();
            employeeFields.employee_code = `EMP-${suffix}`;
        }

        if (data.designation) {
            const jobRoleId = await resolveJobRoleId(data.designation);
            if (jobRoleId) employeeFields.job_role_id = jobRoleId;
        }

        const bcrypt = await import('bcryptjs');
        employeeFields.password = await bcrypt.hash(
            employeeFields.password ?? PASSWORD_PLAIN,
            12
        );

        employeeFields.is_active = true;
        employeeFields.status = employeeFields.status ?? 'Active';

        try {
            const employee = new Employee(employeeFields);
            await employee.save();

            if (skills?.length) {
                await insertEmployeeSkills(employee._id.toString(), skills);
            }

            return this.findById(employee._id.toString()) as Promise<EmployeeResponse>;
        } catch (err: unknown) {
            const code = (err as { code?: number })?.code;
            if (code === 11000) {
                throw new AppError('An employee with this email or employee code already exists.', 409);
            }
            throw err;
        }
    }

    async deactivate(id: string): Promise<EmployeeResponse> {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError('Invalid employee ID', 400);
        }

        const employee = await Employee.findByIdAndUpdate(
            id,
            { is_active: false, status: 'Inactive' },
            { new: true }
        );

        if (!employee) {
            throw new AppError('Employee not found', 404);
        }

        return this.findById(id) as Promise<EmployeeResponse>;
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

    private formatAllocationDate(date: Date | string | undefined): string {
        if (!date) return '';
        if (typeof date === 'string') return date.split('T')[0];
        return date.toISOString().split('T')[0];
    }

    private async attachProjectAssignments(
        employees: EmployeeResponse[],
        yourProjectIds: Set<string>
    ): Promise<EmployeeResponse[]> {
        if (employees.length === 0) return employees;

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const employeeOids = employees.map((e) => new Types.ObjectId(e.id));
        const allocations = await ProjectAllocation.find({
            employee_id: { $in: employeeOids },
            is_active: true,
            end_date: { $gte: today },
        })
            .populate('project_id', 'project_name project_code')
            .sort({ start_date: 1 })
            .lean();

        const byEmployee = new Map<string, EmployeeProjectAssignment[]>();
        for (const alloc of allocations) {
            const empId = alloc.employee_id.toString();
            const project = alloc.project_id as {
                _id?: Types.ObjectId;
                project_name?: string;
                project_code?: string;
            } | Types.ObjectId | null;
            const projectId =
                project && typeof project === 'object' && '_id' in project
                    ? project._id!.toString()
                    : alloc.project_id?.toString() ?? '';
            const projectName =
                project && typeof project === 'object' && 'project_name' in project
                    ? project.project_name ?? 'Unknown project'
                    : 'Unknown project';
            const projectCode =
                project && typeof project === 'object' && 'project_code' in project
                    ? project.project_code ?? ''
                    : '';

            const entry: EmployeeProjectAssignment = {
                projectId,
                projectName,
                projectCode,
                allocationPercent: alloc.allocation_percent ?? 0,
                startDate: this.formatAllocationDate(alloc.start_date),
                endDate: this.formatAllocationDate(alloc.end_date),
                onYourProjects: yourProjectIds.has(projectId),
            };

            if (!byEmployee.has(empId)) byEmployee.set(empId, []);
            byEmployee.get(empId)!.push(entry);
        }

        return employees.map((emp) => ({
            ...emp,
            projectAssignments: byEmployee.get(emp.id) ?? [],
        }));
    }

    private normalizeSkillLevel(level: string | undefined): SkillLevel {
        const normalized = String(level ?? '').trim();
        if (normalized === SkillLevel.BEGINNER) return SkillLevel.BEGINNER;
        if (normalized === SkillLevel.INTERMEDIATE) return SkillLevel.INTERMEDIATE;
        if (normalized === SkillLevel.EXPERT) return SkillLevel.EXPERT;
        return SkillLevel.BEGINNER;
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
            skills: skills.map((s) => ({
                name: (s.skill_id as { name: string })?.name || 'Unknown',
                skillLevel: this.normalizeSkillLevel(s.skill_level),
                yearsOfExperience: s.experience_years || 0,
                isPrimary: s.is_primary || false,
            })),
            availability,
            maxAllocationPercent: emp.max_allocation_percent || 100,
            profileImage: emp.profile_image,
            joinDate: formatDate(emp.join_date),
            is_active: emp.is_active !== false,
        };
    }
}

export const employeeService = new EmployeeService();
