import mongoose, { Document, Schema } from 'mongoose';

export type InterviewStatus =
  | 'pending_selection'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface ISuggestedTimeSlot {
  _id?: mongoose.Types.ObjectId;
  date: Date;
  duration: number; // 15, 30, 45, or 60 minutes
  timezone: string; // e.g., 'America/New_York', 'UTC'
}

export interface ISelectedTimeSlot {
  date: Date;
  duration: number;
  timezone: string;
  selectedAt: Date;
}

export interface IInterview extends Document {
  applicationId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  companyUserId: mongoose.Types.ObjectId;
  graduateId: mongoose.Types.ObjectId;
  graduateUserId: mongoose.Types.ObjectId;
  // For backwards compatibility - used when time is confirmed
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
  // Multiple time slot support
  suggestedTimeSlots?: ISuggestedTimeSlot[];
  selectedTimeSlot?: ISelectedTimeSlot;
  companyTimezone?: string;
  graduateTimezone?: string;
  selectionDeadline?: Date; // Optional deadline for graduate to select a slot
  createdAt: Date;
  updatedAt: Date;
}

const SuggestedTimeSlotSchema = new Schema({
  date: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
    enum: [15, 30, 45, 60],
  },
  timezone: {
    type: String,
    required: true,
  },
}, { _id: true });

const SelectedTimeSlotSchema = new Schema({
  date: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
    enum: [15, 30, 45, 60],
  },
  timezone: {
    type: String,
    required: true,
  },
  selectedAt: {
    type: Date,
    required: true,
  },
}, { _id: false });

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
      required: function(this: IInterview) {
        // Only required when status is not pending_selection
        return this.status !== 'pending_selection';
      },
    },
    durationMinutes: {
      type: Number,
      default: 30,
      min: 15,
      max: 240,
    },
    status: {
      type: String,
      enum: ['pending_selection', 'scheduled', 'in_progress', 'completed', 'cancelled'],
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
    // Multiple time slot support
    suggestedTimeSlots: {
      type: [SuggestedTimeSlotSchema],
      default: undefined,
    },
    selectedTimeSlot: {
      type: SelectedTimeSlotSchema,
      default: undefined,
    },
    companyTimezone: {
      type: String,
    },
    graduateTimezone: {
      type: String,
    },
    selectionDeadline: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

InterviewSchema.index({ companyId: 1, scheduledAt: 1 });
InterviewSchema.index({ graduateId: 1, scheduledAt: 1 });
InterviewSchema.index({ status: 1, scheduledAt: 1 });
InterviewSchema.index({ graduateId: 1, status: 1 }); // For pending_selection queries
InterviewSchema.index({ selectionDeadline: 1, status: 1 }); // For deadline monitoring

export default mongoose.model<IInterview>('Interview', InterviewSchema);

