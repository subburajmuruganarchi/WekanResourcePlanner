import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../../common/errors/app-error';
import { getAuthEmployeeId } from '../../common/utils/auth-user.util';
import { parseWeekStartParam, startOfUtcWeek } from '../../common/utils/week.util';
import { utilizationService } from './utilization.service';
import {
    utilizationRangeQuerySchema,
    utilizationSyncBodySchema,
} from './utilization.validators';

function parseRangeFromQuery(query: Record<string, unknown>) {
    const parsed = utilizationRangeQuerySchema.parse(query);
    return {
        weekStartFrom: startOfUtcWeek(parseWeekStartParam(parsed.weekStartFrom)),
        weekStartTo: startOfUtcWeek(parseWeekStartParam(parsed.weekStartTo)),
        employeeId: parsed.employeeId,
        projectId: parsed.projectId,
    };
}

export class UtilizationController {
    async getVariance(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const range = parseRangeFromQuery(req.query as Record<string, unknown>);
            const data = await utilizationService.getVarianceReport(range);
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(error, res, next);
        }
    }

    async getEmployeeUtilization(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const range = parseRangeFromQuery(req.query as Record<string, unknown>);
            const data = await utilizationService.getEmployeeUtilization(req.params.id, range);
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(error, res, next);
        }
    }

    async getProjectUtilization(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const range = parseRangeFromQuery(req.query as Record<string, unknown>);
            const data = await utilizationService.getProjectUtilization(req.params.id, range);
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(error, res, next);
        }
    }

    async getDashboardSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const week = req.query.weekStart
                ? startOfUtcWeek(parseWeekStartParam(String(req.query.weekStart)))
                : undefined;
            const data = await utilizationService.getDashboardSummary(week);
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(error, res, next);
        }
    }

    async syncActuals(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const body = utilizationSyncBodySchema.parse(req.body);
            const data = await utilizationService.runActualsSync({
                weekStartFrom: startOfUtcWeek(parseWeekStartParam(body.weekStartFrom)),
                weekStartTo: startOfUtcWeek(parseWeekStartParam(body.weekStartTo)),
                employeeId: body.employeeId,
                projectId: body.projectId,
                actorId: getAuthEmployeeId(req.user),
            });
            res.json({ status: 'success', data });
        } catch (error) {
            this.handleError(error, res, next);
        }
    }

    private handleError(error: unknown, res: Response, next: NextFunction): void {
        if (error instanceof ZodError) {
            res.status(400).json({ status: 'fail', message: 'Validation Error', errors: error.errors });
            return;
        }
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ status: 'error', message: error.message });
            return;
        }
        if (error instanceof Error) {
            res.status(400).json({ status: 'error', message: error.message });
            return;
        }
        next(error);
    }
}

export const utilizationController = new UtilizationController();
