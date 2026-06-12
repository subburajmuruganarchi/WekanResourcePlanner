import { Project, IProject } from './project.model';
import { ProjectSkillRequirement, IProjectSkillRequirement } from './project-skill-requirement.model';
import { ProjectRoleEffort, IProjectRoleEffort } from './project-role-effort.model';
import { ProjectAllocation } from '../allocations/allocation.model';
import { EmployeeSkill } from '../employees/employee-skill.model';
import { Role } from '../roles/role.model';
import { Skill } from '../skills/skill.model';
import { Types } from 'mongoose';
import { AppError } from '../../common/errors/app-error';

export interface ProjectListParams {
    status?: string;
    managerId?: string;
    ownerId?: string;
}

export interface ProjectResponse {
    id: string;
    code: string;
    name: string;
    owner: string;
    ownerId?: string;
    managerId: string;
    managerName: string;
    startDate: string;
    endDate: string;
    status: string;
    priority: string;
    billingType?: string;
    deliveryModel?: string;
    projectLogo?: string;
    projectedTotalHours?: number;
    businessGoal?: string;
    staffingStrategy?: string;
    skillRequirements: {
        skillId: string;
        skillName?: string;
        minSkillLevel?: string;
        originalHeadcount: number;
        remainingHeadcount: number;
        requiredDays: number;
        roleId?: string;
        roleName?: string;
    }[];
    roleEfforts?: {
        roleId: string;
        roleName?: string;
        originalHeadcount: number;
        remainingHeadcount: number;
        requiredDays: number;
        hoursPerDay: number;
    }[];
    teamSize: number;
}

interface PopulatedProject {
    _id: Types.ObjectId;
    project_code: string;
    project_name: string;
    project_owner_id: { _id: Types.ObjectId; first_name: string; last_name: string } | Types.ObjectId;
    project_manager_id: { _id: Types.ObjectId; first_name: string; last_name: string } | Types.ObjectId;
    start_date: Date;
    end_date: Date;
    status: string;
    priority: string;
    billing_type?: string;
    delivery_model?: string;
    project_logo?: string;
    projected_total_hours?: number;
    business_goal?: string;
    staffing_strategy?: string;
}

interface PopulatedSkillRequirement {
    _id: Types.ObjectId;
    project_id: Types.ObjectId;
    skill_id: { _id: Types.ObjectId; name: string } | Types.ObjectId;
    min_skill_level?: string;
    required_headcount: number;
    required_days: number;
    start_date: Date;
    end_date: Date;
    role_id?: { _id: Types.ObjectId; role_name: string } | Types.ObjectId;
}

interface PopulatedRoleEffort {
    _id: Types.ObjectId;
    project_id: Types.ObjectId;
    role_id: { _id: Types.ObjectId; role_name: string } | Types.ObjectId;
    required_headcount: number;
    required_days: number;
    start_date: Date;
    end_date: Date;
    hours_per_day: number;
}

