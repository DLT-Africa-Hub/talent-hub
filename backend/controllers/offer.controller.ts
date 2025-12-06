import { Request, Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import Offer from '../models/Offer.model';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
import Application from '../models/Application.model';
import Graduate from '../models/Graduate.model';
import Company from '../models/Company.model';
import Job from '../models/Job.model';
import { createNotification } from '../services/notification.service';

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

/**
 * Get offer by application ID
 * GET /api/graduates/offers/:applicationId
 */
export const getOffer = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { applicationId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    res.status(400).json({ message: 'Invalid application ID' });
    return;
  }

  const graduate = await Graduate.findOne({ userId }).lean();
  if (!graduate) {
    res.status(404).json({ message: 'Graduate profile not found' });
    return;
  }

  const offer = await Offer.findOne({
    applicationId: new mongoose.Types.ObjectId(applicationId),
    graduateId: graduate._id,
  })
    .populate({
      path: 'jobId',
      select: 'title location jobType',
      populate: {
        path: 'companyId',
        select: 'companyName',
      },
    })
    .lean();

  if (!offer) {
    res.status(404).json({ message: 'Offer not found' });
    return;
  }

  res.json({ offer });
};

/**
 * Get offer by offer ID (for graduates)
 * GET /api/graduates/offers/by-id/:offerId
 */
export const getOfferById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { offerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(offerId)) {
    res.status(400).json({ message: 'Invalid offer ID' });
    return;
  }

  const graduate = await Graduate.findOne({ userId }).lean();
  if (!graduate) {
    res.status(404).json({ message: 'Graduate profile not found' });
    return;
  }

  const offer = await Offer.findOne({
    _id: new mongoose.Types.ObjectId(offerId),
    graduateId: graduate._id,
  })
    .populate({
      path: 'jobId',
      select: 'title location jobType',
      populate: {
        path: 'companyId',
        select: 'companyName',
      },
    })
    .lean();

  if (!offer) {
    res.status(404).json({ message: 'Offer not found' });
    return;
  }

  res.json({ offer });
};

/**
 * Get offer by offer ID (for companies)
 * GET /api/companies/offers/by-id/:offerId
 */
export const getOfferByIdForCompany = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { offerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(offerId)) {
    res.status(400).json({ message: 'Invalid offer ID' });
    return;
  }

  const company = await Company.findOne({ userId }).lean();
  if (!company) {
    res.status(404).json({ message: 'Company profile not found' });
    return;
  }

  const offer = await Offer.findOne({
    _id: new mongoose.Types.ObjectId(offerId),
    companyId: company._id,
  })
    .populate({
      path: 'jobId',
      select: 'title location jobType',
      populate: {
        path: 'companyId',
        select: 'companyName',
      },
    })
    .lean();

  if (!offer) {
    res.status(404).json({ message: 'Offer not found' });
    return;
  }

  res.json({ offer });
};

/**
 * Upload signed offer document
 * POST /api/graduates/offers/:offerId/upload-signed
 */
export const uploadSignedOffer = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { offerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(offerId)) {
    res.status(400).json({ message: 'Invalid offer ID' });
    return;
  }

  const graduate = await Graduate.findOne({ userId });
  if (!graduate) {
    res.status(404).json({ message: 'Graduate profile not found' });
    return;
  }

  const offer = await Offer.findOne({
    _id: offerId,
    graduateId: graduate._id,
  });

  if (!offer) {
    res.status(404).json({ message: 'Offer not found' });
    return;
  }

  if (offer.status !== 'pending') {
    res.status(400).json({
      message:
        'Offer has already been processed. Cannot upload signed document.',
    });
    return;
  }

  // Handle file upload
  upload.single('signedOffer')(req, res, async (err) => {
    if (err) {
      res.status(400).json({ message: err.message });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    try {
      // Upload to Cloudinary
      const uploadResult = await new Promise<{
        secure_url: string;
        public_id: string;
      }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'raw',
            folder: 'signed-offers',
            public_id: `signed-offer-${offerId}-${Date.now()}`,
            format: 'pdf',
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve({
                secure_url: result.secure_url,
                public_id: result.public_id as string,
              });
            } else {
              reject(new Error('Upload failed'));
            }
          }
        );
        uploadStream.end(file.buffer);
      });

      // Update offer - when signed document is uploaded, set status to 'signed'
      offer.signedDocumentUrl = uploadResult.secure_url;
      offer.signedDocumentFileName = file.originalname;
      offer.status = 'signed';
      offer.signedAt = new Date();
      offer.updatedBy = new mongoose.Types.ObjectId(userId);
      await offer.save();

      // Notify company
      const company = await Company.findById(offer.companyId).lean();
      const job = await Application.findById(offer.applicationId)
        .populate({
          path: 'jobId',
          select: 'title',
        })
        .lean();

      interface PopulatedApplication {
        jobId?: { title?: string } | mongoose.Types.ObjectId;
      }
      const populatedJob = job as PopulatedApplication | null;
      const jobTitle =
        populatedJob?.jobId &&
        typeof populatedJob.jobId === 'object' &&
        'title' in populatedJob.jobId
          ? populatedJob.jobId.title
          : undefined;

      if (company?.userId) {
        await createNotification({
          userId: company.userId.toString(),
          type: 'application',
          title: 'Offer Signed',
          message: `${graduate.firstName} ${graduate.lastName} has signed the offer for ${jobTitle || 'the position'}. Please confirm the hire in the chat.`,
          relatedId:
            offer._id instanceof mongoose.Types.ObjectId
              ? offer._id
              : new mongoose.Types.ObjectId(String(offer._id)),
          relatedType: 'application',
        });
      }

      res.json({
        message:
          'Signed offer uploaded successfully. Waiting for company confirmation.',
        offer: {
          id: offer._id as mongoose.Types.ObjectId,
          status: offer.status,
          signedDocumentUrl: offer.signedDocumentUrl,
          signedAt: offer.signedAt,
        },
      });
    } catch (error) {
      console.error('Upload signed offer error:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to upload signed offer';
      res.status(500).json({
        message: errorMessage,
      });
    }
  });
};

