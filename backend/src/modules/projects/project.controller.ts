import { Request, Response, NextFunction } from 'express';
import { projectService } from './project.service';
import { CreateProjectSchema } from './project.schema';

export class ProjectController {
    /**
     * Maps camelCase frontend fields to snake_case backend fields.
     */
    private mapRequestBody(body: any): any {
        const mapped = { ...body };
        // Map camelCase frontend keys to snake_case backend keys
        if (mapped.name !== undefined) { mapped.project_name = mapped.name; delete mapped.name; }
        if (mapped.code !== undefined) { mapped.project_code = mapped.code; delete mapped.code; }
        if (mapped.ownerId !== undefined) { mapped.project_owner_id = mapped.ownerId; delete mapped.ownerId; }
        if (mapped.managerId !== undefined) { mapped.project_manager_id = mapped.managerId; delete mapped.managerId; }
        if (mapped.startDate !== undefined) { mapped.start_date = mapped.startDate; delete mapped.startDate; }
        if (mapped.endDate !== undefined) { mapped.end_date = mapped.endDate; delete mapped.endDate; }
        if (mapped.billingType !== undefined) { mapped.billing_type = mapped.billingType; delete mapped.billingType; }
        if (mapped.deliveryModel !== undefined) { mapped.delivery_model = mapped.deliveryModel; delete mapped.deliveryModel; }
        if (mapped.businessGoal !== undefined) { mapped.business_goal = mapped.businessGoal; delete mapped.businessGoal; }
        if (mapped.staffingStrategy !== undefined) { mapped.staffing_strategy = mapped.staffingStrategy; delete mapped.staffingStrategy; }
        return mapped;
    }

    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = (req as any).user;
            const params: any = {
                status: req.query.status as string | undefined,
            };

            // RBAC: If PM, only show projects they own/manage
            if (user && user.role === 'Project Manager') {
                params.managerId = user.id;
                params.ownerId = user.id;
            }

            const projects = await projectService.findAll(params);

            res.json({
                status: 'success',
                data: projects,
            });
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const project = await projectService.findById(id);

            if (!project) {
                res.status(404).json({
                    status: 'error',
                    message: 'Project not found',
                });
                return;
            }

            res.json({
                status: 'success',
                data: project,
            });
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const mappedBody = this.mapRequestBody(req.body);
            // Validate request body with Zod
            const validatedData = CreateProjectSchema.parse(mappedBody);

            const project = await projectService.create(validatedData as any);
            res.status(201).json({
                status: 'success',
                data: project,
            });
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const mappedBody = this.mapRequestBody(req.body);
            const project = await projectService.update(id, mappedBody);

            res.json({
                status: 'success',
                data: project,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const projectController = new ProjectController();

