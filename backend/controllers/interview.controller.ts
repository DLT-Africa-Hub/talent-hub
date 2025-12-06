import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Interview, { ISuggestedTimeSlot } from '../models/Interview.model';
import Application from '../models/Application.model';
import Company from '../models/Company.model';
import Graduate from '../models/Graduate.model';
import { createNotification } from '../services/notification.service';
import {
  buildInterviewRoomUrl,
  generateInterviewSlug,
} from '../utils/interview.utils';
import {
  isValidTimezone,
  formatDateInTimezone,
  formatTimeSlotForDisplay,
} from '../utils/timezone.utils';
import { generateStreamToken, getStreamClient } from '../utils/stream.utils';

export const getInterviewBySlug = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { slug } = req.params;

  if (!slug || typeof slug !== 'string') {
    res.status(400).json({ message: 'Interview link is required' });
    return;
  }

  const interview = await Interview.findOne({ roomSlug: slug })
    .populate({
      path: 'jobId',
      select: 'title location jobType companyId',
      populate: {
        path: 'companyId',
        select: 'companyName',
      },
    })
    .populate({
      path: 'companyId',
      select: 'companyName',
    })
    .populate({
      path: 'graduateId',
      select: 'firstName lastName profilePictureUrl rank position',
    })
    .lean();

  if (!interview) {
    res.status(404).json({ message: 'Interview not found' });
    return;
  }

  const companyUserId =
    interview.companyUserId instanceof mongoose.Types.ObjectId
      ? interview.companyUserId.toString()
      : interview.companyUserId;
  const graduateUserId =
    interview.graduateUserId instanceof mongoose.Types.ObjectId
      ? interview.graduateUserId.toString()
      : interview.graduateUserId;

  const isCompanyParticipant = companyUserId === userId;
  const isGraduateParticipant = graduateUserId === userId;

  if (!isCompanyParticipant && !isGraduateParticipant) {
    res
      .status(403)
      .json({ message: 'You do not have access to this interview' });
    return;
  }

  const interviewData = interview as Record<string, any>;
  const job = (interviewData.jobId as Record<string, any>) || {};
  const companyInfo =
    (job.companyId &&
      typeof job.companyId === 'object' &&
      'companyName' in job.companyId &&
      job.companyId) ||
    (interviewData.companyId &&
      typeof interviewData.companyId === 'object' &&
      'companyName' in interviewData.companyId &&
      interviewData.companyId) ||
    null;
  const graduate = (interviewData.graduateId as Record<string, any>) || {};

  const graduateName = `${graduate.firstName || ''} ${
    graduate.lastName || ''
  }`.trim();

  const participantRole = isCompanyParticipant ? 'company' : 'graduate';
  const participantDisplayName =
    participantRole === 'company'
      ? companyInfo?.companyName || 'Company'
      : graduateName || 'Candidate';

  const joinWindowStartsAt = new Date(
    new Date(interview.scheduledAt).getTime() - 10 * 60 * 1000
  );

  res.json({
    interview: {
      id: interviewData._id?.toString?.() ?? '',
      applicationId: interviewData.applicationId
        ? interviewData.applicationId.toString()
        : undefined,
      scheduledAt: interviewData.scheduledAt,
      status: interviewData.status,
      durationMinutes: interviewData.durationMinutes,
      roomSlug: interviewData.roomSlug,
      roomUrl: interviewData.roomUrl,
      provider: interviewData.provider,
      job: {
        id: job._id?.toString?.(),
        title: job.title,
        location: job.location,
        jobType: job.jobType,
      },
      company: {
        id:
          interview.companyId?._id?.toString?.() ??
          companyInfo?._id?.toString?.(),
        name: companyInfo?.companyName,
      },
      graduate: {
        id: graduate._id?.toString?.(),
        name: graduateName,
        avatar: graduate.profilePictureUrl,
        rank: graduate.rank,
        role: graduate.position,
      },
      participant: {
        role: participantRole,
        name: participantDisplayName,
        counterpartName:
          participantRole === 'company'
            ? graduateName
            : companyInfo?.companyName,
      },
      joinWindowStartsAt,
    },
  });
};

/**
 * Suggest multiple time slots for an interview (Company)
 * POST /api/companies/interviews/suggest-slots
 */
