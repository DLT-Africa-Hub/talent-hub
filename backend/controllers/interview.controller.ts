import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Interview, { ISuggestedTimeSlot } from '../models/Interview.model';
import Application from '../models/Application.model';
import Company from '../models/Company.model';
import Graduate from '../models/Graduate.model';
import Job from '../models/Job.model';
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
import calendlyService from '../services/calendly.service';
import { InterviewStage } from '../models/Job.model';

/**
 * Generate interview stage information for email messages
 */
function getInterviewStageInfo(
  jobData: {
    interviewStages?: number;
    interviewStageTitles?: string[];
    interviewStageDetails?: InterviewStage[];
  },
  currentStage: number
): {
  stageTitle: string;
  stageDescription?: string;
  stageInfo: string;
  totalStagesInfo: string;
} {
  const totalStages = jobData.interviewStages || 1;
  const stageIndex = currentStage - 1;

  // Prefer interviewStageDetails over interviewStageTitles
  let stageTitle = `Stage ${currentStage}`;
  let stageDescription: string | undefined;

  if (
    jobData.interviewStageDetails &&
    jobData.interviewStageDetails[stageIndex]
  ) {
    stageTitle = jobData.interviewStageDetails[stageIndex].title;
    stageDescription = jobData.interviewStageDetails[stageIndex].description;
  } else if (
    jobData.interviewStageTitles &&
    jobData.interviewStageTitles[stageIndex]
  ) {
    stageTitle = jobData.interviewStageTitles[stageIndex];
  }

  const stageInfo = totalStages > 1 ? ` (${stageTitle})` : '';

  // Generate info about total interview stages
  let totalStagesInfo = '';
  if (totalStages > 1) {
    if (totalStages === 2) {
      totalStagesInfo =
        '\n\nThis role requires 2 interview stages. This is your first interview.';
    } else if (totalStages === 3) {
      if (currentStage === 1) {
        totalStagesInfo =
          '\n\nThis role requires 3 interview stages. This is your first interview.';
      } else if (currentStage === 2) {
        totalStagesInfo =
          '\n\nThis role requires 3 interview stages. This is your second interview.';
      } else {
        totalStagesInfo =
          '\n\nThis role requires 3 interview stages. This is your final interview.';
      }
    }

    // Add stage description if available
    if (stageDescription) {
      totalStagesInfo += `\n\n${stageTitle}: ${stageDescription}`;
    }
  }

  return { stageTitle, stageDescription, stageInfo, totalStagesInfo };
}

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
      select: 'title location jobType companyId directContact',
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
    .populate({
      path: 'createdBy',
      select: 'role _id',
    })
    .lean();

  if (!interview) {
    res.status(404).json({ message: 'Interview not found' });
    return;
  }

  // Get user role to check if admin
  const User = (await import('../models/User.model')).default;
  const currentUser = await User.findById(userId).select('role').lean();
  const isAdmin = currentUser?.role === 'admin';

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

  // Check if admin created this interview or if job is admin-managed
  const job = interview.jobId as
    | { directContact?: boolean }
    | mongoose.Types.ObjectId
    | null;
  const jobData =
    typeof job === 'object' &&
    job &&
    !(job instanceof mongoose.Types.ObjectId) &&
    'directContact' in job
      ? job
      : null;
  const isAdminManagedJob = jobData?.directContact === false;

  const creator = interview.createdBy as
    | { _id?: mongoose.Types.ObjectId; role?: string }
    | mongoose.Types.ObjectId
    | null;
  const creatorData =
    creator &&
    typeof creator === 'object' &&
    !(creator instanceof mongoose.Types.ObjectId) &&
    'role' in creator
      ? creator
      : null;
  const isCreatedByAdmin =
    creatorData?.role === 'admin' &&
    creatorData._id &&
    creatorData._id.toString() === userId;

  // Admin is authorized if:
  // 1. They are an admin AND the job is admin-managed, OR
  // 2. They created the interview
  const isAdminAuthorized = isAdmin && (isAdminManagedJob || isCreatedByAdmin);

  if (!isCompanyParticipant && !isGraduateParticipant && !isAdminAuthorized) {
    res
      .status(403)
      .json({ message: 'You do not have access to this interview' });
    return;
  }

  const interviewData = interview as Record<string, any>;
  const jobDataForResponse = (interviewData.jobId as Record<string, any>) || {};
  const companyInfo =
    (jobDataForResponse.companyId &&
      typeof jobDataForResponse.companyId === 'object' &&
      'companyName' in jobDataForResponse.companyId &&
      jobDataForResponse.companyId) ||
    (interviewData.companyId &&
      typeof interviewData.companyId === 'object' &&
      'companyName' in interviewData.companyId &&
      interviewData.companyId) ||
    null;
  const graduate = (interviewData.graduateId as Record<string, any>) || {};

  const graduateName = `${graduate.firstName || ''} ${
    graduate.lastName || ''
  }`.trim();

  const participantRole = isCompanyParticipant
    ? 'company'
    : isAdminAuthorized
      ? 'admin'
      : 'graduate';
  const participantDisplayName =
    participantRole === 'company'
      ? companyInfo?.companyName || 'Company'
      : participantRole === 'admin'
        ? 'Admin'
        : graduateName || 'Candidate';

  // For pending_selection interviews, use first suggested slot date if scheduledAt is not available
  const interviewScheduledAt =
    interview.scheduledAt ||
    (interview.status === 'pending_selection' &&
    interview.suggestedTimeSlots &&
    interview.suggestedTimeSlots.length > 0
      ? interview.suggestedTimeSlots[0].date
      : new Date());

  const joinWindowStartsAt = new Date(
    new Date(interviewScheduledAt).getTime() - 10 * 60 * 1000
  );

  res.json({
    interview: {
      id: interviewData._id?.toString?.() ?? '',
      applicationId: interviewData.applicationId
        ? interviewData.applicationId.toString()
        : undefined,
      scheduledAt: interviewData.scheduledAt || interviewScheduledAt,
      status: interviewData.status,
      durationMinutes: interviewData.durationMinutes,
      roomSlug: interviewData.roomSlug,
      roomUrl: interviewData.roomUrl,
      provider: interviewData.provider,
      job: {
        id: jobDataForResponse._id?.toString?.(),
        title: jobDataForResponse.title,
        location: jobDataForResponse.location,
        jobType: jobDataForResponse.jobType,
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
        role: Array.isArray(graduate.position)
          ? graduate.position.join(', ')
          : graduate.position || '',
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
      select: 'companyId title interviewStages interviewStageTitles',
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
    interviewStages?: 1 | 2 | 3;
    interviewStageTitles?: string[];
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

  // Verify application status allows interview scheduling
  // Application must be accepted before scheduling interviews
  const applicationStatus = application.status as string;
  if (applicationStatus !== 'accepted') {
    res.status(400).json({
      message:
        'Application must be accepted before scheduling an interview. Please accept the application first.',
    });
    return;
  }

  // Determine which stage this interview should be
  const totalStages = jobData?.interviewStages || 1;

  // Get all completed interviews for this application to determine next stage
  const completedInterviews = await Interview.find({
    applicationId: application._id,
    status: 'completed',
  })
    .select('stage')
    .sort({ stage: 1 })
    .lean();

  const completedStages = completedInterviews
    .map((iv) => iv.stage)
    .filter(
      (stage): stage is 1 | 2 | 3 =>
        stage !== undefined && [1, 2, 3].includes(stage)
    )
    .sort((a, b) => a - b);

  // Determine next stage
  let nextStage: 1 | 2 | 3 = 1;
  if (completedStages.length > 0) {
    const highestCompleted = Math.max(...completedStages);
    if (highestCompleted < totalStages) {
      nextStage = (highestCompleted + 1) as 1 | 2 | 3;
    } else {
      res.status(400).json({
        message: `All interview stages (${totalStages}) have been completed for this application`,
      });
      return;
    }
  }

  // Check for existing active interview for this application or same stage
  const existingInterviewForApplication = await Interview.findOne({
    applicationId: application._id,
    $or: [
      { status: { $in: ['pending_selection', 'scheduled', 'in_progress'] } },
      { stage: nextStage, status: { $ne: 'cancelled' } },
    ],
  });

  if (existingInterviewForApplication) {
    if (existingInterviewForApplication.stage === nextStage) {
      res.status(400).json({
        message: `Stage ${nextStage} interview is already scheduled or pending for this application`,
      });
      return;
    }
    res.status(400).json({
      message:
        'An interview is already scheduled or pending for this application',
    });
    return;
  }

  // Check for existing active interview for the same role (jobId) with this graduate
  // This prevents scheduling multiple interviews for the same role if one is pending
  const existingInterviewForSameRole = await Interview.findOne({
    jobId: jobData._id,
    graduateId: graduateData._id,
    status: { $in: ['pending_selection', 'scheduled', 'in_progress'] },
  });

  if (existingInterviewForSameRole) {
    // Provide specific message based on status
    if (existingInterviewForSameRole.status === 'pending_selection') {
      res.status(400).json({
        message:
          'An interview time slot selection is pending for this candidate for this role. Please wait until they select a time or the current selection expires before scheduling another interview.',
      });
      return;
    }

    if (existingInterviewForSameRole.status === 'in_progress') {
      res.status(400).json({
        message:
          'This candidate already has an interview in progress for this role. You cannot schedule another interview until the current one is completed or missed.',
      });
      return;
    }

    if (existingInterviewForSameRole.status === 'scheduled') {
      res.status(400).json({
        message:
          'An interview is already scheduled for this candidate for this role. Please wait until the current interview is completed or missed before scheduling another one.',
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
    stage: nextStage,
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
      select: 'title directContact',
    })
    .populate({
      path: 'createdBy',
      select: 'role',
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
    const job = interview.jobId as
      | { title?: string; directContact?: boolean }
      | mongoose.Types.ObjectId;
    const companyName =
      typeof company === 'object' &&
      company &&
      !(company instanceof mongoose.Types.ObjectId) &&
      'companyName' in company
        ? company.companyName
        : undefined;
    const jobData =
      typeof job === 'object' &&
      job &&
      !(job instanceof mongoose.Types.ObjectId) &&
      'title' in job
        ? job
        : null;
    const jobTitle = jobData?.title;
    const isAdminManaged = jobData?.directContact === false;

    // Get the creator (admin or company user) - need to fetch it since it wasn't populated
    let isCreatedByAdmin = false;
    let adminUserId: string | null = null;
    if (interview.createdBy) {
      const User = (await import('../models/User.model')).default;
      const creator = await User.findById(interview.createdBy)
        .select('_id role')
        .lean();
      if (creator && creator.role === 'admin') {
        isCreatedByAdmin = true;
        adminUserId =
          creator._id instanceof mongoose.Types.ObjectId
            ? creator._id.toString()
            : String(creator._id);
      }
    }

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

    // Notify admin (if admin-managed) or company (if company-managed)
    try {
      if (isAdminManaged && isCreatedByAdmin && adminUserId) {
        // Notify admin who created the interview
        await createNotification({
          userId: adminUserId,
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
      } else {
        // Notify company user
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
      }
    } catch (error) {
      console.error(
        'Failed to send interview confirmation notification:',
        error
      );
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

/**
 * Get company's Calendly availability (for candidates to view and select)
 * GET /api/v1/interviews/calendly/availability/:applicationId
 */
export const getCalendlyAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { applicationId } = req.params;
    const { startTime, endTime, eventTypeUri } = req.query;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      res.status(400).json({ message: 'Invalid application ID' });
      return;
    }

    // Get application and verify graduate access (candidate viewing company availability)
    // Explicitly select calendly fields including accessToken and refreshToken (which have select: false)
    const application = await Application.findById(applicationId)
      .populate({
        path: 'jobId',
        select: 'companyId title',
        populate: {
          path: 'companyId',
          select:
            '_id userId calendly.userUri calendly.enabled calendly.publicLink calendly.connectedAt calendly.tokenExpiresAt +calendly.accessToken +calendly.refreshToken',
        },
      })
      .populate({
        path: 'graduateId',
        select: 'userId',
      })
      .lean();

    if (!application) {
      res.status(404).json({ message: 'Application not found' });
      return;
    }

    const graduate = application.graduateId as {
      userId?: mongoose.Types.ObjectId;
    };
    const graduateUserId = graduate?.userId;

    // Verify the candidate owns this application
    if (!graduateUserId || graduateUserId.toString() !== userId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const job = application.jobId as {
      companyId?: {
        _id?: mongoose.Types.ObjectId;
        userId?: mongoose.Types.ObjectId;
        calendly?: {
          enabled?: boolean;
          userUri?: string;
          accessToken?: string;
          refreshToken?: string;
          publicLink?: string;
          tokenExpiresAt?: Date;
        };
      };
    };

    if (!job?.companyId?.calendly || !job.companyId.calendly.enabled) {
      res.status(400).json({
        message: 'Company has not connected their Calendly account',
      });
      return;
    }

    // Validate time range
    if (
      !startTime ||
      !endTime ||
      typeof startTime !== 'string' ||
      typeof endTime !== 'string'
    ) {
      res.status(400).json({
        message:
          'startTime and endTime query parameters are required (ISO 8601 format)',
      });
      return;
    }

    // Validate dates are valid and startTime is before endTime
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({
        message: 'Invalid date format. Dates must be in ISO 8601 format.',
      });
      return;
    }

    if (startDate >= endDate) {
      res.status(400).json({
        message: 'startTime must be before endTime',
      });
      return;
    }

    // Ensure dates are in the future (at least 1 hour from now)
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    if (startDate < oneHourFromNow) {
      res.status(400).json({
        message: 'startTime must be at least 1 hour in the future',
      });
      return;
    }

    // Calendly API constraint: date range cannot be greater than 7 days
    const dateRangeMs = endDate.getTime() - startDate.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    if (dateRangeMs > sevenDaysMs) {
      res.status(400).json({
        message:
          'Date range cannot exceed 7 days. Please select a smaller date range.',
      });
      return;
    }

    const companyCalendly = job.companyId.calendly as {
      enabled?: boolean;
      userUri?: string;
      accessToken?: string;
      refreshToken?: string;
      tokenExpiresAt?: Date;
      publicLink?: string;
      connectedAt?: Date;
    };

    // Always fetch event types to return to frontend (even if eventTypeUri is provided)
    let eventTypesData: {
      collection: Array<{
        uri: string;
        name: string;
        active: boolean;
        duration?: number;
      }>;
    } | null = null;
    let eventTypeUriToUse = eventTypeUri as string | undefined;

    if (!companyCalendly.accessToken) {
      res.status(400).json({
        message: 'Company must connect Calendly via OAuth to view availability',
      });
      return;
    }

    if (!companyCalendly.userUri) {
      res.status(400).json({
        message: 'Company Calendly user URI is missing',
      });
      return;
    }

    // Check if token is expired and refresh if needed
    let accessTokenToUse = companyCalendly.accessToken;
    const companyId = (job.companyId as { _id?: mongoose.Types.ObjectId })._id;

    if (
      companyCalendly.tokenExpiresAt &&
      companyCalendly.tokenExpiresAt < new Date()
    ) {
      // Token is expired, try to refresh it
      if (!companyCalendly.refreshToken) {
        res.status(400).json({
          message:
            'Calendly access token has expired and no refresh token is available. Please reconnect Calendly.',
        });
        return;
      }

      try {
        const refreshResult = await calendlyService.refreshAccessToken(
          companyCalendly.refreshToken
        );

        // Update company with new tokens
        if (companyId) {
          const company = await Company.findById(companyId);
          if (company && company.calendly) {
            company.calendly.accessToken = refreshResult.accessToken;
            if (refreshResult.refreshToken) {
              company.calendly.refreshToken = refreshResult.refreshToken;
            }
            if (refreshResult.expiresIn) {
              company.calendly.tokenExpiresAt = new Date(
                Date.now() + refreshResult.expiresIn * 1000
              );
            }
            await company.save();
          }
        }

        accessTokenToUse = refreshResult.accessToken;
      } catch (refreshError) {
        console.error('Failed to refresh Calendly access token:', refreshError);
        res.status(400).json({
          message:
            'Calendly access token has expired and could not be refreshed. Please reconnect Calendly.',
        });
        return;
      }
    }

    // Fetch event types from Calendly and get company timezone
    let companyTimezone = 'UTC'; // Default to UTC
    try {
      // Validate access token exists and is not empty
      if (!accessTokenToUse || accessTokenToUse.trim() === '') {
        res.status(400).json({
          message:
            'Company Calendly access token is missing or invalid. Please reconnect Calendly.',
        });
        return;
      }

      // Get company's timezone from Calendly user info
      try {
        const companyUser =
          await calendlyService.getCurrentUser(accessTokenToUse);
        if (companyUser?.timezone) {
          companyTimezone = companyUser.timezone;
        }
      } catch (timezoneError) {
        console.warn(
          'Failed to get company timezone, using UTC:',
          timezoneError
        );
        // Continue with UTC as default
      }

      const eventTypes = await calendlyService.getEventTypes(
        companyCalendly.userUri,
        accessTokenToUse
      );

      if (eventTypes.collection.length === 0) {
        res.status(400).json({
          message: 'Company has no available Calendly event types',
        });
        return;
      }

      // Format event types for response (include duration for calculating end_time)
      eventTypesData = {
        collection: eventTypes.collection.map((et) => ({
          uri: et.uri,
          name: et.name,
          active: et.active,
          duration: et.duration, // Include duration for calculating end_time
        })),
      };

      // If no eventTypeUri provided, use the first active event type
      if (!eventTypeUriToUse) {
        const activeEventType = eventTypes.collection.find((et) => et.active);
        eventTypeUriToUse =
          activeEventType?.uri || eventTypes.collection[0].uri;
      }
    } catch (error) {
      console.error('Error fetching event types:', error);
      res.status(500).json({
        message: 'Failed to fetch Calendly event types',
      });
      return;
    }

    // Get available times
    if (!accessTokenToUse) {
      res.status(400).json({
        message:
          'Company Calendly access token is missing. Please reconnect Calendly.',
      });
      return;
    }

    if (!eventTypeUriToUse) {
      res.status(400).json({
        message: 'No event type available for scheduling',
      });
      return;
    }

    try {
      const availability = await calendlyService.getAvailableTimes(
        eventTypeUriToUse,
        startTime,
        endTime,
        accessTokenToUse
      );

      // Get event type duration to calculate end_time for slots
      // Use eventTypesData which already includes duration
      const selectedEventType = eventTypesData?.collection?.find(
        (et) => et.uri === eventTypeUriToUse
      );
      const eventDurationMinutes = selectedEventType?.duration || 30; // Default to 30 minutes

      // Add end_time to each slot if not present
      const slotsWithEndTime = (availability.collection || []).map(
        (slot: { start_time: string; end_time?: string }) => {
          if (slot.end_time) {
            return slot; // Already has end_time
          }
          // Calculate end_time from start_time + duration
          const startTime = new Date(slot.start_time);
          const endTime = new Date(
            startTime.getTime() + eventDurationMinutes * 60 * 1000
          );
          return {
            ...slot,
            end_time: endTime.toISOString(),
          };
        }
      );

      res.json({
        availableSlots: slotsWithEndTime,
        eventTypeUri: eventTypeUriToUse,
        eventTypes: eventTypesData?.collection || [],
        companyTimezone: companyTimezone, // Include company timezone for frontend display
      });
    } catch (error) {
      console.error('Error fetching Calendly availability:', error);
      res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch Calendly availability',
      });
    }
  } catch (error) {
    console.error('Get Calendly availability error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Schedule interview via Calendly
 * POST /api/v1/interviews/calendly/schedule/:applicationId
 */
export const scheduleCalendlyInterview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { applicationId } = req.params;
    const { eventTypeUri, startTime, inviteeEmail, inviteeName, location } =
      req.body;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      res.status(400).json({ message: 'Invalid application ID' });
      return;
    }

    if (!eventTypeUri || !startTime || !inviteeEmail) {
      res.status(400).json({
        message: 'eventTypeUri, startTime, and inviteeEmail are required',
      });
      return;
    }

    // Validate startTime format
    const startDate = new Date(startTime);
    if (isNaN(startDate.getTime())) {
      res
        .status(400)
        .json({ message: 'Invalid startTime format (ISO 8601 required)' });
      return;
    }

    if (startDate < new Date()) {
      res.status(400).json({ message: 'startTime must be in the future' });
      return;
    }

    // Get application and verify graduate access (candidate scheduling)
    // Explicitly select calendly fields including accessToken (which has select: false)
    const application = await Application.findById(applicationId)
      .populate({
        path: 'jobId',
        select: 'companyId title interviewStages interviewStageTitles',
        populate: {
          path: 'companyId',
          select:
            '_id userId companyName calendly.userUri calendly.enabled calendly.publicLink calendly.connectedAt calendly.tokenExpiresAt +calendly.accessToken +calendly.refreshToken',
        },
      })
      .populate({
        path: 'graduateId',
        select: 'userId firstName lastName',
      })
      .lean();

    if (!application) {
      res.status(404).json({ message: 'Application not found' });
      return;
    }

    const graduate = application.graduateId as {
      _id: mongoose.Types.ObjectId;
      userId?: mongoose.Types.ObjectId;
      firstName?: string;
      lastName?: string;
    };
    const graduateUserId = graduate?.userId;

    // Verify the candidate owns this application
    if (!graduateUserId || graduateUserId.toString() !== userId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const job = application.jobId as {
      _id: mongoose.Types.ObjectId;
      interviewStages?: 1 | 2 | 3;
      interviewStageTitles?: string[];
      companyId?: {
        _id?: mongoose.Types.ObjectId;
        userId?: mongoose.Types.ObjectId;
        companyName?: string;
        calendly?: {
          enabled?: boolean;
          userUri?: string;
          accessToken?: string;
          refreshToken?: string;
          tokenExpiresAt?: Date;
        };
      };
      title?: string;
    };
    const companyIdValue = job?.companyId?._id;

    if (!companyIdValue) {
      res.status(404).json({ message: 'Company not found' });
      return;
    }

    const companyId: mongoose.Types.ObjectId =
      companyIdValue instanceof mongoose.Types.ObjectId
        ? companyIdValue
        : new mongoose.Types.ObjectId(String(companyIdValue));

    const companyCalendly = job?.companyId?.calendly as
      | {
          enabled?: boolean;
          userUri?: string;
          accessToken?: string;
          refreshToken?: string;
          tokenExpiresAt?: Date;
        }
      | undefined;

    if (
      !companyCalendly ||
      !companyCalendly.enabled ||
      !companyCalendly.accessToken
    ) {
      res.status(400).json({
        message:
          'Company must connect Calendly via OAuth to schedule interviews',
      });
      return;
    }

    // Check if token is expired and refresh if needed
    let accessTokenToUse = companyCalendly.accessToken;

    if (
      companyCalendly.tokenExpiresAt &&
      companyCalendly.tokenExpiresAt < new Date()
    ) {
      // Token is expired, try to refresh it
      if (!companyCalendly.refreshToken) {
        res.status(400).json({
          message:
            'Calendly access token has expired and no refresh token is available. Please reconnect Calendly.',
        });
        return;
      }

      try {
        const refreshResult = await calendlyService.refreshAccessToken(
          companyCalendly.refreshToken
        );

        // Update company with new tokens
        if (companyId) {
          const company = await Company.findById(companyId);
          if (company && company.calendly) {
            company.calendly.accessToken = refreshResult.accessToken;
            if (refreshResult.refreshToken) {
              company.calendly.refreshToken = refreshResult.refreshToken;
            }
            if (refreshResult.expiresIn) {
              company.calendly.tokenExpiresAt = new Date(
                Date.now() + refreshResult.expiresIn * 1000
              );
            }
            await company.save();
          }
        }

        accessTokenToUse = refreshResult.accessToken;
      } catch (refreshError) {
        console.error('Failed to refresh Calendly access token:', refreshError);
        res.status(400).json({
          message:
            'Calendly access token has expired and could not be refreshed. Please reconnect Calendly.',
        });
        return;
      }
    }

    // Get job to check interview stages (if not already populated)
    let jobData = job;
    if (!job.interviewStages) {
      const jobDoc = await Job.findById(application.jobId)
        .select('interviewStages interviewStageTitles interviewStageDetails')
        .lean();
      if (!jobDoc) {
        res.status(404).json({ message: 'Job not found' });
        return;
      }
      jobData = {
        ...job,
        interviewStages: jobDoc.interviewStages,
        interviewStageTitles: jobDoc.interviewStageTitles,
      };
    }

    // Determine which stage this interview should be
    // Get all completed interviews for this application to determine next stage
    const completedInterviews = await Interview.find({
      applicationId: application._id,
      status: 'completed',
    })
      .select('stage')
      .sort({ stage: 1 })
      .lean();

    const completedStages = completedInterviews
      .map((iv) => iv.stage)
      .filter(
        (stage): stage is 1 | 2 | 3 =>
          stage !== undefined && [1, 2, 3].includes(stage)
      )
      .sort((a, b) => a - b);

    // Determine next stage
    const totalStages = jobData.interviewStages || 1;
    let nextStage: 1 | 2 | 3 = 1;
    if (completedStages.length > 0) {
      const highestCompleted = Math.max(...completedStages);
      if (highestCompleted < totalStages) {
        nextStage = (highestCompleted + 1) as 1 | 2 | 3;
      } else {
        res.status(400).json({
          message: `All interview stages (${totalStages}) have been completed for this application`,
        });
        return;
      }
    }

    // Verify application status allows interview scheduling
    // Applications should be accepted, shortlisted, or reviewed to schedule interviews
    const applicationStatus = (application as { status?: string }).status;
    if (
      applicationStatus &&
      !['accepted', 'shortlisted', 'reviewed'].includes(applicationStatus)
    ) {
      res.status(400).json({
        message:
          'Your application must be reviewed and accepted before you can schedule an interview. Please wait for the company to review your application.',
      });
      return;
    }

    // Check if there's already an interview for this stage or any active interview
    // IMPORTANT: Check for same role (jobId) to prevent multiple pending interviews for same role
    const existingInterview = await Interview.findOne({
      jobId: jobData._id || job._id,
      graduateId: graduate._id,
      $or: [
        { status: { $in: ['pending_selection', 'scheduled', 'in_progress'] } },
        { stage: nextStage, status: { $ne: 'cancelled' } },
      ],
    });

    if (existingInterview) {
      if (existingInterview.stage === nextStage) {
        res.status(400).json({
          message: `Stage ${nextStage} interview is already scheduled or in progress for this role`,
        });
        return;
      }
      res.status(400).json({
        message:
          'An interview is already scheduled or pending for this role. Please wait until the current interview is completed or missed before scheduling another one.',
      });
      return;
    }

    // Create Calendly event using company's access token
    let calendlyEvent;
    try {
      calendlyEvent = await calendlyService.createScheduledEvent(
        eventTypeUri,
        inviteeEmail,
        startTime,
        accessTokenToUse,
        {
          inviteeName:
            inviteeName || `${graduate.firstName} ${graduate.lastName}`.trim(),
          location,
        }
      );
    } catch (error) {
      console.error('Error creating Calendly event:', error);
      res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to create Calendly event',
      });
      return;
    }

    // Calculate end time (default 30 minutes if not provided by Calendly)
    const endDate = calendlyEvent.end_time
      ? new Date(calendlyEvent.end_time)
      : new Date(startDate.getTime() + 30 * 60 * 1000);
    const durationMinutes = Math.round(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60)
    );

    // Get company user ID
    const companyUserIdValue =
      job.companyId &&
      typeof job.companyId === 'object' &&
      'userId' in job.companyId
        ? (job.companyId as { userId?: mongoose.Types.ObjectId }).userId
        : null;

    if (!companyUserIdValue) {
      res.status(404).json({ message: 'Company user ID not found' });
      return;
    }

    // Create interview record
    const roomSlug = generateInterviewSlug();
    const roomUrl =
      calendlyEvent.location?.location || buildInterviewRoomUrl(roomSlug);

    const interview = new Interview({
      applicationId: application._id,
      jobId: jobData._id || job._id,
      companyId: companyId,
      companyUserId: companyUserIdValue,
      graduateId: graduate._id,
      graduateUserId: graduate.userId!,
      scheduledAt: startDate,
      durationMinutes,
      status: 'scheduled',
      roomSlug,
      roomUrl,
      provider: 'calendly',
      stage: nextStage,
      calendlyEventUri: calendlyEvent.uri,
      calendlyEventTypeUri: eventTypeUri,
      calendlyInviteeUri: calendlyEvent.event_memberships?.[0]?.user,
      createdBy: graduate.userId!,
    });

    const savedInterview = await interview.save();

    // Update application status
    const newApplicationStatus =
      application.status === 'pending' || application.status === 'reviewed'
        ? 'shortlisted'
        : application.status;

    await Application.findByIdAndUpdate(application._id, {
      interviewScheduledAt: startDate,
      interviewLink: roomUrl,
      status: newApplicationStatus,
    });

    // Send notifications
    try {
      const graduateName =
        `${graduate.firstName || ''} ${graduate.lastName || ''}`.trim() ||
        'there';
      const companyName =
        job.companyId &&
        typeof job.companyId === 'object' &&
        'companyName' in job.companyId
          ? (job.companyId as { companyName: string }).companyName
          : 'the company';
      const formattedDate = startDate.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

      // Get stage information
      const stageInfoData = getInterviewStageInfo(jobData, nextStage);

      // Notify candidate
      await createNotification({
        userId: graduate.userId!,
        type: 'interview',
        title: 'Interview Scheduled',
        message: `An interview${stageInfoData.stageInfo} has been scheduled for ${job.title || 'the position'} at ${companyName} on ${formattedDate}`,
        relatedId: savedInterview._id as mongoose.Types.ObjectId,
        relatedType: 'interview',
        email: {
          subject: `Interview Scheduled: ${job.title || 'Position'} at ${companyName}${stageInfoData.stageInfo}`,
          text: `Hello ${graduateName},\n\nYour interview${stageInfoData.stageInfo} for "${job.title || 'the position'}" at ${companyName} has been scheduled via Calendly.\n\nDate & Time: ${formattedDate}\nDuration: ${durationMinutes} minutes\nJoin Link: ${roomUrl}${stageInfoData.totalStagesInfo}\n\n📅 Add to Calendar: The interview has been added to your Calendly calendar. You can also join directly from your Talent Hub Interviews tab when it's time.\n\nBest of luck!`,
        },
      });

      // Notify company
      const companyUserId =
        job.companyId &&
        typeof job.companyId === 'object' &&
        'userId' in job.companyId
          ? (job.companyId as { userId?: mongoose.Types.ObjectId }).userId
          : null;

      if (companyUserId) {
        await createNotification({
          userId: companyUserId,
          type: 'interview',
          title: 'Interview Scheduled via Calendly',
          message: `${graduateName} has scheduled an interview${stageInfoData.stageInfo} for "${job.title || 'the position'}" via Calendly on ${formattedDate}`,
          relatedId: savedInterview._id as mongoose.Types.ObjectId,
          relatedType: 'interview',
          email: {
            subject: `Interview Scheduled: ${graduateName} - ${job.title || 'Position'}${stageInfoData.stageInfo}`,
            text: `Hello,\n\n${graduateName} has scheduled an interview${stageInfoData.stageInfo} via Calendly for "${job.title || 'the position'}".\n\nDate & Time: ${formattedDate}\nDuration: ${durationMinutes} minutes\nJoin Link: ${roomUrl}${stageInfoData.totalStagesInfo}\n\n📅 The interview has been added to your Calendly calendar. You can also join directly from your Talent Hub Interviews tab when it's time.`,
          },
        });
      }
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    res.json({
      message: 'Interview scheduled successfully via Calendly',
      interview: {
        id: String(savedInterview._id),
        scheduledAt: savedInterview.scheduledAt,
        durationMinutes: savedInterview.durationMinutes,
        roomUrl: savedInterview.roomUrl,
        calendlyEventUri: savedInterview.calendlyEventUri,
        status: savedInterview.status,
      },
      calendlyEvent: {
        uri: calendlyEvent.uri,
        startTime: calendlyEvent.start_time,
        endTime: calendlyEvent.end_time,
        location: calendlyEvent.location,
      },
    });
  } catch (error) {
    console.error('Schedule Calendly interview error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Mark interview as done or missed (Company)
 * PUT /api/companies/interviews/:interviewId/status
 */
export const updateInterviewStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { interviewId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(interviewId)) {
      res.status(400).json({ message: 'Invalid interview ID' });
      return;
    }

    if (!status || !['completed', 'missed'].includes(status)) {
      res.status(400).json({
        message: "Status must be either 'completed' or 'missed'",
      });
      return;
    }

    // Get company
    const company = await Company.findOne({ userId }).lean();
    if (!company) {
      res.status(404).json({ message: 'Company profile not found' });
      return;
    }

    // Get interview with populated data (use lean for read-only)
    const interview = await Interview.findById(interviewId)
      .populate({
        path: 'jobId',
        select: 'title companyId',
      })
      .populate({
        path: 'applicationId',
        select: 'status',
      })
      .populate({
        path: 'graduateId',
        select: 'firstName lastName userId',
      })
      .lean();

    if (!interview) {
      res.status(404).json({ message: 'Interview not found' });
      return;
    }

    // Verify interview belongs to company
    const job = interview.jobId as
      | { companyId?: mongoose.Types.ObjectId }
      | mongoose.Types.ObjectId;
    const jobData =
      typeof job === 'object' &&
      job &&
      !(job instanceof mongoose.Types.ObjectId)
        ? job
        : null;

    if (
      !jobData ||
      !jobData.companyId ||
      jobData.companyId.toString() !== company._id.toString()
    ) {
      res
        .status(403)
        .json({ message: 'Interview does not belong to your company' });
      return;
    }

    // Only allow updating from scheduled or in_progress status
    // Use atomic update to prevent race conditions
    const updateData: {
      status: 'completed' | 'missed';
      endedAt?: Date;
      startedAt?: Date;
      updatedBy: mongoose.Types.ObjectId;
    } = {
      status: status as 'completed' | 'missed',
      updatedBy: new mongoose.Types.ObjectId(userId),
    };

    if (status === 'completed') {
      updateData.endedAt = new Date();
      if (!interview.startedAt) {
        updateData.startedAt = new Date();
      }
    }

    // Use transaction to ensure atomicity of interview and application updates
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Atomic update: only update if status is still scheduled or in_progress
      // First verify company ownership separately since we can't use populated field in query
      if (
        !jobData ||
        !jobData.companyId ||
        jobData.companyId.toString() !== company._id.toString()
      ) {
        await session.abortTransaction();
        session.endSession();
        res
          .status(403)
          .json({ message: 'Interview does not belong to your company' });
        return;
      }

      const updatedInterview = await Interview.findOneAndUpdate(
        {
          _id: interviewId,
          status: { $in: ['scheduled', 'in_progress'] },
        },
        updateData,
        {
          new: true,
          session,
        }
      ).lean();

      if (!updatedInterview) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({
          message:
            'Interview status has changed or does not belong to your company. Please refresh and try again.',
        });
        return;
      }

      // Update application status if interview is completed (within transaction)
      if (status === 'completed') {
        await Application.findByIdAndUpdate(
          interview.applicationId,
          {
            $set: { status: 'interviewed' },
          },
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }

    // Send notifications (outside transaction to avoid blocking)
    try {
      // Re-fetch interview with populated data for notifications
      const interviewForNotify = await Interview.findById(interviewId)
        .populate({
          path: 'graduateId',
          select: 'firstName lastName userId',
        })
        .populate({
          path: 'jobId',
          select: 'title',
        })
        .lean();

      if (!interviewForNotify) {
        res.status(500).json({ message: 'Failed to fetch interview data' });
        return;
      }

      const graduate = interviewForNotify.graduateId as
        | {
            firstName?: string;
            lastName?: string;
            userId?: mongoose.Types.ObjectId;
          }
        | mongoose.Types.ObjectId;
      const graduateData =
        typeof graduate === 'object' &&
        graduate &&
        !(graduate instanceof mongoose.Types.ObjectId)
          ? graduate
          : null;

      const graduateName =
        graduateData?.firstName && graduateData?.lastName
          ? `${graduateData.firstName} ${graduateData.lastName}`
          : 'Candidate';

      const notifyJob = interviewForNotify.jobId as
        | { title?: string }
        | mongoose.Types.ObjectId;
      const jobTitle =
        notifyJob && typeof notifyJob === 'object' && 'title' in notifyJob
          ? notifyJob.title
          : 'the position';

      if (status === 'completed') {
        // Notify graduate that interview is completed
        if (graduateData?.userId) {
          const graduateUserId =
            graduateData.userId instanceof mongoose.Types.ObjectId
              ? graduateData.userId.toString()
              : String(graduateData.userId);

          await createNotification({
            userId: graduateUserId,
            type: 'interview',
            title: 'Interview Completed',
            message: `Your interview for "${jobTitle}" at ${company.companyName} has been marked as completed. The company will review and get back to you.`,
            relatedId:
              interviewForNotify._id instanceof mongoose.Types.ObjectId
                ? interviewForNotify._id
                : new mongoose.Types.ObjectId(String(interviewForNotify._id)),
            relatedType: 'interview',
            email: {
              subject: `Interview Completed: ${jobTitle} at ${company.companyName}`,
              text: `Hello ${graduateName},\n\nYour interview for "${jobTitle}" at ${company.companyName} has been completed. The company will review your interview and get back to you with their decision.\n\nThank you for your time!`,
            },
          });
        }
      } else if (status === 'missed') {
        // Notify graduate that interview was missed
        if (graduateData?.userId) {
          const graduateUserId =
            graduateData.userId instanceof mongoose.Types.ObjectId
              ? graduateData.userId.toString()
              : String(graduateData.userId);

          await createNotification({
            userId: graduateUserId,
            type: 'interview',
            title: 'Interview Missed',
            message: `Your interview for "${jobTitle}" at ${company.companyName} was marked as missed. Please contact the company if you'd like to reschedule.`,
            relatedId:
              interviewForNotify._id instanceof mongoose.Types.ObjectId
                ? interviewForNotify._id
                : new mongoose.Types.ObjectId(String(interviewForNotify._id)),
            relatedType: 'interview',
            email: {
              subject: `Interview Missed: ${jobTitle} at ${company.companyName}`,
              text: `Hello ${graduateName},\n\nYour interview for "${jobTitle}" at ${company.companyName} was marked as missed. If you'd like to reschedule, please contact the company or check your Interviews page for options.\n\nBest regards.`,
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }

    // Get the updated interview for response
    const finalInterview = await Interview.findById(interviewId)
      .select('_id status')
      .lean();

    res.json({
      message: `Interview marked as ${status} successfully`,
      interview: {
        id:
          finalInterview?._id instanceof mongoose.Types.ObjectId
            ? finalInterview._id.toString()
            : String(finalInterview?._id || interviewId),
        status: finalInterview?.status || status,
      },
    });
  } catch (error) {
    console.error('Update interview status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Reschedule a missed interview (Company)
 * POST /api/companies/interviews/:interviewId/reschedule
 */
export const rescheduleMissedInterview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { interviewId } = req.params;
    const { timeSlots, companyTimezone, selectionDeadline } = req.body;

    if (!mongoose.Types.ObjectId.isValid(interviewId)) {
      res.status(400).json({ message: 'Invalid interview ID' });
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

    // Get company
    const company = await Company.findOne({ userId }).lean();
    if (!company) {
      res.status(404).json({ message: 'Company profile not found' });
      return;
    }

    // Get interview (use lean for read-only, will re-fetch in transaction if needed)
    const interview = await Interview.findById(interviewId)
      .populate({
        path: 'jobId',
        select: 'companyId title interviewStages interviewStageTitles',
      })
      .populate({
        path: 'applicationId',
        select: 'status',
      })
      .populate({
        path: 'graduateId',
        select: 'firstName lastName userId',
      })
      .lean();

    if (!interview) {
      res.status(404).json({ message: 'Interview not found' });
      return;
    }

    // Verify interview belongs to company
    const job = interview.jobId as
      | {
          companyId?: mongoose.Types.ObjectId;
          title?: string;
          interviewStages?: 1 | 2 | 3;
          interviewStageTitles?: string[];
        }
      | mongoose.Types.ObjectId;
    const jobData =
      typeof job === 'object' &&
      job &&
      !(job instanceof mongoose.Types.ObjectId)
        ? job
        : null;

    if (
      !jobData ||
      !jobData.companyId ||
      jobData.companyId.toString() !== company._id.toString()
    ) {
      res
        .status(403)
        .json({ message: 'Interview does not belong to your company' });
      return;
    }

    // Only allow rescheduling missed interviews
    // Also check if there's already a pending interview for the same role
    const jobIdForQuery =
      jobData && typeof jobData === 'object' && '_id' in jobData
        ? (jobData as { _id?: mongoose.Types.ObjectId })._id
        : interview.jobId instanceof mongoose.Types.ObjectId
          ? interview.jobId
          : new mongoose.Types.ObjectId(String(interview.jobId));

    const graduateIdForQuery =
      interview.graduateId instanceof mongoose.Types.ObjectId
        ? interview.graduateId
        : new mongoose.Types.ObjectId(String(interview.graduateId));

    const existingPendingInterview = await Interview.findOne({
      jobId: jobIdForQuery,
      graduateId: graduateIdForQuery,
      _id: { $ne: new mongoose.Types.ObjectId(interviewId) },
      status: { $in: ['pending_selection', 'scheduled', 'in_progress'] },
    }).lean();

    if (existingPendingInterview) {
      res.status(400).json({
        message:
          'Another interview is already scheduled or pending for this role. Please wait until it is completed or missed before rescheduling.',
      });
      return;
    }

    // Validate each time slot
    const validDurations = [15, 30, 45, 60];
    const now = new Date();
    const suggestedSlots: ISuggestedTimeSlot[] = [];
    const seenDates = new Set<string>();

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

      const dateKey = slotDate.toISOString();
      if (seenDates.has(dateKey)) {
        res.status(400).json({
          message: 'Duplicate time slots are not allowed',
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

    // Use atomic update to prevent race conditions
    // Only update if status is still 'missed' and belongs to company
    const session = await mongoose.startSession();
    session.startTransaction();

    let updatedInterviewForNotify: any = null;

    try {
      // Verify company ownership before update (already checked above, but double-check in transaction)
      if (
        !jobData ||
        !jobData.companyId ||
        jobData.companyId.toString() !== company._id.toString()
      ) {
        await session.abortTransaction();
        session.endSession();
        res
          .status(403)
          .json({ message: 'Interview does not belong to your company' });
        return;
      }

      const updatedInterview = await Interview.findOneAndUpdate(
        {
          _id: interviewId,
          status: 'missed',
        },
        {
          $set: {
            status: 'pending_selection',
            suggestedTimeSlots: suggestedSlots,
            companyTimezone: companyTimezone,
            durationMinutes: suggestedSlots[0].duration,
            selectionDeadline: selectionDeadline
              ? new Date(selectionDeadline)
              : undefined,
            scheduledAt: suggestedSlots[0].date,
            updatedBy: new mongoose.Types.ObjectId(userId),
          },
        },
        {
          new: true,
          session,
        }
      )
        .populate({
          path: 'jobId',
          select: 'companyId title',
        })
        .populate({
          path: 'graduateId',
          select: 'firstName lastName userId',
        })
        .lean();

      if (!updatedInterview) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({
          message:
            'Interview status has changed or does not belong to your company. Please refresh and try again.',
        });
        return;
      }

      await session.commitTransaction();
      session.endSession();

      // Use updatedInterview for notifications and response
      updatedInterviewForNotify = updatedInterview;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }

    // Send notification to graduate
    const graduate = updatedInterviewForNotify.graduateId as
      | {
          firstName?: string;
          lastName?: string;
          userId?: mongoose.Types.ObjectId;
        }
      | mongoose.Types.ObjectId;
    const graduateData =
      typeof graduate === 'object' &&
      graduate &&
      !(graduate instanceof mongoose.Types.ObjectId)
        ? graduate
        : null;

    const updatedJobData = updatedInterviewForNotify.jobId as
      | { title?: string }
      | mongoose.Types.ObjectId;

    if (graduateData?.userId) {
      const graduateName =
        graduateData.firstName && graduateData.lastName
          ? `${graduateData.firstName} ${graduateData.lastName}`
          : 'there';
      const graduateUserId =
        graduateData.userId instanceof mongoose.Types.ObjectId
          ? graduateData.userId.toString()
          : String(graduateData.userId);

      const jobTitle =
        updatedJobData &&
        typeof updatedJobData === 'object' &&
        'title' in updatedJobData
          ? updatedJobData.title
          : 'the position';

      try {
        await createNotification({
          userId: graduateUserId,
          type: 'interview',
          title: 'Interview Rescheduled',
          message: `${company.companyName} has rescheduled your interview for "${jobTitle}". Please select your preferred time slot.`,
          relatedId:
            updatedInterviewForNotify._id instanceof mongoose.Types.ObjectId
              ? updatedInterviewForNotify._id
              : new mongoose.Types.ObjectId(
                  String(updatedInterviewForNotify._id)
                ),
          relatedType: 'interview',
          email: {
            subject: `Interview Rescheduled: ${jobTitle} at ${company.companyName}`,
            text: `Hello ${graduateName},\n\n${company.companyName} has rescheduled your interview for "${jobTitle}". ${suggestedSlots.length} new time slot${suggestedSlots.length > 1 ? 's have' : ' has'} been suggested.\n\nPlease log in to Talent Hub to view the available times and select your preferred slot.\n\nBest of luck!`,
          },
        });
      } catch (error) {
        console.error('Failed to send reschedule notification:', error);
      }
    }

    const interviewIdInstance =
      updatedInterviewForNotify._id instanceof mongoose.Types.ObjectId
        ? updatedInterviewForNotify._id.toString()
        : String(updatedInterviewForNotify._id);

    res.json({
      message: 'Interview rescheduled successfully',
      interview: {
        id: interviewIdInstance,
        status: updatedInterviewForNotify.status,
        suggestedTimeSlots: updatedInterviewForNotify.suggestedTimeSlots,
        companyTimezone: updatedInterviewForNotify.companyTimezone,
        selectionDeadline: updatedInterviewForNotify.selectionDeadline,
      },
    });
  } catch (error) {
    console.error('Reschedule interview error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
