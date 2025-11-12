import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose';

export interface IEducationDetails {
  degree: string;
  field: string;
  institution: string;
  graduationYear: number;
}

export interface IWorkExperience {
  _id?: Types.ObjectId;
  company: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
}

export interface IGraduate {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
  skills: string[];
  education: IEducationDetails;
  interests: string[];
  socials?: {
    github?: string;
    twitter?: string;
    linkedin?: string;
  };
  portfolio?: string;
  workExperiences: IWorkExperience[];
  assessmentData?: {
    submittedAt: Date;
    embedding?: number[];
    feedback?: string;
  };
  rank?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type GraduateDocument = HydratedDocument<IGraduate>;

type GraduateModel = Model<IGraduate>;

const GraduateSchema: Schema<IGraduate, GraduateModel> = new Schema(
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
    profilePictureUrl: {
      type: String,
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
    workExperiences: {
      type: [
        {
          company: {
            type: String,
            required: true,
          },
          title: {
            type: String,
            required: true,
          },
          startDate: {
            type: Date,
            required: true,
          },
          endDate: {
            type: Date,
          },
          description: {
            type: String,
          },
        },
      ],
      default: [],
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
GraduateSchema.index({ 'education.field': 1 });
GraduateSchema.index({ skills: 1 });
GraduateSchema.index({ rank: 1 });
GraduateSchema.index({ 'assessmentData.submittedAt': -1 });
GraduateSchema.index({ createdAt: -1 });

export default mongoose.model<IGraduate, GraduateModel>('Graduate', GraduateSchema);

