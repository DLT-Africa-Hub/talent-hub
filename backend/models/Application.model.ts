import mongoose, { Schema, Document, Types } from 'mongoose';



export interface IApplication extends Document {
  graduateId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  matchId?: mongoose.Types.ObjectId;
  interviewId?: mongoose.Types.ObjectId;
  status:
    | 'pending'
    | 'reviewed'
    | 'shortlisted'
    | 'interviewed'
    | 'accepted'
    | 'rejected'
    | 'withdrawn';
  coverLetter?: string;
  resume?: {
    _id?: Types.ObjectId;
    fileName: string;
    fileUrl: string;
    size:number;
    publicId:any;
    onDisplay:boolean;
  };
  extraAnswers?: Record<string, string>; // Map of requirement label to answer
  interviewScheduledAt?: Date;
  interviewLink?: string;
  interviewRoomSlug?: string;
  appliedAt: Date;
  reviewedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema: Schema = new Schema(
  {
    graduateId: {
      type: Schema.Types.ObjectId,
      ref: 'Graduate',
      required: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    matchId: {
      type: Schema.Types.ObjectId,
      ref: 'Match',
      required: false,
    },
    interviewId: {
      type: Schema.Types.ObjectId,
      ref: 'Interview',
      required: false,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'reviewed',
        'shortlisted',
        'interviewed',
        'accepted',
        'rejected',
        'withdrawn',
      ],
      default: 'pending',
      required: true,
    },
    coverLetter: {
      type: String,
      required: false,
    },
    resume: {
      _id: {
        type: Schema.Types.ObjectId,
        required: false,
      },
      fileName: {
        type: String,
        required: false,
      },
      fileUrl: {
        type: String,
        required: false,
      },
      size: {
        type: Number,
        required: false,
      },
      publicId: {
        type: Schema.Types.Mixed, 
        required: false,
      },
      onDisplay: {
        type: Boolean,
        default: true,
      },
    },
    appliedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    reviewedAt: {
      type: Date,
      required: false,
    },
    notes: {
      type: String,
      required: false,
    },
    extraAnswers: {
      type: Map,
      of: String,
      required: false,
    },
    interviewScheduledAt: {
      type: Date,
      required: false,
    },
    interviewLink: {
      type: String,
      required: false,
    },
    interviewRoomSlug: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
ApplicationSchema.index({ graduateId: 1, jobId: 1 }, { unique: true });
ApplicationSchema.index({ jobId: 1, status: 1 });
ApplicationSchema.index({ graduateId: 1, status: 1 });
ApplicationSchema.index({ appliedAt: -1 });

export default mongoose.model<IApplication>('Application', ApplicationSchema);
