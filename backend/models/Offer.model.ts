import mongoose, { Schema, Document } from 'mongoose';

export type OfferStatus =
  | 'pending'
  | 'signed'
  | 'accepted'
  | 'rejected'
  | 'expired';

export interface IOffer extends Document {
  applicationId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  graduateId: mongoose.Types.ObjectId;
  status: OfferStatus;

  // Offer details
  jobTitle: string;
  jobType: string;
  location?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  startDate?: Date;
  benefits?: string[];

  // Document management
  offerDocumentUrl?: string; // Original offer PDF
  signedDocumentUrl?: string; // Signed offer PDF uploaded by graduate
  signedDocumentFileName?: string;

  // Dates
  sentAt: Date;
  signedAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  expiresAt?: Date;

  // Metadata
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OfferSchema = new Schema<IOffer>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      unique: true, // One offer per application
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    graduateId: {
      type: Schema.Types.ObjectId,
      ref: 'Graduate',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'signed', 'accepted', 'rejected', 'expired'],
      default: 'pending',
      required: true,
    },
    jobTitle: {
      type: String,
      required: true,
    },
    jobType: {
      type: String,
      required: true,
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
    startDate: Date,
    benefits: [String],
    offerDocumentUrl: String,
    signedDocumentUrl: String,
    signedDocumentFileName: String,
    sentAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    signedAt: Date,
    acceptedAt: Date,
    rejectedAt: Date,
    expiresAt: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
OfferSchema.index({ applicationId: 1 }, { unique: true });
OfferSchema.index({ graduateId: 1, status: 1 });
OfferSchema.index({ companyId: 1, status: 1 });
OfferSchema.index({ expiresAt: 1 });

export default mongoose.model<IOffer>('Offer', OfferSchema);
