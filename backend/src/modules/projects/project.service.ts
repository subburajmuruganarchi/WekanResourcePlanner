import { Project, IProject, ISkillRequirement, IRoleEffort } from './project.model';
import { Types } from 'mongoose';
import { AppError } from '../../common/errors/app-error';

export interface ProjectListParams {
    status?: string;
}

export interface ProjectResponse {
    id: string;
    code: string;
    name: string;
    // clientName removed
    owner: string;
    startDate: string;
    endDate: string;
    status: string;
    priority: string;
    billingType?: string;
    deliveryModel?: string;
    skillRequirements: {
        skillId: string;
        skillName?: string; // Populated
        minSkillLevel: string;
        requiredHeadcount: number;
        requiredDays: number;
        roleId?: string;
        roleName?: string; // Populated
    }[];
    roleEfforts?: {
        roleId: string;
        roleName?: string; // Populated
        requiredHeadcount: number;
        requiredDays: number;
        hoursPerDay: number;
    }[];
    teamSize: number;
}

// Helper interface for Mongoose Population
interface PopulatedProject {
    _id: Types.ObjectId;
    code: string;
    name: string;
    ownerId: { firstName: string; lastName: string } | Types.ObjectId;
    startDate: Date;
    endDate: Date;
    status: string;
    priority: string;
    billingType?: string;
    deliveryModel?: string;
    skillRequirements: {
        skillId: { _id: Types.ObjectId; name: string } | Types.ObjectId;
        minSkillLevel: string;
        requiredHeadcount: number;
        requiredDays: number;
        roleId?: { _id: Types.ObjectId; name: string } | Types.ObjectId;
    }[];
    roleEfforts?: {
        roleId: { _id: Types.ObjectId; name: string } | Types.ObjectId;
        requiredHeadcount: number;
        requiredDays: number;
        hoursPerDay: number;
    }[];
}

export class ProjectService {
    async findAll(params: ProjectListParams = {}): Promise<ProjectResponse[]> {
        const query: Record<string, unknown> = {};

        if (params.status) {
            query.status = params.status;
        }

        const projects = await Project.find(query)
            .populate('ownerId', 'firstName lastName')
            .populate('skillRequirements.skillId', 'name')
            .populate('skillRequirements.roleId', 'name')
            .populate('roleEfforts.roleId', 'name')
            .sort({ createdAt: -1 })
            .lean() as unknown as PopulatedProject[];

        return projects.map(proj => this.mapToResponse(proj));
    }

    async findById(id: string): Promise<ProjectResponse | null> {
        if (!Types.ObjectId.isValid(id)) {
            return null;
        }

        const project = await Project.findById(id)
            .populate('ownerId', 'firstName lastName')
            .populate('skillRequirements.skillId', 'name')
            .populate('skillRequirements.roleId', 'name')
            .populate('roleEfforts.roleId', 'name')
            .lean() as unknown as PopulatedProject | null;

        if (!project) {
            return null;
        }

        return this.mapToResponse(project);
    }

    async create(data: Partial<IProject>): Promise<ProjectResponse> {
        // Business Logic Validation

        // 1. Check code uniqueness
        const existing = await Project.findOne({ code: data.code });
        if (existing) {
            throw new AppError(`Project code '${data.code}' already exists`, 400);
        }

        // 2. Date validation
        if (data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate)) {
            throw new AppError('Start date cannot be after end date', 400);
        }

        const project = new Project(data);
        await project.save();

        const populated = await Project.findById(project._id)
            .populate('ownerId', 'firstName lastName')
            .populate('skillRequirements.skillId', 'name')
            .populate('skillRequirements.roleId', 'name')
            .populate('roleEfforts.roleId', 'name')
            .lean() as unknown as PopulatedProject;

        return this.mapToResponse(populated);
    }

    private mapToResponse(proj: PopulatedProject): ProjectResponse {
        const owner = proj.ownerId as { firstName: string; lastName: string } | undefined;
        let ownerName = 'Unassigned';
        if (owner && 'firstName' in owner) {
            ownerName = `${owner.firstName} ${owner.lastName}`;
        }

        // Handle date formatting safely
        const formatDate = (date: Date | string | undefined): string => {
            if (!date) return '';
            if (typeof date === 'string') return date.split('T')[0];
            return date.toISOString().split('T')[0];
        };

        // Map skill requirements safely (handle legacy projects without this field)
        const skillRequirements = (proj.skillRequirements || []).map(req => {
            const skill = req.skillId as { _id: Types.ObjectId, name: string } | undefined;
            const role = req.roleId as { _id: Types.ObjectId, name: string } | undefined;
            return {
                skillId: skill?._id?.toString() || (req.skillId ? req.skillId.toString() : ''),
                skillName: skill?.name,
                minSkillLevel: req.minSkillLevel,
                requiredHeadcount: req.requiredHeadcount,
                requiredDays: req.requiredDays,
                roleId: role?._id?.toString() || (req.roleId ? req.roleId.toString() : undefined),
                roleName: role?.name
            };
        });

        // Map role efforts safely (handle legacy projects without this field)
        const roleEfforts = (proj.roleEfforts || []).map(effort => {
            const role = effort.roleId as { _id: Types.ObjectId, name: string } | undefined;
            return {
                roleId: role?._id?.toString() || (effort.roleId ? effort.roleId.toString() : ''),
                roleName: role?.name,
                requiredHeadcount: effort.requiredHeadcount,
                requiredDays: effort.requiredDays,
                hoursPerDay: effort.hoursPerDay
            };
        });

        return {
            id: proj._id.toString(),
            code: proj.code,
            name: proj.name,
            owner: ownerName,
            startDate: formatDate(proj.startDate),
            endDate: formatDate(proj.endDate),
            status: proj.status,
            priority: proj.priority || 'Medium',
            billingType: proj.billingType,
            deliveryModel: proj.deliveryModel,
            skillRequirements,
            roleEfforts,
            teamSize: 0,
        };
    }
}

export const projectService = new ProjectService();