export const suggestTimeSlots = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { applicationId, timeSlots, companyTimezone, selectionDeadline } =
    req.body;

  // Validate applicationId
  if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
    res.status(400).json({ message: 'Valid application ID is required' });
    return;
  }

  // Validate timeSlots array
  if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
    res.status(400).json({ message: 'At least one time slot is required' });
    return;
  }

  if (timeSlots.length > 5) {
    res.status(400).json({ message: 'Maximum 5 time slots allowed' });
    return;
  }

  // Validate timezone
  if (!companyTimezone || !isValidTimezone(companyTimezone)) {
    res.status(400).json({ message: 'Valid company timezone is required' });
    return;
  }

  // Validate each time slot
  const validDurations = [15, 30, 45, 60];
  const now = new Date();
  const suggestedSlots: ISuggestedTimeSlot[] = [];
  const seenDates = new Set<string>(); // Track dates to prevent duplicates

  for (const slot of timeSlots) {
    if (!slot.date) {
      res.status(400).json({ message: 'Each time slot must have a date' });
      return;
    }

    const slotDate = new Date(slot.date);
    if (isNaN(slotDate.getTime())) {
      res.status(400).json({ message: 'Invalid date format in time slot' });
      return;
    }

    if (slotDate < now) {
      res.status(400).json({ message: 'Time slots cannot be in the past' });
      return;
    }

    const duration = slot.duration || 30;
    if (!validDurations.includes(duration)) {
      res
        .status(400)
        .json({ message: 'Duration must be 15, 30, 45, or 60 minutes' });
      return;
    }

    // Check for duplicate time slots (same date/time)
    const dateKey = slotDate.toISOString();
    if (seenDates.has(dateKey)) {
      res.status(400).json({
        message:
          'Duplicate time slots are not allowed. Each time slot must be unique.',
      });
      return;
    }
    seenDates.add(dateKey);

    suggestedSlots.push({
      date: slotDate,
      duration,
      timezone: companyTimezone,
    });
  }

  // Get company
  const company = await Company.findOne({ userId }).lean();
  if (!company) {
    res.status(404).json({ message: 'Company profile not found' });
    return;
  }

  // Get application with related data
  const application = await Application.findById(applicationId)
    .populate({
      path: 'jobId',
      select: 'companyId title',
    })
    .populate({
      path: 'graduateId',
      select: 'firstName lastName userId',
    });

  if (!application) {
    res.status(404).json({ message: 'Application not found' });
    return;
  }

  // Verify application belongs to company
  interface PopulatedJob {
    _id?: mongoose.Types.ObjectId;
    title?: string;
    companyId?: mongoose.Types.ObjectId;
  }
  interface PopulatedGraduate {
    _id?: mongoose.Types.ObjectId;
    firstName?: string;
    lastName?: string;
    userId?: mongoose.Types.ObjectId;
  }

  const job = application.jobId as PopulatedJob | mongoose.Types.ObjectId;
  const jobData =
    typeof job === 'object' && job && !(job instanceof mongoose.Types.ObjectId)
      ? job
      : null;

  if (!jobData || jobData.companyId?.toString() !== company._id.toString()) {
    res
      .status(403)
      .json({ message: 'Application does not belong to your company' });
    return;
  }

  const graduate = application.graduateId as
    | PopulatedGraduate
    | mongoose.Types.ObjectId;
  const graduateData =
    typeof graduate === 'object' &&
    graduate &&
    !(graduate instanceof mongoose.Types.ObjectId)
      ? graduate
      : null;

  if (!graduateData?.userId) {
    res
      .status(400)
      .json({ message: 'Graduate profile is missing a linked user account' });
    return;
  }

  // Check for existing active interview for this application
  const existingInterviewForApplication = await Interview.findOne({
    applicationId: application._id,
    status: { $in: ['pending_selection', 'scheduled', 'in_progress'] },
  });

  if (existingInterviewForApplication) {
    res.status(400).json({
      message:
        'An interview is already scheduled or pending for this application',
    });
    return;
  }

  // Check for existing active interview between this company and graduate
  // (regardless of which application/job it's for)
  // This prevents scheduling multiple interviews with the same candidate until the first one is completed
  const existingInterviewForPair = await Interview.findOne({
    companyId: company._id,
    graduateId: graduateData._id,
    status: { $in: ['pending_selection', 'scheduled', 'in_progress'] },
  });

  if (existingInterviewForPair) {
    // Provide specific message based on status
    if (existingInterviewForPair.status === 'pending_selection') {
      res.status(400).json({
        message:
          'An interview time slot selection is pending for this candidate. Please wait until they select a time or the current selection expires before scheduling another interview.',
      });
      return;
    }

    if (existingInterviewForPair.status === 'in_progress') {
      res.status(400).json({
        message:
          'This candidate already has an interview in progress. You cannot schedule another interview with them until the current one is completed.',
      });
      return;
    }

    if (existingInterviewForPair.status === 'scheduled') {
      res.status(400).json({
        message:
          'An interview is already scheduled with this candidate. Please wait until the current interview is completed before scheduling another one.',
      });
      return;
    }
  }

  // Generate room details
  const roomSlug = generateInterviewSlug();
  const roomUrl = buildInterviewRoomUrl(roomSlug);

  // Create interview with pending_selection status
  const interview = new Interview({
    applicationId: application._id,
    jobId: jobData._id,
    companyId: company._id,
    companyUserId: new mongoose.Types.ObjectId(userId),
    graduateId: graduateData._id,
    graduateUserId: graduateData.userId,
    status: 'pending_selection',
    roomSlug,
    roomUrl,
    provider: 'stream',
    createdBy: new mongoose.Types.ObjectId(userId),
    suggestedTimeSlots: suggestedSlots,
    companyTimezone,
    durationMinutes: suggestedSlots[0].duration, // Default to first slot's duration
    selectionDeadline: selectionDeadline
      ? new Date(selectionDeadline)
      : undefined,
  });

  await interview.save();

  // Update application status - only mark as reviewed/shortlisted, not interviewed
  // Interview hasn't happened yet, just being scheduled
  // Don't change status to 'interviewed' - that should only happen after the interview is completed
  if (application.status === 'pending') {
    application.status = 'reviewed';
  }
  // If already reviewed or shortlisted, keep that status (don't downgrade or change unnecessarily)
  if (!application.reviewedAt) {
    application.reviewedAt = new Date();
  }
  await application.save();

  // Send notification to graduate
  const graduateName =
    `${graduateData.firstName || ''} ${graduateData.lastName || ''}`.trim();
  const graduateUserId =
    graduateData.userId instanceof mongoose.Types.ObjectId
      ? graduateData.userId.toString()
      : String(graduateData.userId);

  try {
    await createNotification({
      userId: graduateUserId,
      type: 'interview',
      title: 'Interview Time Slots Available',
      message: `${company.companyName} has suggested ${suggestedSlots.length} time slot${suggestedSlots.length > 1 ? 's' : ''} for your interview for "${jobData.title}". Please select your preferred time.`,
      relatedId: interview._id as mongoose.Types.ObjectId,
      relatedType: 'interview',
      email: {
        subject: `Interview Time Slots: ${jobData.title} at ${company.companyName}`,
        text: `Hello ${graduateName || 'there'},\n\n${company.companyName} has suggested ${suggestedSlots.length} time slot${suggestedSlots.length > 1 ? 's' : ''} for your interview for "${jobData.title}".\n\nPlease log in to Talent Hub to view the available times and select your preferred slot.\n\nBest of luck!`,
      },
    });
  } catch (error) {
    console.error('Failed to send interview slots notification:', error);
  }

  res.status(201).json({
    message: 'Interview time slots suggested successfully',
    interview: {
      id: interview._id?.toString(),
      status: interview.status,
      suggestedTimeSlots: interview.suggestedTimeSlots,
      companyTimezone: interview.companyTimezone,
      selectionDeadline: interview.selectionDeadline,
      roomSlug: interview.roomSlug,
    },
  });
};

