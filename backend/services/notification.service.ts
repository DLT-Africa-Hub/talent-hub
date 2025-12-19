import mongoose from 'mongoose';
import Notification, { INotification } from '../models/Notification.model';
import User from '../models/User.model';
import { sendEmail } from './email.service';
import { io } from '..';
import { emitNewNotification, emitUnreadCountUpdate } from '../socket/socket';

type ObjectIdLike = mongoose.Types.ObjectId | string;

interface CreateNotificationEmailOptions {
  subject: string;
  text: string;
  html?: string;
}

interface CreateNotificationParams {
  userId: ObjectIdLike;
  type: INotification['type'];
  title: string;
  message: string;
  relatedId?: ObjectIdLike;
  relatedType?: INotification['relatedType'];
  email?: CreateNotificationEmailOptions;
}

const toObjectId = (value: ObjectIdLike): mongoose.Types.ObjectId =>
  typeof value === 'string' ? new mongoose.Types.ObjectId(value) : value;

const maybeObjectId = (
  value?: ObjectIdLike
): mongoose.Types.ObjectId | undefined => {
  if (!value) {
    return undefined;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }

  return undefined;
};

export const createNotification = async ({
  userId,
  type,
  title,
  message,
  relatedId,
  relatedType,
  email,
}: CreateNotificationParams): Promise<INotification> => {
  const resolvedUserId = toObjectId(userId);

  const notification = await Notification.create({
    userId: resolvedUserId,
    type,
    title,
    message,
    relatedId: maybeObjectId(relatedId),
    relatedType,
  });

  // Convert to plain object and transform IDs
  const notificationData = {
    ...notification.toObject(),
    id: (notification._id as mongoose.Types.ObjectId).toString(),
    userId: notification.userId.toString(),
    relatedId: notification.relatedId
      ? notification.relatedId.toString()
      : null,
  };

  // Emit real-time notification via Socket.IO
  try {
    emitNewNotification(io, resolvedUserId.toString(), notificationData);

    // Also emit updated unread count
    const unreadCount = await Notification.countDocuments({
      userId: resolvedUserId,
      read: false,
    });

    emitUnreadCountUpdate(io, resolvedUserId.toString(), {
      notifications: unreadCount,
      messages: 0, // You can fetch message count here if needed
    });
  } catch (error) {
    console.error('Failed to emit notification via socket:', error);
  }

  // Send email notification if requested
  if (email) {
    try {
      const user = await User.findById(resolvedUserId).select('email').lean();

      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });
      }
    } catch (error) {
      console.error('Failed to send notification email:', error);
    }
  }

  return notification;
};

export const markNotificationAsRead = async (
  userId: ObjectIdLike,
  notificationId: ObjectIdLike
): Promise<INotification | null> => {
  const resolvedUserId = toObjectId(userId);
  const resolvedNotificationId = toObjectId(notificationId);

  const notification = await Notification.findOneAndUpdate(
    { _id: resolvedNotificationId, userId: resolvedUserId },
    {
      $set: {
        read: true,
        readAt: new Date(),
      },
    },
    { new: true }
  );

  // Emit updated unread count via Socket.IO
  if (notification) {
    try {
      const unreadCount = await Notification.countDocuments({
        userId: resolvedUserId,
        read: false,
      });

      emitUnreadCountUpdate(io, resolvedUserId.toString(), {
        notifications: unreadCount,
        messages: 0, // You can fetch message count here if needed
      });
    } catch (error) {
      console.error('Failed to emit unread count update:', error);
    }
  }

  return notification;
};

export const markAllNotificationsAsRead = async (
  userId: ObjectIdLike
): Promise<number> => {
  const resolvedUserId = toObjectId(userId);
  const result = await Notification.updateMany(
    { userId: resolvedUserId, read: false },
    {
      $set: {
        read: true,
        readAt: new Date(),
      },
    }
  );

  // Emit updated unread count (should be 0 now)
  try {
    emitUnreadCountUpdate(io, resolvedUserId.toString(), {
      notifications: 0,
      messages: 0, // You can fetch message count here if needed
    });
  } catch (error) {
    console.error('Failed to emit unread count update:', error);
  }

  return result.modifiedCount ?? 0;
};
