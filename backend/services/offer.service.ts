import PDFDocument from 'pdfkit';
import { v2 as cloudinary } from 'cloudinary';
import Offer, { IOffer } from '../models/Offer.model';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
import Application from '../models/Application.model';
import Message from '../models/Message.model';
import { createNotification } from './notification.service';
import mongoose from 'mongoose';

interface OfferData {
  jobTitle: string;
  jobType: string;
  location?: string;
  salary?: {
    amount?: number;
    currency?: string;
  };
  startDate?: Date;
  benefits?: string[];
  companyName: string;
  graduateName: string;
  graduateEmail?: string;
}

/**
 * Generate PDF offer document
 */
export async function generateOfferPDF(offerData: OfferData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(24).text('OFFER OF EMPLOYMENT', { align: 'center' });
      doc.moveDown(2);

      // Company and Date
      doc.fontSize(12);
      doc.text(`${offerData.companyName}`, { align: 'left' });
      doc.text(
        `Date: ${new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`,
        { align: 'right' }
      );
      doc.moveDown(2);

      // Recipient
      doc.fontSize(14);
      doc.text(`Dear ${offerData.graduateName},`, { align: 'left' });
      doc.moveDown();

      // Offer content
      doc.fontSize(12);
      doc.text(
        `We are pleased to offer you the position of ${offerData.jobTitle} at ${offerData.companyName}.`,
        { align: 'left' }
      );
      doc.moveDown();

      // Job Details Section
      doc.fontSize(14).text('POSITION DETAILS', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12);
      doc.text(`Position: ${offerData.jobTitle}`);
      doc.text(`Job Type: ${offerData.jobType}`);
      if (offerData.location) {
        doc.text(`Location: ${offerData.location}`);
      }
      doc.moveDown();

      // Compensation
      if (offerData.salary) {
        doc.fontSize(14).text('COMPENSATION', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12);
        const currency = offerData.salary.currency || 'USD';
        if (offerData.salary.amount) {
          doc.text(
            `Salary: ${currency} ${offerData.salary.amount.toLocaleString()}`
          );
        }
        doc.moveDown();
      }

      // Start Date
      if (offerData.startDate) {
        doc.fontSize(14).text('START DATE', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12);
        doc.text(
          `Proposed Start Date: ${offerData.startDate.toLocaleDateString(
            'en-US',
            {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }
          )}`
        );
        doc.moveDown();
      }

      // Benefits
      if (offerData.benefits && offerData.benefits.length > 0) {
        doc.fontSize(14).text('BENEFITS', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12);
        offerData.benefits.forEach((benefit) => {
          doc.text(`• ${benefit}`);
        });
        doc.moveDown();
      }

      // Instructions
      doc.moveDown();
      doc.fontSize(12);
      doc.text(
        'Please review this offer carefully. To accept, please sign this document and upload it through the Talent Hub platform.',
        { align: 'left' }
      );
      doc.moveDown(2);

      // Signature lines
      doc.fontSize(12);
      doc.text('_________________________', { align: 'left' });
      doc.text('Candidate Signature', { align: 'left' });
      doc.moveDown();
      doc.text('Date: _______________', { align: 'left' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Upload PDF to Cloudinary and return URL
 */
export async function uploadOfferPDF(
  pdfBuffer: Buffer,
  fileName: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: 'offers',
        public_id: fileName,
        format: 'pdf',
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new Error('Upload failed: No result from Cloudinary'));
        }
      }
    );

    uploadStream.end(pdfBuffer);
  });
}

/**
 * Create and send offer when application is accepted
 */
