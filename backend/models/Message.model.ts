import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId; // User ID
  receiverId: mongoose.Types.ObjectId; // User ID
  applicationId?: mongoose.Types.ObjectId; // Related application (for context)
  offerId?: mongoose.Types.ObjectId; // Related offer (if message is about offer)
  message: string;
  type: 'text' | 'offer' | 'file';
  fileUrl?: string;
  fileName?: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: false,
    },
    offerId: {
      type: Schema.Types.ObjectId,
      ref: 'Offer',
      required: false,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'offer', 'file'],
      default: 'text',
      required: true,
    },
    fileUrl: String,
    fileName: String,
    read: {
      type: Boolean,
      default: false,
      required: true,
    },
    readAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
MessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
MessageSchema.index({ applicationId: 1 });
MessageSchema.index({ offerId: 1 });
MessageSchema.index({ receiverId: 1, read: 1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
