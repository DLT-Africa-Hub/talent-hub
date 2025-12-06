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
  current?: boolean;
}

export interface IAssessmentQuestion {
  question: string;
  options: string[];
  answer: string;
  skill?: string;
}

export interface ICv {
  _id?: Types.ObjectId;
  fileName: string;
  fileUrl: string;
  size: number;
  publicId: string;
  onDisplay: boolean;
}

export interface IGraduate {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  firstName: string;
  lastName: string;
  phoneNumber: number;
  expLevel: 'entry level' | 'mid level' | 'senior level';
  expYears: number;
  position:
    | 'frontend developer'
    | 'backend developer'
    | 'fullstack developer'
    | 'mobile developer'
    | 'devops engineer'
    | 'data engineer'
    | 'security engineer'
    | 'other';
  profilePictureUrl?: string;
  location?: string;
  salaryPerAnnum?: number; // Expected salary per annum
  skills: string[];
  education: IEducationDetails;
  interests: string[];
  socials?: {
    github?: string;
    twitter?: string;
    linkedin?: string;
  };
  portfolio?: string;
  summary?: string;
  cv?: ICv[]; // URL to CV/resume file
  workExperiences: IWorkExperience[];
  assessmentData?: {
    submittedAt: Date;
    embedding?: number[];
    feedback?: string;
    attempts?: number;
    needsRetake?: boolean;
    lastScore?: number;
    questionSetVersion?: number;
    currentQuestions?: IAssessmentQuestion[];
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
    phoneNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    expLevel: {
      type: String,
      enum: ['entry level', 'mid level', 'senior level'],
      required: true,
    },
    expYears: {
      type: Number,
      required: true,
    },
    position: {
      type: String,
      enum: [
        'frontend developer',
        'backend developer',
        'fullstack developer',
        'mobile developer',
        'devops engineer',
        'data engineer',
        'security engineer',
        'other',
      ],
      required: true,
    },
    profilePictureUrl: {
      type: String,
    },
    location: {
      type: String,
      required: false,
    },
    salaryPerAnnum: {
      type: Number,
      required: false,
      min: 0,
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
    summary: {
      type: String,
      required: false,
    },
    cv: {
      type: [
        {
          fileName: {
            type: String,
            required: true,
          },
          fileUrl: {
            type: String,
            required: true,
          },
          size: {
            type: Number,
            required: true,
          },
          publicId: {
            type: String,
            required: false,
          },
          onDisplay: {
            type: Boolean,
          },
        },
      ],
      default: [],
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
          current: {
            type: Boolean,
          },
        },
      ],
      default: [],
    },
    assessmentData: {
      submittedAt: Date,
      embedding: [Number],
      feedback: String,
      attempts: {
        type: Number,
        default: 0,
      },
      needsRetake: {
        type: Boolean,
        default: false,
      },
      lastScore: Number,
      questionSetVersion: {
        type: Number,
        default: 1,
      },
      currentQuestions: {
        type: [
          {
            question: {
              type: String,
              required: true,
              trim: true,
            },
            options: {
              type: [String],
              required: true,
              validate: {
                validator: (value: unknown[]): boolean =>
                  Array.isArray(value) && value.length > 0,
                message: 'Each question must include at least one option',
              },
            },
            answer: {
              type: String,
              required: true,
              trim: true,
            },
            skill: {
              type: String,
              required: false,
              trim: true,
            },
          },
        ],
      },
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

export default mongoose.model<IGraduate, GraduateModel>(
  'Graduate',
  GraduateSchema
);
