import { Employee } from '../employees/employee.model';
import { EmployeeSkill } from '../employees/employee-skill.model';
import { ProjectAllocation, IProjectAllocation, AllocationOverrideLog } from './allocation.model';
import { Project } from '../projects/project.model';
import { ProjectSkillRequirement } from '../projects/project-skill-requirement.model';
import { Types, startSession } from 'mongoose';

export interface RankingRequest {
    projectId: string;
    skillName?: string;
    startDate?: string;
    endDate?: string;
}

export interface RankedEmployee {
    id: string;
    name: string;
    role: string;
    primarySkill: string;
    matchingSkills: { name: string; level: string }[];
    skillLevel: string;
    availability: number; // average availability over period
    experienceYears: number;
    matchScore: number;
    factors: {
        skillMatch: boolean;
        availabilityScore: number;
        experienceScore: number;
    };
    currentAllocations: {
        id: string;
        projectId: string;
        projectName: string;
        percentage: number;
        startDate: string;
        endDate: string;
        skillId?: string;
    }[];
    isAllocatedToProject: boolean;
}

export interface CreateAllocationRequest {
    projectId: string;
    employeeId: string;
    roleId: string;
    skillId?: string;
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
    skillId?: string;
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
    skillId?: string;
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
    first_name: string;
    last_name: string;
    position?: string;
    department?: string;
    role_id?: { _id: Types.ObjectId; role_name: string };
    is_active?: boolean;
}

interface PopulatedEmployeeSkill {
    skill_id: { _id: Types.ObjectId; name: string };
    skill_level: string;
    experience_years: number;
    is_primary: boolean;
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

            if (startDate < project.start_date) {
                throw new Error(`Allocation start date cannot be before project start date (${project.start_date.toISOString().split('T')[0]})`);
            }
            if (project.end_date && endDate > project.end_date) {
                throw new Error(`Allocation end date cannot be after project end date (${project.end_date.toISOString().split('T')[0]})`);
            }

            // Validate employee exists
            const employee = await Employee.findById(request.employeeId).session(session);
            if (!employee) {
                throw new Error('Employee not found');
            }
            if (employee.is_active === false) {
                throw new Error('Cannot allocate inactive employee');
            }

            // Validate allocation percentage
            if (request.percentage <= 0 || request.percentage > 100) {
                throw new Error('Allocation percentage must be between 1 and 100');
            }

            // Calculate maximum allocation at any point during the requested period
            const overlappingAllocations = await ProjectAllocation.find({
                employee_id: new Types.ObjectId(request.employeeId),
                is_active: true,
                start_date: { $lte: endDate },
                end_date: { $gte: startDate }
            }).session(session);

            // Find all critical dates where allocation might change
            const criticalDates = new Set<number>();
            criticalDates.add(startDate.getTime());
            criticalDates.add(endDate.getTime());
            overlappingAllocations.forEach(a => {
                const s = new Date(a.start_date).getTime();
                const e = new Date(a.end_date).getTime();
                if (s > startDate.getTime() && s <= endDate.getTime()) criticalDates.add(s);
                if (e >= startDate.getTime() && e < endDate.getTime()) criticalDates.add(e);
            });

            const sortedDates = Array.from(criticalDates).sort((a, b) => a - b);
            let maxCurrentAllocation = 0;

            // Check each sub-interval for over-allocation
            for (let i = 0; i < sortedDates.length; i++) {
                const checkDate = new Date(sortedDates[i]);
                // For the last date, we check the date itself; for others, we check the interval starting at that date
                const currentAtDate = overlappingAllocations.reduce((sum, a) => {
                    const s = new Date(a.start_date);
                    const e = new Date(a.end_date);
                    if (checkDate >= s && checkDate <= e) {
                        return sum + (a.allocation_percent || 0);
                    }
                    return sum;
                }, 0);
                maxCurrentAllocation = Math.max(maxCurrentAllocation, currentAtDate);
            }

            const newTotalAllocation = maxCurrentAllocation + request.percentage;

            // Check if over-allocation (requires admin override)
            if (newTotalAllocation > 100) {
                if (!request.isAdminOverride) {
                    throw new Error(
                        `Allocation would exceed 100% capacity. Employee reaches ${maxCurrentAllocation}% allocation at some point during this period. ` +
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
                project_id: new Types.ObjectId(request.projectId),
                employee_id: new Types.ObjectId(request.employeeId),
                role_id: new Types.ObjectId(request.roleId),
                skill_id: request.skillId ? new Types.ObjectId(request.skillId) : undefined,
                start_date: startDate,
                end_date: endDate,
                allocation_percent: request.percentage,
                is_active: true
            }], { session });

