import mongoose, { Document, Schema } from 'mongoose';

export type InterviewStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface IInterview extends Document {
  applicationId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  companyUserId: mongoose.Types.ObjectId;
  graduateId: mongoose.Types.ObjectId;
  graduateUserId: mongoose.Types.ObjectId;
  scheduledAt: Date;
  durationMinutes: number;
  status: InterviewStatus;
  roomSlug: string;
  roomUrl: string;
  provider: 'jitsi';
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  startedAt?: Date;
  endedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema = new Schema<IInterview>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      unique: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    companyUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    graduateId: {
      type: Schema.Types.ObjectId,
      ref: 'Graduate',
      required: true,
    },
    graduateUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      default: 30,
      min: 15,
      max: 240,
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
      required: true,
    },
    roomSlug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    roomUrl: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      enum: ['jitsi'],
      default: 'jitsi',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    startedAt: Date,
    endedAt: Date,
    notes: String,
  },
  {
    timestamps: true,
  }
);

InterviewSchema.index({ companyId: 1, scheduledAt: 1 });
InterviewSchema.index({ graduateId: 1, scheduledAt: 1 });
InterviewSchema.index({ status: 1, scheduledAt: 1 });

export default mongoose.model<IInterview>('Interview', InterviewSchema);

