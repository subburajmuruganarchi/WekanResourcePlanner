import { Types } from 'mongoose';
import { Notification, NotificationType, INotification } from './notification.model';

export class NotificationService {
    /**
     * Create a new notification for a user
     */
    async createNotification(
        userId: string,
        title: string,
        message: string,
        type: NotificationType = NotificationType.INFO,
        relatedData?: Record<string, any>
    ): Promise<void> {
        if (!Types.ObjectId.isValid(userId)) {
            console.error(`Invalid userId ${userId} for notification`);
            return;
        }

        try {
            await Notification.create({
                userId: new Types.ObjectId(userId),
                title,
                message,
                type,
                relatedData
            });
        } catch (error) {
            console.error('Failed to create notification:', error);
        }
    }

    /**
     * Get recent notifications for a user (limit 50)
     */
    async getUserNotifications(userId: string): Promise<any[]> {
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        const notifications = await Notification.find({ userId: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        return notifications.map(n => ({
            id: n._id.toString(),
            title: n.title,
            message: n.message,
            type: n.type,
            read: n.read,
            relatedData: n.relatedData,
            createdAt: n.createdAt.toISOString()
        }));
    }

    /**
     * Mark a specific notification as read
     */
    async markAsRead(notificationId: string, userId: string): Promise<void> {
        if (!Types.ObjectId.isValid(notificationId) || !Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid ID(s)');
        }

        await Notification.updateOne(
            { _id: new Types.ObjectId(notificationId), userId: new Types.ObjectId(userId) },
            { $set: { read: true } }
        );
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string): Promise<void> {
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        await Notification.updateMany(
            { userId: new Types.ObjectId(userId), read: false },
            { $set: { read: true } }
        );
    }
}

export const notificationService = new NotificationService();
