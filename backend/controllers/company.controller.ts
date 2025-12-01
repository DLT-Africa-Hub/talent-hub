import '../types/express.d';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Company from '../models/Company.model';
import Job from '../models/Job.model';
import Match from '../models/Match.model';
import Graduate from '../models/Graduate.model';
import Application from '../models/Application.model';
import Interview, { InterviewStatus } from '../models/Interview.model';
import { AIServiceError, generateJobEmbedding } from '../services/aiService';
import { queueJobMatching } from '../services/aiMatching.service';
import {
  validateRequiredString,
  validateOptionalString,
  validateObjectId,
  validatePagination,
  validateEnum,
  validateOptionalEnum,
  validateSalary,
  validateSkills,
  validateNumericRange,
  deleteUndefined,
} from '../utils/validation.utils';

import '../middleware/auth.middleware';
import {
  notifyCompanyJobCreated,
  notifyCompanyProfileUpdated,
} from '../services/notification.dispatcher';
import { createNotification } from '../services/notification.service';
import {
  buildInterviewRoomUrl,
  generateInterviewSlug,
} from '../utils/interview.utils';

const INTERVIEW_STATUS_VALUES: readonly InterviewStatus[] = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
] as const;

const serializeCompanyInterview = (interview: any) => {
  const interviewData = interview as Record<string, any>;
  const graduate = interviewData.graduateId || {};
  const job = interviewData.jobId || {};
  const companyInfo =
    job.companyId &&
    typeof job.companyId === 'object' &&
    'companyName' in job.companyId
      ? job.companyId
      : null;

  const rawApplicationId = interviewData.applicationId;
  const applicationId =
    rawApplicationId instanceof mongoose.Types.ObjectId
      ? rawApplicationId.toString()
      : typeof rawApplicationId === 'string'
        ? rawApplicationId
        : undefined;

  return {
    id: interviewData._id?.toString?.() ?? '',
    applicationId,
    scheduledAt: interviewData.scheduledAt,
    status: interviewData.status,
    durationMinutes: interviewData.durationMinutes,
    roomSlug: interviewData.roomSlug,
    roomUrl: interviewData.roomUrl,
    job: {
      id: job._id?.toString?.(),
      title: job.title,
      location: job.location,
      jobType: job.jobType,
      companyName: companyInfo?.companyName,
    },
    participant: {
      name: `${graduate.firstName || ''} ${graduate.lastName || ''}`.trim(),
      role: graduate.position,
      rank: graduate.rank,
      avatar: graduate.profilePictureUrl,
    },
  };
};

/**
 * Get company profile
 * GET /api/companies/profile
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const company = await Company.findOne({ userId })
    .populate('userId', 'email')
    .lean();

  if (!company) {
    res.status(404).json({ message: 'Company profile not found' });
    return;
  }

  res.json(company);
};

/**
 * Create company profile
 * POST /api/companies/profile
 */
export const createProfile = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { companyName, industry, companySize, description, website, location } = req.body;

  const validatedName = validateRequiredString(companyName, 'Company name', res);
  if (!validatedName) return;

  const validatedIndustry = validateRequiredString(industry, 'Industry', res);
  if (!validatedIndustry) return;

  const validatedSize = validateNumericRange(companySize, 1, 100000, 'Company size', res);
  if (validatedSize === null) return;

  const validatedDescription = validateRequiredString(description, 'Description', res);
  if (!validatedDescription) return;

  const validatedWebsite = website ? validateOptionalString(website, 'Website', res) : null;
  if (website && validatedWebsite === null) return;

  const validatedLocation = location ? validateOptionalString(location, 'Location', res) : null;
  if (location && validatedLocation === null) return;

  const existingCompany = await Company.findOne({ userId }).lean();

  if (existingCompany) {
    res.status(409).json({ message: 'Company profile already exists. Use PUT to update.' });
    return;
  }

  const company = new Company({
    userId: new mongoose.Types.ObjectId(userId),
    companyName: validatedName,
    industry: validatedIndustry,
    companySize: validatedSize,
    description: validatedDescription,
    ...deleteUndefined({
      website: validatedWebsite,
      location: validatedLocation,
    }),
  });

  await company.save();

  res.status(201).json({
    message: 'Company profile created successfully',
    company,
  });
};

/**
 * Update company profile
 * PUT /api/companies/profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const company = await Company.findOne({ userId });

  if (!company) {
    res.status(404).json({ message: 'Company profile not found' });
    return;
  }

  const { companyName, industry, companySize, description, website, location } = req.body;

  if (companyName !== undefined) {
    const validated = validateRequiredString(companyName, 'Company name', res);
    if (!validated) return;
    company.companyName = validated;
  }

  if (industry !== undefined) {
    const validated = validateRequiredString(industry, 'Industry', res);
    if (!validated) return;
    company.industry = validated;
  }

  if (companySize !== undefined) {
    const validated = validateNumericRange(companySize, 1, 100000, 'Company size', res);
    if (validated === null) return;
    company.companySize = validated;
  }

  if (description !== undefined) {
    const validated = validateRequiredString(description, 'Description', res);
    if (!validated) return;
    company.description = validated;
  }

  if (website !== undefined) {
    const validated = validateOptionalString(website, 'Website', res);
    if (validated === null && website !== null) return;
    company.website = validated || undefined;
  }

  if (location !== undefined) {
    const validated = validateOptionalString(location, 'Location', res);
    if (validated === null && location !== null) return;
    company.location = validated || undefined;
  }

  await company.save();

  // Emit notification for profile update
  try {
    await notifyCompanyProfileUpdated({
      companyId: company.userId.toString(),
      companyName: company.companyName,
    });
  } catch (error) {
    console.error('Failed to send profile update notification:', error);
  }

  res.json({
    message: 'Company profile updated successfully',
    company,
  });
};

/**
 * Parse preferred rank string into array of ranks
 * Examples: "A" -> ["A"], "A and B" -> ["A", "B"], "B and C" -> ["B", "C"]
 */