export class ProjectService {
    async findAll(params: ProjectListParams = {}): Promise<ProjectResponse[]> {
        const query: Record<string, unknown> = {};

        if (params.status) {
            query.status = params.status;
        }

        if (params.managerId || params.ownerId) {
            const orConditions: any[] = [];
            if (params.managerId) orConditions.push({ project_manager_id: params.managerId });
            if (params.ownerId) orConditions.push({ project_owner_id: params.ownerId });
            
            if (orConditions.length > 0) {
                query.$or = orConditions;
            }
        }

        const projects = await Project.find(query)
            .populate('project_owner_id', 'first_name last_name')
            .populate('project_manager_id', 'first_name last_name')
            .sort({ created_at: -1 })
            .lean() as unknown as PopulatedProject[];

        // Get skill requirements and role efforts for all projects
        const projectIds = projects.map(p => p._id);

        const allSkillReqs = await ProjectSkillRequirement.find({ project_id: { $in: projectIds } })
            .populate('skill_id', 'name')
            .populate('role_id', 'role_name')
            .lean() as unknown as PopulatedSkillRequirement[];
        const allRoleEfforts = await ProjectRoleEffort.find({ project_id: { $in: projectIds } })
            .populate('role_id', 'role_name')
            .lean() as unknown as PopulatedRoleEffort[];

        // Group by project
        const skillReqsByProject = new Map<string, PopulatedSkillRequirement[]>();
        allSkillReqs.forEach(req => {
            const projId = req.project_id.toString();
            if (!skillReqsByProject.has(projId)) {
                skillReqsByProject.set(projId, []);
            }
            skillReqsByProject.get(projId)!.push(req);
        });

        const roleEffortsByProject = new Map<string, PopulatedRoleEffort[]>();
        allRoleEfforts.forEach(effort => {
            const projId = effort.project_id.toString();
            if (!roleEffortsByProject.has(projId)) {
                roleEffortsByProject.set(projId, []);
            }
            roleEffortsByProject.get(projId)!.push(effort);
        });

        const allAllocations = await ProjectAllocation.find({
            project_id: { $in: projectIds },
        }).lean();

        const allocationsByProject = new Map<string, typeof allAllocations>();
        allAllocations.forEach((allocation) => {
            const projId = allocation.project_id.toString();
            if (!allocationsByProject.has(projId)) {
                allocationsByProject.set(projId, []);
            }
            allocationsByProject.get(projId)!.push(allocation);
        });

        return projects.map(proj => this.mapToResponse(
            proj,
            skillReqsByProject.get(proj._id.toString()) || [],
            roleEffortsByProject.get(proj._id.toString()) || [],
            allocationsByProject.get(proj._id.toString()) || []
        ));
    }

    async findById(id: string): Promise<ProjectResponse | null> {
        if (!Types.ObjectId.isValid(id)) {
            return null;
        }

        const project = await Project.findById(id)
            .populate('project_owner_id', 'first_name last_name')
            .populate('project_manager_id', 'first_name last_name')
            .lean() as unknown as PopulatedProject | null;

        if (!project) {
            return null;
        }

        // Get skill requirements and role efforts for this project
        const skillReqs = await ProjectSkillRequirement.find({ project_id: id })
            .populate('skill_id', 'name')
            .populate('role_id', 'role_name')
            .lean() as unknown as PopulatedSkillRequirement[];

        const roleEfforts = await ProjectRoleEffort.find({ project_id: id })
            .populate('role_id', 'role_name')
            .lean() as unknown as PopulatedRoleEffort[];

        const allocations = await ProjectAllocation.find({ project_id: id, is_active: true }).lean();
        const employeeIds = allocations.map(a => a.employee_id);
        const employeeSkills = await EmployeeSkill.find({ employee_id: { $in: employeeIds } }).lean();

        return this.mapToResponse(project, skillReqs, roleEfforts, allocations, employeeSkills);
    }

    async create(data: Partial<IProject>): Promise<ProjectResponse> {
        // Check code uniqueness
        const existing = await Project.findOne({ project_code: data.project_code });
        if (existing) {
            throw new AppError(`Project code '${data.project_code}' already exists`, 400);
        }

        // Date validation
        if (data.start_date && data.end_date && new Date(data.start_date) > new Date(data.end_date)) {
            throw new AppError('Start date cannot be after end date', 400);
        }

        const project = new Project(data);
        await project.save();

        const populated = await Project.findById(project._id)
            .populate('project_owner_id', 'first_name last_name')
            .populate('project_manager_id', 'first_name last_name')
            .lean() as unknown as PopulatedProject;

        return this.mapToResponse(populated, [], []);
    }

    async update(id: string, data: any): Promise<ProjectResponse> {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError('Invalid project ID', 400);
        }

        // Date validation if dates are provided
        if (data.start_date && data.end_date && new Date(data.start_date) > new Date(data.end_date)) {
            throw new AppError('Start date cannot be after end date', 400);
        }

