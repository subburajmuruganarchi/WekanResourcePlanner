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
            // Return validation errors with 400 status
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
}

export const timeEntryController = new TimeEntryController();