/**
 * Get interviews pending time slot selection (Graduate)
 * GET /api/graduates/interviews/pending-selection
 */
export const getPendingSelectionInterviews = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Get graduate
  const graduate = await Graduate.findOne({ userId }).lean();
  if (!graduate) {
    res.status(404).json({ message: 'Graduate profile not found' });
    return;
  }

  // Get pending selection interviews
  const interviews = await Interview.find({
    graduateId: graduate._id,
    status: 'pending_selection',
  })
    .populate({
      path: 'jobId',
      select: 'title location jobType',
    })
    .populate({
      path: 'companyId',
      select: 'companyName',
    })
    .sort({ createdAt: -1 })
    .lean();

  // Get graduate's timezone from request or default to UTC
  // Frontend should send timezone, but we default to UTC for safety
  const requestTimezone =
    typeof req.query.timezone === 'string' ? req.query.timezone : undefined;
  const graduateTimezone =
    requestTimezone && isValidTimezone(requestTimezone)
      ? requestTimezone
      : 'UTC';

  const formattedInterviews = interviews.map((interview) => {
    const interviewData = interview as Record<string, unknown>;
    const job = (interviewData.jobId as Record<string, unknown>) || {};
    const company = (interviewData.companyId as Record<string, unknown>) || {};

    // Format time slots for display
    const formattedSlots = (interview.suggestedTimeSlots || []).map((slot) => {
      const slotId = slot._id?.toString() || '';
      const displayInfo = formatTimeSlotForDisplay(
        new Date(slot.date),
        slot.duration,
        interview.companyTimezone || 'UTC',
        graduateTimezone
      );

      return {
        id: slotId,
        date: slot.date,
        duration: slot.duration,
        timezone: slot.timezone,
        ...displayInfo,
      };
    });

    return {
      id: interview._id?.toString(),
      status: interview.status,
      job: {
        id: (job._id as mongoose.Types.ObjectId)?.toString?.(),
        title: job.title,
        location: job.location,
        jobType: job.jobType,
      },
      company: {
        id: (company._id as mongoose.Types.ObjectId)?.toString?.(),
        name: company.companyName,
      },
      suggestedTimeSlots: formattedSlots,
      companyTimezone: interview.companyTimezone,
      selectionDeadline: interview.selectionDeadline,
      createdAt: interview.createdAt,
    };
  });

  res.json({
    interviews: formattedInterviews,
    count: formattedInterviews.length,
  });
};

