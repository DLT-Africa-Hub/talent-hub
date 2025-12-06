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
  duration: number;
  timezone: string;
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
  scheduledAt: Date;
  durationMinutes: number;
  status: InterviewStatus;
  roomSlug: string;
  roomUrl: string;
  provider: 'stream';
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  startedAt?: Date;
  endedAt?: Date;
  notes?: string;
  suggestedTimeSlots?: ISuggestedTimeSlot[];
  selectedTimeSlot?: ISelectedTimeSlot;
  companyTimezone?: string;
  graduateTimezone?: string;
  selectionDeadline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const isValidTimezone = (tz: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const SuggestedTimeSlotSchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
      validate: {
        validator: function (value: Date) {
          return value > new Date();
        },
        message: 'Time slot date must be in the future',
      },
    },
    duration: {
      type: Number,
      required: true,
      enum: {
        values: [15, 30, 45, 60],
        message: 'Duration must be 15, 30, 45, or 60 minutes',
      },
    },
    timezone: {
      type: String,
      required: true,
      validate: {
        validator: isValidTimezone,
        message: 'Invalid timezone',
      },
    },
  },
  { _id: true }
);

const SelectedTimeSlotSchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      enum: {
        values: [15, 30, 45, 60],
        message: 'Duration must be 15, 30, 45, or 60 minutes',
      },
    },
    timezone: {
      type: String,
      required: true,
      validate: {
        validator: isValidTimezone,
        message: 'Invalid timezone',
      },
    },
    selectedAt: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

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
      required: function (this: IInterview) {
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
      enum: [
        'pending_selection',
        'scheduled',
        'in_progress',
        'completed',
        'cancelled',
      ],
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
      enum: ['stream'],
      default: 'stream',
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
