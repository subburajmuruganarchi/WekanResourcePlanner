import { Request, Response, NextFunction } from 'express';
import { notificationService } from './notification.service';
import { getAuthEmployeeId } from '../../common/utils/auth-user.util';

export class NotificationController {
    /**
     * GET /api/notifications/:userId
     */
    async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const authId = getAuthEmployeeId(req.user);
            const { userId } = req.params;
            if (authId && userId !== authId && req.user?.role !== 'Admin') {
                res.status(403).json({ status: 'error', message: 'Access denied.' });
                return;
            }
            const notifications = await notificationService.getUserNotifications(userId);
            res.json({ status: 'success', data: notifications });
        } catch (error) {
            if (error instanceof Error) {
                res.status(400).json({ status: 'error', message: error.message });
                return;
            }
            next(error);
        }
    }

    /**
     * PUT /api/notifications/:notificationId/read
     * Body: { userId: string }
     */
    async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { notificationId } = req.params;
            const authId = getAuthEmployeeId(req.user);
            const userId = (req.body.userId as string) || authId;

            if (!userId) {
                res.status(400).json({ status: 'error', message: 'userId is required' });
                return;
            }
            if (authId && userId !== authId && req.user?.role !== 'Admin') {
                res.status(403).json({ status: 'error', message: 'Access denied.' });
                return;
            }

            await notificationService.markAsRead(notificationId, userId);
            res.json({ status: 'success', message: 'Notification marked as read' });
        } catch (error) {
            if (error instanceof Error) {
                res.status(400).json({ status: 'error', message: error.message });
                return;
            }
            next(error);
        }
    }

    /**
     * PUT /api/notifications/read-all
     * Body: { userId: string }
     */
    async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const authId = getAuthEmployeeId(req.user);
            const userId = (req.body.userId as string) || authId;

            if (!userId) {
                res.status(400).json({ status: 'error', message: 'userId is required' });
                return;
            }
            if (authId && userId !== authId && req.user?.role !== 'Admin') {
                res.status(403).json({ status: 'error', message: 'Access denied.' });
                return;
            }

            await notificationService.markAllAsRead(userId);
            res.json({ status: 'success', message: 'All notifications marked as read' });
        } catch (error) {
            if (error instanceof Error) {
                res.status(400).json({ status: 'error', message: error.message });
                return;
            }
            next(error);
        }
    }
}

export const notificationController = new NotificationController();
