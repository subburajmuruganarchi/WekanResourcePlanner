import { Request, Response, NextFunction } from 'express';
import { resourceRequestService } from './resource-request.service';
import { AppError } from '../../common/errors/app-error';
import { getAuthEmployeeId } from '../../common/utils/auth-user.util';
import { ROLES } from '../../common/constants/roles';
import { normalizeRoleName } from '../../common/utils/role-normalize.util';
import type { ResourceRequestStatus } from './resource-request.model';

const REVIEW_ROLES = [ROLES.ADMIN, ROLES.DELIVERY_MANAGER, ROLES.CEO];

export class ResourceRequestController {
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = req.user;
            if (!user) {
                res.status(401).json({ status: 'error', message: 'Authentication required' });
                return;
            }

            const status = req.query.status as ResourceRequestStatus | undefined;
            const data = await resourceRequestService.list({
                role: user.role,
                employeeId: getAuthEmployeeId(user),
                status,
            });
            res.json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = req.user;
            const authEmployeeId = getAuthEmployeeId(user);
            if (!user || !authEmployeeId) {
                res.status(401).json({ status: 'error', message: 'Authentication required' });
                return;
            }

            const {
                projectId,
                employeeId,
                roleId,
                allocationPercent,
                startDate,
                endDate,
                justification,
            } = req.body;

            if (!projectId || !employeeId || !allocationPercent || !startDate || !endDate || !justification) {
                throw new AppError(
                    'projectId, employeeId, allocationPercent, startDate, endDate, and justification are required',
                    400
                );
            }

            const role = normalizeRoleName(user.role);
            if ((role === ROLES.EMPLOYEE || role === ROLES.USER) && employeeId !== authEmployeeId) {
                res.status(403).json({
                    status: 'error',
                    message: 'Employees can only request resources for themselves',
                });
                return;
            }

            const data = await resourceRequestService.create({
                projectId,
                employeeId,
                requestedById: authEmployeeId,
                roleId,
                allocationPercent: Number(allocationPercent),
                startDate,
                endDate,
                justification,
            });

            res.status(201).json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }

    async review(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = req.user;
            const reviewerId = getAuthEmployeeId(user);
            if (!user || !reviewerId) {
                res.status(401).json({ status: 'error', message: 'Authentication required' });
                return;
            }

            if (!REVIEW_ROLES.includes(normalizeRoleName(user.role) as (typeof REVIEW_ROLES)[number])) {
                res.status(403).json({ status: 'error', message: 'Only Delivery Managers and Admins can review requests' });
                return;
            }

            const { action, reviewNotes, createAllocation } = req.body;
            if (action !== 'approve' && action !== 'reject') {
                throw new AppError('action must be approve or reject', 400);
            }

            const data = await resourceRequestService.review(req.params.id, {
                action,
                reviewerId,
                reviewNotes,
                createAllocation,
            });

            res.json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }

    async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = req.user;
            const authEmployeeId = getAuthEmployeeId(user);
            if (!user || !authEmployeeId) {
                res.status(401).json({ status: 'error', message: 'Authentication required' });
                return;
            }

            const data = await resourceRequestService.cancel(req.params.id, authEmployeeId, user.role);
            res.json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }
}

export const resourceRequestController = new ResourceRequestController();
