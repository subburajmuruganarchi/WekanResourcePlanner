import { Employee, IEmployee, IEmployeeSkill } from './employee.model';
import { Skill } from '../skills/skill.model';
import { Role } from '../roles/role.model';
import { Types } from 'mongoose';
import { SkillType } from '../../common/types/enums';
import { AppError } from '../../common/errors/app-error';

export interface EmployeeListParams {
    skill?: string;
    minLevel?: string;
    isActive?: boolean;
}

export interface EmployeeResponse {
    id: string;
    employeeCode: string;
    name: string;
    email: string;
    status: string;
    role: string;
    department?: string;
    designation?: string;
    skills: {
        name: string;
        skillType: string;
        level: string;
        experienceYears: number;
    }[];
    availability: number;
    maxAllocationPercent: number;
}

interface PopulatedSkill {
    skillId: { name: string } | Types.ObjectId;
    skillType: SkillType;
    level: string;
    experienceYears: number;
}

interface PopulatedEmployee {
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string;
    employeeCode: string;
    status: string;
    roleId: { name: string } | Types.ObjectId;
    department?: string;
    designation?: string;
    skills: PopulatedSkill[];
    maxAllocationPercent: number;
}

export class EmployeeService {
    async findAll(params: EmployeeListParams = {}): Promise<EmployeeResponse[]> {
        const query: Record<string, unknown> = {};

        if (typeof params.isActive === 'boolean') {
            query.isActive = params.isActive;
        }

        const employees = await Employee.find(query)
            .populate('skills.skillId', 'name')
            .populate('roleId', 'name')
            .lean() as unknown as PopulatedEmployee[];

        return employees.map(emp => this.mapToResponse(emp));
    }

    async findById(id: string): Promise<EmployeeResponse | null> {
        if (!Types.ObjectId.isValid(id)) {
            return null;
        }

        const employee = await Employee.findById(id)
            .populate('skills.skillId', 'name')
            .populate('roleId', 'name')
            .lean() as unknown as PopulatedEmployee | null;

        if (!employee) {
            return null;
        }

        return this.mapToResponse(employee);
    }

    async create(data: Partial<IEmployee>): Promise<EmployeeResponse> {
        // 1. Mandatory Validation: At least one Primary skill
        if (!data.skills || !data.skills.some(s => s.skillType === SkillType.PRIMARY)) {
            throw new AppError('At least one Primary skill is required.', 400);
        }

        // 2. Mandatory Validation: No duplicate skills
        const skillIds = data.skills.map(s => s.skillId.toString());
        if (new Set(skillIds).size !== skillIds.length) {
            throw new AppError('Duplicate skill entries are not allowed.', 400);
        }

        // 3. Verify Role existence
        if (data.roleId) {
            const roleExists = await Role.exists({ _id: data.roleId });
            if (!roleExists) {
                throw new AppError('Specified Role does not exist.', 400);
            }
        }

        // 4. Verify all Skill IDs existence
        for (const skillReq of data.skills) {
            const skillExists = await Skill.exists({ _id: skillReq.skillId });
            if (!skillExists) {
                throw new AppError(`Skill ID ${skillReq.skillId} does not exist.`, 400);
            }
        }

        const employee = new Employee(data);
        await employee.save();

        const populated = await Employee.findById(employee._id)
            .populate('skills.skillId', 'name')
            .populate('roleId', 'name')
            .lean() as unknown as PopulatedEmployee;

        return this.mapToResponse(populated);
    }

    private mapToResponse(emp: PopulatedEmployee): EmployeeResponse {
        return {
            id: emp._id.toString(),
            employeeCode: emp.employeeCode,
            name: `${emp.firstName} ${emp.lastName}`,
            email: emp.email,
            status: emp.status,
            role: (emp.roleId as { name: string })?.name || 'Unassigned',
            department: emp.department,
            designation: emp.designation,
            skills: emp.skills.map(s => ({
                name: (s.skillId as { name: string })?.name || 'Unknown',
                skillType: s.skillType,
                level: s.level,
                experienceYears: s.experienceYears || 0
            })),
            availability: 100, // TODO: Compute from allocations
            maxAllocationPercent: emp.maxAllocationPercent || 100
        };
    }
}

export const employeeService = new EmployeeService();