const parsePreferredRank = (
  preferedRank: 'A' | 'B' | 'C' | 'D' | 'A and B' | 'B and C' | 'C and D'
): string[] => {
  if (preferedRank.includes(' and ')) {
    return preferedRank.split(' and ') as string[];
  }
  return [preferedRank];
};

/**
 * Match graduates based on rank when a job is posted
 * This creates matches automatically for graduates whose rank matches the job's preferred rank
 */
const matchGraduatesByRank = async (
  jobId: mongoose.Types.ObjectId,
  preferedRank: 'A' | 'B' | 'C' | 'D' | 'A and B' | 'B and C' | 'C and D',
  jobTitle: string,
  companyName: string
): Promise<void> => {
  try {
    // Parse the preferred rank into an array
    const requiredRanks = parsePreferredRank(preferedRank);

    // Find all graduates with matching ranks
    const matchingGraduates = await Graduate.find({
      rank: { $in: requiredRanks },
    }).select('_id userId').lean();

    if (matchingGraduates.length === 0) {
      console.log(
        `[Rank Matching] No graduates found with ranks: ${requiredRanks.join(', ')}`
      );
      return;
    }

    console.log(
      `[Rank Matching] Found ${matchingGraduates.length} graduates matching ranks: ${requiredRanks.join(', ')}`
    );

    // Create matches for each graduate
    const matchPromises = matchingGraduates.map(async (graduate) => {
      try {
        // Check if match already exists
        const existingMatch = await Match.findOne({
          graduateId: graduate._id,
          jobId: jobId,
        });

        if (existingMatch) {
          console.log(
            `[Rank Matching] Match already exists for graduate ${graduate._id} and job ${jobId}`
          );
          return;
        }

        // Create new match with a base score of 100 (rank-based match)
        const match = new Match({
          graduateId: graduate._id,
          jobId: jobId,
          score: 100, // Full score for rank-based match
          status: 'pending',
        });

        await match.save();

        // Send notification to graduate
        // The userId field in Graduate model references User._id
        const graduateUserId =
          graduate.userId instanceof mongoose.Types.ObjectId
            ? graduate.userId.toString()
            : String(graduate.userId);

        const matchId = match._id instanceof mongoose.Types.ObjectId
          ? match._id.toString()
          : String(match._id);

        // Send notification with custom message for rank-based match
        await createNotification({
          userId: graduateUserId,
          type: 'match',
          title: 'New Job Match Based on Your Rank!',
          message: `Your rank matched you with "${jobTitle}" at ${companyName}. You've been automatically matched based on your assessment rank.`,
          relatedId: matchId,
          relatedType: 'match',
        });

        console.log(
          `[Rank Matching] Created match and sent notification for graduate ${graduate._id}`
        );
      } catch (error) {
        console.error(
          `[Rank Matching] Error creating match for graduate ${graduate._id}:`,
          error
        );
        // Continue with other graduates even if one fails
      }
    });

    await Promise.all(matchPromises);
    console.log(
      `[Rank Matching] Completed matching for job ${jobId} with ${matchingGraduates.length} graduates`
    );
  } catch (error) {
    console.error('[Rank Matching] Error in matchGraduatesByRank:', error);
    // Don't throw - matching shouldn't break job creation
  }
};

/**
 * Create a new job posting
 * POST /api/companies/jobs
 */
export const createJob = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const company = await Company.findOne({ userId }).lean();

  if (!company) {
    res.status(404).json({ message: 'Company profile not found' });
    return;
  }

  const { title, jobType, preferedRank, description, requirements, location, salary, status, directContact } =
    req.body;

  const validatedTitle = validateRequiredString(title, 'Title', res);
  if (!validatedTitle) return;

  const validatedJobType = validateEnum(
    jobType,
    ['Full time', 'Part time', 'Contract', 'Internship'] as const,
    'Job type',
    res
  );
  if (!validatedJobType) return;

  const validatedPreferedRank = validateEnum(
    preferedRank,
    ['A', 'B', 'C', 'D', 'A and B', 'B and C', 'C and D'] as const,
    'Preferred rank',
    res
  );
  if (!validatedPreferedRank) return;

  const validatedDescription = validateRequiredString(description, 'Description', res);
  if (!validatedDescription) return;

  if (!requirements) {
    res.status(400).json({ message: 'Requirements are required' });
    return;
  }

  const validatedSkills = validateSkills(requirements.skills, res);
  if (!validatedSkills) return;

  // Validate extra requirements if provided
  let validatedExtraRequirements: any[] | undefined;
  if (requirements.extraRequirements && Array.isArray(requirements.extraRequirements)) {
    validatedExtraRequirements = requirements.extraRequirements
      .filter((req: any) => req && typeof req === 'object')
      .map((req: any) => ({
        label: typeof req.label === 'string' && req.label.trim() ? req.label.trim() : null,
        type: ['text', 'url', 'textarea'].includes(req.type) ? req.type : 'text',
        required: Boolean(req.required),
        placeholder: typeof req.placeholder === 'string' ? req.placeholder.trim() : undefined,
      }))
      .filter((req: any) => req.label !== null);

    if (requirements.extraRequirements.length > 0 && validatedExtraRequirements && validatedExtraRequirements.length === 0) {
      res.status(400).json({ message: 'Invalid extra requirements format' });
      return;
    }
  }

  const validatedLocation = location ? validateOptionalString(location, 'Location', res) : null;
  if (location && validatedLocation === null) return;

  const validatedSalary = validateSalary(salary, res);
  if (salary !== undefined && validatedSalary === null) return;

  const validatedStatus = status
    ? validateOptionalEnum(status, ['active', 'closed', 'draft'] as const, 'Status', res)
    : null;
  if (status && validatedStatus === null) return;

  // Validate directContact (default to true if not provided)
  const validatedDirectContact = directContact !== undefined ? Boolean(directContact) : true;

  const jobText = `
    Title: ${validatedTitle}
    Type: ${validatedJobType}
    Preferred Rank: ${validatedPreferedRank}
    Description: ${validatedDescription}
    Required Skills: ${validatedSkills.join(', ')}
  `;

  // Generate embedding - required for AI matching
  let embedding: number[];
  try {
    embedding = await generateJobEmbedding(jobText);
  } catch (error) {
    if (error instanceof AIServiceError) {
      res.status(error.statusCode ?? 503).json({
        message: 'Failed to generate job embedding for AI matching',
        error: error.message,
      });
      return;
    }

    console.error('Error generating embedding:', error);
    res.status(500).json({
      message: 'Failed to generate job embedding. Please try again.',
    });
    return;
  }

  const job = new Job({
    companyId: company._id,
    title: validatedTitle,
    jobType: validatedJobType,
    preferedRank: validatedPreferedRank,
    description: validatedDescription,
    requirements: {
      skills: validatedSkills,
      ...(validatedExtraRequirements && validatedExtraRequirements.length > 0
        ? { extraRequirements: validatedExtraRequirements }
        : {}),
    },
    directContact: validatedDirectContact,
    embedding,
    ...deleteUndefined({
      location: validatedLocation,
      salary: validatedSalary,
      status: validatedStatus,
    }),
  });

  await job.save();

  // Match graduates based on rank (automatic matching)
  // This happens before AI matching to ensure rank-based matches are created immediately
  if (job.status === 'active') {
    await matchGraduatesByRank(
      job._id as mongoose.Types.ObjectId,
      validatedPreferedRank,
      validatedTitle,
      company.companyName
    );
  }

  // Queue matching since embedding was successfully generated
  queueJobMatching(job._id as mongoose.Types.ObjectId);

  // Emit notification for job creation
  try {
    const companyUserId = company.userId?.toString() || userId;
    const jobId = job._id instanceof mongoose.Types.ObjectId
      ? job._id.toString()
      : String(job._id);
    await notifyCompanyJobCreated({
      jobId,
      jobTitle: validatedTitle,
      companyId: companyUserId,
      companyName: company.companyName,
    });
  } catch (error) {
    console.error('Failed to send job creation notification:', error);
  }

  res.status(201).json({
    message: 'Job created successfully',
    job,
  });
};