/**
 * Select a time slot for an interview (Graduate)
 * POST /api/graduates/interviews/:interviewId/select-slot
 */
export const selectTimeSlot = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { interviewId } = req.params;
  const { slotId, graduateTimezone } = req.body;

  if (!interviewId || !mongoose.Types.ObjectId.isValid(interviewId)) {
    res.status(400).json({ message: 'Valid interview ID is required' });
    return;
  }

  if (!slotId) {
    res.status(400).json({ message: 'Slot ID is required' });
    return;
  }

  // Validate timezone if provided
  if (graduateTimezone && !isValidTimezone(graduateTimezone)) {
    res.status(400).json({ message: 'Invalid graduate timezone' });
    return;
  }

  // Get graduate
  const graduate = await Graduate.findOne({ userId }).lean();
  if (!graduate) {
    res.status(404).json({ message: 'Graduate profile not found' });
    return;
  }

  // Get interview with populated company and job for notifications
  const interview = await Interview.findOne({
    _id: new mongoose.Types.ObjectId(interviewId),
    graduateId: graduate._id,
    status: 'pending_selection',
  })
    .populate({
      path: 'companyId',
      select: 'companyName',
    })
    .populate({
      path: 'jobId',
      select: 'title',
    });

  if (!interview) {
    res
      .status(404)
      .json({ message: 'Interview not found or already confirmed' });
    return;
  }

  // Find the selected slot
  const selectedSlot = interview.suggestedTimeSlots?.find(
    (slot) => slot._id?.toString() === slotId
  );

  if (!selectedSlot) {
    res.status(400).json({ message: 'Invalid time slot selected' });
    return;
  }

  // Check if the selected slot is still in the future
  const now = new Date();
  if (new Date(selectedSlot.date) < now) {
    res.status(400).json({ message: 'Selected time slot has already passed' });
    return;
  }

  // Use atomic update with transaction to prevent race conditions
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Atomically update interview - only if still in pending_selection status
    const updatedInterview = await Interview.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(interviewId),
        graduateId: graduate._id,
        status: 'pending_selection', // Critical: ensures atomic status check
      },
      {
        $set: {
          selectedTimeSlot: {
            date: selectedSlot.date,
            duration: selectedSlot.duration,
            timezone: selectedSlot.timezone,
            selectedAt: now,
          },
          scheduledAt: selectedSlot.date,
          durationMinutes: selectedSlot.duration,
          status: 'scheduled',
          graduateTimezone: graduateTimezone || 'UTC',
          updatedBy: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        new: true,
        session, // Include in transaction
      }
    );

    if (!updatedInterview) {
      await session.abortTransaction();
      session.endSession();
      res.status(409).json({
        message:
          'Interview status changed. Another user may have already selected a time slot.',
      });
      return;
    }

    // Update application within transaction
    await Application.findByIdAndUpdate(
      interview.applicationId,
      {
        $set: {
          interviewScheduledAt: selectedSlot.date,
          interviewLink: updatedInterview.roomUrl,
          interviewRoomSlug: updatedInterview.roomSlug,
          interviewId: updatedInterview._id,
        },
      },
      { session }
    );

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Get company and job info for notifications (already populated)
    const company = interview.companyId as
      | { companyName?: string }
      | mongoose.Types.ObjectId;
    const job = interview.jobId as { title?: string } | mongoose.Types.ObjectId;
    const companyName =
      typeof company === 'object' &&
      company &&
      !(company instanceof mongoose.Types.ObjectId) &&
      'companyName' in company
        ? company.companyName
        : undefined;
    const jobTitle =
      typeof job === 'object' &&
      job &&
      !(job instanceof mongoose.Types.ObjectId) &&
      'title' in job
        ? job.title
        : undefined;

    const formattedDate = formatDateInTimezone(
      selectedSlot.date,
      updatedInterview.companyTimezone || 'UTC',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
    );

    const graduateName =
      `${graduate.firstName || ''} ${graduate.lastName || ''}`.trim();

    // Notify company
    try {
      const companyUserId =
        updatedInterview.companyUserId instanceof mongoose.Types.ObjectId
          ? updatedInterview.companyUserId.toString()
          : String(updatedInterview.companyUserId);

      await createNotification({
        userId: companyUserId,
        type: 'interview',
        title: 'Interview Time Confirmed',
        message: `${graduateName || 'A candidate'} has selected a time slot for their interview: ${formattedDate}.`,
        relatedId: updatedInterview._id as mongoose.Types.ObjectId,
        relatedType: 'interview',
        email: {
          subject: `Interview Confirmed: ${jobTitle || 'Position'}`,
          text: `Hello,\n\n${graduateName || 'A candidate'} has confirmed their interview time for "${jobTitle || 'the position'}".\n\nScheduled: ${formattedDate}\nJoin Link: ${updatedInterview.roomUrl}\n\nYou can join the interview from your Talent Hub Interviews tab when it's time.`,
        },
      });
    } catch (error) {
      console.error('Failed to send interview confirmation to company:', error);
    }

    // Notify graduate (confirmation)
    try {
      await createNotification({
        userId,
        type: 'interview',
        title: 'Interview Scheduled',
        message: `Your interview with ${companyName || 'the company'} is confirmed for ${formattedDate}.`,
        relatedId: updatedInterview._id as mongoose.Types.ObjectId,
        relatedType: 'interview',
      });
    } catch (error) {
      console.error(
        'Failed to send interview confirmation to graduate:',
        error
      );
    }

    res.json({
      message: 'Time slot selected successfully',
      interview: {
        id: updatedInterview._id?.toString(),
        status: updatedInterview.status,
        scheduledAt: updatedInterview.scheduledAt,
        durationMinutes: updatedInterview.durationMinutes,
        roomSlug: updatedInterview.roomSlug,
        roomUrl: updatedInterview.roomUrl,
        selectedTimeSlot: updatedInterview.selectedTimeSlot,
      },
    });
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();
    console.error('Error selecting time slot:', error);
    res
      .status(500)
      .json({ message: 'Failed to select time slot. Please try again.' });
  }
};

