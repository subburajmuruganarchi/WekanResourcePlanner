import { Request, Response, NextFunction } from 'express';
import { projectService } from './project.service';
import { CreateProjectSchema } from './project.schema';
import { getAuthEmployeeId } from '../../common/utils/auth-user.util';
import { ROLES } from '../../common/constants/roles';
import { normalizeRoleName, isEmployeeAccessRole } from '../../common/utils/role-normalize.util';
import { resolveEmployeeAssignedProjectIds } from '../../common/utils/employee-project-scope.util';

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
            const user = req.user;
            const role = user ? normalizeRoleName(user.role) : undefined;
            const params: any = {
                status: req.query.status as string | undefined,
            };

            // RBAC: If PM, only show projects they own/manage
            if (user && role === ROLES.PROJECT_MANAGER) {
                const employeeId = getAuthEmployeeId(user);
                if (employeeId) {
                    params.managerId = employeeId;
                    params.ownerId = employeeId;
                }
            }

            const forTimeEntry = req.query.forTimeEntry === 'true';

            // Time entry picker: all active-status projects (scoped by PM/DM filters above when applicable)
            if (forTimeEntry) {
                params.forTimeEntry = true;
            } else if (user && isEmployeeAccessRole(role)) {
                const employeeId = getAuthEmployeeId(user);
                if (employeeId) {
                    params.projectIds = await resolveEmployeeAssignedProjectIds(employeeId);
                }
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
            const user = req.user;
            const role = user ? normalizeRoleName(user.role) : undefined;

            if (user && isEmployeeAccessRole(role)) {
                const employeeId = getAuthEmployeeId(user);
                if (!employeeId) {
                    res.status(403).json({
                        status: 'error',
                        message: 'You do not have access to this project',
                    });
                    return;
                }
                const assignedIds = await resolveEmployeeAssignedProjectIds(employeeId);
                if (!assignedIds.includes(id)) {
                    res.status(403).json({
                        status: 'error',
                        message: 'You do not have access to this project',
                    });
                    return;
                }
            }

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