/**
 * Get all jobs for company
 * GET /api/companies/jobs
 */
export const getJobs = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const company = await Company.findOne({ userId }).lean();

  if (!company) {
    res.status(404).json({ message: 'Company profile not found' });
    return;
  }

  const { status, page = '1', limit = '10' } = req.query;

  const pagination = validatePagination(page as string, limit as string, res);
  if (!pagination) return;

  const validatedStatus = status
    ? validateOptionalEnum(status as string, ['active', 'closed', 'draft'] as const, 'Status', res)
    : null;
  if (status && validatedStatus === null) return;

  const query: any = { companyId: company._id };
  if (validatedStatus) {
    query.status = validatedStatus;
  }

  const skip = (pagination.page - 1) * pagination.limit;

  const [jobs, total] = await Promise.all([
    Job.find(query)
      .select('-embedding')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pagination.limit)
      .lean(),
    Job.countDocuments(query),
  ]);

  // Get match counts for each job
  const jobIds = jobs.map((job) => job._id);
  const matchCounts = await Match.aggregate([
    {
      $match: {
        jobId: { $in: jobIds },
      },
    },
    {
      $group: {
        _id: '$jobId',
        count: { $sum: 1 },
      },
    },
  ]);

  // Create a map with normalized IDs (always as strings)
  const matchCountMap = new Map<string, number>();
  matchCounts.forEach((item) => {
    const jobIdStr =
      item._id instanceof mongoose.Types.ObjectId
        ? item._id.toString()
        : String(item._id);
    matchCountMap.set(jobIdStr, item.count);
  });

  // Get applicant counts for each job
  const applicantCounts = await Application.aggregate([
    {
      $match: {
        jobId: { $in: jobIds },
      },
    },
    {
      $group: {
        _id: '$jobId',
        count: { $sum: 1 },
      },
    },
  ]);

  const applicantCountMap = new Map();
  applicantCounts.forEach((item) => {
    const jobIdStr =
      item._id instanceof mongoose.Types.ObjectId
        ? item._id.toString()
        : String(item._id);
    applicantCountMap.set(jobIdStr, item.count);
  });

  // Add match count and applicant count to each job
  const jobsWithMatches = jobs.map((job) => {
    const jobIdStr =
      job._id instanceof mongoose.Types.ObjectId
        ? job._id.toString()
        : String(job._id);
    return {
      ...job,
      matchCount: matchCountMap.get(jobIdStr) || 0,
      applicantCount: applicantCountMap.get(jobIdStr) || 0,
    };
  });

  res.json({
    jobs: jobsWithMatches,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit),
    },
  });
};

/**
 * Get specific job details
 * GET /api/companies/jobs/:jobId
 */
export const getJob = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const validatedJobId = validateObjectId(req.params.jobId, 'Job ID', res);
  if (!validatedJobId) return;

  const company = await Company.findOne({ userId }).lean();

  if (!company) {
    res.status(404).json({ message: 'Company profile not found' });
    return;
  }

  const job = await Job.findOne({
    _id: new mongoose.Types.ObjectId(validatedJobId),
    companyId: company._id,
  })
    .select('-embedding')
    .lean();

  if (!job) {
    res.status(404).json({ message: 'Job not found' });
    return;
  }

  res.json(job);
};

/**
 * Update job posting
 * PUT /api/companies/jobs/:jobId
 */
