import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  companyId: mongoose.Types.ObjectId;
  title: string;
  jobType: "Full time" | "Part time" | "Contract" | "Internship";
  description: string;
  requirements: {
    skills: string[];
  };
  location?: string;
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  preferedRank: "A" | "B" | "C" | "D" | "A and B" | "B and C" | "C and D";
  status: 'active' | 'closed' | 'draft';
  embedding?: number[];
  matches?: {
    graduateId: mongoose.Types.ObjectId;
    score: number;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema: Schema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    jobType: {
      type: String,
      enum: ['Full time', 'Part time', 'Contract', 'Internship'],
      required: true,
    },
    preferedRank: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'A and B', 'B and C', 'C and D'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    requirements: {
      skills: {
        type: [String],
        required: true,
      },
    },
    location: String,
    salary: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'USD',
      },
    },
    status: {
      type: String,
      enum: ['active', 'closed', 'draft'],
      default: 'active',
    },
    embedding: [Number],
    matches: [
      {
        graduateId: {
          type: Schema.Types.ObjectId,
          ref: 'Graduate',
        },
        score: Number,
        status: {
          type: String,
          enum: ['pending', 'accepted', 'rejected'],
          default: 'pending',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
JobSchema.index({ companyId: 1 });
JobSchema.index({ status: 1 });
JobSchema.index({ 'requirements.skills': 1 });
JobSchema.index({ location: 1 });
JobSchema.index({ 'salary.min': 1, 'salary.max': 1 });
JobSchema.index({ createdAt: -1 });
JobSchema.index({ companyId: 1, status: 1 }); // Compound index for company jobs by status

export default mongoose.model<IJob>('Job', JobSchema);

