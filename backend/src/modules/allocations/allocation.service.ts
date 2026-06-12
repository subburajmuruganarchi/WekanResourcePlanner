import { Employee } from '../employees/employee.model';
import { EmployeeSkill } from '../employees/employee-skill.model';
import { ProjectAllocation, IProjectAllocation, AllocationOverrideLog } from './allocation.model';
import { Project } from '../projects/project.model';
import { ProjectSkillRequirement } from '../projects/project-skill-requirement.model';
import { ProjectRoleEffort } from '../projects/project-role-effort.model';
import { Types, startSession } from 'mongoose';
import { computeAvailabilityInPeriod } from './allocation-availability.util';

export interface RankingRequest {
    projectId: string;
    skillName?: string;
    startDate?: string;
    endDate?: string;
}

const ACCESS_ROLE_NAMES = new Set(['Admin', 'Project Manager', 'Employee', 'User']);

export interface RankedEmployee {
    id: string;
    name: string;
    /** System access role (JWT / sidebar). */
    role: string;
    roleId?: string;
    /** Job role on employee profile (Developer, etc.). */
    jobRoleName?: string;
    jobRoleId?: string;
    /** Best role_id to use when creating an allocation for this project. */
    suggestedAllocationRoleId?: string;
    suggestedAllocationRoleName?: string;
    /** Open role slots on the project this employee fits. */
    matchingRoleEfforts?: { roleId: string; roleName: string; remainingHeadcount: number }[];
    primarySkill: string;
    matchingSkills: { name: string; level: string }[];
    skillLevel: string;
    availability: number; // average free % over project window
    peakCommittedPercent: number; // max combined % on any day (all other projects)
    minFreePercent: number; // 100 − peakCommitted (capacity left on busiest day)
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
        roleId?: string;
        roleName?: string;
        percentage: number;
        startDate: string;
        endDate: string;
        skillId?: string;
        skillIds?: string[];
    }[];
    isAllocatedToProject: boolean;
    /** Active allocation on the project being ranked, if any. */
    projectAllocation?: {
        id: string;
        percentage: number;
        startDate: string;
        endDate: string;
        roleId?: string;
        roleName?: string;
        skillId?: string;
        skillIds?: string[];
    };
}

export interface CreateAllocationRequest {
    projectId: string;
    employeeId: string;
    roleId: string;
    skillId?: string;
    skillIds?: string[];
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
    skillIds?: string[];
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
    skillIds?: string[];
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
    job_role_id?: { _id: Types.ObjectId; role_name: string };
    is_active?: boolean;
}

interface RoleEffortGap {
    roleId: string;
    roleName: string;
    requiredHeadcount: number;
    fulfilledHeadcount: number;
    remainingHeadcount: number;
}

interface PopulatedEmployeeSkill {
    skill_id: { _id: Types.ObjectId; name: string };
    skill_level: string;
    experience_years: number;
    is_primary: boolean;
}

function resolveSkillObjectIds(skillId?: string, skillIds?: string[]): Types.ObjectId[] {
    const raw = skillIds?.length ? skillIds : skillId ? [skillId] : [];
    const unique = [...new Set(raw.filter((id) => Types.ObjectId.isValid(id)))];
    return unique.map((id) => new Types.ObjectId(id));
}