            // Log admin override if applicable
            if (request.isAdminOverride && request.overrideReason && request.authorizedById) {
                await AllocationOverrideLog.create([{
                    allocation_id: allocation._id,
                    project_id: allocation.project_id,
                    employee_id: allocation.employee_id,
                    requested_percentage: request.percentage,
                    reason: request.overrideReason,
                    authorized_by: new Types.ObjectId(request.authorizedById)
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

            // Note: admin override is only required if the update causes over-allocation.
            // This is checked after applying the requested changes below.

            // Find existing allocation
            const allocation = await ProjectAllocation.findById(request.allocationId).session(session);
            if (!allocation) {
                throw new Error('Allocation not found');
            }

            // Store original values for audit log
            const originalPercentage = allocation.allocation_percent;

            // Apply updates
            if (request.percentage !== undefined) {
                if (request.percentage <= 0 || request.percentage > 100) {
                    throw new Error('Allocation percentage must be between 1 and 100');
                }
                allocation.allocation_percent = request.percentage;
            }

            if (request.startDate) {
                const startDate = new Date(request.startDate);
                if (isNaN(startDate.getTime())) {
                    throw new Error('Invalid start date format');
                }
                allocation.start_date = startDate;
            }

            if (request.endDate) {
                const endDate = new Date(request.endDate);
                if (isNaN(endDate.getTime())) {
                    throw new Error('Invalid end date format');
                }
                allocation.end_date = endDate;
            }

            if (request.skillId) {
                allocation.skill_id = new Types.ObjectId(request.skillId);
            }

            // Validate dates
            if (allocation.end_date <= allocation.start_date) {
                throw new Error('End date must be after start date');
            }

            // Perform capacity check for updates
            const overlappingAllocations = await ProjectAllocation.find({
                employee_id: allocation.employee_id,
                is_active: true,
                _id: { $ne: allocation._id }, // Exclude current allocation
                start_date: { $lte: allocation.end_date },
                end_date: { $gte: allocation.start_date }
            }).session(session);

            const criticalDates = new Set<number>();
            criticalDates.add(allocation.start_date.getTime());
            criticalDates.add(allocation.end_date.getTime());
            overlappingAllocations.forEach(a => {
                const s = new Date(a.start_date).getTime();
                const e = new Date(a.end_date).getTime();
                if (s > allocation.start_date.getTime() && s <= allocation.end_date.getTime()) criticalDates.add(s);
                if (e >= allocation.start_date.getTime() && e < allocation.end_date.getTime()) criticalDates.add(e);
            });

            const sortedDates = Array.from(criticalDates).sort((a, b) => a - b);
            let maxCurrentAllocation = 0;

            for (let i = 0; i < sortedDates.length; i++) {
                const checkDate = new Date(sortedDates[i]);
                const currentAtDate = overlappingAllocations.reduce((sum, a) => {
                    const s = new Date(a.start_date);
                    const e = new Date(a.end_date);
                    if (checkDate >= s && checkDate <= e) {
                        return sum + (a.allocation_percent || 0);
                    }
                    return sum;
                }, 0);
                maxCurrentAllocation = Math.max(maxCurrentAllocation, currentAtDate);
            }

            const newTotalAllocation = maxCurrentAllocation + allocation.allocation_percent;

            if (newTotalAllocation > 100) {
                if (!request.isAdminOverride) {
                    throw new Error(
                        `Allocation would exceed 100% capacity. Employee reaches ${maxCurrentAllocation}% allocation at some point during this period. ` +
                        `Updated allocation of ${allocation.allocation_percent}% would result in ${newTotalAllocation}% total. ` +
                        `Admin override required.`
                    );
                }
                // Validate override details if it's over 100
                if (!request.overrideReason || request.overrideReason.trim().length < 10) {
                    throw new Error('Admin override requires a reason of at least 10 characters');
                }
                if (!request.authorizedById || !Types.ObjectId.isValid(request.authorizedById)) {
                    throw new Error('Admin override requires valid authorizer ID');
                }
            }

            await allocation.save({ session });

            // Log admin override/update if applicable
            if (request.isAdminOverride || request.percentage !== originalPercentage) {
                await AllocationOverrideLog.create([{
                    allocation_id: allocation._id,
                    project_id: allocation.project_id,
                    employee_id: allocation.employee_id,
                    requested_percentage: allocation.allocation_percent,
                    reason: request.overrideReason || 'Allocation updated within capacity',
                    authorized_by: new Types.ObjectId(request.authorizedById || '000000000000000000000001') // Default system user if no authorizer given for valid update
                }], { session });
            }

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
            projectId: allocation.project_id.toString(),
            employeeId: allocation.employee_id.toString(),
            roleId: allocation.role_id.toString(),
            skillId: allocation.skill_id?.toString(),
            startDate: allocation.start_date.toISOString().split('T')[0],
            endDate: allocation.end_date.toISOString().split('T')[0],
            percentage: allocation.allocation_percent,
            isActive: allocation.is_active
        };
    }

    async rankEmployees(request: RankingRequest): Promise<RankedEmployee[]> {
        // Get all active employees
        const employees = await Employee.find({ is_active: { $ne: false } })
            .populate('role_id', 'role_name')
            .lean() as unknown as PopulatedEmployee[];

        // Get all employee skills
        const employeeIds = employees.map(e => e._id);
        const allSkills = await EmployeeSkill.find({ employee_id: { $in: employeeIds } })
            .populate('skill_id', 'name')
            .lean() as unknown as (PopulatedEmployeeSkill & { employee_id: Types.ObjectId })[];

        // Group skills by employee
        const skillsByEmployee = new Map<string, PopulatedEmployeeSkill[]>();
        allSkills.forEach(skill => {
            const empId = skill.employee_id.toString();
            if (!skillsByEmployee.has(empId)) {
                skillsByEmployee.set(empId, []);
            }
            skillsByEmployee.get(empId)!.push(skill);
        });

        // Fetch project skill requirements if projectId is provided
        let projectRequirements: any[] = [];
        if (request.projectId && !request.skillName) {
            projectRequirements = await ProjectSkillRequirement.find({ project_id: request.projectId })
                .populate('skill_id', 'name')
                .lean();
        }

        // Calculate availability and match score for each employee
        const rankedEmployees = await Promise.all(
            employees.map(async (emp) => this.calculateRanking(
                emp,
                request,
                skillsByEmployee.get(emp._id.toString()) || [],
                projectRequirements
            ))
        );

        // Sort by match score (higher is better)
        return rankedEmployees.sort((a, b) => b.matchScore - a.matchScore);
    }

    private async calculateRanking(
        emp: PopulatedEmployee,
        request: RankingRequest,
        skills: PopulatedEmployeeSkill[],
        projectRequirements: any[] = []
    ): Promise<RankedEmployee> {
        const roleName = emp.role_id?.role_name || emp.department || 'Employee';

        // Find the matching skills
        let matchedSkill: PopulatedEmployeeSkill | undefined;
        let matchingSkills: { name: string; level: string }[] = [];
        let skillMatchScore = 0;
        let skillMatch = false;

        if (request.skillName) {
            const targetSkillLower = request.skillName.toLowerCase();

            // Try matching primary skill first
            const primaryMatch = skills.find(s =>
                s.is_primary && (s.skill_id as { name: string })?.name?.toLowerCase() === targetSkillLower
            );

            if (primaryMatch) {
                matchedSkill = primaryMatch;
                matchingSkills = [{
                    name: (primaryMatch.skill_id as { name: string }).name,
                    level: primaryMatch.skill_level
                }];
                skillMatchScore = 40;
                skillMatch = true;
            } else {
                // Try matching any other skill
                const secondaryMatch = skills.find(s =>
                    (s.skill_id as { name: string })?.name?.toLowerCase() === targetSkillLower
                );

                if (secondaryMatch) {
                    matchedSkill = secondaryMatch;
                    matchingSkills = [{
                        name: (secondaryMatch.skill_id as { name: string }).name,
                        level: secondaryMatch.skill_level
                    }];
                    skillMatchScore = 30;
                    skillMatch = true;
                }
            }
        } else if (projectRequirements.length > 0) {
            // Rank against all project requirements
            let totalPossibleScore = projectRequirements.length * 40;
            let earnedScore = 0;
            let matchesFound = 0;

            projectRequirements.forEach(req => {
                const reqSkillName = (req.skill_id as { name: string })?.name?.toLowerCase();
                const empSkill = skills.find(s =>
                    (s.skill_id as { name: string })?.name?.toLowerCase() === reqSkillName
                );

                if (empSkill) {
                    matchesFound++;
                    const levelScore = 30; // Base score for having the skill
                    const primaryBonus = empSkill.is_primary ? 10 : 0;
                    earnedScore += (levelScore + primaryBonus);

                    const skillNameStr = (empSkill.skill_id as { name: string }).name;
                    if (!matchingSkills.find(s => s.name === skillNameStr)) {
                        matchingSkills.push({
                            name: skillNameStr,
                            level: empSkill.skill_level
                        });
                    }

                    // Keep track of the "best" match to display it
                    if (!matchedSkill || (empSkill.is_primary && !matchedSkill.is_primary)) {
                        matchedSkill = empSkill;
                    }
                }
            });

            if (matchesFound > 0) {
                skillMatch = true;
                // Normalize score to 40 max
                skillMatchScore = (earnedScore / totalPossibleScore) * 40;
            }
        } else {
            // No specific skill and no project requirements, use primary or first available
            matchedSkill = skills.find(s => s.is_primary) || skills[0];
            if (matchedSkill) {
                matchingSkills = [{
                    name: (matchedSkill.skill_id as { name: string }).name,
                    level: matchedSkill.skill_level
                }];
            }
            skillMatch = true;
            skillMatchScore = 20; // Lower base score if no requirement matched
        }

        const skillName = (matchedSkill?.skill_id as { name: string })?.name || 'N/A';
        const skillLevel = matchedSkill?.skill_level || 'Beginner';
        const empExpYears = matchedSkill?.experience_years || 0;

        // Calculate availability over the requested period
        const analysisStart = request.startDate ? new Date(request.startDate) : new Date();
        const analysisEnd = request.endDate ? new Date(request.endDate) : new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);
        const totalPeriodDays = Math.max(1, Math.ceil((analysisEnd.getTime() - analysisStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        const allocations = await ProjectAllocation.find({
            employee_id: emp._id,
            is_active: true,
            $or: [
                { end_date: { $gte: analysisStart }, start_date: { $lte: analysisEnd } }
            ]
        }).populate('project_id', 'project_name project_code').lean();

        let weightedBusyDays = 0;
        const currentAllocations = allocations.map(a => {
            const proj = a.project_id as unknown as { _id: Types.ObjectId; project_name: string; project_code: string };
            const allocStart = new Date(a.start_date);
            const allocEnd = new Date(a.end_date);

            // Calculate overlap with analysis period
            const overlapStart = new Date(Math.max(allocStart.getTime(), analysisStart.getTime()));
            const overlapEnd = new Date(Math.min(allocEnd.getTime(), analysisEnd.getTime()));

            if (overlapStart <= overlapEnd) {
                const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                weightedBusyDays += overlapDays * ((a.allocation_percent || 0) / 100);
            }

            return {
                id: a._id.toString(),
                projectId: proj?._id?.toString() || '',
                projectName: proj?.project_name || proj?.project_code || 'Unknown',
                percentage: a.allocation_percent,
                startDate: allocStart.toISOString().split('T')[0],
                endDate: allocEnd.toISOString().split('T')[0],
                skillId: a.skill_id?.toString()
            };
        });

        const availability = Math.round(Math.max(0, (1 - (weightedBusyDays / totalPeriodDays)) * 100));

        // Check if already allocated to the target project (ever)
        const isAllocatedToProject = request.projectId
            ? allocations.some(a => a.project_id && (a.project_id as any)._id?.toString() === request.projectId)
            : false;

        // Calculate other match factors
        const availabilityScore = availability / 100;
        const experienceScore = Math.min(empExpYears / 10, 1);

        // Calculate composite score (weighted)
        const matchScoreValue = (
            skillMatchScore +
            (availabilityScore * 35) +
            (experienceScore * 25)
        ) / 100;

        return {
            id: emp._id.toString(),
            name: `${emp.first_name} ${emp.last_name}`,
            role: roleName,
            primarySkill: skillName,
            matchingSkills,
            skillLevel,
            availability,
            experienceYears: empExpYears,
            matchScore: Math.round(matchScoreValue * 100) / 100,
            factors: {
                skillMatch,
                availabilityScore: Math.round(availabilityScore * 100) / 100,
                experienceScore: Math.round(experienceScore * 100) / 100,
            },
            currentAllocations,
            isAllocatedToProject,
        };
    }
}

export const allocationService = new AllocationService();
