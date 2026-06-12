import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../../common/errors/app-error';
import { getAuthEmployeeId } from '../../common/utils/auth-user.util';
import { parseWeekStartParam, startOfUtcWeek } from '../../common/utils/week.util';
import { weeklyAllocationService } from './weekly-allocation.service';
import {
    parseIdList,
    weeklyGridPutBodySchema,
    weeklyGridQuerySchema,
} from './weekly-allocation.validators';

export class WeeklyAllocationController {
    async getGrid(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const parsed = weeklyGridQuerySchema.parse(req.query);

            const employeeIds =
                parseIdList(parsed.employeeIds) ??
                (parsed.employeeId ? [parsed.employeeId] : undefined);
            const projectIds =
                parseIdList(parsed.projectIds) ??
                (parsed.projectId ? [parsed.projectId] : undefined);

            const data = await weeklyAllocationService.getGrid({
                weekStartFrom: startOfUtcWeek(parseWeekStartParam(parsed.weekStartFrom)),
                weekStartTo: startOfUtcWeek(parseWeekStartParam(parsed.weekStartTo)),
                employeeIds,
                projectIds,
                page: parsed.page,
                limit: parsed.limit,
                includeCapacitySummary: parsed.includeCapacitySummary ?? false,
            });

            res.json({ status: 'success', data });
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({ status: 'fail', message: 'Validation Error', errors: error.errors });
                return;
            }
            if (error instanceof Error) {
                res.status(400).json({ status: 'error', message: error.message });
                return;
            }
            next(error);
        }
    }

    async putGrid(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const parsed = weeklyGridPutBodySchema.parse(req.body);
            const actorId = getAuthEmployeeId(req.user);

            const employeeIds = parsed.updates.map((u) => u.employeeId);
            const projectIds = parsed.updates.map((u) => u.projectId);
            await weeklyAllocationService.assertEntitiesExist(employeeIds, projectIds);

            const result = await weeklyAllocationService.bulkUpdateGrid(parsed, actorId);

            res.json({ status: 'success', data: result });
        } catch (error) {
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
}

export const weeklyAllocationController = new WeeklyAllocationController();
