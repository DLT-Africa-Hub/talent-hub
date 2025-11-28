import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type:
    | 'match'
    | 'application'
    | 'message'
    | 'system'
    | 'job_alert'
    | 'interview';
  title: string;
  message: string;
  relatedId?: mongoose.Types.ObjectId;
  relatedType?:
    | 'match'
    | 'job'
    | 'application'
    | 'company'
    | 'graduate'
    | 'interview';
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['match', 'application', 'message', 'system', 'job_alert', 'interview'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    relatedType: {
      type: String,
      enum: ['match', 'job', 'application', 'company', 'graduate', 'interview'],
      required: false,
    },
    read: {
      type: Boolean,
      default: false,
      required: true,
    },
    readAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ relatedId: 1, relatedType: 1 });

export default mongoose.model<INotification>(
  'Notification',
  NotificationSchema
);
