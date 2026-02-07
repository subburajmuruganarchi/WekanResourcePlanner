import { Request, Response, NextFunction } from 'express';
import { projectService } from './project.service';

export class ProjectController {
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const params = {
                status: req.query.status as string | undefined,
            };

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
            // Validate request body with Zod
            const validatedData = CreateProjectSchema.parse(req.body);

            const project = await projectService.create(validatedData as any);
            res.status(201).json({
                status: 'success',
                data: project,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const projectController = new ProjectController();