export const updateJob = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const validatedJobId = validateObjectId(req.params.jobId, 'Job ID', res);
  if (!validatedJobId) return;

  const company = await Company.findOne({ userId }).lean();

  if (!company) {
    res.status(404).json({ message: 'Company profile not found' });
    return;
  }

  const job = await Job.findOne({
    _id: new mongoose.Types.ObjectId(validatedJobId),
    companyId: company._id,
  });

  if (!job) {
    res.status(404).json({ message: 'Job not found' });
    return;
  }

  const { title, jobType, preferedRank, description, requirements, location, salary, status, directContact } =
    req.body;
  let needsEmbeddingUpdate = false;

  if (title !== undefined) {
    const validated = validateRequiredString(title, 'Title', res);
    if (!validated) return;
    job.title = validated;
    needsEmbeddingUpdate = true;
  }

  if (jobType !== undefined) {
    const validated = validateEnum(
      jobType,
      ['Full time', 'Part time', 'Contract', 'Internship'] as const,
      'Job type',
      res
    );
    if (!validated) return;
    job.jobType = validated;
    needsEmbeddingUpdate = true;
  }

  if (preferedRank !== undefined) {
    const validated = validateEnum(
      preferedRank,
      ['A', 'B', 'C', 'D', 'A and B', 'B and C', 'C and D'] as const,
      'Preferred rank',
      res
    );
    if (!validated) return;
    job.preferedRank = validated;
    needsEmbeddingUpdate = true;
  }

  if (description !== undefined) {
    const validated = validateRequiredString(description, 'Description', res);
    if (!validated) return;
    job.description = validated;
    needsEmbeddingUpdate = true;
  }

  if (requirements !== undefined) {
    const validatedSkills = validateSkills(requirements.skills, res);
    if (!validatedSkills) return;
    job.requirements = {
      skills: validatedSkills,
    };
    needsEmbeddingUpdate = true;
  }

  if (location !== undefined) {
    const validated = validateOptionalString(location, 'Location', res);
    if (validated === null && location !== null) return;
    job.location = validated || undefined;
  }

  if (salary !== undefined) {
    const validated = validateSalary(salary, res);
    if (validated === null && salary !== null) return;
    job.salary = validated || undefined;
  }

  if (status !== undefined) {
    const validated = validateEnum(status, ['active', 'closed', 'draft'] as const, 'Status', res);
    if (!validated) return;
    job.status = validated;
  }

  if (directContact !== undefined) {
    job.directContact = Boolean(directContact);
  }

  if (needsEmbeddingUpdate) {
    const jobText = `
      Title: ${job.title}
      Type: ${job.jobType}
      Preferred Rank: ${job.preferedRank}
      Description: ${job.description}
      Required Skills: ${job.requirements.skills.join(', ')}
    `;

    try {
      job.embedding = await generateJobEmbedding(jobText);
    } catch (error) {
      if (error instanceof AIServiceError) {
        res.status(error.statusCode ?? 503).json({ message: error.message });
        return;
      }

      console.error('Error regenerating embedding:', error);
      res.status(500).json({ message: 'Failed to regenerate job embedding' });
      return;
    }
  }

  await job.save();

  // Convert to plain object and remove embedding for response
  const jobResponse = job.toObject();
  delete jobResponse.embedding;

  res.json({
    message: 'Job updated successfully',
    job: jobResponse,
  });

  if (needsEmbeddingUpdate) {
    queueJobMatching(job._id as mongoose.Types.ObjectId);
  }
};

/**
 * Delete job posting
 * DELETE /api/companies/jobs/:jobId
 */
export const deleteJob = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const validatedJobId = validateObjectId(req.params.jobId, 'Job ID', res);
  if (!validatedJobId) return;

  const company = await Company.findOne({ userId }).lean();

  if (!company) {
    res.status(404).json({ message: 'Company profile not found' });
    return;
  }

  const job = await Job.findOne({
    _id: new mongoose.Types.ObjectId(validatedJobId),
    companyId: company._id,
  }).lean();

  if (!job) {
    res.status(404).json({ message: 'Job not found' });
    return;
  }

  await Promise.all([
    Match.deleteMany({ jobId: new mongoose.Types.ObjectId(validatedJobId) }),
    Application.deleteMany({ jobId: new mongoose.Types.ObjectId(validatedJobId) }),
    Job.deleteOne({ _id: new mongoose.Types.ObjectId(validatedJobId) }),
  ]);

  res.json({ message: 'Job deleted successfully' });
};

/**
 * Get matches for a specific job
 * GET /api/companies/jobs/:jobId/matches
 */
export const getJobMatches = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const validatedJobId = validateObjectId(req.params.jobId, 'Job ID', res);
  if (!validatedJobId) return;

  const company = await Company.findOne({ userId }).lean();

  if (!company) {
    res.status(404).json({ message: 'Company profile not found' });
    return;
  }

  const job = await Job.findOne({
    _id: new mongoose.Types.ObjectId(validatedJobId),
    companyId: company._id,
  }).lean();

  if (!job) {
    res.status(404).json({ message: 'Job not found' });
    return;
  }

  const { status, minScore, page = '1', limit = '10' } = req.query;

  const pagination = validatePagination(page as string, limit as string, res);
  if (!pagination) return;

  const validatedStatus = status
    ? validateOptionalEnum(status as string, ['pending', 'accepted', 'rejected'] as const, 'Status', res)
    : null;
  if (status && validatedStatus === null) return;

  const validatedMinScore = minScore
    ? validateNumericRange(minScore as string, 0, 100, 'Min score', res)
    : null;
  if (minScore !== undefined && validatedMinScore === null) return;

  const query: any = { jobId: new mongoose.Types.ObjectId(validatedJobId) };
  if (validatedStatus) {
    query.status = validatedStatus;
  }
  if (validatedMinScore !== null) {
    query.score = { $gte: validatedMinScore };
  }

  const skip = (pagination.page - 1) * pagination.limit;

  const [matches, total] = await Promise.all([
    Match.find(query)
      .populate({
        path: 'graduateId',
        select: 'firstName lastName skills education rank expYears profilePictureUrl summary cv position location',
        populate: {
          path: 'userId',
          select: 'email',
        },
      })
      .sort({ score: -1 })
      .skip(skip)
      .limit(pagination.limit)
      .lean(),
    Match.countDocuments(query),
  ]);

  res.json({
    matches,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit),
    },
  });
};

