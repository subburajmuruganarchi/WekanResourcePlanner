import { Request, Response, NextFunction } from 'express';
import { buildHealthSummary, runSystemVerify } from './system.service';

export class SystemController {
    async healthSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await buildHealthSummary();
            res.json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }

    async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await runSystemVerify();
            res.json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }
}

export const systemController = new SystemController();
