import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Notification, { INotification } from '../models/Notification.model';
import { markAllNotificationsAsRead, markNotificationAsRead } from '../services/notification.service';

const MAX_LIMIT = 50;

const toObjectId = (value: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId =>
    typeof value === 'string' ? new mongoose.Types.ObjectId(value) : value;

const isValidIsoDate = (value: string): boolean => {
    const date = new Date(value);
    return !Number.isNaN(date.valueOf());
};

type NotificationSerializable = Pick<
    INotification,
    'type' | 'title' | 'message' | 'read' | 'readAt' | 'createdAt' | 'updatedAt' | 'relatedType'
> & {
    _id: unknown;
    relatedId?: unknown;
};

const toNotificationId = (value: unknown): string => {
    if (value instanceof mongoose.Types.ObjectId) {
        return value.toHexString();
    }
    return String(value);
};

const serializeNotification = (notification: NotificationSerializable) => ({
    id: toNotificationId(notification._id),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    readAt: notification.readAt ?? null,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
    relatedId: notification.relatedId?.toString() ?? null,
    relatedType: notification.relatedType ?? null,
});

export const listNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const { limit = '20', after, unreadOnly } = req.query;

        const parsedLimit = Math.min(
            Math.max(Number.parseInt(limit as string, 10) || 20, 1),
            MAX_LIMIT
        );

        const filter: Record<string, unknown> = {
            userId: toObjectId(userId),
        };

        if (typeof unreadOnly === 'string' && unreadOnly.toLowerCase() === 'true') {
            filter.read = false;
        }

        if (after) {
            if (typeof after !== 'string' || !isValidIsoDate(after)) {
                res.status(400).json({ message: 'Invalid "after" parameter. Use ISO 8601 format.' });
                return;
            }

            filter.createdAt = { $gt: new Date(after) };
        }

        const notifications = await Notification.find(filter)
            .sort({ createdAt: -1 })
            .limit(parsedLimit)
            .lean();

        res.json({
            notifications: notifications.map((notification) =>
                serializeNotification(notification as NotificationSerializable)
            ),
            meta: {
                limit: parsedLimit,
                count: notifications.length,
                hasMore: notifications.length === parsedLimit,
            },
        });
    } catch (error) {
        console.error('List notifications error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getUnreadNotificationCount = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const count = await Notification.countDocuments({
            userId: toObjectId(userId),
            read: false,
        });

        res.json({ count });
    } catch (error) {
        console.error('Get unread notification count error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const markNotificationRead = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const { notificationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            res.status(400).json({ message: 'Invalid notificationId' });
            return;
        }

        const notification = await markNotificationAsRead(userId, notificationId);

        if (!notification) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }

        res.json({
            notification: serializeNotification(notification),
        });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const markAllNotificationsRead = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const updatedCount = await markAllNotificationsAsRead(userId);

        res.json({
            updatedCount,
        });
    } catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