export async function createAndSendOffer(
  applicationId: string,
  userId: string
): Promise<IOffer> {
  // Get application with populated data
  const application = await Application.findById(applicationId)
    .populate({
      path: 'jobId',
      select: 'title jobType location salary companyId',
      populate: {
        path: 'companyId',
        select: 'companyName',
      },
    })
    .populate({
      path: 'graduateId',
      select: 'firstName lastName userId',
      populate: {
        path: 'userId',
        select: 'email',
      },
    });

  if (!application) {
    throw new Error('Application not found');
  }

  interface PopulatedJob {
    _id?: mongoose.Types.ObjectId;
    title?: string;
    jobType?: string;
    location?: string;
    salary?: {
      amount?: number;
      currency?: string;
    };
    companyId?:
      | {
          _id?: mongoose.Types.ObjectId;
          companyName?: string;
        }
      | mongoose.Types.ObjectId;
  }
  interface PopulatedGraduate {
    _id?: mongoose.Types.ObjectId;
    firstName?: string;
    lastName?: string;
    userId?:
      | {
          _id?: mongoose.Types.ObjectId;
          email?: string;
        }
      | mongoose.Types.ObjectId;
  }
  const job = application.jobId as PopulatedJob | mongoose.Types.ObjectId;
  const jobData =
    typeof job === 'object' && job && !(job instanceof mongoose.Types.ObjectId)
      ? job
      : null;
  const company =
    jobData?.companyId &&
    typeof jobData.companyId === 'object' &&
    !(jobData.companyId instanceof mongoose.Types.ObjectId)
      ? jobData.companyId
      : null;
  const graduate = application.graduateId as
    | PopulatedGraduate
    | mongoose.Types.ObjectId;
  const graduateData =
    typeof graduate === 'object' &&
    graduate &&
    !(graduate instanceof mongoose.Types.ObjectId)
      ? graduate
      : null;
  const graduateUser =
    graduateData?.userId &&
    typeof graduateData.userId === 'object' &&
    !(graduateData.userId instanceof mongoose.Types.ObjectId)
      ? graduateData.userId
      : null;

  // Check if offer already exists
  const existingOffer = await Offer.findOne({ applicationId: application._id });
  if (existingOffer) {
    throw new Error('Offer already exists for this application');
  }

  if (!jobData || !company || !graduateData) {
    throw new Error('Required application data is missing');
  }

  // Prepare offer data
  const offerData: OfferData = {
    jobTitle: jobData.title || '',
    jobType: jobData.jobType || 'Full time',
    location: jobData.location,
    salary: jobData.salary,
    companyName: company.companyName || '',
    graduateName:
      `${graduateData.firstName || ''} ${graduateData.lastName || ''}`.trim(),
    graduateEmail: graduateUser?.email,
  };

  // Generate PDF
  const pdfBuffer = await generateOfferPDF(offerData);
  const appObjectId =
    application._id instanceof mongoose.Types.ObjectId
      ? application._id
      : new mongoose.Types.ObjectId(String(application._id));
  const fileName = `offer-${appObjectId.toString()}-${Date.now()}`;
  const offerDocumentUrl = await uploadOfferPDF(pdfBuffer, fileName);

  // Set expiration date (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Create offer record
  const jobId =
    jobData._id ||
    (job instanceof mongoose.Types.ObjectId
      ? job
      : new mongoose.Types.ObjectId());
  const companyId = company._id || new mongoose.Types.ObjectId();
  const graduateId =
    graduateData._id ||
    (graduate instanceof mongoose.Types.ObjectId
      ? graduate
      : new mongoose.Types.ObjectId());

  const offer = new Offer({
    applicationId: appObjectId,
    jobId:
      jobId instanceof mongoose.Types.ObjectId
        ? jobId
        : new mongoose.Types.ObjectId(String(jobId)),
    companyId:
      companyId instanceof mongoose.Types.ObjectId
        ? companyId
        : new mongoose.Types.ObjectId(String(companyId)),
    graduateId:
      graduateId instanceof mongoose.Types.ObjectId
        ? graduateId
        : new mongoose.Types.ObjectId(String(graduateId)),
    status: 'pending',
    jobTitle: offerData.jobTitle,
    jobType: offerData.jobType,
    location: offerData.location,
    salary: offerData.salary,
    offerDocumentUrl,
    expiresAt,
    sentAt: new Date(),
    createdBy: new mongoose.Types.ObjectId(userId),
  });

  await offer.save();

  // Update application status to 'offer_sent'
  application.status = 'offer_sent';
  await application.save();

  // Send notification with offer message
  const jobTitle = jobData.title || 'the position';
  const companyName = company.companyName || 'the company';
  const offerMessage = `Congratulations! ${companyName} has sent you an offer for the position of ${jobTitle}. Please download, sign, and upload the offer document to accept.`;

  if (graduateUser?._id) {
    const graduateUserId =
      graduateUser._id instanceof mongoose.Types.ObjectId
        ? graduateUser._id
        : new mongoose.Types.ObjectId(String(graduateUser._id));
    const companyUserId = new mongoose.Types.ObjectId(userId);
    const offerId =
      offer._id instanceof mongoose.Types.ObjectId
        ? offer._id
        : new mongoose.Types.ObjectId(String(offer._id));

    // Create message for the conversation
    const messageContent = `Congratulations! We are pleased to offer you the position of ${jobTitle} at ${companyName}. Please download the attached offer letter, sign it, upload the signed copy here, and then click 'Accept Offer'.`;

    await Message.create({
      senderId: companyUserId,
      receiverId: graduateUserId,
      applicationId: appObjectId,
      offerId: offerId,
      message: messageContent,
      type: 'offer',
      fileUrl: offerDocumentUrl,
      fileName: `Offer_Letter_${jobTitle}_${companyName}.pdf`,
      read: false,
    });

    await createNotification({
      userId: graduateUserId.toString(),
      type: 'application',
      title: 'Job Offer Received',
      message: offerMessage,
      relatedId: offerId.toString(),
      relatedType: 'application',
      email: {
        subject: `Job Offer: ${jobTitle} at ${companyName}`,
        text: `${offerMessage}\n\nDownload your offer letter from the Talent Hub platform.`,
      },
    });
  }

  return offer;
}