/**
 * Accept or reject a match
 * PUT /api/companies/jobs/:jobId/matches/:matchId
 */
export const updateMatchStatus = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const validatedJobId = validateObjectId(req.params.jobId, 'Job ID', res);
  if (!validatedJobId) return;

  const validatedMatchId = validateObjectId(req.params.matchId, 'Match ID', res);
  if (!validatedMatchId) return;

  const validatedStatus = validateEnum(
    req.body.status,
    ['accepted', 'rejected'] as const,
    'Status',
    res
  );
  if (!validatedStatus) return;

  const company = await Company.findOne({ userId }).lean();

  if (!company) {
    res.status(404).json({ message: 'Company profile not found' });
    return;
  }

  const job = await Job.findOne({
    _id: new mongoose.Types.ObjectId(validatedJobId),
    companyId: company._id,
  }).lean();

  if (!job) {
    res.status(404).json({ message: 'Job not found' });
    return;
  }

  const match = await Match.findOne({
    _id: new mongoose.Types.ObjectId(validatedMatchId),
    jobId: new mongoose.Types.ObjectId(validatedJobId),
  });

  if (!match) {
    res.status(404).json({ message: 'Match not found' });
    return;
  }

  match.status = validatedStatus;
  await match.save();

  const matchId = match._id as mongoose.Types.ObjectId;

  // Populate match before sending notification
  await match.populate({
    path: 'graduateId',
    select: 'firstName lastName skills education rank userId location',
    populate: {
      path: 'userId',
      select: 'email',
    },
  });

  try {
    const graduate = match.graduateId as any;
    if (graduate?.userId) {
      await createNotification({
        userId: graduate.userId,
        type: 'match',
        title: validatedStatus === 'accepted' ? 'Match accepted' : 'Match rejected',
        message: `${company.companyName} ${validatedStatus === 'accepted' ? 'accepted' : 'rejected'} your match for ${job.title}`,
        relatedId: matchId,
        relatedType: 'match',
        email: {
          subject: `Your match for ${job.title} was ${validatedStatus}`,
          text: [
            `Hi ${graduate.firstName ?? 'there'},`,
            '',
            `${company.companyName} has ${validatedStatus} your match for "${job.title}".`,
            'Sign in to Talent Hub to review the details.',
          ].join('\n'),
        },
      });
    }
  } catch (notificationError) {
    console.error('Failed to notify graduate about match status change:', notificationError);
  }

  // Use the already populated match object
  const updatedMatch = match.toObject();

  res.json({
    message: `Match ${validatedStatus} successfully`,
    match: updatedMatch,
  });
};

/**
 * Get all matches for company's jobs
 * GET /api/companies/matches
 */
export const getAllMatches = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const company = await Company.findOne({ userId }).lean();

  if (!company) {
    res.status(404).json({ message: 'Company profile not found' });
    return;
  }

  const { status, minScore, page = '1', limit = '10' } = req.query;

  const pagination = validatePagination(page as string, limit as string, res);
  if (!pagination) return;

  const validatedStatus = status
    ? validateOptionalEnum(status as string, ['pending', 'accepted', 'rejected'] as const, 'Status', res)
    : null;
  if (status && validatedStatus === null) return;

  const validatedMinScore = minScore
    ? validateNumericRange(minScore as string, 0, 100, 'Min score', res)
    : null;
  if (minScore !== undefined && validatedMinScore === null) return;

  // Get all company jobs
  const companyJobs = await Job.find({ companyId: company._id }).select('_id').lean();
  const companyJobIds = companyJobs.map((job) => job._id);

  if (companyJobIds.length === 0) {
    res.json({
      matches: [],
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: 0,
        pages: 0,
      },
    });
    return;
  }

  const query: any = { jobId: { $in: companyJobIds } };
  if (validatedStatus) {
    query.status = validatedStatus;
  }
  if (validatedMinScore !== null) {
    query.score = { $gte: validatedMinScore };
  }

  const skip = (pagination.page - 1) * pagination.limit;

  const [matches, total] = await Promise.all([
    Match.find(query)
      .populate({
        path: 'graduateId',
        select: 'firstName lastName skills education rank profilePictureUrl summary cv expYears position location',
        populate: {
          path: 'userId',
          select: 'email',
        },
      })
      .populate({
        path: 'jobId',
        select: 'title companyId location jobType salary directContact',
        populate: {
          path: 'companyId',
          select: 'companyName',
        },
      })
      .sort({ score: -1, createdAt: -1 })
      .skip(skip)
      .limit(pagination.limit)
      .lean(),
    Match.countDocuments(query),
  ]);

  res.json({
    matches,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit),
    },
  });
};

/**
 * Get all applications for company
 * GET /api/companies/applications
 */
export const getApplications = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const company = await Company.findOne({ userId }).lean();

  if (!company) {
    res.status(404).json({ message: 'Company profile not found' });
    return;
  }

  const { status, jobId, page = '1', limit = '10' } = req.query;

  const pagination = validatePagination(page as string, limit as string, res);
  if (!pagination) return;

  const validatedStatus = status
    ? validateOptionalEnum(
      status as string,
      ['pending', 'reviewed', 'shortlisted', 'interviewed', 'accepted', 'rejected', 'withdrawn'] as const,
      'Status',
      res
    )
    : null;
  if (status && validatedStatus === null) return;

  const validatedJobId = jobId ? validateObjectId(jobId as string, 'Job ID', res) : null;
  if (jobId && !validatedJobId) return;

  const companyJobs = await Job.find({ companyId: company._id }).select('_id').lean();

  const companyJobIds = companyJobs.map((job) => job._id);

  if (companyJobIds.length === 0) {
    res.json({
      applications: [],
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: 0,
        pages: 0,
      },
    });
    return;
  }

  const query: any = { jobId: { $in: companyJobIds } };
  if (validatedStatus) {
    query.status = validatedStatus;
  }
  if (validatedJobId) {
    query.jobId = new mongoose.Types.ObjectId(validatedJobId);
  }

  const skip = (pagination.page - 1) * pagination.limit;

  const [applications, total] = await Promise.all([
    Application.find(query)
      .populate({
        path: 'graduateId',
        select: 'firstName lastName skills education rank profilePictureUrl summary cv expYears position location',
        populate: {
          path: 'userId',
          select: 'email',
        },
      })
      .populate({
        path: 'jobId',
        select: 'title companyId directContact',
        populate: {
          path: 'companyId',
          select: 'companyName',
        },
      })
      .populate('matchId', 'score')
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(pagination.limit)
      .lean(),
    Application.countDocuments(query),
  ]);

  res.json({
    applications,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit),
    },
  });
};

