import { Types } from 'mongoose';
import { DeliveryPortfolio } from './delivery-portfolio.model';
import { Project } from '../projects/project.model';
import { Employee } from '../employees/employee.model';
import { AppError } from '../../common/errors/app-error';
import type { CreatePortfolioInput, UpdatePortfolioInput } from './delivery-portfolio.schema';
import { getPortfolioProjectIds } from '../../common/utils/delivery-scope.util';
import { getDeliveryManagersForProject } from '../../common/utils/project-delivery-managers.util';

function mapPortfolio(doc: {
    _id: Types.ObjectId;
    name: string;
    description?: string;
    project_ids: Types.ObjectId[];
    manager_ids: Types.ObjectId[];
    is_active: boolean;
}) {
    return {
        id: doc._id.toString(),
        name: doc.name,
        description: doc.description ?? '',
        projectIds: doc.project_ids.map((id) => id.toString()),
        managerIds: doc.manager_ids.map((id) => id.toString()),
        isActive: doc.is_active,
    };
}

async function validateIds(projectIds: string[], managerIds: string[]): Promise<void> {
    if (projectIds.length > 0) {
        const count = await Project.countDocuments({ _id: { $in: projectIds } });
        if (count !== projectIds.length) {
            throw new AppError('One or more project IDs are invalid', 400);
        }
    }
    if (managerIds.length > 0) {
        const count = await Employee.countDocuments({ _id: { $in: managerIds } });
        if (count !== managerIds.length) {
            throw new AppError('One or more manager IDs are invalid', 400);
        }
    }
}

export class DeliveryPortfolioService {
    async list() {
        const docs = await DeliveryPortfolio.find({ is_active: true })
            .sort({ name: 1 })
            .lean();
        return docs.map(mapPortfolio);
    }

    async getById(id: string) {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError('Invalid portfolio ID', 400);
        }
        const doc = await DeliveryPortfolio.findById(id).lean();
        if (!doc) {
            throw new AppError('Portfolio not found', 404);
        }
        return mapPortfolio(doc);
    }

    async create(input: CreatePortfolioInput) {
        await validateIds(input.projectIds, input.managerIds);
        const doc = await DeliveryPortfolio.create({
            name: input.name,
            description: input.description,
            project_ids: input.projectIds.map((id) => new Types.ObjectId(id)),
            manager_ids: input.managerIds.map((id) => new Types.ObjectId(id)),
            is_active: true,
        });
        return mapPortfolio(doc);
    }

    async update(id: string, input: UpdatePortfolioInput) {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError('Invalid portfolio ID', 400);
        }
        const projectIds = input.projectIds;
        const managerIds = input.managerIds;
        if (projectIds || managerIds) {
            await validateIds(projectIds ?? [], managerIds ?? []);
        }

        const update: Record<string, unknown> = {};
        if (input.name !== undefined) update.name = input.name;
        if (input.description !== undefined) update.description = input.description;
        if (projectIds !== undefined) {
            update.project_ids = projectIds.map((pid) => new Types.ObjectId(pid));
        }
        if (managerIds !== undefined) {
            update.manager_ids = managerIds.map((mid) => new Types.ObjectId(mid));
        }

        const doc = await DeliveryPortfolio.findByIdAndUpdate(id, update, { new: true }).lean();
        if (!doc) {
            throw new AppError('Portfolio not found', 404);
        }
        return mapPortfolio(doc);
    }

    async deactivate(id: string) {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError('Invalid portfolio ID', 400);
        }
        const doc = await DeliveryPortfolio.findByIdAndUpdate(
            id,
            { is_active: false },
            { new: true }
        ).lean();
        if (!doc) {
            throw new AppError('Portfolio not found', 404);
        }
        return mapPortfolio(doc);
    }

    async getMyProjectIds(dmEmployeeId: string): Promise<string[]> {
        return getPortfolioProjectIds(dmEmployeeId);
    }

    /** Assign a delivery manager to a project via portfolio membership. */
    async assignDeliveryManagerForProject(
        projectId: string,
        managerId: string
    ): Promise<{ deliveryManagerIds: string[]; deliveryManagerNames: string[] }> {
        if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(managerId)) {
            throw new AppError('Invalid project or manager ID', 400);
        }

        const project = await Project.findById(projectId).lean();
        if (!project) {
            throw new AppError('Project not found', 404);
        }

        const manager = await Employee.findById(managerId).lean();
        if (!manager) {
            throw new AppError('Manager not found', 404);
        }

        const projectOid = new Types.ObjectId(projectId);
        const managerOid = new Types.ObjectId(managerId);

        let portfolio = await DeliveryPortfolio.findOne({
            is_active: true,
            project_ids: projectOid,
        });

        if (!portfolio) {
            portfolio = await DeliveryPortfolio.create({
                name: `${project.project_code} — Delivery`,
                description: `Auto-created for ${project.project_name}`,
                project_ids: [projectOid],
                manager_ids: [managerOid],
                is_active: true,
            });
        } else {
            await DeliveryPortfolio.findByIdAndUpdate(portfolio._id, {
                $addToSet: {
                    manager_ids: managerOid,
                    project_ids: projectOid,
                },
            });
        }

        return getDeliveryManagersForProject(projectId);
    }
}

export const deliveryPortfolioService = new DeliveryPortfolioService();