/**
 * Accept offer (after signing)
 * POST /api/graduates/offers/:offerId/accept
 */
export const acceptOffer = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { offerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(offerId)) {
    res.status(400).json({ message: 'Invalid offer ID' });
    return;
  }

  const graduate = await Graduate.findOne({ userId });
  if (!graduate) {
    res.status(404).json({ message: 'Graduate profile not found' });
    return;
  }

  const offer = await Offer.findOne({
    _id: offerId,
    graduateId: graduate._id,
  });

  if (!offer) {
    res.status(404).json({ message: 'Offer not found' });
    return;
  }

  if (offer.status !== 'signed') {
    res.status(400).json({
      message:
        'Offer must be signed before acceptance. Please upload the signed document first.',
    });
    return;
  }

  // Update offer status
  offer.status = 'accepted';
  offer.acceptedAt = new Date();
  offer.updatedBy = new mongoose.Types.ObjectId(userId);
  await offer.save();

  // Update application status to 'hired'
  const application = await Application.findById(offer.applicationId);
  if (application) {
    application.status = 'hired';
    await application.save();
  }

  // Close the job so others can't apply
  const job = await Job.findById(offer.jobId);
  if (job) {
    job.status = 'closed';
    await job.save();
  }

  // Notify company
  const company = await Company.findById(offer.companyId).lean();
  const populatedApplication = await Application.findById(offer.applicationId)
    .populate({
      path: 'jobId',
      select: 'title',
    })
    .lean();

  interface PopulatedApplication {
    jobId?: { title?: string } | mongoose.Types.ObjectId;
  }
  const populatedApp = populatedApplication as PopulatedApplication | null;
  const jobTitle =
    populatedApp?.jobId &&
    typeof populatedApp.jobId === 'object' &&
    'title' in populatedApp.jobId
      ? populatedApp.jobId.title
      : undefined;

  if (company?.userId) {
    await createNotification({
      userId: company.userId.toString(),
      type: 'application',
      title: 'Offer Accepted',
      message: `Congratulations! ${graduate.firstName} ${graduate.lastName} has accepted the offer for ${jobTitle || 'the position'}. The job posting has been closed.`,
      relatedId:
        offer._id instanceof mongoose.Types.ObjectId
          ? offer._id
          : new mongoose.Types.ObjectId(String(offer._id)),
      relatedType: 'application',
      email: {
        subject: `Offer Accepted: ${jobTitle || 'Position'}`,
        text: `${graduate.firstName} ${graduate.lastName} has accepted your offer.`,
      },
    });
  }

  res.json({
    message: 'Offer accepted successfully',
    offer: {
      id: (offer._id instanceof mongoose.Types.ObjectId
        ? offer._id
        : new mongoose.Types.ObjectId(String(offer._id))
      ).toString(),
      status: offer.status,
      acceptedAt: offer.acceptedAt,
    },
    application: application
      ? {
          id: (application._id instanceof mongoose.Types.ObjectId
            ? application._id
            : new mongoose.Types.ObjectId(String(application._id))
          ).toString(),
          status: application.status,
        }
      : null,
  });
};

/**
 * Company confirms hire (after graduate uploads signed offer)
 * POST /api/companies/offers/:offerId/confirm-hire
 */
