import { Request, Response, NextFunction } from 'express';
import { buildAuditCenter, buildHealthSummary, runSystemVerify } from './system.service';

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

    async auditCenter(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const limit = Math.min(Number(req.query.limit) || 50, 100);
            const data = await buildAuditCenter(limit);
            res.json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }
}

export const systemController = new SystemController();
