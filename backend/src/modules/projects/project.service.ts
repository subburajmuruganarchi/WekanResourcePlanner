import { Project } from './project.model';
import { Types } from 'mongoose';

export interface ProjectListParams {
    status?: string;
}

export interface ProjectResponse {
    id: string;
    code: string;
    name: string;
    clientName: string;
    owner: string;
    startDate: string;
    endDate?: string;
    status: string;
    priority: string;
    teamSize: number;
}

interface PopulatedProject {
    _id: Types.ObjectId;
    code: string;
    name: string;
    clientName: string;
    managerId?: { firstName: string; lastName: string } | Types.ObjectId;
    startDate: Date;
    endDate?: Date;
    status: string;
    priority: string;
}

export class ProjectService {
    async findAll(params: ProjectListParams = {}): Promise<ProjectResponse[]> {
        const query: Record<string, unknown> = {};

        if (params.status) {
            query.status = params.status;
        }

        const projects = await Project.find(query)
            .populate('managerId', 'firstName lastName')
            .lean() as unknown as PopulatedProject[];

        return projects.map(proj => this.mapToResponse(proj));
    }

    async findById(id: string): Promise<ProjectResponse | null> {
        if (!Types.ObjectId.isValid(id)) {
            return null;
        }

        const project = await Project.findById(id)
            .populate('managerId', 'firstName lastName')
            .lean() as unknown as PopulatedProject | null;

        if (!project) {
            return null;
        }

        return this.mapToResponse(project);
    }

    private mapToResponse(proj: PopulatedProject): ProjectResponse {
        const manager = proj.managerId as { firstName: string; lastName: string } | undefined;
        const ownerName = manager
            ? `${manager.firstName} ${manager.lastName}`
            : 'Unassigned';

        return {
            id: proj._id.toString(),
            code: proj.code,
            name: proj.name,
            clientName: proj.clientName,
            owner: ownerName,
            startDate: proj.startDate.toISOString().split('T')[0],
            endDate: proj.endDate?.toISOString().split('T')[0],
            status: proj.status,
            priority: proj.priority || 'Medium',
            teamSize: 0, // TODO: Calculate from allocations
        };
    }
}

export const projectService = new ProjectService();
