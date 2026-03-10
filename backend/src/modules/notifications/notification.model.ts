import { Document, Schema, Types, model } from 'mongoose';

export enum NotificationType {
    INFO = 'INFO',
    SUCCESS = 'SUCCESS',
    WARNING = 'WARNING',
    ERROR = 'ERROR'
}

export interface INotification extends Document {
    userId: Types.ObjectId;
    title: string;
    message: string;
    type: NotificationType;
    read: boolean;
    relatedData?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: Object.values(NotificationType), default: NotificationType.INFO },
    read: { type: Boolean, default: false, index: true },
    relatedData: { type: Schema.Types.Mixed }
}, { timestamps: true });

// Optimize query for fetching unread notifications for a user
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', NotificationSchema);
