import mongoose from 'mongoose';
import Notification, { INotification } from '../models/Notification.model';
import User from '../models/User.model';
import { sendEmail } from './email.service';

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

const maybeObjectId = (value?: ObjectIdLike): mongoose.Types.ObjectId | undefined => {
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

  return result.modifiedCount ?? 0;
};