export const confirmHire = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { offerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(offerId)) {
    res.status(400).json({ message: 'Invalid offer ID' });
    return;
  }

  const company = await Company.findOne({ userId }).lean();
  if (!company) {
    res.status(404).json({ message: 'Company profile not found' });
    return;
  }

  const offer = await Offer.findOne({
    _id: offerId,
    companyId: company._id,
  });

  if (!offer) {
    res.status(404).json({ message: 'Offer not found' });
    return;
  }

  if (offer.status !== 'signed') {
    res.status(400).json({
      message:
        'Offer must be signed by the graduate before you can confirm the hire.',
    });
    return;
  }

  // Update offer status to accepted
  offer.status = 'accepted';
  offer.acceptedAt = new Date();
  offer.updatedBy = new mongoose.Types.ObjectId(userId);
  await offer.save();

  // Update application status to 'hired'
  const application = await Application.findById(offer.applicationId);
  if (application) {
    application.status = 'hired';
    await application.save();
  }

  // Close the job so others can't apply
  const job = await Job.findById(offer.jobId);
  if (job) {
    job.status = 'closed';
    await job.save();
  }

  // Notify graduate
  const graduate = await Graduate.findById(offer.graduateId).lean();
  const populatedApplication = await Application.findById(offer.applicationId)
    .populate({
      path: 'jobId',
      select: 'title',
    })
    .lean();

  interface PopulatedApplication {
    jobId?: { title?: string } | mongoose.Types.ObjectId;
  }
  const populatedApp = populatedApplication as PopulatedApplication | null;
  const jobTitle =
    populatedApp?.jobId &&
    typeof populatedApp.jobId === 'object' &&
    'title' in populatedApp.jobId
      ? populatedApp.jobId.title
      : undefined;

  if (graduate?.userId) {
    await createNotification({
      userId: graduate.userId.toString(),
      type: 'application',
      title: 'Hire Confirmed',
      message: `Congratulations! ${company.companyName} has confirmed your hire for ${jobTitle || 'the position'}. Welcome to the team!`,
      relatedId:
        offer._id instanceof mongoose.Types.ObjectId
          ? offer._id
          : new mongoose.Types.ObjectId(String(offer._id)),
      relatedType: 'application',
      email: {
        subject: `Hire Confirmed: ${jobTitle || 'Position'}`,
        text: `Congratulations! ${company.companyName} has confirmed your hire. Welcome to the team!`,
      },
    });
  }

  res.json({
    message: 'Hire confirmed successfully',
    offer: {
      id: (offer._id instanceof mongoose.Types.ObjectId
        ? offer._id
        : new mongoose.Types.ObjectId(String(offer._id))
      ).toString(),
      status: offer.status,
      acceptedAt: offer.acceptedAt,
    },
    application: application
      ? {
          id: (application._id instanceof mongoose.Types.ObjectId
            ? application._id
            : new mongoose.Types.ObjectId(String(application._id))
          ).toString(),
          status: application.status,
        }
      : null,
  });
};

/**
 * Reject offer
 * POST /api/graduates/offers/:offerId/reject
 */
export const rejectOffer = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { offerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(offerId)) {
    res.status(400).json({ message: 'Invalid offer ID' });
    return;
  }

  const graduate = await Graduate.findOne({ userId });
  if (!graduate) {
    res.status(404).json({ message: 'Graduate profile not found' });
    return;
  }

  const offer = await Offer.findOne({
    _id: offerId,
    graduateId: graduate._id,
  });

  if (!offer) {
    res.status(404).json({ message: 'Offer not found' });
    return;
  }

  if (offer.status === 'accepted' || offer.status === 'rejected') {
    res.status(400).json({
      message: 'Offer has already been processed',
    });
    return;
  }

  // Update offer status
  offer.status = 'rejected';
  offer.rejectedAt = new Date();
  offer.updatedBy = new mongoose.Types.ObjectId(userId);
  await offer.save();

  // Update application status back to 'rejected'
  const application = await Application.findById(offer.applicationId);
  if (application) {
    application.status = 'rejected';
    await application.save();
  }

  // Notify company
  const company = await Company.findById(offer.companyId).lean();
  const job = await Application.findById(offer.applicationId)
    .populate({
      path: 'jobId',
      select: 'title',
    })
    .lean();

  interface PopulatedApplication {
    jobId?: { title?: string } | mongoose.Types.ObjectId;
  }
  const populatedJob = job as PopulatedApplication | null;
  const jobTitle =
    populatedJob?.jobId &&
    typeof populatedJob.jobId === 'object' &&
    'title' in populatedJob.jobId
      ? populatedJob.jobId.title
      : undefined;

  if (company?.userId) {
    await createNotification({
      userId: company.userId.toString(),
      type: 'application',
      title: 'Offer Rejected',
      message: `${graduate.firstName} ${graduate.lastName} has rejected the offer for ${jobTitle || 'the position'}.`,
      relatedId:
        offer._id instanceof mongoose.Types.ObjectId
          ? offer._id
          : new mongoose.Types.ObjectId(String(offer._id)),
      relatedType: 'application',
    });
  }

  res.json({
    message: 'Offer rejected',
    offer: {
      id: (offer._id instanceof mongoose.Types.ObjectId
        ? offer._id
        : new mongoose.Types.ObjectId(String(offer._id))
      ).toString(),
      status: offer.status,
      rejectedAt: offer.rejectedAt,
    },
  });
};
