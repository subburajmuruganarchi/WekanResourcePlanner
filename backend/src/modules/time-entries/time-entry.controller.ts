import { Request, Response, NextFunction } from 'express';
import { timeEntryService, CreateTimeEntryRequest } from './time-entry.service';

export class TimeEntryController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const request: CreateTimeEntryRequest = {
                employeeId: req.body.employeeId,
                projectId: req.body.projectId,
                timeCodeId: req.body.timeCodeId,
                date: req.body.date,
                hours: req.body.hours,
                comments: req.body.comments,
                overrideReason: req.body.overrideReason,
                requestingUserId: (req as any).user?.id || req.body.requestingUserId, // Use auth user if available
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

            const user = (req as any).user;
            const targetEmployeeId = employeeId as string;

            // RBAC: Employees can ONLY see their own entries
            if (user && !['Admin', 'Project Manager'].includes(user.role)) {
                if (targetEmployeeId !== user.id) {
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
            const { employeeId } = req.body;

            if (!employeeId) {
                res.status(400).json({
                    status: 'error',
                    message: 'employeeId is required',
                });
                return;
            }

            await timeEntryService.deleteEntry(id, employeeId);

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
            const { entryIds, pmUserId } = req.body;

            if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0 || !pmUserId) {
                res.status(400).json({
                    status: 'error',
                    message: 'entryIds (array) and pmUserId are required',
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
            const { entryIds, pmUserId, rejectionComment } = req.body;

            if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0 || !pmUserId) {
                res.status(400).json({
                    status: 'error',
                    message: 'entryIds (array) and pmUserId are required',
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
            const { pmUserId } = req.query;

            if (!pmUserId) {
                res.status(400).json({
                    status: 'error',
                    message: 'pmUserId query parameter is required',
                });
                return;
            }

            const entries = await timeEntryService.getPendingApprovalForPM(pmUserId as string);

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
