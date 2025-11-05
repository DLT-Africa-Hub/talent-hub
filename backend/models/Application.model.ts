import mongoose, { Schema, Document } from 'mongoose';

export interface IApplication extends Document {
  graduateId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  matchId?: mongoose.Types.ObjectId;
  status: 'pending' | 'reviewed' | 'shortlisted' | 'interviewed' | 'accepted' | 'rejected' | 'withdrawn';
  coverLetter?: string;
  resume?: string;
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
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'shortlisted', 'interviewed', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending',
      required: true,
    },
    coverLetter: {
      type: String,
      required: false,
    },
    resume: {
      type: String,
      required: false,
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

