import { Employee } from '../employees/employee.model';
import { ProjectAllocation } from './allocation.model';
import { Types } from 'mongoose';

export interface RankingRequest {
    projectId: string;
    skillName?: string;
}

export interface RankedEmployee {
    id: string;
    name: string;
    role: string;
    primarySkill: string;
    skillLevel: string;
    availability: number;
    experienceYears: number;
    matchScore: number;
    factors: {
        skillMatch: boolean;
        availabilityScore: number;
        experienceScore: number;
    };
}

interface PopulatedEmployee {
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    title: string;
    skills: Array<{
        skillId: { name: string } | Types.ObjectId;
        type: string;
        level: string;
    }>;
    roles: Array<{ label: string } | Types.ObjectId>;
    experienceYears?: number;
    isActive: boolean;
}

export class AllocationService {
    async rankEmployees(request: RankingRequest): Promise<RankedEmployee[]> {
        // Get all active employees
        const employees = await Employee.find({ isActive: true })
            .populate('skills.skillId', 'name')
            .populate('roles', 'label')
            .lean() as unknown as PopulatedEmployee[];

        // Calculate availability for each employee
        const rankedEmployees = await Promise.all(
            employees.map(async (emp) => this.calculateRanking(emp, request))
        );

        // Sort by match score (higher is better)
        return rankedEmployees.sort((a, b) => b.matchScore - a.matchScore);
    }

    private async calculateRanking(emp: PopulatedEmployee, request: RankingRequest): Promise<RankedEmployee> {
        const primarySkill = emp.skills?.find(s => s.type === 'Primary');
        const primaryRole = Array.isArray(emp.roles) && emp.roles.length > 0
            ? (emp.roles[0] as { label: string })?.label
            : 'Employee';

        const skillName = (primarySkill?.skillId as { name: string })?.name || 'N/A';
        const skillLevel = primarySkill?.level || 'Beginner';

        // Calculate availability (100 - sum of active allocation percentages)
        const allocations = await ProjectAllocation.find({
            employeeId: emp._id,
            isActive: true,
            endDate: { $gte: new Date() }
        }).lean();

        const totalAllocated = allocations.reduce((sum, alloc) => sum + (alloc.percentage || 0), 0);
        const availability = Math.max(0, 100 - totalAllocated);

        // Calculate match factors
        const skillMatch = request.skillName
            ? skillName.toLowerCase() === request.skillName.toLowerCase()
            : true;
        const availabilityScore = availability / 100;
        const experienceScore = Math.min((emp.experienceYears || 0) / 10, 1);

        // Calculate composite score (weighted)
        const matchScore = (
            (skillMatch ? 40 : 0) +
            (availabilityScore * 35) +
            (experienceScore * 25)
        ) / 100;

        return {
            id: emp._id.toString(),
            name: `${emp.firstName} ${emp.lastName}`,
            role: primaryRole || 'Employee',
            primarySkill: skillName,
            skillLevel,
            availability,
            experienceYears: emp.experienceYears || 0,
            matchScore: Math.round(matchScore * 100) / 100,
            factors: {
                skillMatch,
                availabilityScore: Math.round(availabilityScore * 100) / 100,
                experienceScore: Math.round(experienceScore * 100) / 100,
            },
        };
    }
}

export const allocationService = new AllocationService();