        const oldProject = await Project.findById(id).lean();
        const project = await Project.findByIdAndUpdate(id, data, { new: true, runValidators: true });

        if (!project) {
            throw new AppError('Project not found', 404);
        }

        // If PM changed, sync to TimeEntries
        if (oldProject && oldProject.project_manager_id?.toString() !== project.project_manager_id?.toString()) {
            const { TimeEntry } = require('../time-entries/time-entry.model');
            await TimeEntry.updateMany(
                { projectId: project._id },
                { $set: { projectManagerUserId: project.project_manager_id } }
            );
        }

        // Sync Skill Requirements
        if (data.skillRequirements && Array.isArray(data.skillRequirements)) {
            await ProjectSkillRequirement.deleteMany({ project_id: id });
            const skillInserts = data.skillRequirements.map((s: any) => ({
                project_id: id,
                skill_id: s.skillId,
                min_skill_level: s.minSkillLevel,
                required_headcount: s.originalHeadcount || s.requiredHeadcount,
                start_date: new Date(s.startDate),
                end_date: new Date(s.endDate),
                required_days: s.requiredDays || Math.ceil((new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
            }));
            if (skillInserts.length > 0) {
                await ProjectSkillRequirement.insertMany(skillInserts);
            }
        }

        // Sync Role Efforts
        if (data.roleEfforts && Array.isArray(data.roleEfforts)) {
            await ProjectRoleEffort.deleteMany({ project_id: id });
            const roleInserts = data.roleEfforts.map((r: any) => ({
                project_id: id,
                role_id: r.roleId,
                required_headcount: r.originalHeadcount || r.requiredHeadcount,
                start_date: new Date(r.startDate),
                end_date: new Date(r.endDate),
                required_days: r.requiredDays || Math.ceil((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1,
                hours_per_day: r.hoursPerDay
            }));
            if (roleInserts.length > 0) {
                await ProjectRoleEffort.insertMany(roleInserts);
            }
        }

        return this.findById(id) as Promise<ProjectResponse>;
    }

    private mapToResponse(
        proj: PopulatedProject,
        skillReqs: PopulatedSkillRequirement[],
        roleEfforts: PopulatedRoleEffort[],
        allocations: any[] = [],
        employeeSkills: any[] = []
    ): ProjectResponse {
        const owner = proj.project_owner_id as { _id: Types.ObjectId; first_name: string; last_name: string } | undefined;
        let ownerName = 'Unassigned';
        let ownerId: string | undefined;
        if (owner && 'first_name' in owner) {
            ownerName = `${owner.first_name} ${owner.last_name}`;
            ownerId = owner._id?.toString();
        }

        const manager = proj.project_manager_id as { _id: Types.ObjectId; first_name: string; last_name: string } | undefined;
        let managerName = 'Unassigned';
        let managerId = '';
        if (manager && 'first_name' in manager) {
            managerName = `${manager.first_name} ${manager.last_name}`;
            managerId = manager._id?.toString();
        }

        const formatDate = (date: Date | string | undefined): string => {
            if (!date) return '';
            if (typeof date === 'string') return date.split('T')[0];
            return date.toISOString().split('T')[0];
        };

        const mappedSkillReqs = skillReqs.map(req => {
            const skill = req.skill_id as any;
            const role = req.role_id as any;
            const skillId = skill?._id?.toString() || (req.skill_id ? req.skill_id.toString() : '');
            const reqRoleId = role?._id?.toString() || (req.role_id ? req.role_id.toString() : undefined);

            const reqStartDate = req.start_date || proj.start_date;
            const reqEndDate = req.end_date || proj.end_date;
            const reqDays = Math.ceil((new Date(reqEndDate).getTime() - new Date(reqStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

            // Calculate fulfilled headcount for this skill
            const fulfilledHeadcount = allocations.reduce((sum, alloc) => {
                const empSkills = employeeSkills.filter(es => es.employee_id.toString() === alloc.employee_id.toString());
                const hasSkill = empSkills.some(es => es.skill_id.toString() === skillId);
                const roleMatch = !reqRoleId || alloc.role_id?.toString() === reqRoleId;

                if (hasSkill && roleMatch) {
                    const allocStart = new Date(alloc.start_date);
                    const allocEnd = new Date(alloc.end_date);
                    const reqStart = new Date(reqStartDate);
                    const reqEnd = new Date(reqEndDate);

                    const overlapStart = new Date(Math.max(allocStart.getTime(), reqStart.getTime()));
                    const overlapEnd = new Date(Math.min(allocEnd.getTime(), reqEnd.getTime()));

                    if (overlapStart <= overlapEnd) {
                        const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        const percent = (alloc.allocation_percent || 0) / 100;
                        return sum + (percent * (overlapDays / reqDays));
                    }
                }
                return sum;
            }, 0);

            return {
                skillId,
                skillName: skill?.name || skill?.skill_name,
                minSkillLevel: req.min_skill_level,
                originalHeadcount: req.required_headcount,
                remainingHeadcount: Math.round(Math.max(0, req.required_headcount - fulfilledHeadcount) * 10) / 10,
                fulfilledPercent: Math.round((fulfilledHeadcount / req.required_headcount) * 100),
                requiredDays: reqDays,
                startDate: formatDate(reqStartDate),
                endDate: formatDate(reqEndDate),
                roleId: reqRoleId,
                roleName: role?.role_name,
            };
        });

        const mappedRoleEfforts = roleEfforts.map(effort => {
            const role = effort.role_id as any;
            const roleId = role?._id?.toString() || (effort.role_id ? effort.role_id.toString() : '');

            const reqStartDate = effort.start_date || proj.start_date;
            const reqEndDate = effort.end_date || proj.end_date;
            const reqDays = Math.ceil((new Date(reqEndDate).getTime() - new Date(reqStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

            // Calculate fulfilled headcount for this role
            const fulfilledHeadcount = allocations.reduce((sum, alloc) => {
                if (alloc.role_id?.toString() === roleId) {
                    const allocStart = new Date(alloc.start_date);
                    const allocEnd = new Date(alloc.end_date);
                    const reqStart = new Date(reqStartDate);
                    const reqEnd = new Date(reqEndDate);

                    const overlapStart = new Date(Math.max(allocStart.getTime(), reqStart.getTime()));
                    const overlapEnd = new Date(Math.min(allocEnd.getTime(), reqEnd.getTime()));

                    if (overlapStart <= overlapEnd) {
                        const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        const percent = (alloc.allocation_percent || 0) / 100;
                        return sum + (percent * (overlapDays / reqDays));
                    }
                }
                return sum;
            }, 0);

            return {
                roleId,
                roleName: role?.role_name,
                originalHeadcount: effort.required_headcount,
                remainingHeadcount: Math.round(Math.max(0, effort.required_headcount - fulfilledHeadcount) * 10) / 10,
                fulfilledPercent: Math.round((fulfilledHeadcount / effort.required_headcount) * 100),
                requiredDays: reqDays,
                startDate: formatDate(reqStartDate),
                endDate: formatDate(reqEndDate),
                hoursPerDay: effort.hours_per_day
            };
        });

        return {
            id: proj._id.toString(),
            code: proj.project_code,
            name: proj.project_name,
            owner: ownerName,
            ownerId,
            managerId,
            managerName,
            startDate: formatDate(proj.start_date),
            endDate: formatDate(proj.end_date),
            status: proj.status,
            priority: proj.priority || 'Medium',
            billingType: proj.billing_type,
            deliveryModel: proj.delivery_model,
            projectLogo: proj.project_logo,
            projectedTotalHours: proj.projected_total_hours,
            businessGoal: proj.business_goal,
            staffingStrategy: proj.staffing_strategy,
            skillRequirements: mappedSkillReqs,
            roleEfforts: mappedRoleEfforts,
            teamSize: new Set(allocations.map(a => a.employee_id.toString())).size,
        };
    }
}

export const projectService = new ProjectService();
