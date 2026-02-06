import { Request, Response, NextFunction } from 'express';
import { allocationService } from './allocation.service';

export class AllocationController {
    async rankEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { projectId, skill } = req.query;

            const rankedEmployees = await allocationService.rankEmployees({
                projectId: projectId as string,
                skillName: skill as string | undefined,
            });

            res.json({
                status: 'success',
                data: rankedEmployees,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const allocationController = new AllocationController();