/**
 * Update application status (accept/reject)
 * PUT /api/companies/applications/:applicationId/status
 */
export const updateApplicationStatus = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const company = await Company.findOne({ userId }).lean();

  if (!company) {
    res.status(404).json({ message: 'Company profile not found' });
    return;
  }

  const { applicationId } = req.params;
  const { status, notes } = req.body;

  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    res.status(400).json({ message: 'Invalid application ID' });
    return;
  }

  const validatedStatus = validateEnum(
    status,
    ['accepted', 'rejected', 'reviewed', 'shortlisted', 'interviewed', 'offer_sent', 'hired'] as const,
    'Status',
    res
  );
  if (!validatedStatus) return;

  // Verify application belongs to company's jobs
  const application = await Application.findById(applicationId)
    .populate({
      path: 'jobId',
      select: 'companyId title',
      populate: {
        path: 'companyId',
        select: 'userId',
      },
    })
    .populate({
      path: 'graduateId',
      select: 'firstName lastName userId',
    });

  if (!application) {
    res.status(404).json({ message: 'Application not found' });
    return;
  }

  const job = application.jobId as any;
  if (!job || job.companyId?._id?.toString() !== company._id.toString()) {
    res.status(403).json({ message: 'Application does not belong to your company' });
    return;
  }

  // If status is 'accepted', create and send offer
  if (validatedStatus === 'accepted') {
    try {
      const { createAndSendOffer } = await import('../services/offer.service');
      await createAndSendOffer(applicationId, userId);
      // Status will be set to 'offer_sent' by the service
    } catch (error: any) {
      console.error('Failed to create offer:', error);
      res.status(500).json({ 
        message: error.message || 'Failed to create and send offer' 
      });
      return;
    }
  } else {
    application.status = validatedStatus;
    application.reviewedAt = new Date();
    if (notes !== undefined) {
      application.notes = typeof notes === 'string' ? notes.trim() : undefined;
    }
    await application.save();
  }

  // Send notifications (only if not already sent by offer service)
  if (validatedStatus !== 'accepted') {
    try {
      const graduate = application.graduateId as any;
      if (graduate?.userId) {
        const graduateUserId = graduate.userId instanceof mongoose.Types.ObjectId
          ? graduate.userId.toString()
          : String(graduate.userId);
        await createNotification({
          userId: graduateUserId,
          type: 'application',
          title: `Application ${validatedStatus === 'rejected' ? 'Rejected' : 'Updated'}`,
          message: `Your application for "${job.title}" has been ${validatedStatus}.`,
          relatedId: application._id instanceof mongoose.Types.ObjectId
            ? application._id.toString()
            : String(application._id),
          relatedType: 'application',
          email: {
            subject: `Application Update: ${job.title}`,
            text: `Your application for "${job.title}" at ${company.companyName} has been ${validatedStatus}.`,
          },
        });
      }
    } catch (error) {
      console.error('Failed to send application status notification:', error);
    }
  }

  // Reload application to get updated status
  const updatedApplication = await Application.findById(applicationId).lean();

  res.json({
    message: validatedStatus === 'accepted' 
      ? 'Application accepted and offer sent successfully' 
      : 'Application status updated successfully',
    application: updatedApplication || application.toObject({ versionKey: false }),
  });
};

/**
 * Schedule interview for application
 * POST /api/companies/applications/:applicationId/schedule-interview
 */
