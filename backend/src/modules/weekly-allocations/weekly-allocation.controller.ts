import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../../common/errors/app-error';
import { getAuthEmployeeId } from '../../common/utils/auth-user.util';
import { parseWeekStartParam, startOfUtcWeek } from '../../common/utils/week.util';
import { ROLES } from '../../common/constants/roles';
import { getPortfolioProjectIds } from '../../common/utils/delivery-scope.util';
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

            let employeeIds =
                parseIdList(parsed.employeeIds) ??
                (parsed.employeeId ? [parsed.employeeId] : undefined);
            let projectIds =
                parseIdList(parsed.projectIds) ??
                (parsed.projectId ? [parsed.projectId] : undefined);

            if (req.user?.role === ROLES.DELIVERY_MANAGER) {
                const actorId = getAuthEmployeeId(req.user);
                const portfolioIds = actorId ? await getPortfolioProjectIds(actorId) : [];
                const allowed = new Set(portfolioIds);
                if (projectIds?.length) {
                    projectIds = projectIds.filter((id) => allowed.has(id));
                } else {
                    projectIds = portfolioIds;
                }
            }

            const data = await weeklyAllocationService.getGrid({
                weekStartFrom: startOfUtcWeek(parseWeekStartParam(parsed.weekStartFrom)),
                weekStartTo: startOfUtcWeek(parseWeekStartParam(parsed.weekStartTo)),
                employeeIds,
                projectIds,
                page: parsed.page,
                limit: parsed.limit,
                includeCapacitySummary: parsed.includeCapacitySummary ?? false,
                excludeBench: parsed.excludeBench ?? false,
                includeUnstaffedProjects: parsed.includeUnstaffedProjects ?? false,
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

            if (req.user?.role === ROLES.DELIVERY_MANAGER && actorId) {
                const portfolioIds = new Set(await getPortfolioProjectIds(actorId));
                const outOfScope = parsed.updates.filter((u) => !portfolioIds.has(u.projectId));
                if (outOfScope.length > 0) {
                    res.status(403).json({
                        status: 'error',
                        message: 'Cannot edit allocations outside your delivery portfolio.',
                    });
                    return;
                }
            }

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
