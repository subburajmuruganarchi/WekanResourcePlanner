import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { deliveryPortfolioService } from './delivery-portfolio.service';
import { createPortfolioSchema, updatePortfolioSchema } from './delivery-portfolio.schema';
import { getAuthEmployeeId } from '../../common/utils/auth-user.util';
import { ROLES } from '../../common/constants/roles';

export class DeliveryPortfolioController {
    async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await deliveryPortfolioService.list();
            res.json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await deliveryPortfolioService.getById(req.params.id);
            res.json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const parsed = createPortfolioSchema.parse(req.body);
            const data = await deliveryPortfolioService.create(parsed);
            res.status(201).json({ status: 'success', data });
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({ status: 'fail', message: 'Validation Error', errors: error.errors });
                return;
            }
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const parsed = updatePortfolioSchema.parse(req.body);
            const data = await deliveryPortfolioService.update(req.params.id, parsed);
            res.json({ status: 'success', data });
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({ status: 'fail', message: 'Validation Error', errors: error.errors });
                return;
            }
            next(error);
        }
    }

    async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await deliveryPortfolioService.deactivate(req.params.id);
            res.json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }

    /** GET /api/delivery-portfolios/my-projects — portfolio project IDs for the current DM. */
    async myProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const employeeId = getAuthEmployeeId(req.user);
            if (!employeeId) {
                res.status(401).json({ status: 'error', message: 'Authentication required.' });
                return;
            }
            if (req.user?.role !== ROLES.DELIVERY_MANAGER && req.user?.role !== ROLES.ADMIN) {
                res.status(403).json({ status: 'error', message: 'Delivery Manager access required.' });
                return;
            }
            const projectIds =
                req.user.role === ROLES.ADMIN
                    ? []
                    : await deliveryPortfolioService.getMyProjectIds(employeeId);
            res.json({ status: 'success', data: { projectIds } });
        } catch (error) {
            next(error);
        }
    }
}

export const deliveryPortfolioController = new DeliveryPortfolioController();