function mapStoredSkillIds(allocation: IProjectAllocation): string[] {
    if (allocation.skill_ids?.length) {
        return allocation.skill_ids.map((id) => id.toString());
    }
    if (allocation.skill_id) {
        return [allocation.skill_id.toString()];
    }
    return [];
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

            const skillObjectIds = resolveSkillObjectIds(request.skillId, request.skillIds);

            // Create the allocation
            const [allocation] = await ProjectAllocation.create([{
                project_id: new Types.ObjectId(request.projectId),
                employee_id: new Types.ObjectId(request.employeeId),
                role_id: new Types.ObjectId(request.roleId),
                skill_id: skillObjectIds[0],
                skill_ids: skillObjectIds.length > 0 ? skillObjectIds : undefined,
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

            if (request.skillId !== undefined || request.skillIds !== undefined) {
                const skillObjectIds = resolveSkillObjectIds(request.skillId, request.skillIds);
                allocation.skill_id = skillObjectIds[0];
                allocation.skill_ids = skillObjectIds.length > 0 ? skillObjectIds : undefined;
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
        const skillIds = mapStoredSkillIds(allocation);
        return {
            id: allocation._id.toString(),
            projectId: allocation.project_id.toString(),
            employeeId: allocation.employee_id.toString(),
            roleId: allocation.role_id.toString(),
            skillId: skillIds[0],
            skillIds: skillIds.length > 0 ? skillIds : undefined,
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
            .populate('job_role_id', 'role_name')
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
        let roleEffortGaps: RoleEffortGap[] = [];
        let projectAllocations: Array<{
            employee_id: Types.ObjectId;
            role_id?: Types.ObjectId;
            start_date: Date;
            end_date: Date;
            allocation_percent: number;
            project_id: Types.ObjectId;
        }> = [];

        if (request.projectId && Types.ObjectId.isValid(request.projectId)) {
            const projectOid = new Types.ObjectId(request.projectId);
            if (!request.skillName) {
                projectRequirements = await ProjectSkillRequirement.find({ project_id: projectOid })
                    .populate('skill_id', 'name')
                    .lean();
            }
            const roleEfforts = await ProjectRoleEffort.find({ project_id: projectOid })
                .populate('role_id', 'role_name')
                .lean();
            projectAllocations = (await ProjectAllocation.find({
                project_id: projectOid,
                is_active: true,
            }).lean()) as typeof projectAllocations;
            roleEffortGaps = this.computeRoleEffortGaps(roleEfforts, projectAllocations);
        }

        // Calculate availability and match score for each employee
        const rankedEmployees = await Promise.all(
            employees.map(async (emp) => this.calculateRanking(
                emp,
                request,
                skillsByEmployee.get(emp._id.toString()) || [],
                projectRequirements,
                roleEffortGaps,
                projectAllocations
            ))
        );

        // Sort by match score (higher is better)
        const sorted = rankedEmployees.sort((a, b) => b.matchScore - a.matchScore);

        // When the project defines skill requirements, only surface employees who match
        // at least one required skill (or are already allocated for edit).
        const shouldFilterBySkills =
            projectRequirements.length > 0 || Boolean(request.skillName?.trim());
        if (shouldFilterBySkills) {
            return sorted.filter(
                (emp) => emp.isAllocatedToProject || emp.factors?.skillMatch === true
            );
        }

        return sorted;
    }

    private computeRoleEffortGaps(
        roleEfforts: Array<{
            role_id: { _id: Types.ObjectId; role_name: string } | Types.ObjectId;
            required_headcount: number;
            start_date: Date;
            end_date: Date;
        }>,
        allocations: Array<{
            role_id?: Types.ObjectId;
            start_date: Date;
            end_date: Date;
            allocation_percent: number;
        }>
    ): RoleEffortGap[] {
        return roleEfforts.map((effort) => {
            const role = effort.role_id as { _id: Types.ObjectId; role_name: string };
            const roleId = role?._id?.toString() || (effort.role_id as Types.ObjectId).toString();
            const roleName = role?.role_name || 'Role';
            const reqStart = new Date(effort.start_date);
            const reqEnd = new Date(effort.end_date);
            const reqDays = Math.max(
                1,
                Math.ceil((reqEnd.getTime() - reqStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
            );

            const fulfilledHeadcount = allocations.reduce((sum, alloc) => {
                if (alloc.role_id?.toString() !== roleId) return sum;
                const allocStart = new Date(alloc.start_date);
                const allocEnd = new Date(alloc.end_date);
                const overlapStart = new Date(Math.max(allocStart.getTime(), reqStart.getTime()));
                const overlapEnd = new Date(Math.min(allocEnd.getTime(), reqEnd.getTime()));
                if (overlapStart <= overlapEnd) {
                    const overlapDays =
                        Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    const percent = (alloc.allocation_percent || 0) / 100;
                    return sum + percent * (overlapDays / reqDays);
                }
                return sum;
            }, 0);

            const remaining = Math.max(0, effort.required_headcount - fulfilledHeadcount);
            return {
                roleId,
                roleName,
                requiredHeadcount: effort.required_headcount,
                fulfilledHeadcount,
                remainingHeadcount: Math.round(remaining * 10) / 10,
            };
        });
    }

    private resolveSuggestedAllocationRole(
        emp: PopulatedEmployee,
        roleEffortGaps: RoleEffortGap[],
        projectRequirements: Array<{ role_id?: Types.ObjectId | { _id: Types.ObjectId } }>,
        existingProjectAlloc?: { role_id?: Types.ObjectId }
    ): { roleId?: string; roleName?: string; matching: RankedEmployee['matchingRoleEfforts'] } {
        if (existingProjectAlloc?.role_id) {
            const rid = existingProjectAlloc.role_id.toString();
            const gap = roleEffortGaps.find((g) => g.roleId === rid);
            return {
                roleId: rid,
                roleName: gap?.roleName,
                matching: roleEffortGaps
                    .filter((g) => g.remainingHeadcount > 0)
                    .map((g) => ({
                        roleId: g.roleId,
                        roleName: g.roleName,
                        remainingHeadcount: g.remainingHeadcount,
                    })),
            };
        }

        const jobRoleId = (emp.job_role_id as { _id: Types.ObjectId; role_name: string } | undefined)?._id?.toString();
        const jobRoleName = (emp.job_role_id as { _id: Types.ObjectId; role_name: string } | undefined)?.role_name;

        const openGaps = roleEffortGaps.filter((g) => g.remainingHeadcount > 0);

        if (jobRoleId && openGaps.some((g) => g.roleId === jobRoleId)) {
            return {
                roleId: jobRoleId,
                roleName: jobRoleName,
                matching: openGaps.map((g) => ({
                    roleId: g.roleId,
                    roleName: g.roleName,
                    remainingHeadcount: g.remainingHeadcount,
                })),
            };
        }

        if (openGaps.length > 0) {
            const best = openGaps.sort((a, b) => b.remainingHeadcount - a.remainingHeadcount)[0];
            return {
                roleId: best.roleId,
                roleName: best.roleName,
                matching: openGaps.map((g) => ({
                    roleId: g.roleId,
                    roleName: g.roleName,
                    remainingHeadcount: g.remainingHeadcount,
                })),
            };
        }

        if (jobRoleId && !ACCESS_ROLE_NAMES.has(jobRoleName || '')) {
            return { roleId: jobRoleId, roleName: jobRoleName, matching: [] };
        }

        for (const req of projectRequirements) {
            const reqRoleId = (req.role_id as { _id: Types.ObjectId } | undefined)?._id?.toString()
                || (req.role_id as Types.ObjectId | undefined)?.toString();
            if (reqRoleId) {
                const gap = roleEffortGaps.find((g) => g.roleId === reqRoleId);
                return {
                    roleId: reqRoleId,
                    roleName: gap?.roleName,
                    matching: [],
                };
            }
        }

        return { matching: [] };
    }

    private findEmployeeSkillForRequirement(
        skills: PopulatedEmployeeSkill[],
        req: { skill_id?: { _id?: Types.ObjectId; name?: string } | Types.ObjectId }
    ): PopulatedEmployeeSkill | undefined {
        const skillRef = req.skill_id as { _id?: Types.ObjectId; name?: string } | Types.ObjectId | undefined;
        const reqSkillId =
            skillRef && typeof skillRef === 'object' && '_id' in skillRef && skillRef._id
                ? skillRef._id.toString()
                : skillRef?.toString?.();
        const reqSkillName =
            skillRef && typeof skillRef === 'object' && 'name' in skillRef
                ? skillRef.name?.toLowerCase()
                : undefined;

        return skills.find((s) => {
            const empSkillRef = s.skill_id as { _id?: Types.ObjectId; name?: string };
            const empSkillId = empSkillRef?._id?.toString();
            const empSkillName = empSkillRef?.name?.toLowerCase();
            if (reqSkillId && empSkillId && reqSkillId === empSkillId) return true;
            if (reqSkillName && empSkillName && reqSkillName === empSkillName) return true;
            return false;
        });
    }

    private fillDisplaySkills(
        skills: PopulatedEmployeeSkill[],
        matchingSkills: { name: string; level: string }[],
        matchedSkill?: PopulatedEmployeeSkill
    ): { matchingSkills: { name: string; level: string }[]; matchedSkill?: PopulatedEmployeeSkill } {
        if (matchingSkills.length > 0 || skills.length === 0) {
            return { matchingSkills, matchedSkill };
        }

        const sorted = [...skills].sort((a, b) => {
            if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
            return (b.experience_years || 0) - (a.experience_years || 0);
        });

        const displaySkills: { name: string; level: string }[] = [];
        for (const s of sorted.slice(0, 6)) {
            const name = (s.skill_id as { name: string })?.name;
            if (name && !displaySkills.some((d) => d.name === name)) {
                displaySkills.push({ name, level: s.skill_level });
            }
        }

        return {
            matchingSkills: displaySkills,
            matchedSkill: matchedSkill || sorted[0],
        };
    }

    private resolveExperienceYears(
        skills: PopulatedEmployeeSkill[],
        matchingSkills: { name: string; level: string }[],
        matchedSkill?: PopulatedEmployeeSkill
    ): number {
        const names = new Set(matchingSkills.map((s) => s.name));
        const relevant =
            names.size > 0
                ? skills.filter((s) => names.has((s.skill_id as { name: string })?.name))
                : skills;

        const fromSkills = relevant.reduce(
            (max, s) => Math.max(max, s.experience_years || 0),
            0
        );
        if (fromSkills > 0) return fromSkills;
        return matchedSkill?.experience_years || 0;
    }

    private async calculateRanking(
        emp: PopulatedEmployee,
        request: RankingRequest,
        skills: PopulatedEmployeeSkill[],
        projectRequirements: any[] = [],
        roleEffortGaps: RoleEffortGap[] = [],
        projectAllocations: Array<{
            employee_id: Types.ObjectId;
            role_id?: Types.ObjectId;
        }> = []
    ): Promise<RankedEmployee> {
        const accessRoleName = emp.role_id?.role_name || emp.department || 'Employee';
        const jobRoleName = emp.job_role_id?.role_name;
        const jobRoleId = emp.job_role_id?._id?.toString();

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
                const empSkill = this.findEmployeeSkillForRequirement(skills, req);

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

        ({ matchingSkills, matchedSkill } = this.fillDisplaySkills(skills, matchingSkills, matchedSkill));

        const skillName = (matchedSkill?.skill_id as { name: string })?.name || 'No skills on profile';
        const skillLevel = matchedSkill?.skill_level || '—';
        const empExpYears = this.resolveExperienceYears(skills, matchingSkills, matchedSkill);

        // Calculate availability over the requested period
        const analysisStart = request.startDate
            ? new Date(request.startDate + 'T00:00:00.000Z')
            : new Date();
        const analysisEnd = request.endDate
            ? new Date(request.endDate + 'T00:00:00.000Z')
            : new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);

        const allocations = await ProjectAllocation.find({
            employee_id: emp._id,
            is_active: true,
            $or: [
                { end_date: { $gte: analysisStart }, start_date: { $lte: analysisEnd } }
            ]
        })
            .populate('project_id', 'project_name project_code')
            .populate('role_id', 'role_name')
            .lean();

        const capacitySlices = allocations.map((a) => ({
            start_date: new Date(a.start_date),
            end_date: new Date(a.end_date),
            allocation_percent: a.allocation_percent || 0,
        }));

        const periodCapacity = computeAvailabilityInPeriod(
            capacitySlices,
            analysisStart,
            analysisEnd
        );

        const currentAllocations = allocations.map(a => {
            const proj = a.project_id as unknown as { _id: Types.ObjectId; project_name: string; project_code: string };
            const allocRole = a.role_id as unknown as { _id: Types.ObjectId; role_name: string } | undefined;
            const allocStart = new Date(a.start_date);
            const allocEnd = new Date(a.end_date);

            return {
                id: a._id.toString(),
                projectId: proj?._id?.toString() || '',
                projectName: proj?.project_name || proj?.project_code || 'Unknown',
                roleId: allocRole?._id?.toString() || a.role_id?.toString(),
                roleName: allocRole?.role_name,
                percentage: a.allocation_percent,
                startDate: allocStart.toISOString().split('T')[0],
                endDate: allocEnd.toISOString().split('T')[0],
                skillId: a.skill_id?.toString(),
                skillIds: a.skill_ids?.length
                    ? a.skill_ids.map((id) => id.toString())
                    : a.skill_id
                      ? [a.skill_id.toString()]
                      : undefined,
            };
        });

        const availability = periodCapacity.availability;

        const projectAllocationEntry = request.projectId
            ? currentAllocations.find((a) => a.projectId === request.projectId)
            : undefined;

        // Check if already allocated to the target project in this period
        const isAllocatedToProject = !!projectAllocationEntry;

        // Role effort fit (up to 20 pts when project defines role efforts)
        let roleEffortScore = 0;
        if (roleEffortGaps.length > 0) {
            const openGaps = roleEffortGaps.filter((g) => g.remainingHeadcount > 0);
            if (jobRoleId && openGaps.some((g) => g.roleId === jobRoleId)) {
                roleEffortScore = 20;
            } else if (openGaps.length > 0) {
                roleEffortScore = 8;
            }
        }

        const existingOnProject = request.projectId
            ? projectAllocations.find(
                (a) =>
                    a.employee_id.toString() === emp._id.toString()
            )
            : undefined;

        const suggested = this.resolveSuggestedAllocationRole(
            emp,
            roleEffortGaps,
            projectRequirements,
            existingOnProject
        );

        // Calculate other match factors
        const availabilityScore = availability / 100;
        const experienceScore = Math.min(empExpYears / 10, 1);

        // Calculate composite score (weighted) — skills 40, availability 30, experience 20, role 10
        const matchScoreValue = Math.min(
            1,
            (skillMatchScore +
                roleEffortScore +
                availabilityScore * 30 +
                experienceScore * 20) /
                110
        );

        const accessRoleId = (emp.role_id as { _id: Types.ObjectId } | undefined)?._id?.toString();

        return {
            id: emp._id.toString(),
            name: `${emp.first_name} ${emp.last_name}`,
            role: accessRoleName,
            roleId: accessRoleId,
            jobRoleName,
            jobRoleId,
            suggestedAllocationRoleId: suggested.roleId,
            suggestedAllocationRoleName: suggested.roleName,
            matchingRoleEfforts: suggested.matching,
            primarySkill: skillName,
            matchingSkills,
            skillLevel,
            availability,
            peakCommittedPercent: periodCapacity.peakCommittedPercent,
            minFreePercent: periodCapacity.minFreePercent,
            experienceYears: empExpYears,
            matchScore: Math.round(matchScoreValue * 100) / 100,
            factors: {
                skillMatch,
                availabilityScore: Math.round(availabilityScore * 100) / 100,
                experienceScore: Math.round(experienceScore * 100) / 100,
            },
            currentAllocations,
            isAllocatedToProject,
            projectAllocation: projectAllocationEntry
                ? {
                      id: projectAllocationEntry.id,
                      percentage: projectAllocationEntry.percentage,
                      startDate: projectAllocationEntry.startDate,
                      endDate: projectAllocationEntry.endDate,
                      roleId: projectAllocationEntry.roleId,
                      roleName: projectAllocationEntry.roleName,
                      skillId: projectAllocationEntry.skillId,
                      skillIds: projectAllocationEntry.skillIds,
                  }
                : undefined,
        };
    }
}

export const allocationService = new AllocationService();
