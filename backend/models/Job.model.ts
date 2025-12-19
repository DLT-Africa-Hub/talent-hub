import mongoose, { Schema, Document } from 'mongoose';

export interface ExtraRequirement {
  label: string;
  type: 'text' | 'url' | 'textarea';
  required: boolean;
  placeholder?: string;
}

export interface InterviewStage {
  title: string;
  description?: string;
}

export interface IJob extends Document {
  companyId: mongoose.Types.ObjectId;
  title: string;
  jobType: 'Full time' | 'Part time' | 'Contract' | 'Internship';
  description: string; // Rich text HTML content
  requirements: {
    skills: string[];
    extraRequirements?: ExtraRequirement[];
  };
  location?: string;
  salary?: {
    amount: number;
    currency: string;
  };
  preferedRank: 'A' | 'B' | 'C' | 'D' | 'A and B' | 'B and C' | 'C and D';
  status: 'active' | 'closed' | 'draft';
  directContact: boolean; // true = company handles directly, false = DLT Africa (admin) handles
  interviewStages: 1 | 2 | 3; // Number of interview stages (1, 2, or 3)
  interviewStageTitles?: string[]; // DEPRECATED: Use interviewStageDetails instead. Titles for each interview stage (length must match interviewStages)
  interviewStageDetails?: InterviewStage[]; // Details for each interview stage (title + description, length must match interviewStages)
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
      extraRequirements: [
        {
          label: {
            type: String,
            required: true,
          },
          type: {
            type: String,
            enum: ['text', 'url', 'textarea'],
            required: true,
          },
          required: {
            type: Boolean,
            default: false,
          },
          placeholder: {
            type: String,
            required: false,
          },
        },
      ],
    },
    location: String,
    salary: {
      amount: Number,
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
    directContact: {
      type: Boolean,
      default: true, // Default to direct contact
      required: true,
    },
    interviewStages: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
      required: true,
    },
    interviewStageTitles: {
      type: [String],
      validate: {
        validator: function (this: IJob, titles: string[] | undefined) {
          if (!titles || titles.length === 0) return true; // Optional, can be set later
          return titles.length === this.interviewStages;
        },
        message:
          'Number of stage titles must match the number of interview stages',
      },
    },
    interviewStageDetails: {
      type: [
        {
          title: {
            type: String,
            required: true,
          },
          description: {
            type: String,
            required: false,
          },
        },
      ],
      validate: {
        validator: function (
          this: IJob,
          details: InterviewStage[] | undefined
        ) {
          if (!details || details.length === 0) return true; // Optional, can be set later
          return details.length === this.interviewStages;
        },
        message:
          'Number of stage details must match the number of interview stages',
      },
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
JobSchema.index({ 'salary.amount': 1 });
JobSchema.index({ createdAt: -1 });
JobSchema.index({ companyId: 1, status: 1 }); // Compound index for company jobs by status

export default mongoose.model<IJob>('Job', JobSchema);