export const scheduleInterview = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const company = await Company.findOne({ userId }).lean();

  if (!company) {
    res.status(404).json({ message: 'Company profile not found' });
    return;
  }

  const { applicationId } = req.params;
  const { scheduledAt } = req.body;

  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    res.status(400).json({ message: 'Invalid application ID' });
    return;
  }

  if (!scheduledAt) {
    res.status(400).json({ message: 'Scheduled time is required' });
    return;
  }

  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    res.status(400).json({ message: 'Invalid date format' });
    return;
  }

  if (scheduledDate < new Date()) {
    res.status(400).json({ message: 'Interview cannot be scheduled in the past' });
    return;
  }

  // Verify application belongs to company's jobs
  const application = await Application.findById(applicationId)
    .populate({
      path: 'jobId',
      select: 'companyId title',
      populate: {
        path: 'companyId',
        select: 'userId',
      },
    })
    .populate({
      path: 'graduateId',
      select: 'firstName lastName userId',
    });

  if (!application) {
    res.status(404).json({ message: 'Application not found' });
    return;
  }

  const job = application.jobId as any;
  if (!job || job.companyId?._id?.toString() !== company._id.toString()) {
    res.status(403).json({ message: 'Application does not belong to your company' });
    return;
  }

  const graduate = application.graduateId as any;
  if (!graduate?.userId) {
    res.status(400).json({
      message: 'Graduate profile is missing a linked user account',
    });
    return;
  }

  const graduateUserId =
    graduate.userId instanceof mongoose.Types.ObjectId
      ? graduate.userId
      : new mongoose.Types.ObjectId(graduate.userId);

  // Check if this graduate has an active interview that has already started
  const now = new Date();
  const existingActiveInterviews = await Interview.find({
    graduateId: graduate._id ?? new mongoose.Types.ObjectId(graduate.id),
    status: { $in: ['scheduled', 'in_progress'] },
  }).lean();

  // Check if any of these interviews have started (scheduledAt <= now)
  const activeStartedInterview = existingActiveInterviews.find((interview) => {
    const interviewStartTime = new Date(interview.scheduledAt);
    return interviewStartTime <= now;
  });

  if (activeStartedInterview) {
    res.status(400).json({ 
      message: 'This candidate already has an interview in progress. You cannot schedule another interview with them until the current one is completed.' 
    });
    return;
  }

  const durationRaw = req.body?.durationMinutes;
  const durationNumber =
    typeof durationRaw === 'number'
      ? durationRaw
      : typeof durationRaw === 'string'
        ? Number(durationRaw)
        : NaN;
  
  // Only allow 15, 30, 45, or 60 minutes
  const allowedDurations = [15, 30, 45, 60];
  const durationMinutes = Number.isFinite(durationNumber) && allowedDurations.includes(Math.floor(durationNumber))
    ? Math.floor(durationNumber)
    : 30;
  
  if (!allowedDurations.includes(durationMinutes)) {
    res.status(400).json({ 
      message: 'Invalid duration. Allowed values are: 15, 30, 45, or 60 minutes.' 
    });
    return;
  }

  let interview = await Interview.findOne({ applicationId: application._id });
  const roomSlug = interview?.roomSlug ?? generateInterviewSlug();
  const roomUrl = buildInterviewRoomUrl(roomSlug);

  if (!interview) {
    interview = new Interview({
      applicationId: application._id,
      jobId: job._id,
      companyId: company._id,
      companyUserId: new mongoose.Types.ObjectId(userId),
      graduateId: graduate._id ?? new mongoose.Types.ObjectId(graduate.id),
      graduateUserId,
      scheduledAt: scheduledDate,
      durationMinutes,
      status: 'scheduled',
      roomSlug,
      roomUrl,
      provider: 'jitsi',
      createdBy: new mongoose.Types.ObjectId(userId),
    });
  } else {
    interview.scheduledAt = scheduledDate;
    interview.durationMinutes = durationMinutes;
    interview.status = 'scheduled';
    interview.roomSlug = roomSlug;
    interview.roomUrl = roomUrl;
    interview.updatedBy = new mongoose.Types.ObjectId(userId);
  }


  const persistedInterview = interview as NonNullable<typeof interview>;
  const interviewId = persistedInterview._id as mongoose.Types.ObjectId;
  await persistedInterview.save();

  application.interviewScheduledAt = scheduledDate;
  application.interviewLink = roomUrl;
  application.interviewRoomSlug = roomSlug;
  application.interviewId = interviewId;
  application.status = 'interviewed';
  if (!application.reviewedAt) {
    application.reviewedAt = new Date();
  }

  await application.save();

      const graduateName = `${graduate.firstName || ''} ${graduate.lastName || ''}`.trim();
      const formattedDate = scheduledDate.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

  // Send notifications
  try {
    await Promise.all([
      createNotification({
        userId: graduateUserId,
        type: 'interview',
        title: 'Interview Scheduled',
        message: `Your interview for "${job.title}" at ${company.companyName} is set for ${formattedDate}.`,
        relatedId: interviewId,
        relatedType: 'interview',
        email: {
          subject: `Interview Scheduled: ${job.title} at ${company.companyName}`,
          text: `Hello ${graduateName || 'there'},\n\nAn interview has been scheduled for your application to "${job.title}" at ${company.companyName}.\n\nDate: ${formattedDate}\nJoin Link: ${roomUrl}\n\nYou can also join directly from your Talent Hub Interviews tab when it's time.\n\nBest of luck!`,
        },
      }),
      createNotification({
        userId,
        type: 'interview',
        title: 'Interview Scheduled',
        message: `Interview with ${graduateName || 'a candidate'} scheduled for ${formattedDate}.`,
        relatedId: interviewId,
        relatedType: 'interview',
      }),
    ]);
  } catch (error) {
    console.error('Failed to send interview scheduling notification:', error);
  }

  res.json({
    message: 'Interview scheduled successfully',
    application: application.toObject({ versionKey: false }),
    interview: {
      id: interviewId.toString(),
      scheduledAt: persistedInterview.scheduledAt,
      status: persistedInterview.status,
      roomSlug: persistedInterview.roomSlug,
      roomUrl: persistedInterview.roomUrl,
      durationMinutes: persistedInterview.durationMinutes,
    },
  });
};

/**
 * Get scheduled interviews for the company
 * GET /api/companies/interviews
 */
export const getCompanyInterviews = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const company = await Company.findOne({ userId }).lean();

  if (!company) {
    res.status(404).json({ message: 'Company profile not found' });
    return;
  }

  const { status, page = '1', limit = '10', upcoming } = req.query;

  const pagination = validatePagination(page as string, limit as string, res);
  if (!pagination) return;

  const validatedStatus = status
    ? validateOptionalEnum(
        status as string,
        INTERVIEW_STATUS_VALUES,
        'Status',
        res
      )
    : null;
  if (status && validatedStatus === null) return;

  const query: Record<string, unknown> = {
    companyId: company._id,
  };

  if (validatedStatus) {
    query.status = validatedStatus;
  }

  if (typeof upcoming === 'string') {
    if (upcoming === 'true') {
      query.scheduledAt = { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) };
    } else if (upcoming === 'false') {
      query.scheduledAt = { $lt: new Date() };
    }
  }

  const skip = (pagination.page - 1) * pagination.limit;

  // First, update any interviews that have passed their end time to 'completed'
  const now = new Date();
  await Interview.updateMany(
    {
      companyId: company._id,
      status: { $in: ['scheduled', 'in_progress'] },
      $expr: {
        $lte: [
          {
            $add: [
              '$scheduledAt',
              { $multiply: ['$durationMinutes', 60 * 1000] }
            ]
          },
          now
        ]
      }
    },
    {
      $set: {
        status: 'completed',
        endedAt: now,
      }
    }
  );

  const [interviews, total] = await Promise.all([
    Interview.find(query)
      .populate({
        path: 'graduateId',
        select: 'firstName lastName profilePictureUrl rank position',
      })
      .populate({
        path: 'jobId',
        select: 'title location jobType companyId',
        populate: {
          path: 'companyId',
          select: 'companyName',
        },
      })
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(pagination.limit)
      .lean(),
    Interview.countDocuments(query),
  ]);

  res.json({
    interviews: interviews.map(serializeCompanyInterview),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit),
    },
  });
};

