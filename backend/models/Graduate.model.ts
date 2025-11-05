import mongoose, { Schema, Document } from 'mongoose';

export interface IGraduate extends Document {
  userId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  skills: string[];
  education: {
    degree: string;
    field: string;
    institution: string;
    graduationYear: number;
  };
  interests: string[];
  socials?: {
    github?: string;
    twitter?: string;
    linkedin?: string;
  };
  portfolio?: string;
  assessmentData?: {
    submittedAt: Date;
    embedding?: number[];
    feedback?: string;
  };
  rank?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GraduateSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    education: {
      degree: {
        type: String,
        required: true,
      },
      field: {
        type: String,
        required: true,
      },
      institution: {
        type: String,
        required: true,
      },
      graduationYear: {
        type: Number,
        required: true,
      },
    },
    interests: {
      type: [String],
      default: [],
    },
    socials: {
      github: {
        type: String,
        required: false, // OAuth connected
      },
      twitter: {
        type: String,
        required: false, // OAuth connected
      },
      linkedin: {
        type: String,
        required: false, // OAuth connected
      },
    },
    portfolio: {
      type: String,
      required: false, // Manual URL input
    },
    assessmentData: {
      submittedAt: Date,
      embedding: [Number],
      feedback: String,
    },
    rank: {
      type: String,
      required: false, // Updated after assessment completion
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
GraduateSchema.index({ userId: 1 }, { unique: true });
GraduateSchema.index({ 'education.field': 1 });
GraduateSchema.index({ skills: 1 });
GraduateSchema.index({ rank: 1 });
GraduateSchema.index({ 'assessmentData.submittedAt': -1 });
GraduateSchema.index({ createdAt: -1 });

export default mongoose.model<IGraduate>('Graduate', GraduateSchema);

