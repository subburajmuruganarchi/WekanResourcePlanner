import { Employee } from '../employees/employee.model';
import { ProjectAllocation, AllocationOverrideLog, IProjectAllocation } from './allocation.model';
import { Project } from '../projects/project.model';
import { Types, startSession } from 'mongoose';

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

export interface CreateAllocationRequest {
    projectId: string;
    employeeId: string;
    roleId: string;
    startDate: string;
    endDate: string;
    percentage: number;
    isAdminOverride?: boolean;
    overrideReason?: string;
    authorizedById?: string;
}

export interface AllocationResponse {
    id: string;
    projectId: string;
    employeeId: string;
    roleId: string;
    startDate: string;
    endDate: string;
    percentage: number;
    isActive: boolean;
    hasAdminOverride?: boolean;
}

export interface UpdateAllocationRequest {
    allocationId: string;
    percentage?: number;
    startDate?: string;
    endDate?: string;
    isAdminOverride: boolean;
    overrideReason: string;
    authorizedById: string;
}

export interface ValidationError {
    field: string;
    message: string;
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
    async createAllocation(request: CreateAllocationRequest): Promise<AllocationResponse> {
        const session = await startSession();
        session.startTransaction();

        try {
            // Validate IDs
            if (!Types.ObjectId.isValid(request.projectId)) {
                throw new Error('Invalid project ID');
            }
            if (!Types.ObjectId.isValid(request.employeeId)) {
                throw new Error('Invalid employee ID');
            }
            if (!Types.ObjectId.isValid(request.roleId)) {
                throw new Error('Invalid role ID');
            }

            // Validate dates
            const startDate = new Date(request.startDate);
            const endDate = new Date(request.endDate);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw new Error('Invalid date format');
            }
            if (endDate <= startDate) {
                throw new Error('End date must be after start date');
            }

            // Validate project exists and check date range
            const project = await Project.findById(request.projectId).session(session);
            if (!project) {
                throw new Error('Project not found');
            }

            if (startDate < project.startDate) {
                throw new Error(`Allocation start date cannot be before project start date (${project.startDate.toISOString().split('T')[0]})`);
            }
            if (project.endDate && endDate > project.endDate) {
                throw new Error(`Allocation end date cannot be after project end date (${project.endDate.toISOString().split('T')[0]})`);
            }

            // Validate employee exists
            const employee = await Employee.findById(request.employeeId).session(session);
            if (!employee) {
                throw new Error('Employee not found');
            }
            if (!employee.isActive) {
                throw new Error('Cannot allocate inactive employee');
            }

            // Validate allocation percentage
            if (request.percentage <= 0 || request.percentage > 100) {
                throw new Error('Allocation percentage must be between 1 and 100');
            }

            // Calculate current allocation for the employee during the requested period
            const overlappingAllocations = await ProjectAllocation.find({
                employeeId: new Types.ObjectId(request.employeeId),
                isActive: true,
                startDate: { $lte: endDate },
                endDate: { $gte: startDate }
            }).session(session);

            const currentTotalAllocation = overlappingAllocations.reduce(
                (sum, alloc) => sum + alloc.percentage, 0
            );
            const newTotalAllocation = currentTotalAllocation + request.percentage;

            // Check if over-allocation (requires admin override)
            if (newTotalAllocation > 100) {
                if (!request.isAdminOverride) {
                    throw new Error(
                        `Allocation would exceed 100% capacity. Employee is currently at ${currentTotalAllocation}% allocation. ` +
                        `Requested ${request.percentage}% would result in ${newTotalAllocation}% total. ` +
                        `Admin override required.`
                    );
                }

                // Validate override requirements
                if (!request.overrideReason || request.overrideReason.trim().length < 10) {
                    throw new Error('Admin override requires a reason of at least 10 characters');
                }
                if (!request.authorizedById || !Types.ObjectId.isValid(request.authorizedById)) {
                    throw new Error('Admin override requires valid authorizer ID');
                }
            }

            // Create the allocation
            const [allocation] = await ProjectAllocation.create([{
                projectId: new Types.ObjectId(request.projectId),
                employeeId: new Types.ObjectId(request.employeeId),
                roleId: new Types.ObjectId(request.roleId),
                startDate,
                endDate,
                percentage: request.percentage,
                isActive: true
            }], { session });

            // Log admin override if applicable
            if (request.isAdminOverride && request.overrideReason && request.authorizedById) {
                await AllocationOverrideLog.create([{
                    allocationId: allocation._id,
                    projectId: new Types.ObjectId(request.projectId),
                    employeeId: new Types.ObjectId(request.employeeId),
                    requestedPercentage: request.percentage,
                    reason: request.overrideReason,
                    authorizedBy: new Types.ObjectId(request.authorizedById)
                }], { session });
            }

            await session.commitTransaction();

            return this.mapAllocationToResponse(allocation);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async updateAllocation(request: UpdateAllocationRequest): Promise<AllocationResponse> {
        const session = await startSession();
        session.startTransaction();

        try {
            // Validate allocation ID
            if (!Types.ObjectId.isValid(request.allocationId)) {
                throw new Error('Invalid allocation ID');
            }

            // Admin override is mandatory for updates
            if (!request.isAdminOverride) {
                throw new Error('Only admin users can modify allocations. Admin override required.');
            }

            // Validate override reason (required for audit)
            if (!request.overrideReason || request.overrideReason.trim().length < 10) {
                throw new Error('Admin override requires a reason of at least 10 characters');
            }

            // Validate authorizer ID
            if (!request.authorizedById || !Types.ObjectId.isValid(request.authorizedById)) {
                throw new Error('Admin override requires valid authorizer ID');
            }

            // Find existing allocation
            const allocation = await ProjectAllocation.findById(request.allocationId).session(session);
            if (!allocation) {
                throw new Error('Allocation not found');
            }

            // Store original values for audit log
            const originalPercentage = allocation.percentage;

            // Apply updates
            if (request.percentage !== undefined) {
                if (request.percentage <= 0 || request.percentage > 100) {
                    throw new Error('Allocation percentage must be between 1 and 100');
                }
                allocation.percentage = request.percentage;
            }

            if (request.startDate) {
                const startDate = new Date(request.startDate);
                if (isNaN(startDate.getTime())) {
                    throw new Error('Invalid start date format');
                }
                allocation.startDate = startDate;
            }

            if (request.endDate) {
                const endDate = new Date(request.endDate);
                if (isNaN(endDate.getTime())) {
                    throw new Error('Invalid end date format');
                }
                allocation.endDate = endDate;
            }

            // Validate dates
            if (allocation.endDate <= allocation.startDate) {
                throw new Error('End date must be after start date');
            }

            await allocation.save({ session });

            // Create immutable audit log (cannot be updated or deleted)
            await AllocationOverrideLog.create([{
                allocationId: allocation._id,
                projectId: allocation.projectId,
                employeeId: allocation.employeeId,
                requestedPercentage: request.percentage || originalPercentage,
                reason: request.overrideReason,
                authorizedBy: new Types.ObjectId(request.authorizedById)
            }], { session });

            await session.commitTransaction();

            return {
                ...this.mapAllocationToResponse(allocation),
                hasAdminOverride: true
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    private mapAllocationToResponse(allocation: IProjectAllocation): AllocationResponse {
        return {
            id: allocation._id.toString(),
            projectId: allocation.projectId.toString(),
            employeeId: allocation.employeeId.toString(),
            roleId: allocation.roleId.toString(),
            startDate: allocation.startDate.toISOString().split('T')[0],
            endDate: allocation.endDate.toISOString().split('T')[0],
            percentage: allocation.percentage,
            isActive: allocation.isActive
        };
    }

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

