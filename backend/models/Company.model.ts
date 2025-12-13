import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  userId: mongoose.Types.ObjectId;
  companyName: string;
  industry: string;
  description: string;
  companySize: number;
  website?: string;
  location?: string;
  calendly?: {
    userUri?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    publicLink?: string;
    enabled: boolean;
    connectedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  postedJobs: number;
  hiredCandidates: Array<mongoose.Types.ObjectId>;
}

const CompanySchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    industry: {
      type: String,
      required: true,
    },
    companySize: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    website: {
      type: String,
    },
    location: {
      type: String,
    },
    calendly: {
      userUri: {
        type: String,
        required: false,
      },
      accessToken: {
        type: String,
        required: false,
        select: false,
      },
      refreshToken: {
        type: String,
        required: false,
        select: false,
      },
      tokenExpiresAt: {
        type: Date,
        required: false,
      },
      publicLink: {
        type: String,
        required: false,
      },
      enabled: {
        type: Boolean,
        default: false,
      },
      connectedAt: {
        type: Date,
        required: false,
      },
    },
    postedJobs: {
      type: Number,
    },
    hiredCandidates: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
CompanySchema.index({ industry: 1 });
CompanySchema.index({ companyName: 1 });
CompanySchema.index({ location: 1 });
CompanySchema.index({ createdAt: -1 });

export default mongoose.model<ICompany>('Company', CompanySchema);
