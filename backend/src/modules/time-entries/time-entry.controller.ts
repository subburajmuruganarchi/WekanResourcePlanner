import { Request, Response, NextFunction } from 'express';
import { timeEntryService, CreateTimeEntryRequest } from './time-entry.service';
import { getAuthEmployeeId, assertTimeEntryEmployeeScope } from '../../common/utils/auth-user.util';
import { getManagedProjectIds } from '../../common/utils/pm-scope.util';

function requireAuthEmployeeId(req: Request, res: Response): string | null {
    const id = getAuthEmployeeId(req.user);
    if (!id) {
        res.status(401).json({ status: 'error', message: 'Authentication required.' });
        return null;
    }
    return id;
}

async function getPmManagedProjectIdSet(req: Request): Promise<Set<string> | null> {
    if (req.user?.role !== 'Project Manager') {
        return null;
    }
    const pmId = getAuthEmployeeId(req.user);
    if (!pmId) {
        return new Set();
    }
    const ids = await getManagedProjectIds(pmId);
    return new Set(ids);
}

export class TimeEntryController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const targetEmployeeId = req.body.employeeId as string;
            const scope = await assertTimeEntryEmployeeScope(req.user, targetEmployeeId);
            if (!scope.ok) {
                res.status(403).json({ status: 'error', message: scope.message });
                return;
            }

            const request: CreateTimeEntryRequest = {
                employeeId: targetEmployeeId,
                projectId: req.body.projectId,
                timeCodeId: req.body.timeCodeId,
                date: req.body.date,
                hours: req.body.hours,
                comments: req.body.comments,
                overrideReason: req.body.overrideReason,
                requestingUserId: getAuthEmployeeId(req.user) || req.body.requestingUserId,
            };

            const timeEntry = await timeEntryService.createTimeEntry(request);

            res.status(201).json({
                status: 'success',
                data: timeEntry,
            });
        } catch (error) {
            if (error instanceof Error) {
                res.status(400).json({
                    status: 'error',
                    message: error.message,
                });
                return;
            }
            next(error);
        }
    }

    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { employeeId, week } = req.query;

            if (!employeeId || !week) {
                res.status(400).json({
                    status: 'error',
                    message: 'employeeId and week query parameters are required',
                });
                return;
            }

            const user = req.user;
            const targetEmployeeId = employeeId as string;

            const scope = await assertTimeEntryEmployeeScope(user, targetEmployeeId);
            if (!scope.ok) {
                res.status(403).json({ status: 'error', message: scope.message });
                return;
            }

            let entries = await timeEntryService.getByEmployee(
                targetEmployeeId,
                week as string
            );

            const managedProjectIds = await getPmManagedProjectIdSet(req);
            if (managedProjectIds) {
                entries = entries.filter((e) => managedProjectIds.has(e.projectId));
            }

            res.json({
                status: 'success',
                data: entries,
            });
        } catch (error) {
            if (error instanceof Error) {
                res.status(400).json({ status: 'error', message: error.message });
                return;
            }
            next(error);
        }
    }

    async getEstimates(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { employeeId, week } = req.query;

            if (!employeeId || !week) {
                res.status(400).json({
                    status: 'error',
                    message: 'employeeId and week query parameters are required',
                });
                return;
            }

            const scope = await assertTimeEntryEmployeeScope(req.user, employeeId as string);
            if (!scope.ok) {
                res.status(403).json({ status: 'error', message: scope.message });
                return;
            }

            let estimates = await timeEntryService.getEstimatedHours(
                employeeId as string,
                week as string
            );

            const managedProjectIds = await getPmManagedProjectIdSet(req);
            if (managedProjectIds) {
                const byProject = estimates.byProject.filter((p) => managedProjectIds.has(p.projectId));
                estimates = {
                    byProject,
                    totalEstimated: Math.round(
                        byProject.reduce((sum, p) => sum + p.estimatedHours, 0) * 10
                    ) / 10,
                };
            }

            res.json({
                status: 'success',
                data: estimates,
            });
        } catch (error) {
            if (error instanceof Error) {
                res.status(400).json({ status: 'error', message: error.message });
                return;
            }
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const targetEmployeeId = (req.body?.employeeId as string) || getAuthEmployeeId(req.user);

            if (!targetEmployeeId) {
                res.status(400).json({
                    status: 'error',
                    message: 'employeeId is required',
                });
                return;
            }

            const scope = await assertTimeEntryEmployeeScope(req.user, targetEmployeeId);
            if (!scope.ok) {
                res.status(403).json({ status: 'error', message: scope.message });
                return;
            }

            await timeEntryService.deleteEntry(id, targetEmployeeId);

            res.json({
                status: 'success',
                message: 'Time entry deleted',
            });
        } catch (error) {
            if (error instanceof Error) {
                res.status(400).json({ status: 'error', message: error.message });
                return;
            }
            next(error);
        }
    }

    async getDailyForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { employeeId, week } = req.query;

            if (!employeeId || !week) {
                res.status(400).json({
                    status: 'error',
                    message: 'employeeId and week query parameters are required',
                });
                return;
            }

            const scope = await assertTimeEntryEmployeeScope(req.user, employeeId as string);
            if (!scope.ok) {
                res.status(403).json({ status: 'error', message: scope.message });
                return;
            }

            let forecast = await timeEntryService.getDailyForecast(
                employeeId as string,
                week as string
            );

            const managedProjectIds = await getPmManagedProjectIdSet(req);
            if (managedProjectIds) {
                const days = forecast.days.map((day) => {
                    const byProject = day.byProject.filter((p) => managedProjectIds.has(p.projectId));
                    const totalForecast = Math.round(
                        byProject.reduce((sum, p) => sum + p.forecastHours, 0) * 10
                    ) / 10;
                    return { ...day, byProject, totalForecast };
                });
                forecast = {
                    days,
                    weekTotal: Math.round(
                        days.reduce((sum, day) => sum + day.totalForecast, 0) * 10
                    ) / 10,
                };
            }

            res.json({
                status: 'success',
                data: forecast,
            });
        } catch (error) {
            if (error instanceof Error) {
                res.status(400).json({ status: 'error', message: error.message });
                return;
            }
            next(error);
        }
    }

    /**
     * POST /api/time-entries/submit
     * Body: { employeeId, weekStart }
     */
    async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { employeeId, weekStart, adminOverride } = req.body;

            if (!employeeId || !weekStart) {
                res.status(400).json({
                    status: 'error',
                    message: 'employeeId and weekStart are required',
                });
                return;
            }

            const scope = await assertTimeEntryEmployeeScope(req.user, employeeId);
            if (!scope.ok) {
                res.status(403).json({ status: 'error', message: scope.message });
                return;
            }

            const result = await timeEntryService.submitWeeklyEntries(
                employeeId,
                weekStart,
                adminOverride === true
            );

            res.json({
                status: 'success',
                data: result,
            });
        } catch (error) {
            if (error instanceof Error) {
                res.status(400).json({ status: 'error', message: error.message });
                return;
            }
            next(error);
        }
    }

    /**
     * POST /api/time-entries/approve
     * Body: { entryIds: string[], pmUserId: string }
     */
    async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { entryIds } = req.body;
            const pmUserId = requireAuthEmployeeId(req, res);
            if (!pmUserId) return;

            if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
                res.status(400).json({
                    status: 'error',
                    message: 'entryIds (array) is required',
                });
                return;
            }

            const result = await timeEntryService.approveEntries(
                entryIds, 
                pmUserId, 
                { overrideReason: req.body.overrideReason }
            );

            res.json({
                status: 'success',
                data: result,
            });
        } catch (error) {
            if (error instanceof Error) {
                const statusCode = error.message.includes('not the Project Manager') ? 403 : 400;
                res.status(statusCode).json({ status: 'error', message: error.message });
                return;
            }
            next(error);
        }
    }

    /**
     * POST /api/time-entries/reject
     * Body: { entryIds: string[], pmUserId: string, rejectionComment?: string }
     */
    async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { entryIds, rejectionComment } = req.body;
            const pmUserId = requireAuthEmployeeId(req, res);
            if (!pmUserId) return;

            if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
                res.status(400).json({
                    status: 'error',
                    message: 'entryIds (array) is required',
                });
                return;
            }

            const result = await timeEntryService.rejectEntries(
                entryIds, 
                pmUserId, 
                rejectionComment,
                { overrideReason: req.body.overrideReason }
            );

            res.json({
                status: 'success',
                data: result,
            });
        } catch (error) {
            if (error instanceof Error) {
                const statusCode = error.message.includes('not the Project Manager') ? 403 : 400;
                res.status(statusCode).json({ status: 'error', message: error.message });
                return;
            }
            next(error);
        }
    }

    /**
     * GET /api/time-entries/pending-approval?pmUserId=xxx
     * Returns all SUBMITTED entries for projects managed by the given PM.
     */
    async pendingApproval(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const pmUserId = requireAuthEmployeeId(req, res);
            if (!pmUserId) return;

            const includeAll = req.user?.role === 'Admin';
            const entries = await timeEntryService.getPendingApprovalForPM(pmUserId, { includeAll });

            res.json({
                status: 'success',
                data: entries,
            });
        } catch (error) {
            if (error instanceof Error) {
                res.status(400).json({ status: 'error', message: error.message });
                return;
            }
            next(error);
        }
    }

    /**
     * GET /api/time-entries/by-project/:projectId
     * Query params: week, employeeId, status
     */
    async byProject(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { projectId } = req.params;
            const { week, employeeId, status } = req.query;

            if (!projectId) {
                res.status(400).json({ status: 'error', message: 'projectId is required' });
                return;
            }

            const entries = await timeEntryService.getEntriesByProject(projectId, {
                week: week as string | undefined,
                employeeId: employeeId as string | undefined,
                status: status as string | undefined,
            });

            res.json({ status: 'success', data: entries });
        } catch (error) {
            if (error instanceof Error) {
                res.status(400).json({ status: 'error', message: error.message });
                return;
            }
            next(error);
        }
    }
}

export const timeEntryController = new TimeEntryController();