/**
 * Get all available graduates grouped by rank
 * GET /api/companies/graduates
 */
export const getAvailableGraduates = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { page = 1, limit = 20, rank, search, sortBy = 'createdAt' } = req.query;

  const pagination = validatePagination(
    page as string,
    limit as string,
    res
  );
  if (!pagination) return;

  try {
    // Get company ID
    const company = await Company.findOne({ userId }).lean();
    if (!company) {
      res.status(404).json({ message: 'Company profile not found' });
      return;
    }

    // Build query
    const query: any = {
      rank: { $exists: true, $ne: null }, // Only graduates with a rank
    };

    // Filter by rank if provided
    if (rank && typeof rank === 'string') {
      const rankValues = rank.split(',').map((r) => r.trim());
      query.rank = { $in: rankValues };
    }

    // Search filter
    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { position: searchRegex },
        { location: searchRegex },
        { 'education.field': searchRegex },
        { 'education.institution': searchRegex },
        { skills: { $in: [searchRegex] } },
      ];
    }

    // Build sort
    const sort: any = {};
    if (sortBy === 'name') {
      sort.firstName = 1;
      sort.lastName = 1;
    } else if (sortBy === 'rank') {
      sort.rank = 1;
    } else {
      sort.createdAt = -1;
    }

    // Get total count
    const total = await Graduate.countDocuments(query);

    // Get graduates with pagination
    const graduates = await Graduate.find(query)
      .select(
        'firstName lastName position location skills education rank profilePictureUrl summary expLevel expYears workExperiences cv'
      )
      .sort(sort)
      .skip((pagination.page - 1) * pagination.limit)
      .limit(pagination.limit)
      .lean();

    // Get rank distribution for statistics
    const rankDistribution = await Graduate.aggregate([
      { $match: { rank: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$rank',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalWithRank = rankDistribution.reduce(
      (sum, item) => sum + item.count,
      0
    );

    const rankStats = rankDistribution.reduce(
      (acc, item) => {
        acc[item._id] = {
          count: item.count,
          percentage: totalWithRank > 0 
            ? Math.round((item.count / totalWithRank) * 100) 
            : 0,
        };
        return acc;
      },
      {} as Record<string, { count: number; percentage: number }>
    );

    // Get graduate IDs
    const graduateIds = graduates.map((g) => g._id);

    // Find interviews for these graduates with this company
    // Get all interviews (we'll filter by end time in the logic below)
    const interviews = await Interview.find({
      graduateId: { $in: graduateIds },
      companyId: company._id,
      status: { $in: ['scheduled', 'in_progress'] },
    })
      .select('graduateId scheduledAt status durationMinutes')
      .lean();

    // Create a map of graduateId -> interview
    const interviewMap = new Map();
    interviews.forEach((interview) => {
      const gradId = interview.graduateId.toString();
      if (!interviewMap.has(gradId)) {
        interviewMap.set(gradId, interview);
      } else {
        // If multiple interviews, get the earliest one
        const existing = interviewMap.get(gradId);
        if (new Date(interview.scheduledAt) < new Date(existing.scheduledAt)) {
          interviewMap.set(gradId, interview);
        }
      }
    });

    res.json({
      graduates: graduates.map((g) => {
        // Find the CV that's on display, or get the first CV if available
        const displayCV = g.cv?.find((cv) => cv.onDisplay) || g.cv?.[0];
        
        const graduateId = g._id.toString();
        const interview = interviewMap.get(graduateId);
        
        // Check if there's a scheduled interview that hasn't passed yet
        let hasUpcomingInterview = false;
        let interviewScheduledAt: string | undefined;
        if (interview) {
          const scheduledTime = new Date(interview.scheduledAt);
          const now = new Date();
          // Check if interview is scheduled and hasn't ended yet
          // Add duration (in minutes) to scheduled time to get end time
          // Default duration is 30 minutes if not specified
          const durationMinutes = interview.durationMinutes || 30;
          const endTime = new Date(scheduledTime.getTime() + durationMinutes * 60 * 1000);
          // Interview is considered "upcoming" only if:
          // 1. It hasn't been cancelled
          // 2. The end time hasn't passed yet (current time is before end time)
          hasUpcomingInterview = interview.status !== 'cancelled' && endTime > now;
          interviewScheduledAt = interview.scheduledAt.toISOString();
        }
        
        return {
          id: graduateId,
          firstName: g.firstName,
          lastName: g.lastName,
          name: `${g.firstName} ${g.lastName}`,
          position: g.position,
          location: g.location,
          skills: g.skills || [],
          education: g.education,
          rank: g.rank,
          profilePictureUrl: g.profilePictureUrl,
          summary: g.summary,
          expLevel: g.expLevel,
          expYears: g.expYears,
          workExperiences: g.workExperiences || [],
          cv: displayCV ? {
            fileUrl: displayCV.fileUrl,
            fileName: displayCV.fileName,
          } : null,
          hasUpcomingInterview,
          interviewScheduledAt,
        };
      }),
      rankStatistics: rankStats,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    });
  } catch (error) {
    console.error('Error fetching graduates:', error);
    res.status(500).json({ message: 'Failed to fetch graduates' });
  }
};
