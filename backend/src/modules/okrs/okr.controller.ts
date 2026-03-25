import { Request, Response, NextFunction } from 'express';
import { okrService } from './okr.service';
import { AppError } from '../../common/errors/app-error';

export class OkrController {

    /**
     * GET /api/okrs?period=Q1-2026
     * List all OKRs (Admin: all, PM: team, Employee: own)
     */
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { period } = req.query;
            const okrs = await okrService.findAll(period as string | undefined);
            res.json({ status: 'success', data: okrs });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/okrs/periods
     * Get available OKR periods for dropdown
     */
    async listPeriods(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const periods = await okrService.getAvailablePeriods();
            res.json({ status: 'success', data: periods });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/okrs/employee/:employeeId?period=Q1-2026
     * Get OKRs for a specific employee with overall score
     */
    async getByEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { employeeId } = req.params;
            const { period } = req.query;
            const user = (req as any).user;

            // RBAC: Employees can ONLY see their own OKRs
            if (user && !['Admin', 'Project Manager'].includes(user.role)) {
                if (employeeId !== user.id) {
                    res.status(403).json({
                        status: 'error',
                        message: 'Access denied. You can only view your own OKRs.'
                    });
                    return;
                }
            }

            const result = await okrService.findByEmployee(employeeId, period as string | undefined);
            res.json({ status: 'success', data: result });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/okrs
     * Create a new OKR (Admin/PM only)
     */
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { employeeId, objective, periodQuarter, periodYear, status, keyResults } = req.body;

            if (!employeeId || !objective || !periodQuarter || !periodYear) {
                throw new AppError('employeeId, objective, periodQuarter, and periodYear are required', 400);
            }

            if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(periodQuarter)) {
                throw new AppError('periodQuarter must be Q1, Q2, Q3, or Q4', 400);
            }

            if (!keyResults || !Array.isArray(keyResults) || keyResults.length === 0) {
                throw new AppError('At least one key result is required', 400);
            }

            const userRole = req.headers['x-user-role'] as string;
            const userId = req.headers['x-user-id'] as string;

            const okr = await okrService.create({
                employeeId,
                objective,
                periodQuarter,
                periodYear: Number(periodYear),
                status,
                keyResults,
                createdBy: userId,
            });

            res.status(201).json({ status: 'success', data: okr });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/okrs/:id
     * Update an OKR's objective, status, or key results (Admin/PM)
     */
    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { objective, status, keyResults } = req.body;

            const okr = await okrService.update(id, { objective, status, keyResults });
            res.json({ status: 'success', data: okr });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /api/okrs/:id/progress
     * Update a key result's achieved value (Admin/PM/Employee for own)
     */
    async updateProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { keyResultId, achieved, status } = req.body;

            if (!keyResultId || achieved === undefined) {
                throw new AppError('keyResultId and achieved are required', 400);
            }

            const okr = await okrService.updateProgress(id, {
                keyResultId,
                achieved: Number(achieved),
                status,
            });
            res.json({ status: 'success', data: okr });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/okrs/:id
     * Delete an OKR (Admin only)
     */
    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            await okrService.delete(id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

export const okrController = new OkrController();
