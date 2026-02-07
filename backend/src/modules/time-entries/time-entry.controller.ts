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

            const entries = await timeEntryService.getByEmployee(
                employeeId as string,
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
}

export const timeEntryController = new TimeEntryController();
