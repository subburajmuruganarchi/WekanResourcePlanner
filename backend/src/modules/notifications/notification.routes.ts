import express from 'express';
import { notificationController } from './notification.controller';

const router = express.Router();

// GET /api/notifications/:userId - Get recent notifications
router.get('/:userId', (req, res, next) => notificationController.getNotifications(req, res, next));

// PUT /api/notifications/:notificationId/read - Mark single notification as read
router.put('/:notificationId/read', (req, res, next) => notificationController.markAsRead(req, res, next));

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', (req, res, next) => notificationController.markAllAsRead(req, res, next));

export { router as notificationRouter };
