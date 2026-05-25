import { Request, Response, NextFunction } from 'express';
import { timeEntryService, CreateTimeEntryRequest } from './time-entry.service';
import { getAuthEmployeeId, assertEmployeeScope } from '../../common/utils/auth-user.util';

function requireAuthEmployeeId(req: Request, res: Response): string | null {
    const id = getAuthEmployeeId(req.user);
    if (!id) {
        res.status(401).json({ status: 'error', message: 'Authentication required.' });
        return null;
    }
    return id;
}

export class TimeEntryController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const targetEmployeeId = req.body.employeeId as string;
            const scope = assertEmployeeScope(req.user, targetEmployeeId);
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
            const authEmployeeId = getAuthEmployeeId(user);

            // RBAC: Employees can ONLY see their own entries
            if (user && authEmployeeId && !['Admin', 'Project Manager'].includes(user.role)) {
                if (targetEmployeeId !== authEmployeeId) {
                    res.status(403).json({
                        status: 'error',
                        message: 'Access denied. You can only view your own time entries.'
                    });
                    return;
                }
            }

            const entries = await timeEntryService.getByEmployee(
                targetEmployeeId,
                week as string
            );

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

            const scope = assertEmployeeScope(req.user, employeeId as string);
            if (!scope.ok) {
                res.status(403).json({ status: 'error', message: scope.message });
                return;
            }

            const estimates = await timeEntryService.getEstimatedHours(
                employeeId as string,
                week as string
            );

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

            const scope = assertEmployeeScope(req.user, targetEmployeeId);
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

            const scope = assertEmployeeScope(req.user, employeeId as string);
            if (!scope.ok) {
                res.status(403).json({ status: 'error', message: scope.message });
                return;
            }

            const forecast = await timeEntryService.getDailyForecast(
                employeeId as string,
                week as string
            );

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

            const scope = assertEmployeeScope(req.user, employeeId);
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

            const entries = await timeEntryService.getPendingApprovalForPM(pmUserId);

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
