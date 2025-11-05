import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  userId: mongoose.Types.ObjectId;
  companyName: string;
  industry: string;
  description: string;
  website?: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
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
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
CompanySchema.index({ userId: 1 }, { unique: true });
CompanySchema.index({ industry: 1 });
CompanySchema.index({ companyName: 1 });
CompanySchema.index({ location: 1 });
CompanySchema.index({ createdAt: -1 });

export default mongoose.model<ICompany>('Company', CompanySchema);

