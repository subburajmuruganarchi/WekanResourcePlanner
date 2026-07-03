import { Request, Response, NextFunction } from 'express';
import { features } from '../../config/features';

export class ConfigController {
    async features(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            res.json({
                status: 'success',
                data: {
                    mvpMode: features.mvpMode,
                    timeEntryEnabled: features.timeEntryEnabled,
                    timesheetApprovalEnabled: features.timesheetApprovalEnabled,
                    weeklyAllocationsEnabled: features.weeklyAllocationsEnabled,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

export const configController = new ConfigController();
