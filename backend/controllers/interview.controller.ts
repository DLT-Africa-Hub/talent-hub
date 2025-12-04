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
    res.status(403).json({ message: 'You do not have access to this interview' });
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
        id: interview.companyId?._id?.toString?.() ?? companyInfo?._id?.toString?.(),
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
        counterpartName: participantRole === 'company' ? graduateName : companyInfo?.companyName,
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

  const { applicationId, timeSlots, companyTimezone, selectionDeadline } = req.body;

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
      res.status(400).json({ message: 'Duration must be 15, 30, 45, or 60 minutes' });
      return;
    }

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
  const jobData = (typeof job === 'object' && job && !(job instanceof mongoose.Types.ObjectId)) ? job : null;
  
  if (!jobData || jobData.companyId?.toString() !== company._id.toString()) {
    res.status(403).json({ message: 'Application does not belong to your company' });
    return;
  }

  const graduate = application.graduateId as PopulatedGraduate | mongoose.Types.ObjectId;
  const graduateData = (typeof graduate === 'object' && graduate && !(graduate instanceof mongoose.Types.ObjectId)) ? graduate : null;

  if (!graduateData?.userId) {
    res.status(400).json({ message: 'Graduate profile is missing a linked user account' });
    return;
  }

  // Check for existing active interview
  const existingInterview = await Interview.findOne({
    applicationId: application._id,
    status: { $in: ['pending_selection', 'scheduled', 'in_progress'] },
  });

  if (existingInterview) {
    res.status(400).json({ 
      message: 'An interview is already scheduled or pending for this application' 
    });
    return;
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
    selectionDeadline: selectionDeadline ? new Date(selectionDeadline) : undefined,
  });

  await interview.save();

  // Update application status
  application.status = 'interviewed';
  if (!application.reviewedAt) {
    application.reviewedAt = new Date();
  }
  await application.save();

  // Send notification to graduate
  const graduateName = `${graduateData.firstName || ''} ${graduateData.lastName || ''}`.trim();
  const graduateUserId = graduateData.userId instanceof mongoose.Types.ObjectId
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

  // Get graduate's timezone from profile or default to UTC
  const graduateTimezone = 'UTC'; // Could be stored in profile

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

  // Get interview
  const interview = await Interview.findOne({
    _id: new mongoose.Types.ObjectId(interviewId),
    graduateId: graduate._id,
    status: 'pending_selection',
  });

  if (!interview) {
    res.status(404).json({ message: 'Interview not found or already confirmed' });
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
  if (new Date(selectedSlot.date) < new Date()) {
    res.status(400).json({ message: 'Selected time slot has already passed' });
    return;
  }

  // Update interview with selected slot
  interview.selectedTimeSlot = {
    date: selectedSlot.date,
    duration: selectedSlot.duration,
    timezone: selectedSlot.timezone,
    selectedAt: new Date(),
  };
  interview.scheduledAt = selectedSlot.date;
  interview.durationMinutes = selectedSlot.duration;
  interview.status = 'scheduled';
  interview.graduateTimezone = graduateTimezone || 'UTC';
  interview.updatedBy = new mongoose.Types.ObjectId(userId);

  await interview.save();

  // Update application
  const application = await Application.findById(interview.applicationId);
  if (application) {
    application.interviewScheduledAt = selectedSlot.date;
    application.interviewLink = interview.roomUrl;
    application.interviewRoomSlug = interview.roomSlug;
    application.interviewId = interview._id as mongoose.Types.ObjectId;
    await application.save();
  }

  // Get company and job info for notifications
  const company = await Company.findById(interview.companyId).lean();
  const job = await Job.findById(interview.jobId).select('title').lean();

  const formattedDate = formatDateInTimezone(
    selectedSlot.date,
    interview.companyTimezone || 'UTC',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }
  );

  const graduateName = `${graduate.firstName || ''} ${graduate.lastName || ''}`.trim();

  // Notify company
  try {
    const companyUserId = interview.companyUserId instanceof mongoose.Types.ObjectId
      ? interview.companyUserId.toString()
      : String(interview.companyUserId);

    await createNotification({
      userId: companyUserId,
      type: 'interview',
      title: 'Interview Time Confirmed',
      message: `${graduateName || 'A candidate'} has selected a time slot for their interview: ${formattedDate}.`,
      relatedId: interview._id as mongoose.Types.ObjectId,
      relatedType: 'interview',
      email: {
        subject: `Interview Confirmed: ${job?.title || 'Position'}`,
        text: `Hello,\n\n${graduateName || 'A candidate'} has confirmed their interview time for "${job?.title || 'the position'}".\n\nScheduled: ${formattedDate}\nJoin Link: ${interview.roomUrl}\n\nYou can join the interview from your Talent Hub Interviews tab when it's time.`,
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
      message: `Your interview with ${company?.companyName || 'the company'} is confirmed for ${formattedDate}.`,
      relatedId: interview._id as mongoose.Types.ObjectId,
      relatedType: 'interview',
    });
  } catch (error) {
    console.error('Failed to send interview confirmation to graduate:', error);
  }

  res.json({
    message: 'Time slot selected successfully',
    interview: {
      id: interview._id?.toString(),
      status: interview.status,
      scheduledAt: interview.scheduledAt,
      durationMinutes: interview.durationMinutes,
      roomSlug: interview.roomSlug,
      roomUrl: interview.roomUrl,
      selectedTimeSlot: interview.selectedTimeSlot,
    },
  });
};

