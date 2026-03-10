import { Request, Response, NextFunction } from 'express';
import { allocationService, CreateAllocationRequest, UpdateAllocationRequest } from './allocation.service';

export class AllocationController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const request: CreateAllocationRequest = {
                projectId: req.body.projectId,
                employeeId: req.body.employeeId,
                roleId: req.body.roleId,
                skillId: req.body.skillId,
                startDate: req.body.startDate,
                endDate: req.body.endDate,
                percentage: req.body.percentage,
                isAdminOverride: req.body.isAdminOverride,
                overrideReason: req.body.overrideReason,
                authorizedById: req.body.authorizedById,
            };

            const allocation = await allocationService.createAllocation(request);

            res.status(201).json({
                status: 'success',
                data: allocation,
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

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const request: UpdateAllocationRequest = {
                allocationId: req.params.id,
                percentage: req.body.percentage,
                startDate: req.body.startDate,
                endDate: req.body.endDate,
                skillId: req.body.skillId,
                isAdminOverride: req.body.isAdminOverride,
                overrideReason: req.body.overrideReason,
                authorizedById: req.body.authorizedById,
            };

            const allocation = await allocationService.updateAllocation(request);

            res.json({
                status: 'success',
                data: allocation,
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

    async rankEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { projectId, skill, startDate, endDate } = req.query;

            const rankedEmployees = await allocationService.rankEmployees({
                projectId: projectId as string,
                skillName: skill as string | undefined,
                startDate: startDate as string | undefined,
                endDate: endDate as string | undefined,
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

