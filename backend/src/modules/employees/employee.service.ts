import { Employee } from './employee.model';
import { Types } from 'mongoose';

export interface EmployeeListParams {
    skill?: string;
    minLevel?: string;
    isActive?: boolean;
}

export interface EmployeeResponse {
    id: string;
    name: string;
    email: string;
    title: string;
    role: string;
    primarySkill: string;
    skillLevel: string;
    availability: number;
    experienceYears: number;
}

interface PopulatedSkill {
    skillId: { name: string } | Types.ObjectId;
    type: string;
    level: string;
}

interface PopulatedEmployee {
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string;
    title: string;
    roles: Array<{ name: string } | Types.ObjectId>;
    skills: PopulatedSkill[];
    experienceYears?: number;
}

export class EmployeeService {
    async findAll(params: EmployeeListParams = {}): Promise<EmployeeResponse[]> {
        const query: Record<string, unknown> = {};

        if (typeof params.isActive === 'boolean') {
            query.isActive = params.isActive;
        } else {
            query.isActive = true; // Default to active only
        }

        const employees = await Employee.find(query)
            .populate('skills.skillId', 'name')
            .populate('roles', 'name')
            .lean() as unknown as PopulatedEmployee[];

        return employees.map(emp => this.mapToResponse(emp));
    }

    async findById(id: string): Promise<EmployeeResponse | null> {
        if (!Types.ObjectId.isValid(id)) {
            return null;
        }

        const employee = await Employee.findById(id)
            .populate('skills.skillId', 'name')
            .populate('roles', 'name')
            .lean() as unknown as PopulatedEmployee | null;

        if (!employee) {
            return null;
        }

        return this.mapToResponse(employee);
    }

    private mapToResponse(emp: PopulatedEmployee): EmployeeResponse {
        const primarySkill = emp.skills?.find(s => s.type === 'Primary');
        const primaryRole = Array.isArray(emp.roles) && emp.roles.length > 0
            ? (emp.roles[0] as { name: string })?.name
            : 'Employee';

        return {
            id: emp._id.toString(),
            name: `${emp.firstName} ${emp.lastName}`,
            email: emp.email,
            title: emp.title,
            role: primaryRole || 'Employee',
            primarySkill: (primarySkill?.skillId as { name: string })?.name || 'N/A',
            skillLevel: primarySkill?.level || 'N/A',
            availability: 100, // TODO: Calculate from allocations
            experienceYears: emp.experienceYears || 0,
        };
    }
}

export const employeeService = new EmployeeService();
