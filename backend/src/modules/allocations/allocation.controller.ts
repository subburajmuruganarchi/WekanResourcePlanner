import { Request, Response, NextFunction } from 'express';
import { allocationService, CreateAllocationRequest, UpdateAllocationRequest } from './allocation.service';
import { getAuthEmployeeId } from '../../common/utils/auth-user.util';
import { assertCanAssignToProject } from '../../common/utils/mvp-permissions.util';

export class AllocationController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const request: CreateAllocationRequest = {
                projectId: req.body.projectId,
                employeeId: req.body.employeeId,
                roleId: req.body.roleId,
                skillId: req.body.skillId,
                skillIds: req.body.skillIds,
                startDate: req.body.startDate,
                endDate: req.body.endDate,
                percentage: req.body.percentage,
                isAdminOverride: req.body.isAdminOverride,
                overrideReason: req.body.overrideReason,
                authorizedById: req.body.authorizedById,
            };

            try {
                await assertCanAssignToProject(
                    req.user?.role,
                    getAuthEmployeeId(req.user),
                    request.projectId
                );
            } catch (scopeError) {
                res.status(403).json({
                    status: 'error',
                    message: scopeError instanceof Error ? scopeError.message : 'Forbidden',
                });
                return;
            }

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
                skillIds: req.body.skillIds,
                isAdminOverride: req.body.isAdminOverride,
                overrideReason: req.body.overrideReason,
                authorizedById: req.body.authorizedById,
            };

            const existing = await allocationService.getAllocationProjectId(request.allocationId);
            if (existing) {
                try {
                    await assertCanAssignToProject(
                        req.user?.role,
                        getAuthEmployeeId(req.user),
                        existing
                    );
                } catch (scopeError) {
                    res.status(403).json({
                        status: 'error',
                        message: scopeError instanceof Error ? scopeError.message : 'Forbidden',
                    });
                    return;
                }
            }

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

