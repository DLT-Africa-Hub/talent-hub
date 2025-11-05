import mongoose, { Schema, Document } from 'mongoose';

export interface IMatch extends Document {
  graduateId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  score: number;
  status: 'pending' | 'accepted' | 'rejected';
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MatchSchema: Schema = new Schema(
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
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    feedback: String,
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
MatchSchema.index({ graduateId: 1, jobId: 1 }, { unique: true });

export default mongoose.model<IMatch>('Match', MatchSchema);