export const generateStreamTokenController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    // Get user profile information
    let userName = 'User';
    let userImage: string | undefined = undefined;

    // Check if user is a graduate
    const graduate = await Graduate.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();
    if (graduate) {
      userName =
        `${graduate.firstName || ''} ${graduate.lastName || ''}`.trim() ||
        'Graduate';
      userImage = graduate.profilePictureUrl;
    } else {
      // Check if user is a company
      const company = await Company.findOne({
        userId: new mongoose.Types.ObjectId(userId),
      }).lean();
      if (company) {
        userName = company.companyName || 'Company';
      }
    }

    // Prepare user data for Stream
    const streamUser = {
      id: userId,
      role: 'user',
      name: userName,
      image: userImage || '',
    };

    // Validate user data
    if (!streamUser.id || !streamUser.name) {
      res.status(400).json({ message: 'User data is incomplete' });
      return;
    }

    // Get Stream client and upsert user
    const streamClient = getStreamClient();
    await streamClient.upsertUsers([streamUser]);

    // Generate token with 1 hour expiration
    const expirationTime = 60 * 60; // 1 hour
    const token = generateStreamToken(userId, expirationTime);

    res.success({ token });
  } catch (error) {
    console.error('Error generating Stream token:', error);
    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : 'Failed to generate Stream token',
    });
  }
};
