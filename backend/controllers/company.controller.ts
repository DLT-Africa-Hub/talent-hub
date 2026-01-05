import crypto from 'crypto';
import axios from 'axios';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import _ from 'lodash';
import Company from '../models/Company.model';
import Job, { InterviewStage } from '../models/Job.model';
import Match from '../models/Match.model';
import Graduate from '../models/Graduate.model';
import Application from '../models/Application.model';
import Interview, { InterviewStatus } from '../models/Interview.model';
import MessageModel from '../models/Message.model';
import { AIServiceError, generateJobEmbedding } from '../services/aiService';
import { queueJobMatching } from '../services/aiMatching.service';
import { calendlyConfig } from '../config/secrets';
import calendlyService from '../services/calendly.service';
import Token, { TOKEN_TYPES } from '../models/Token.model';
import { hashToken, calculateExpiryDate } from '../utils/security.utils';
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
  validateInterviewStages,
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

const CLIENT_BASE_URL =
  process.env.CLIENT_URL || process.env.APP_URL || 'http://localhost:5174';

const INTERVIEW_STATUS_VALUES: readonly InterviewStatus[] = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
] as const;

interface PopulatedInterview {
  _id?: mongoose.Types.ObjectId;
  applicationId?: mongoose.Types.ObjectId;
  scheduledAt: Date;
  status: InterviewStatus;
  durationMinutes: number;
  roomSlug: string;
  roomUrl: string;
  graduateId?:
    | {
        firstName?: string;
        lastName?: string;
        position?: string[];
        rank?: string;
        profilePictureUrl?: string;
      }
    | mongoose.Types.ObjectId;
  jobId?:
    | {
        _id?: mongoose.Types.ObjectId;
        title?: string;
        location?: string;
        jobType?: string;
        companyId?:
          | {
              companyName?: string;
            }
          | mongoose.Types.ObjectId;
      }
    | mongoose.Types.ObjectId;
}

const serializeCompanyInterview = (
  interview: PopulatedInterview | Record<string, unknown>
) => {
  const interviewData = interview as PopulatedInterview;
  const graduate =
    typeof interviewData.graduateId === 'object' &&
    interviewData.graduateId &&
    !(interviewData.graduateId instanceof mongoose.Types.ObjectId)
      ? interviewData.graduateId
      : {};
  const job =
    typeof interviewData.jobId === 'object' &&
    interviewData.jobId &&
    !(interviewData.jobId instanceof mongoose.Types.ObjectId)
      ? interviewData.jobId
      : {};
  const companyInfo =
    job.companyId &&
    typeof job.companyId === 'object' &&
    !(job.companyId instanceof mongoose.Types.ObjectId) &&
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
      role: Array.isArray(graduate.position)
        ? graduate.position.join(', ')
        : graduate.position || '',
      rank: graduate.rank,
      avatar: graduate.profilePictureUrl,
    },
  };
};

/**
 * Get company profile
 * GET /api/companies/profile
 */
export const getProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
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
export const createProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { companyName, industry, companySize, description, website, location } =
    req.body;

  const validatedName = validateRequiredString(
    companyName,
    'Company name',
    res
  );
  if (!validatedName) return;

  const validatedIndustry = validateRequiredString(industry, 'Industry', res);
  if (!validatedIndustry) return;

  const validatedSize = validateNumericRange(
    companySize,
    1,
    100000,
    'Company size',
    res
  );
  if (validatedSize === null) return;

  const validatedDescription = validateRequiredString(
    description,
    'Description',
    res
  );
  if (!validatedDescription) return;

  const validatedWebsite = website
    ? validateOptionalString(website, 'Website', res)
    : null;
  if (website && validatedWebsite === null) return;

  const validatedLocation = location
    ? validateOptionalString(location, 'Location', res)
    : null;
  if (location && validatedLocation === null) return;

  const existingCompany = await Company.findOne({ userId }).lean();

  if (existingCompany) {
    res
      .status(409)
      .json({ message: 'Company profile already exists. Use PUT to update.' });
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
export const updateProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
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

  const { companyName, industry, companySize, description, website, location } =
    req.body;

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
    const validated = validateNumericRange(
      companySize,
      1,
      100000,
      'Company size',
      res
    );
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
    })
      .select('_id userId')
      .lean();

    if (matchingGraduates.length === 0) {
      console.log(
        `[Rank Matching] No graduates found with ranks: ${requiredRanks.join(', ')}`
      );
      return;
    }

    console.log(
      `[Rank Matching] Found ${matchingGraduates.length} graduates matching ranks: ${requiredRanks.join(', ')}`
    );

    // Batch fetch existing matches to avoid N+1 queries
    const graduateIds = matchingGraduates.map((g) => g._id);
    const existingMatches = await Match.find({
      graduateId: { $in: graduateIds },
      jobId: jobId,
    })
      .select('graduateId')
      .lean();

    const existingGraduateIdsSet = new Set(
      existingMatches.map((m) => m.graduateId?.toString())
    );

    // Filter out graduates that already have matches
    const graduatesToMatch = matchingGraduates.filter(
      (g) => !existingGraduateIdsSet.has(g._id.toString())
    );

    if (graduatesToMatch.length === 0) {
      console.log(
        `[Rank Matching] All graduates already have matches for job ${jobId}`
      );
      return;
    }

    // Create matches for each graduate
    // Use Promise.allSettled to handle partial failures gracefully
    // Note: Each match creation is independent, so we don't need a single transaction
    // However, we batch notifications to avoid N+1
    const matchResults = await Promise.allSettled(
      graduatesToMatch.map(async (graduate) => {
        // Create new match with a base score of 100 (rank-based match)
        const match = new Match({
          graduateId: graduate._id,
          jobId: jobId,
          score: 100, // Full score for rank-based match
          status: 'pending',
        });

        await match.save();

        const graduateUserId =
          graduate.userId instanceof mongoose.Types.ObjectId
            ? graduate.userId.toString()
            : String(graduate.userId);

        const matchId =
          match._id instanceof mongoose.Types.ObjectId
            ? match._id.toString()
            : String(match._id);

        return {
          graduateUserId,
          matchId,
          graduateId: graduate._id,
        };
      })
    );

    // Batch send notifications for successful matches
    const notificationPromises = matchResults
      .filter(
        (
          result
        ): result is PromiseFulfilledResult<{
          graduateUserId: string;
          matchId: string;
          graduateId: mongoose.Types.ObjectId;
        }> => result.status === 'fulfilled'
      )
      .map((result) => {
        const { graduateUserId, matchId } = result.value;
        return createNotification({
          userId: graduateUserId,
          type: 'match',
          title: 'New Job Match Based on Your Rank!',
          message: `Your rank matched you with "${jobTitle}" at ${companyName}. You've been automatically matched based on your assessment rank.`,
          relatedId: matchId,
          relatedType: 'match',
        });
      });

    // Execute all notifications in parallel
    await Promise.allSettled(notificationPromises);

    // Log results
    const successful = matchResults.filter(
      (r) => r.status === 'fulfilled'
    ).length;
    const failed = matchResults.filter((r) => r.status === 'rejected').length;
    console.log(
      `[Rank Matching] Created ${successful} matches${failed > 0 ? `, ${failed} failed` : ''}`
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

  const {
    title,
    jobType,
    preferedRank,
    description,
    requirements,
    location,
    salary,
    status,
    directContact,
    interviewStages,
    interviewStageTitles,
    interviewStageDetails,
  } = req.body;

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

  const validatedDescription = validateRequiredString(
    description,
    'Description',
    res
  );
  if (!validatedDescription) return;

  if (!requirements) {
    res.status(400).json({ message: 'Requirements are required' });
    return;
  }

  const validatedSkills = validateSkills(requirements.skills, res);
  if (!validatedSkills) return;

  // Validate extra requirements if provided
  let validatedExtraRequirements:
    | Array<{
        label: string;
        type: 'text' | 'url' | 'textarea';
        required: boolean;
        placeholder?: string;
      }>
    | undefined;
  if (
    requirements.extraRequirements &&
    Array.isArray(requirements.extraRequirements)
  ) {
    validatedExtraRequirements = requirements.extraRequirements
      .filter(
        (req: unknown): req is Record<string, unknown> =>
          req !== null && typeof req === 'object'
      )
      .map((req: Record<string, unknown>) => ({
        label:
          typeof req.label === 'string' && req.label.trim()
            ? req.label.trim()
            : null,
        type: (['text', 'url', 'textarea'].includes(req.type as string)
          ? req.type
          : 'text') as 'text' | 'url' | 'textarea',
        required: Boolean(req.required),
        placeholder:
          typeof req.placeholder === 'string'
            ? req.placeholder.trim()
            : undefined,
      }))
      .filter(
        (req: {
          label: string | null;
          type: 'text' | 'url' | 'textarea';
          required: boolean;
          placeholder?: string;
        }): req is {
          label: string;
          type: 'text' | 'url' | 'textarea';
          required: boolean;
          placeholder?: string;
        } => req.label !== null
      );

    if (
      requirements.extraRequirements.length > 0 &&
      validatedExtraRequirements &&
      validatedExtraRequirements.length === 0
    ) {
      res.status(400).json({ message: 'Invalid extra requirements format' });
      return;
    }
  }

  const validatedLocation = location
    ? validateOptionalString(location, 'Location', res)
    : null;
  if (location && validatedLocation === null) return;

  const validatedSalary = validateSalary(salary, res);
  if (salary !== undefined && validatedSalary === null) return;

  const validatedStatus = status
    ? validateOptionalEnum(
        status,
        ['active', 'closed', 'draft'] as const,
        'Status',
        res
      )
    : null;
  if (status && validatedStatus === null) return;

  // Validate directContact (default to true if not provided)
  const validatedDirectContact =
    directContact !== undefined ? Boolean(directContact) : true;

  // Validate interviewStages (default to 1 if not provided)
  const validatedInterviewStages = validateInterviewStages(
    interviewStages,
    res
  );
  if (validatedInterviewStages === null && interviewStages !== undefined) {
    return; // Error already sent by validateInterviewStages
  }
  const finalInterviewStages = validatedInterviewStages ?? 1;

  // Validate interviewStageTitles if provided
  let validatedStageTitles: string[] | undefined;
  if (interviewStageTitles !== undefined) {
    if (!Array.isArray(interviewStageTitles)) {
      res.status(400).json({
        message: 'interviewStageTitles must be an array',
      });
      return;
    }

    if (interviewStageTitles.length !== finalInterviewStages) {
      res.status(400).json({
        message: `Number of stage titles (${interviewStageTitles.length}) must match the number of interview stages (${finalInterviewStages})`,
      });
      return;
    }

    // Validate each title is a non-empty string
    const titles = interviewStageTitles
      .map((title: unknown, index: number) => {
        if (typeof title !== 'string') {
          res.status(400).json({
            message: `Stage title at index ${index} must be a string`,
          });
          return null;
        }
        const trimmed = title.trim();
        if (!trimmed) {
          res.status(400).json({
            message: `Stage title at index ${index} cannot be empty`,
          });
          return null;
        }
        return trimmed;
      })
      .filter((title): title is string => title !== null);

    if (titles.length !== finalInterviewStages) {
      return; // Error already sent above
    }

    validatedStageTitles = titles;
  }

  // Validate interviewStageDetails if provided (preferred over interviewStageTitles)
  let validatedStageDetails:
    | Array<{ title: string; description?: string }>
    | undefined;
  if (interviewStageDetails !== undefined) {
    if (!Array.isArray(interviewStageDetails)) {
      res.status(400).json({
        message: 'interviewStageDetails must be an array',
      });
      return;
    }

    if (interviewStageDetails.length !== finalInterviewStages) {
      res.status(400).json({
        message: `Number of stage details (${interviewStageDetails.length}) must match the number of interview stages (${finalInterviewStages})`,
      });
      return;
    }

    // Validate each stage detail
    const details = interviewStageDetails
      .map((detail: unknown, index: number) => {
        if (
          !detail ||
          typeof detail !== 'object' ||
          !('title' in detail) ||
          typeof detail.title !== 'string'
        ) {
          res.status(400).json({
            message: `Stage detail at index ${index} must be an object with a title string`,
          });
          return null;
        }
        const trimmedTitle = detail.title.trim();
        if (!trimmedTitle) {
          res.status(400).json({
            message: `Stage title at index ${index} cannot be empty`,
          });
          return null;
        }
        const result: InterviewStage = {
          title: trimmedTitle,
        };
        if (
          'description' in detail &&
          typeof detail.description === 'string' &&
          detail.description.trim()
        ) {
          result.description = detail.description.trim();
        }
        return result;
      })
      .filter(
        (detail): detail is InterviewStage =>
          detail !== null && typeof detail === 'object' && 'title' in detail
      );

    if (details.length !== finalInterviewStages) {
      return; // Error already sent above
    }

    validatedStageDetails = details;
  }

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
    interviewStages: finalInterviewStages,
    ...(validatedStageDetails
      ? { interviewStageDetails: validatedStageDetails }
      : validatedStageTitles
        ? { interviewStageTitles: validatedStageTitles }
        : {}),
    embedding,
    ...deleteUndefined({
      location: validatedLocation,
      salary: validatedSalary,
      status: validatedStatus,
    }),
  });

  await job.save();

  await Company.findByIdAndUpdate(company._id, { $inc: { postedJobs: 1 } });

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
    const jobId =
      job._id instanceof mongoose.Types.ObjectId
        ? job._id.toString()
        : String(job._id);
    await notifyCompanyJobCreated({
      jobId,
      jobTitle: validatedTitle,
      companyId: companyUserId,
      companyName: company.companyName,
    });

    // Notify all admin users if admin handles applications (directContact is false)
    if (!validatedDirectContact) {
      const User = (await import('../models/User.model')).default;
      const { createNotification } = await import(
        '../services/notification.service'
      );
      const adminUsers = await User.find({ role: 'admin' })
        .select('_id email')
        .lean();

      // Build comprehensive job details for admin
      const salaryText = validatedSalary
        ? `${validatedSalary.currency || 'USD'} ${(validatedSalary.amount / 1000).toLocaleString()}k`
        : 'Not specified';

      const extraRequirementsText =
        validatedExtraRequirements && validatedExtraRequirements.length > 0
          ? validatedExtraRequirements
              .map(
                (req) =>
                  `- ${req.label} (${req.type}${req.required ? ', required' : ''})`
              )
              .join('\n')
          : 'None';

      // Helper function to format description for email (strip HTML and format nicely)
      const formatDescriptionForEmail = (html: string): string => {
        if (!html) return 'Not provided';

        // Remove style and script tags
        let text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

        // Replace common HTML elements with text equivalents
        text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '$1\n\n');
        text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '$1\n\n');
        text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '$1\n');
        text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
        text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '  • $1\n');
        text = text.replace(/<ul[^>]*>/gi, '\n');
        text = text.replace(/<\/ul>/gi, '\n');
        text = text.replace(/<ol[^>]*>/gi, '\n');
        text = text.replace(/<\/ol>/gi, '\n');
        text = text.replace(
          /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi,
          '$2 ($1)'
        );
        text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1');
        text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '$1');
        text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '$1');
        text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '$1');
        text = text.replace(/<br[^>]*>/gi, '\n');
        text = text.replace(/<div[^>]*>/gi, '\n');
        text = text.replace(/<\/div>/gi, '');

        // Remove all remaining HTML tags
        text = text.replace(/<[^>]+>/g, '');

        // Decode HTML entities
        text = text
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&mdash;/g, '—')
          .replace(/&ndash;/g, '–');

        // Clean up whitespace
        text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
        text = text.replace(/[ \t]+/g, ' ');
        text = text.trim();

        return text;
      };

      const formattedDescription =
        formatDescriptionForEmail(validatedDescription);

      const jobDetailsText = `
Job Title: ${validatedTitle}
Company: ${company.companyName}
Job Type: ${validatedJobType}
Location: ${validatedLocation || 'Not specified'}
Preferred Rank: ${validatedPreferedRank}
Salary: ${salaryText}

Description:
${formattedDescription}

Required Skills:
${validatedSkills.map((skill) => `- ${skill}`).join('\n')}

Additional Requirements:
${extraRequirementsText}

Job ID: ${jobId}
      `.trim();

      for (const admin of adminUsers) {
        const adminId =
          admin._id instanceof mongoose.Types.ObjectId
            ? admin._id
            : new mongoose.Types.ObjectId(String(admin._id));

        await createNotification({
          userId: adminId,
          type: 'system',
          title: 'New Job Requires Admin Handling',
          message: `A new job "${validatedTitle}" has been posted by ${company.companyName}. You are responsible for managing applications, scheduling interviews, and vetting candidates for this position.`,
          relatedId: jobId,
          relatedType: 'job',
          email: {
            subject: `New Job Requires Admin Handling: ${validatedTitle} at ${company.companyName}`,
            text: `A new job posting has been created that requires admin handling.\n\n${jobDetailsText}\n\nAs the admin, you will:\n- Review and manage all applications\n- Schedule interview processes\n- Vet all applicants\n- Notify the company about the best candidates\n\nPlease access the admin panel to begin managing this job.`,
          },
        });
      }

      // Create a chat message from company to first admin to initiate discussion
      if (adminUsers.length > 0) {
        try {
          const firstAdmin = adminUsers[0];
          const firstAdminId =
            firstAdmin._id instanceof mongoose.Types.ObjectId
              ? firstAdmin._id
              : new mongoose.Types.ObjectId(String(firstAdmin._id));

          const companyUserIdObj = new mongoose.Types.ObjectId(companyUserId);

          await MessageModel.create({
            senderId: companyUserIdObj,
            receiverId: firstAdminId,
            message: `Hello! We've just posted a new job: "${validatedTitle}". Since we've selected DLT Africa to handle applications, we'd like to discuss the details and any specific requirements you might need. Please let us know if you have any questions or need additional information about this position.`,
            type: 'text',
            applicationId: jobId, // Using applicationId field to store jobId for linking
          });
        } catch (messageError) {
          console.error(
            'Failed to create chat message for job posting:',
            messageError
          );
          // Don't fail the job creation if message creation fails
        }
      }
    }
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
    ? validateOptionalEnum(
        status as string,
        ['active', 'closed', 'draft'] as const,
        'Status',
        res
      )
    : null;
  if (status && validatedStatus === null) return;

  const query: Record<string, unknown> = { companyId: company._id };
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

  const {
    title,
    jobType,
    preferedRank,
    description,
    requirements,
    location,
    salary,
    status,
    directContact,
    interviewStages,
    interviewStageTitles,
    interviewStageDetails,
  } = req.body;
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
    const validated = validateEnum(
      status,
      ['active', 'closed', 'draft'] as const,
      'Status',
      res
    );
    if (!validated) return;
    job.status = validated;
  }

  const previousDirectContact = job.directContact;
  if (directContact !== undefined) {
    job.directContact = Boolean(directContact);
  }

  if (interviewStages !== undefined) {
    const validated = validateInterviewStages(interviewStages, res);
    if (validated === null && interviewStages !== null) return;
    if (validated !== null) {
      job.interviewStages = validated;
      // If stages changed and details/titles are provided, validate them match
      if (interviewStageDetails !== undefined) {
        if (!Array.isArray(interviewStageDetails)) {
          res.status(400).json({
            message: 'interviewStageDetails must be an array',
          });
          return;
        }
        if (interviewStageDetails.length !== validated) {
          res.status(400).json({
            message: `Number of stage details (${interviewStageDetails.length}) must match the number of interview stages (${validated})`,
          });
          return;
        }
        const details = interviewStageDetails
          .map((detail: unknown, index: number) => {
            if (
              !detail ||
              typeof detail !== 'object' ||
              !('title' in detail) ||
              typeof detail.title !== 'string'
            ) {
              res.status(400).json({
                message: `Stage detail at index ${index} must be an object with a title string`,
              });
              return null;
            }
            const trimmedTitle = detail.title.trim();
            if (!trimmedTitle) {
              res.status(400).json({
                message: `Stage title at index ${index} cannot be empty`,
              });
              return null;
            }
            const result: InterviewStage = {
              title: trimmedTitle,
            };
            if (
              'description' in detail &&
              typeof detail.description === 'string' &&
              detail.description.trim()
            ) {
              result.description = detail.description.trim();
            }
            return result;
          })
          .filter(
            (detail): detail is InterviewStage =>
              detail !== null && typeof detail === 'object' && 'title' in detail
          ) as InterviewStage[];
        if (details.length === validated) {
          job.interviewStageDetails = details;
          job.interviewStageTitles = undefined; // Clear old titles when using details
        }
      } else if (interviewStageTitles !== undefined) {
        if (!Array.isArray(interviewStageTitles)) {
          res.status(400).json({
            message: 'interviewStageTitles must be an array',
          });
          return;
        }
        if (interviewStageTitles.length !== validated) {
          res.status(400).json({
            message: `Number of stage titles (${interviewStageTitles.length}) must match the number of interview stages (${validated})`,
          });
          return;
        }
        const titles = interviewStageTitles
          .map((title: unknown, index: number) => {
            if (typeof title !== 'string') {
              res.status(400).json({
                message: `Stage title at index ${index} must be a string`,
              });
              return null;
            }
            const trimmed = title.trim();
            if (!trimmed) {
              res.status(400).json({
                message: `Stage title at index ${index} cannot be empty`,
              });
              return null;
            }
            return trimmed;
          })
          .filter((title): title is string => title !== null);
        if (titles.length === validated) {
          job.interviewStageTitles = titles;
        }
      } else if (validated !== job.interviewStages) {
        // If stages changed but no new titles/details provided, clear existing
        job.interviewStageTitles = undefined;
        job.interviewStageDetails = undefined;
      }
    }
  } else if (interviewStageDetails !== undefined) {
    // Update stage details without changing number of stages
    if (!Array.isArray(interviewStageDetails)) {
      res.status(400).json({
        message: 'interviewStageDetails must be an array',
      });
      return;
    }
    if (interviewStageDetails.length !== job.interviewStages) {
      res.status(400).json({
        message: `Number of stage details (${interviewStageDetails.length}) must match the number of interview stages (${job.interviewStages})`,
      });
      return;
    }
    const details = interviewStageDetails
      .map((detail: unknown, index: number) => {
        if (
          !detail ||
          typeof detail !== 'object' ||
          !('title' in detail) ||
          typeof detail.title !== 'string'
        ) {
          res.status(400).json({
            message: `Stage detail at index ${index} must be an object with a title string`,
          });
          return null;
        }
        const trimmedTitle = detail.title.trim();
        if (!trimmedTitle) {
          res.status(400).json({
            message: `Stage title at index ${index} cannot be empty`,
          });
          return null;
        }
        const result: InterviewStage = {
          title: trimmedTitle,
        };
        if (
          'description' in detail &&
          typeof detail.description === 'string' &&
          detail.description.trim()
        ) {
          result.description = detail.description.trim();
        }
        return result;
      })
      .filter(
        (detail): detail is InterviewStage =>
          detail !== null && typeof detail === 'object' && 'title' in detail
      ) as InterviewStage[];

    if (details.length !== job.interviewStages) {
      return; // Error already sent above
    }
    job.interviewStageDetails = details;
    job.interviewStageTitles = undefined; // Clear old titles when using details
  } else if (interviewStageTitles !== undefined) {
    // Update titles without changing stages
    if (!Array.isArray(interviewStageTitles)) {
      res.status(400).json({
        message: 'interviewStageTitles must be an array',
      });
      return;
    }
    if (interviewStageTitles.length !== job.interviewStages) {
      res.status(400).json({
        message: `Number of stage titles (${interviewStageTitles.length}) must match the number of interview stages (${job.interviewStages})`,
      });
      return;
    }
    const titles = interviewStageTitles
      .map((title: unknown, index: number) => {
        if (typeof title !== 'string') {
          res.status(400).json({
            message: `Stage title at index ${index} must be a string`,
          });
          return null;
        }
        const trimmed = title.trim();
        if (!trimmed) {
          res.status(400).json({
            message: `Stage title at index ${index} cannot be empty`,
          });
          return null;
        }
        return trimmed;
      })
      .filter((title): title is string => title !== null);
    if (titles.length === job.interviewStages) {
      job.interviewStageTitles = titles;
    }
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

  // Notify admins if directContact changed from true to false
  if (previousDirectContact === true && job.directContact === false) {
    try {
      const User = (await import('../models/User.model')).default;
      const { createNotification } = await import(
        '../services/notification.service'
      );
      const adminUsers = await User.find({ role: 'admin' })
        .select('_id email')
        .lean();

      // Build comprehensive job details for admin
      const salaryText = job.salary
        ? `${job.salary.currency || 'USD'} ${((job.salary.amount || 0) / 1000).toLocaleString()}k`
        : 'Not specified';

      const extraRequirementsText =
        job.requirements?.extraRequirements &&
        job.requirements.extraRequirements.length > 0
          ? job.requirements.extraRequirements
              .map(
                (req: { label: string; type: string; required: boolean }) =>
                  `- ${req.label} (${req.type}${req.required ? ', required' : ''})`
              )
              .join('\n')
          : 'None';

      // Format description for email (strip HTML and format nicely)
      const formatDescriptionForEmail = (html: string): string => {
        if (!html) return 'Not provided';

        // Remove style and script tags
        let text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

        // Replace common HTML elements with text equivalents
        text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '$1\n\n');
        text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '$1\n\n');
        text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '$1\n');
        text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
        text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '  • $1\n');
        text = text.replace(/<ul[^>]*>/gi, '\n');
        text = text.replace(/<\/ul>/gi, '\n');
        text = text.replace(/<ol[^>]*>/gi, '\n');
        text = text.replace(/<\/ol>/gi, '\n');
        text = text.replace(
          /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi,
          '$2 ($1)'
        );
        text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1');
        text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '$1');
        text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '$1');
        text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '$1');
        text = text.replace(/<br[^>]*>/gi, '\n');
        text = text.replace(/<div[^>]*>/gi, '\n');
        text = text.replace(/<\/div>/gi, '');

        // Remove all remaining HTML tags
        text = text.replace(/<[^>]+>/g, '');

        // Decode HTML entities
        text = text
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&mdash;/g, '—')
          .replace(/&ndash;/g, '–')
          .replace(/&amp;/g, '&');

        // Clean up whitespace
        text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
        text = text.replace(/[ \t]+/g, ' ');
        text = text.trim();

        return text;
      };

      const formattedDescription = formatDescriptionForEmail(
        job.description || ''
      );

      const jobDetailsText = `
Job Title: ${job.title}
Company: ${company.companyName}
Job Type: ${job.jobType}
Location: ${job.location || 'Not specified'}
Preferred Rank: ${job.preferedRank}
Salary: ${salaryText}

Description:
${formattedDescription}

Required Skills:
${job.requirements?.skills?.map((skill: string) => `- ${skill}`).join('\n') || 'None'}

Additional Requirements:
${extraRequirementsText}

Job ID: ${job._id}
      `.trim();

      const jobIdString =
        job._id instanceof mongoose.Types.ObjectId
          ? job._id.toString()
          : String(job._id);

      for (const admin of adminUsers) {
        const adminId =
          admin._id instanceof mongoose.Types.ObjectId
            ? admin._id
            : new mongoose.Types.ObjectId(String(admin._id));

        await createNotification({
          userId: adminId,
          type: 'system',
          title: 'Job Now Requires Admin Handling',
          message: `The job "${job.title}" at ${company.companyName} has been updated to require admin handling. You are now responsible for managing applications, scheduling interviews, and vetting candidates.`,
          relatedId: jobIdString,
          relatedType: 'job',
          email: {
            subject: `Job Now Requires Admin Handling: ${job.title} at ${company.companyName}`,
            text: `A job posting has been updated to require admin handling.\n\n${jobDetailsText}\n\nAs the admin, you will:\n- Review and manage all applications\n- Schedule interview processes\n- Vet all applicants\n- Notify the company about the best candidates\n\nPlease access the admin panel to begin managing this job.`,
          },
        });
      }

      // Create a chat message from company to first admin to initiate discussion
      if (adminUsers.length > 0) {
        try {
          const firstAdmin = adminUsers[0];
          const firstAdminId =
            firstAdmin._id instanceof mongoose.Types.ObjectId
              ? firstAdmin._id
              : new mongoose.Types.ObjectId(String(firstAdmin._id));

          const companyUserIdObj = new mongoose.Types.ObjectId(userId);

          await MessageModel.create({
            senderId: companyUserIdObj,
            receiverId: firstAdminId,
            message: `Hello! We've updated our job posting "${job.title}" to have DLT Africa handle applications. We'd like to discuss the details and any specific requirements you might need. Please let us know if you have any questions or need additional information about this position.`,
            type: 'text',
          });
        } catch (messageError) {
          console.error(
            'Failed to create chat message for job update:',
            messageError
          );
          // Don't fail the job update if message creation fails
        }
      }
    } catch (error) {
      console.error('Failed to send admin notification for job update:', error);
    }
  }

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

  // Use transaction to ensure atomicity of related deletions
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await Promise.all([
      Match.deleteMany(
        { jobId: new mongoose.Types.ObjectId(validatedJobId) },
        { session }
      ),
      Application.deleteMany(
        { jobId: new mongoose.Types.ObjectId(validatedJobId) },
        { session }
      ),
      Interview.deleteMany(
        { jobId: new mongoose.Types.ObjectId(validatedJobId) },
        { session }
      ),
      Job.deleteOne(
        { _id: new mongoose.Types.ObjectId(validatedJobId) },
        { session }
      ),
    ]);

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error deleting job and related records:', error);
    res.status(500).json({ message: 'Failed to delete job' });
    return;
  }

  res.json({ message: 'Job deleted successfully' });
};

/**
 * Get matches for a specific job
 * GET /api/companies/jobs/:jobId/matches
 */
export const getJobMatches = async (
  req: Request,
  res: Response
): Promise<void> => {
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
    ? validateOptionalEnum(
        status as string,
        ['pending', 'accepted', 'rejected'] as const,
        'Status',
        res
      )
    : null;
  if (status && validatedStatus === null) return;

  const validatedMinScore = minScore
    ? validateNumericRange(minScore as string, 0, 100, 'Min score', res)
    : null;
  if (minScore !== undefined && validatedMinScore === null) return;

  const query: Record<string, unknown> = {
    jobId: new mongoose.Types.ObjectId(validatedJobId),
  };
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
        select:
          'firstName lastName skills education rank expYears profilePictureUrl summary cv position location',
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
export const updateMatchStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const validatedJobId = validateObjectId(req.params.jobId, 'Job ID', res);
  if (!validatedJobId) return;

  const validatedMatchId = validateObjectId(
    req.params.matchId,
    'Match ID',
    res
  );
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
    interface PopulatedGraduate {
      firstName?: string;
      lastName?: string;
      userId?: mongoose.Types.ObjectId | { email?: string };
    }
    const graduate = match.graduateId as
      | PopulatedGraduate
      | mongoose.Types.ObjectId;
    const graduateData =
      typeof graduate === 'object' &&
      graduate &&
      !(graduate instanceof mongoose.Types.ObjectId)
        ? graduate
        : null;
    if (graduateData?.userId) {
      // Handle both ObjectId and populated User object
      let userIdValue: mongoose.Types.ObjectId | string;
      if (graduateData.userId instanceof mongoose.Types.ObjectId) {
        userIdValue = graduateData.userId;
      } else if (
        typeof graduateData.userId === 'object' &&
        graduateData.userId !== null &&
        '_id' in graduateData.userId
      ) {
        // Populated User object
        userIdValue =
          graduateData.userId._id instanceof mongoose.Types.ObjectId
            ? graduateData.userId._id
            : new mongoose.Types.ObjectId(graduateData.userId._id as string);
      } else {
        // Fallback: try to extract from string or other format
        userIdValue = String(graduateData.userId);
      }

      await createNotification({
        userId:
          userIdValue instanceof mongoose.Types.ObjectId
            ? userIdValue.toString()
            : userIdValue,
        type: 'match',
        title:
          validatedStatus === 'accepted' ? 'Match accepted' : 'Match rejected',
        message: `${company.companyName} ${validatedStatus === 'accepted' ? 'accepted' : 'rejected'} your match for ${job.title}`,
        relatedId: matchId,
        relatedType: 'match',
        email: {
          subject: `Your match for ${job.title} was ${validatedStatus}`,
          text: [
            `Hi ${graduateData.firstName ?? 'there'},`,
            '',
            `${company.companyName} has ${validatedStatus} your match for "${job.title}".`,
            'Sign in to Talent Hub to review the details.',
          ].join('\n'),
        },
      });
    }
  } catch (notificationError) {
    console.error(
      'Failed to notify graduate about match status change:',
      notificationError
    );
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
export const getAllMatches = async (
  req: Request,
  res: Response
): Promise<void> => {
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

  const { status, minScore, search, page = '1', limit = '10' } = req.query;

  const pagination = validatePagination(page as string, limit as string, res);
  if (!pagination) return;

  const validatedStatus = status
    ? validateOptionalEnum(
        status as string,
        ['pending', 'accepted', 'rejected'] as const,
        'Status',
        res
      )
    : null;
  if (status && validatedStatus === null) return;

  const validatedMinScore = minScore
    ? validateNumericRange(minScore as string, 0, 100, 'Min score', res)
    : null;
  if (minScore !== undefined && validatedMinScore === null) return;

  // Get all company jobs
  const companyJobs = await Job.find({ companyId: company._id })
    .select('_id')
    .lean();
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

  const query: Record<string, unknown> = { jobId: { $in: companyJobIds } };
  if (validatedStatus) {
    query.status = validatedStatus;
  }
  if (validatedMinScore !== null) {
    query.score = { $gte: validatedMinScore };
  }

  // If search is provided, find matching graduates and jobs first
  let matchingGraduateIds: mongoose.Types.ObjectId[] | null = null;
  let matchingJobIds: mongoose.Types.ObjectId[] | null = null;

  if (search && typeof search === 'string' && search.trim()) {
    const searchRegex = new RegExp(_.escapeRegExp(search.trim()), 'i');

    // Find matching graduates
    const matchingGraduates = await Graduate.find({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { position: { $elemMatch: { $regex: searchRegex } } },
        { location: searchRegex },
        { skills: { $in: [searchRegex] } },
      ],
    })
      .select('_id')
      .lean();
    matchingGraduateIds = matchingGraduates.map((g) =>
      g._id instanceof mongoose.Types.ObjectId
        ? g._id
        : new mongoose.Types.ObjectId(g._id as string)
    );

    // Find matching jobs
    const matchingJobs = await Job.find({
      $or: [{ title: searchRegex }, { location: searchRegex }],
      companyId: company._id,
    })
      .select('_id')
      .lean();
    matchingJobIds = matchingJobs.map((j) =>
      j._id instanceof mongoose.Types.ObjectId
        ? j._id
        : new mongoose.Types.ObjectId(j._id as string)
    );
  }

  // Build final query
  const finalQuery: Record<string, unknown> = { ...query };

  if (matchingGraduateIds !== null || matchingJobIds !== null) {
    if (
      matchingGraduateIds !== null &&
      matchingGraduateIds.length > 0 &&
      matchingJobIds !== null &&
      matchingJobIds.length > 0
    ) {
      finalQuery.$or = [
        { graduateId: { $in: matchingGraduateIds } },
        { jobId: { $in: matchingJobIds } },
      ];
    } else if (matchingJobIds !== null && matchingJobIds.length > 0) {
      finalQuery.jobId = { $in: matchingJobIds };
    } else if (matchingGraduateIds !== null && matchingGraduateIds.length > 0) {
      finalQuery.graduateId = { $in: matchingGraduateIds };
    } else {
      // No matches found, return empty result
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
  }

  const skip = (pagination.page - 1) * pagination.limit;

  const [matches, total] = await Promise.all([
    Match.find(finalQuery)
      .populate({
        path: 'graduateId',
        select:
          'firstName lastName skills education rank profilePictureUrl summary cv expYears position location salaryPerAnnum',
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
    Match.countDocuments(finalQuery),
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
export const getApplications = async (
  req: Request,
  res: Response
): Promise<void> => {
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

  const { status, jobId, search, page = '1', limit = '10' } = req.query;

  const pagination = validatePagination(page as string, limit as string, res);
  if (!pagination) return;

  const validatedStatus = status
    ? validateOptionalEnum(
        status as string,
        [
          'pending',
          'reviewed',
          'shortlisted',
          'interviewed',
          'accepted',
          'rejected',
          'withdrawn',
          'hired',
        ] as const,
        'Status',
        res
      )
    : null;
  if (status && validatedStatus === null) return;

  const validatedJobId = jobId
    ? validateObjectId(jobId as string, 'Job ID', res)
    : null;
  if (jobId && !validatedJobId) return;

  const companyJobs = await Job.find({ companyId: company._id })
    .select('_id')
    .lean();

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

  const query: Record<string, unknown> = { jobId: { $in: companyJobIds } };
  if (validatedStatus) {
    query.status = validatedStatus;
  }
  if (validatedJobId) {
    query.jobId = new mongoose.Types.ObjectId(validatedJobId);
  }

  const skip = (pagination.page - 1) * pagination.limit;

  // If search is provided, find matching graduates and jobs first
  let matchingGraduateIds: mongoose.Types.ObjectId[] | null = null;
  let matchingJobIds: mongoose.Types.ObjectId[] | null = null;

  if (search && typeof search === 'string' && search.trim()) {
    const searchRegex = new RegExp(_.escapeRegExp(search.trim()), 'i');

    // Find matching graduates
    const matchingGraduates = await Graduate.find({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { position: { $elemMatch: { $regex: searchRegex } } },
        { location: searchRegex },
        { skills: { $in: [searchRegex] } },
      ],
    })
      .select('_id')
      .lean();
    matchingGraduateIds = matchingGraduates.map((g) =>
      g._id instanceof mongoose.Types.ObjectId
        ? g._id
        : new mongoose.Types.ObjectId(g._id as string)
    );

    // Find matching jobs
    const matchingJobs = await Job.find({
      $or: [{ title: searchRegex }, { location: searchRegex }],
      companyId: company._id,
    })
      .select('_id')
      .lean();
    matchingJobIds = matchingJobs.map((j) =>
      j._id instanceof mongoose.Types.ObjectId
        ? j._id
        : new mongoose.Types.ObjectId(j._id as string)
    );
  }

  // Build final query
  const finalQuery: Record<string, unknown> = { ...query };

  if (matchingGraduateIds !== null || matchingJobIds !== null) {
    if (
      matchingGraduateIds !== null &&
      matchingGraduateIds.length > 0 &&
      matchingJobIds !== null &&
      matchingJobIds.length > 0
    ) {
      finalQuery.$or = [
        { graduateId: { $in: matchingGraduateIds } },
        { jobId: { $in: matchingJobIds } },
      ];
    } else if (matchingJobIds !== null && matchingJobIds.length > 0) {
      finalQuery.jobId = { $in: matchingJobIds };
    } else if (matchingGraduateIds !== null && matchingGraduateIds.length > 0) {
      finalQuery.graduateId = { $in: matchingGraduateIds };
    } else {
      // No matches found, return empty result
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
  }

  const [applications, total] = await Promise.all([
    Application.find(finalQuery)
      .populate({
        path: 'graduateId',
        select:
          'firstName lastName skills education rank profilePictureUrl summary cv expYears position location salaryPerAnnum',
        populate: {
          path: 'userId',
          select: 'email',
        },
      })
      .populate({
        path: 'jobId',
        select:
          'title companyId directContact jobType salary location description',
        populate: {
          path: 'companyId',
          select: 'companyName',
        },
      })
      .populate('matchId', 'score')
      .populate({
        path: 'interviewId',
        select:
          'status scheduledAt selectedTimeSlot suggestedTimeSlots durationMinutes',
      })
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(pagination.limit)
      .lean(),
    Application.countDocuments(finalQuery),
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
export const updateApplicationStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
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
    [
      'accepted',
      'rejected',
      'reviewed',
      'shortlisted',
      'interviewed',
      'offer_sent',
      'hired',
    ] as const,
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

  interface PopulatedJob {
    _id?: mongoose.Types.ObjectId;
    title?: string;
    companyId?:
      | {
          _id?: mongoose.Types.ObjectId;
          userId?: mongoose.Types.ObjectId;
        }
      | mongoose.Types.ObjectId;
  }
  const job = application.jobId as PopulatedJob | mongoose.Types.ObjectId;
  const jobData =
    typeof job === 'object' && job && !(job instanceof mongoose.Types.ObjectId)
      ? job
      : null;
  const companyIdData =
    jobData?.companyId &&
    typeof jobData.companyId === 'object' &&
    !(jobData.companyId instanceof mongoose.Types.ObjectId)
      ? jobData.companyId
      : null;
  if (
    !jobData ||
    !companyIdData ||
    companyIdData._id?.toString() !== company._id.toString()
  ) {
    res
      .status(403)
      .json({ message: 'Application does not belong to your company' });
    return;
  }

  // Check if there's a completed interview for this application
  const Interview = (await import('../models/Interview.model')).default;
  const completedInterview = await Interview.findOne({
    applicationId: application._id,
    status: 'completed',
  }).lean();

  const hasCompletedInterview = !!completedInterview;

  // If status is 'accepted', handle based on interview status
  if (validatedStatus === 'accepted') {
    if (hasCompletedInterview) {
      // Interview completed - company reviewed and decided to proceed with offer
      try {
        const { createAndSendOffer } = await import(
          '../services/offer.service'
        );
        await createAndSendOffer(applicationId, userId);
        // Status will be set to 'offer_sent' by the service

        // Get graduate userId for navigation - application.graduateId is already populated
        const graduate = application.graduateId as
          | {
              userId?:
                | mongoose.Types.ObjectId
                | { _id?: mongoose.Types.ObjectId };
            }
          | mongoose.Types.ObjectId;
        const graduateData =
          typeof graduate === 'object' &&
          graduate &&
          !(graduate instanceof mongoose.Types.ObjectId)
            ? graduate
            : null;
        let graduateUserId: string | null = null;
        if (graduateData?.userId) {
          if (graduateData.userId instanceof mongoose.Types.ObjectId) {
            graduateUserId = graduateData.userId.toString();
          } else if (
            typeof graduateData.userId === 'object' &&
            '_id' in graduateData.userId &&
            graduateData.userId._id
          ) {
            graduateUserId =
              graduateData.userId._id instanceof mongoose.Types.ObjectId
                ? graduateData.userId._id.toString()
                : String(graduateData.userId._id);
          }
        }

        res.json({
          message: 'Application accepted and offer sent successfully',
          offerSent: true,
          graduateUserId: graduateUserId,
        });
        return;
      } catch (error) {
        console.error('Failed to create offer:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to create and send offer';
        res.status(500).json({
          message: errorMessage,
        });
        return;
      }
    } else {
      // No completed interview yet - just accept to allow interview scheduling
      // This is the initial acceptance before interview
      // Use atomic update to prevent race conditions
      const updateResult = await Application.findByIdAndUpdate(
        applicationId,
        {
          $set: {
            status: validatedStatus,
            reviewedAt: new Date(),
            ...(notes !== undefined
              ? { notes: typeof notes === 'string' ? notes.trim() : undefined }
              : {}),
          },
        },
        { new: true }
      );

      if (!updateResult) {
        res.status(404).json({ message: 'Application not found' });
        return;
      }
    }
  } else if (validatedStatus === 'rejected') {
    // Company can reject at any point, including after interview
    // This allows company to reject even if interview was completed
    // Use atomic update to prevent race conditions
    const updateResult = await Application.findByIdAndUpdate(
      applicationId,
      {
        $set: {
          status: validatedStatus,
          reviewedAt: new Date(),
          ...(notes !== undefined
            ? { notes: typeof notes === 'string' ? notes.trim() : undefined }
            : {}),
        },
      },
      { new: true }
    );

    if (!updateResult) {
      res.status(404).json({ message: 'Application not found' });
      return;
    }
  } else {
    // Use transaction for status update and company update (if hired)
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const updateResult = await Application.findByIdAndUpdate(
        applicationId,
        {
          $set: {
            status: validatedStatus,
            reviewedAt: new Date(),
            ...(notes !== undefined
              ? { notes: typeof notes === 'string' ? notes.trim() : undefined }
              : {}),
          },
        },
        { new: true, session }
      );

      if (!updateResult) {
        await session.abortTransaction();
        session.endSession();
        res.status(404).json({ message: 'Application not found' });
        return;
      }

      if (validatedStatus === 'hired') {
        let graduateId: mongoose.Types.ObjectId | null = null;

        if (application.graduateId instanceof mongoose.Types.ObjectId) {
          graduateId = application.graduateId;
        } else if (
          typeof application.graduateId === 'object' &&
          application.graduateId !== null &&
          '_id' in application.graduateId
        ) {
          const graduateObj = application.graduateId as { _id?: unknown };
          const gradIdValue = graduateObj._id;
          graduateId =
            gradIdValue instanceof mongoose.Types.ObjectId
              ? gradIdValue
              : new mongoose.Types.ObjectId(String(gradIdValue));
        }

        if (graduateId) {
          await Company.findByIdAndUpdate(
            company._id,
            {
              $addToSet: { hiredCandidates: graduateId },
            },
            { session }
          );
        }
      }

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Failed to update application status:', error);
      res.status(500).json({ message: 'Failed to update application status' });
      return;
    }
  }

  // Send notifications (only if not already sent by offer service)
  // For 'accepted' status, only send notification if no offer was sent (i.e., no completed interview)
  if (
    validatedStatus !== 'accepted' ||
    (validatedStatus === 'accepted' && !hasCompletedInterview)
  ) {
    try {
      interface PopulatedGraduate {
        userId?: mongoose.Types.ObjectId;
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
      if (graduateData?.userId) {
        const graduateUserId =
          graduateData.userId instanceof mongoose.Types.ObjectId
            ? graduateData.userId.toString()
            : String(graduateData.userId);
        const notificationTitle =
          validatedStatus === 'rejected'
            ? 'Application Rejected'
            : validatedStatus === 'hired'
              ? 'Hired!'
              : validatedStatus === 'accepted'
                ? 'Application Accepted'
                : 'Application Updated';

        const notificationMessage =
          validatedStatus === 'hired'
            ? `Congratulations! You have been hired for "${jobData?.title || 'the position'}" at ${company.companyName}.`
            : validatedStatus === 'accepted'
              ? `Your application for "${jobData?.title || 'the position'}" at ${company.companyName} has been accepted. You can now schedule an interview from your Interviews page.`
              : validatedStatus === 'rejected' && hasCompletedInterview
                ? `Your application for "${jobData?.title || 'the position'}" at ${company.companyName} has been rejected after the interview.`
                : `Your application for "${jobData?.title || 'the position'}" has been ${validatedStatus}.`;

        const emailSubject =
          validatedStatus === 'hired'
            ? `Congratulations! You've been hired at ${company.companyName}`
            : `Application Update: ${jobData?.title || 'Position'}`;

        // Build interview page URL with applicationId and redirect for login
        const applicationIdString =
          application._id instanceof mongoose.Types.ObjectId
            ? application._id.toString()
            : String(application._id);
        const interviewPageUrl = `${CLIENT_BASE_URL}/interviews?applicationId=${applicationIdString}`;
        const loginUrl = `${CLIENT_BASE_URL}/login?redirect=${encodeURIComponent(interviewPageUrl)}`;

        const emailText =
          validatedStatus === 'hired'
            ? `Congratulations! We are pleased to inform you that you have been hired for "${jobData?.title || 'the position'}" at ${company.companyName}. Welcome to the team!`
            : validatedStatus === 'accepted'
              ? `Your application for "${jobData?.title || 'the position'}" at ${company.companyName} has been accepted.\n\nYou can now schedule an interview by clicking the link below:\n${loginUrl}\n\nAfter the interview is completed, the company will review your application and decide whether to proceed with an offer.\n\nGood luck!`
              : validatedStatus === 'rejected' && hasCompletedInterview
                ? `Thank you for your interest in the "${jobData?.title || 'the position'}" position at ${company.companyName}.\n\nAfter reviewing your interview, we have decided not to move forward with your application at this time. We appreciate the time you took to interview with us and wish you the best in your job search.`
                : `Your application for "${jobData?.title || 'the position'}" at ${company.companyName} has been ${validatedStatus}.`;

        // Create HTML email with clickable link for accepted applications
        const emailHtml =
          validatedStatus === 'accepted'
            ? `<p>Your application for "<strong>${jobData?.title || 'the position'}</strong>" at <strong>${company.companyName}</strong> has been accepted.</p>
              <p>You can now schedule an interview by clicking the link below:</p>
              <p><a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1B7700; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Schedule Interview</a></p>
              <p>After the interview is completed, the company will review your application and decide whether to proceed with an offer.</p>
              <p>Good luck!</p>`
            : validatedStatus === 'hired'
              ? `<p>Congratulations! We are pleased to inform you that you have been hired for "<strong>${jobData?.title || 'the position'}</strong>" at <strong>${company.companyName}</strong>. Welcome to the team!</p>`
              : validatedStatus === 'rejected' && hasCompletedInterview
                ? `<p>Thank you for your interest in the "<strong>${jobData?.title || 'the position'}</strong>" position at <strong>${company.companyName}</strong>.</p>
<p>After reviewing your interview, we have decided not to move forward with your application at this time. We appreciate the time you took to interview with us and wish you the best in your job search.</p>`
                : `<p>Your application for "<strong>${jobData?.title || 'the position'}</strong>" at <strong>${company.companyName}</strong> has been ${validatedStatus}.</p>`;

        await createNotification({
          userId: graduateUserId,
          type: 'application',
          title: notificationTitle,
          message: notificationMessage,
          relatedId:
            application._id instanceof mongoose.Types.ObjectId
              ? application._id.toString()
              : String(application._id),
          relatedType: 'application',
          email: {
            subject: emailSubject,
            text: emailText,
            html: emailHtml,
          },
        });
      }
    } catch (error) {
      console.error('Failed to send application status notification:', error);
    }
  }

  // Reload application to get updated status with populated fields
  const updatedApplication = await Application.findById(applicationId)
    .populate({
      path: 'graduateId',
      select:
        'firstName lastName skills education rank profilePictureUrl summary cv expYears position location salaryPerAnnum userId',
    })
    .populate({
      path: 'jobId',
      select: 'title jobType location salary directContact companyId',
      populate: {
        path: 'companyId',
        select: 'companyName',
      },
    })
    .populate({
      path: 'interviewId',
      select:
        'status scheduledAt selectedTimeSlot suggestedTimeSlots durationMinutes roomSlug',
    })
    .populate({
      path: 'matchId',
      select: 'score',
    })
    .lean();

  // Determine response message based on what happened
  let responseMessage = 'Application status updated successfully';
  if (validatedStatus === 'accepted') {
    if (hasCompletedInterview) {
      responseMessage = 'Application accepted and offer sent successfully';
    } else {
      responseMessage =
        'Application accepted. Candidate can now schedule an interview. After the interview, you can accept or reject the candidate.';
    }
  } else if (validatedStatus === 'rejected') {
    if (hasCompletedInterview) {
      responseMessage = 'Application rejected after interview review';
    } else {
      responseMessage = 'Application rejected';
    }
  } else if (validatedStatus === 'hired') {
    responseMessage = 'Candidate hired successfully';
  }

  res.json({
    message: responseMessage,
    application:
      updatedApplication || application.toObject({ versionKey: false }),
    offerSent: false,
  });
};

/**
 * Schedule interview for application
 * POST /api/companies/applications/:applicationId/schedule-interview
 */
export const scheduleInterview = async (
  req: Request,
  res: Response
): Promise<void> => {
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
    res
      .status(400)
      .json({ message: 'Interview cannot be scheduled in the past' });
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

  interface PopulatedJob {
    _id?: mongoose.Types.ObjectId;
    title?: string;
    interviewStages?: 1 | 2 | 3;
    interviewStageTitles?: string[];
    interviewStageDetails?: InterviewStage[];
    companyId?:
      | {
          _id?: mongoose.Types.ObjectId;
        }
      | mongoose.Types.ObjectId;
  }
  interface PopulatedGraduate {
    _id?: mongoose.Types.ObjectId;
    id?: string;
    firstName?: string;
    lastName?: string;
    userId?: mongoose.Types.ObjectId;
  }
  const job = application.jobId as PopulatedJob | mongoose.Types.ObjectId;
  const jobData =
    typeof job === 'object' && job && !(job instanceof mongoose.Types.ObjectId)
      ? job
      : null;
  const companyIdData =
    jobData?.companyId &&
    typeof jobData.companyId === 'object' &&
    !(jobData.companyId instanceof mongoose.Types.ObjectId)
      ? jobData.companyId
      : null;
  if (
    !jobData ||
    !companyIdData ||
    companyIdData._id?.toString() !== company._id.toString()
  ) {
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
    res.status(400).json({
      message: 'Graduate profile is missing a linked user account',
    });
    return;
  }

  const graduateUserId =
    graduateData.userId instanceof mongoose.Types.ObjectId
      ? graduateData.userId
      : new mongoose.Types.ObjectId(String(graduateData.userId));

  const graduateId =
    graduateData._id instanceof mongoose.Types.ObjectId
      ? graduateData._id
      : graduate instanceof mongoose.Types.ObjectId
        ? graduate
        : new mongoose.Types.ObjectId(
            String(graduateData._id || graduateData.id || graduate)
          );

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

  // Check for active interviews (any stage) or interviews for the same stage
  const existingActiveInterviews = await Interview.find({
    applicationId: application._id,
    $or: [
      { status: { $in: ['pending_selection', 'scheduled', 'in_progress'] } },
      { stage: nextStage, status: { $ne: 'cancelled' } },
    ],
  }).lean();

  if (existingActiveInterviews.length > 0) {
    const sameStageInterview = existingActiveInterviews.find(
      (interview) => interview.stage === nextStage
    );
    if (sameStageInterview) {
      res.status(400).json({
        message: `Stage ${nextStage} interview is already scheduled or in progress for this application`,
      });
      return;
    }

    // Check if any interview is pending selection
    const pendingSelection = existingActiveInterviews.find(
      (interview) => interview.status === 'pending_selection'
    );
    if (pendingSelection) {
      res.status(400).json({
        message:
          'An interview time slot selection is pending for this candidate. Please wait until they select a time or the current selection expires before scheduling another interview.',
      });
      return;
    }

    // Check if any interview is in progress
    const inProgress = existingActiveInterviews.find(
      (interview) => interview.status === 'in_progress'
    );
    if (inProgress) {
      res.status(400).json({
        message:
          'This candidate already has an interview in progress. You cannot schedule another interview with them until the current one is completed.',
      });
      return;
    }

    // Check if any interview is scheduled (regardless of whether it has started)
    const scheduled = existingActiveInterviews.find(
      (interview) => interview.status === 'scheduled'
    );
    if (scheduled) {
      res.status(400).json({
        message:
          'An interview is already scheduled with this candidate. Please wait until the current interview is completed before scheduling another one.',
      });
      return;
    }
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
  const durationMinutes =
    Number.isFinite(durationNumber) &&
    allowedDurations.includes(Math.floor(durationNumber))
      ? Math.floor(durationNumber)
      : 30;

  if (!allowedDurations.includes(durationMinutes)) {
    res.status(400).json({
      message:
        'Invalid duration. Allowed values are: 15, 30, 45, or 60 minutes.',
    });
    return;
  }

  // Check if there's already an interview for this application
  // If it exists and is active, we should have caught it above, but double-check here
  let interview = await Interview.findOne({ applicationId: application._id });

  if (
    interview &&
    ['pending_selection', 'scheduled', 'in_progress'].includes(interview.status)
  ) {
    res.status(400).json({
      message:
        'An interview is already scheduled or pending for this application. Please wait until the current interview is completed before scheduling another one.',
    });
    return;
  }

  const roomSlug = interview?.roomSlug ?? generateInterviewSlug();
  const roomUrl = buildInterviewRoomUrl(roomSlug);

  if (!interview) {
    interview = new Interview({
      applicationId: application._id,
      jobId:
        jobData._id ||
        (job instanceof mongoose.Types.ObjectId
          ? job
          : new mongoose.Types.ObjectId()),
      companyId: company._id,
      companyUserId: new mongoose.Types.ObjectId(userId),
      graduateId: graduateId,
      graduateUserId,
      scheduledAt: scheduledDate,
      durationMinutes,
      status: 'scheduled',
      roomSlug,
      roomUrl,
      provider: 'stream',
      stage: nextStage,
      createdBy: new mongoose.Types.ObjectId(userId),
    });
  } else {
    // Only update if the interview was completed or cancelled
    if (interview.status === 'completed' || interview.status === 'cancelled') {
      interview.scheduledAt = scheduledDate;
      interview.durationMinutes = durationMinutes;
      interview.status = 'scheduled';
      interview.roomSlug = roomSlug;
      interview.roomUrl = roomUrl;
      interview.stage = nextStage;
      interview.updatedBy = new mongoose.Types.ObjectId(userId);
      // Reset interview timing fields
      interview.startedAt = undefined;
      interview.endedAt = undefined;
    } else {
      // Interview is still active, should not reach here due to check above, but handle gracefully
      res.status(400).json({
        message:
          'An interview is already scheduled or pending for this application. Please wait until the current interview is completed before scheduling another one.',
      });
      return;
    }
  }

  const persistedInterview = interview as NonNullable<typeof interview>;
  const interviewId = persistedInterview._id as mongoose.Types.ObjectId;
  await persistedInterview.save();

  application.interviewScheduledAt = scheduledDate;
  application.interviewLink = roomUrl;
  application.interviewRoomSlug = roomSlug;
  application.interviewId = interviewId;
  // Set status to 'shortlisted' when interview is scheduled, not 'interviewed'
  // 'interviewed' should only be set after the interview is completed
  if (application.status === 'pending' || application.status === 'reviewed') {
    application.status = 'shortlisted';
  }
  if (!application.reviewedAt) {
    application.reviewedAt = new Date();
  }

  await application.save();

  const graduateName =
    `${graduateData?.firstName || ''} ${graduateData?.lastName || ''}`.trim();
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
        message: `Your interview for "${jobData?.title || 'the position'}" at ${company.companyName} is set for ${formattedDate}.`,
        relatedId: interviewId,
        relatedType: 'interview',
        email: {
          subject: `Interview Scheduled: ${jobData?.title || 'Position'} at ${company.companyName}`,
          text: `Hello ${graduateName || 'there'},\n\nAn interview has been scheduled for your application to "${jobData?.title || 'the position'}" at ${company.companyName}.\n\nDate: ${formattedDate}\nJoin Link: ${roomUrl}\n\nYou can also join directly from your Talent Hub Interviews tab when it's time.\n\nBest of luck!`,
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
export const getCompanyInterviews = async (
  req: Request,
  res: Response
): Promise<void> => {
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
              { $multiply: ['$durationMinutes', 60 * 1000] },
            ],
          },
          now,
        ],
      },
    },
    {
      $set: {
        status: 'completed',
        endedAt: now,
      },
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
      // Note: companyId is already available via jobId.companyId, no need to populate separately
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

  const {
    page = 1,
    limit = 20,
    rank,
    search,
    sortBy = 'createdAt',
  } = req.query;

  const pagination = validatePagination(page as string, limit as string, res);
  if (!pagination) return;

  try {
    // Get company ID
    const company = await Company.findOne({ userId }).lean();
    if (!company) {
      res.status(404).json({ message: 'Company profile not found' });
      return;
    }

    // Build query
    const query: Record<string, unknown> = {
      rank: { $exists: true, $ne: null }, // Only graduates with a rank
    };

    // Filter by rank if provided
    if (rank && typeof rank === 'string') {
      const rankValues = rank.split(',').map((r) => r.trim());
      query.rank = { $in: rankValues };
    }

    // Search filter
    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(_.escapeRegExp(search.trim()), 'i');
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
    const sort: Record<string, 1 | -1> = {};
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
        'firstName lastName position location skills education rank profilePictureUrl summary expLevel expYears workExperiences cv salaryPerAnnum'
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
          percentage:
            totalWithRank > 0
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
          const endTime = new Date(
            scheduledTime.getTime() + durationMinutes * 60 * 1000
          );
          // Interview is considered "upcoming" only if:
          // 1. It hasn't been cancelled
          // 2. The end time hasn't passed yet (current time is before end time)
          hasUpcomingInterview =
            interview.status !== 'cancelled' && endTime > now;
          interviewScheduledAt = interview.scheduledAt.toISOString();
        }

        return {
          id: graduateId,
          firstName: g.firstName,
          lastName: g.lastName,
          name: `${g.firstName} ${g.lastName}`,
          position: Array.isArray(g.position)
            ? g.position
            : [g.position].filter(Boolean),
          location: g.location,
          skills: g.skills || [],
          education: g.education,
          rank: g.rank,
          profilePictureUrl: g.profilePictureUrl,
          summary: g.summary,
          expLevel: g.expLevel,
          expYears: g.expYears,
          workExperiences: g.workExperiences || [],
          cv: displayCV
            ? {
                fileUrl: displayCV.fileUrl,
                fileName: displayCV.fileName,
              }
            : null,
          salaryPerAnnum: g.salaryPerAnnum,
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

/**
 * Get hired candidates count for company
 * GET /api/companies/hired-candidates/count
 */
export const getHiredCandidatesCount = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const company = await Company.findOne({ userId })
    .select('hiredCandidates')
    .lean();

  if (!company) {
    res.status(404).json({ message: 'Company profile not found' });
    return;
  }

  const count = company.hiredCandidates?.length || 0;

  res.json({
    count,
    hiredCandidates: company.hiredCandidates || [],
  });
};

/**
 * Get hired candidates details for company
 * GET /api/companies/hired-candidates
 */
export const getHiredCandidates = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const company = await Company.findOne({ userId })
    .select('hiredCandidates companyName')
    .lean();

  if (!company) {
    res.status(404).json({ message: 'Company profile not found' });
    return;
  }

  const { page = '1', limit = '10', search } = req.query;

  const pagination = validatePagination(page as string, limit as string, res);
  if (!pagination) return;

  if (!company.hiredCandidates || company.hiredCandidates.length === 0) {
    res.json({
      hiredCandidates: [],
      count: 0,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: 0,
        pages: 0,
      },
    });
    return;
  }

  // Build query for hired graduates
  const query: Record<string, unknown> = {
    _id: { $in: company.hiredCandidates },
  };

  // Add search filter if provided
  if (search && typeof search === 'string' && search.trim()) {
    const searchRegex = new RegExp(_.escapeRegExp(search.trim()), 'i');
    query.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { position: { $elemMatch: { $regex: searchRegex } } },
      { location: searchRegex },
      { skills: { $in: [searchRegex] } },
    ];
  }

  const skip = (pagination.page - 1) * pagination.limit;

  const [graduates, total] = await Promise.all([
    Graduate.find(query)
      .select(
        'firstName lastName position location skills education rank profilePictureUrl summary expLevel expYears workExperiences cv salaryPerAnnum userId'
      )
      .populate('userId', 'email')
      .sort({ firstName: 1, lastName: 1 })
      .skip(skip)
      .limit(pagination.limit)
      .lean(),
    Graduate.countDocuments(query),
  ]);

  // For each hired candidate, get their application details with this company
  const graduateIds = graduates.map((g) => g._id);
  const companyJobs = await Job.find({ companyId: company._id })
    .select('_id')
    .lean();
  const companyJobIds = companyJobs.map((job) => job._id);

  // Get all hired applications for these graduates with this company
  const hiredApplications = await Application.find({
    graduateId: { $in: graduateIds },
    jobId: { $in: companyJobIds },
    status: 'hired',
  })
    .populate({
      path: 'jobId',
      select: 'title location jobType',
    })
    .select('graduateId jobId appliedAt reviewedAt')
    .sort({ reviewedAt: -1 }) // Most recent hire first
    .lean();

  // Create a map of graduateId -> application details
  const applicationMap = new Map();
  hiredApplications.forEach((app) => {
    const gradId = app.graduateId.toString();
    if (!applicationMap.has(gradId)) {
      applicationMap.set(gradId, app);
    }
  });

  // Enrich graduate data with hire details
  const enrichedGraduates = graduates.map((graduate) => {
    const gradId = graduate._id.toString();
    const application = applicationMap.get(gradId);

    // Get the CV that's on display
    const displayCV =
      graduate.cv?.find((cv) => cv.onDisplay) || graduate.cv?.[0];

    interface PopulatedJob {
      title?: string;
      location?: string;
      jobType?: string;
    }
    const job = application?.jobId as PopulatedJob | undefined;

    return {
      id: gradId,
      firstName: graduate.firstName,
      lastName: graduate.lastName,
      name: `${graduate.firstName} ${graduate.lastName}`,
      position: graduate.position,
      location: graduate.location,
      skills: graduate.skills || [],
      education: graduate.education,
      rank: graduate.rank,
      profilePictureUrl: graduate.profilePictureUrl,
      summary: graduate.summary,
      expLevel: graduate.expLevel,
      expYears: graduate.expYears,
      workExperiences: graduate.workExperiences || [],
      cv: displayCV
        ? {
            fileUrl: displayCV.fileUrl,
            fileName: displayCV.fileName,
          }
        : null,
      salaryPerAnnum: graduate.salaryPerAnnum,
      email:
        graduate.userId &&
        typeof graduate.userId === 'object' &&
        'email' in graduate.userId
          ? graduate.userId.email
          : null,
      hireDetails: application
        ? {
            jobTitle: job?.title,
            jobLocation: job?.location,
            jobType: job?.jobType,
            hiredAt: application.reviewedAt,
            appliedAt: application.appliedAt,
          }
        : null,
    };
  });

  res.json({
    hiredCandidates: enrichedGraduates,
    count: total,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit),
    },
  });
};

/**
 * Get Calendly OAuth authorization URL
 * GET /api/v1/companies/calendly/connect
 */
export const getCalendlyAuthUrl = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!calendlyConfig.enabled) {
      res.status(503).json({
        message: 'Calendly integration is not configured',
      });
      return;
    }

    if (!calendlyConfig.clientId || !calendlyConfig.redirectUri) {
      res.status(500).json({
        message: 'Calendly OAuth configuration is incomplete',
      });
      return;
    }

    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    const stateHash = hashToken(state);

    // Store state with user ID for callback verification (expires in 10 minutes)
    await Token.create({
      user: userId,
      tokenHash: stateHash,
      type: TOKEN_TYPES.CALENDLY_OAUTH_STATE,
      expiresAt: calculateExpiryDate(10 * 60 * 1000), // 10 minutes
      metadata: { userId: userId.toString() },
    });

    const authUrl = new URL('https://auth.calendly.com/oauth/authorize');
    authUrl.searchParams.append('client_id', calendlyConfig.clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', calendlyConfig.redirectUri);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('scope', 'default');

    res.json({
      authUrl: authUrl.toString(),
      state,
    });
  } catch (error) {
    console.error('Get Calendly auth URL error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Handle Calendly OAuth callback
 * GET /api/v1/companies/calendly/callback
 */
export const calendlyOAuthCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  const redirectToProfile = (success: boolean, message?: string) => {
    const trimmedBase = CLIENT_BASE_URL.replace(/\/+$/, '');
    const params = new URLSearchParams();

    if (success) {
      params.append('calendly', 'connected');
    } else {
      params.append('calendly', 'error');
      if (message) {
        params.append('message', encodeURIComponent(message));
      }
    }

    const redirectUrl = `${trimmedBase}/company/profile?${params.toString()}`;
    res.redirect(redirectUrl);
  };

  try {
    const { code, state } = req.query;

    if (!state || typeof state !== 'string') {
      redirectToProfile(false, 'Missing state parameter');
      return;
    }

    // Look up user by state token
    const stateHash = hashToken(state);
    const stateToken = await Token.findOne({
      tokenHash: stateHash,
      type: TOKEN_TYPES.CALENDLY_OAUTH_STATE,
      consumedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });

    if (!stateToken || !stateToken.isActive()) {
      redirectToProfile(false, 'Invalid or expired state parameter');
      return;
    }

    const userId = stateToken.user;

    // Consume the state token
    stateToken.consumedAt = new Date();
    await stateToken.save();

    if (!code || typeof code !== 'string') {
      redirectToProfile(false, 'Authorization code is required');
      return;
    }

    if (
      !calendlyConfig.clientId ||
      !calendlyConfig.clientSecret ||
      !calendlyConfig.redirectUri
    ) {
      redirectToProfile(false, 'Calendly OAuth configuration is incomplete');
      return;
    }

    // Exchange authorization code for access token
    const tokenResponse = await axios.post(
      'https://auth.calendly.com/oauth/token',
      {
        grant_type: 'authorization_code',
        client_id: calendlyConfig.clientId,
        client_secret: calendlyConfig.clientSecret,
        code,
        redirect_uri: calendlyConfig.redirectUri,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    if (!access_token) {
      redirectToProfile(false, 'Failed to obtain access token');
      return;
    }

    // Get user information from Calendly
    const userInfo = await calendlyService.getCurrentUser(
      calendlyService.encryptToken(access_token)
    );

    // Find company profile
    const company = await Company.findOne({ userId });
    if (!company) {
      redirectToProfile(false, 'Company profile not found');
      return;
    }

    const encryptedAccessToken =
      calendlyService.encryptToken(access_token) || access_token;
    const encryptedRefreshToken = refresh_token
      ? calendlyService.encryptToken(refresh_token) || refresh_token
      : undefined;

    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : undefined;

    const companyDoc = await Company.findById(company._id).select(
      '+calendly.accessToken +calendly.refreshToken'
    );
    if (!companyDoc) {
      redirectToProfile(false, 'Company profile not found');
      return;
    }

    // Initialize calendly object if it doesn't exist
    if (!companyDoc.calendly) {
      companyDoc.calendly = {
        enabled: false,
      };
    }

    // Set all calendly fields directly on the document
    companyDoc.calendly.userUri = userInfo.uri;
    companyDoc.calendly.accessToken = encryptedAccessToken;
    companyDoc.calendly.tokenExpiresAt = tokenExpiresAt;
    companyDoc.calendly.connectedAt = new Date();
    companyDoc.calendly.enabled = true;

    if (encryptedRefreshToken) {
      companyDoc.calendly.refreshToken = encryptedRefreshToken;
    }

    // Mark the nested calendly object as modified
    companyDoc.markModified('calendly');

    // Save the document - this is the most reliable way to save fields with select: false
    await companyDoc.save();

    redirectToProfile(true);
  } catch (error) {
    console.error('Calendly OAuth callback error:', error);
    let errorMessage = 'Internal server error';

    if (axios.isAxiosError(error)) {
      errorMessage =
        error.response?.data?.message || error.message || errorMessage;
    }

    redirectToProfile(false, errorMessage);
  }
};

/**
 * Get Calendly connection status
 * GET /api/v1/companies/calendly/status
 */
export const getCalendlyStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Explicitly select calendly fields including accessToken (which has select: false)
    const company = await Company.findOne({ userId }).select(
      '+calendly.accessToken +calendly.refreshToken'
    );
    if (!company) {
      res.status(404).json({ message: 'Company profile not found' });
      return;
    }

    if (!company.calendly?.enabled) {
      res.json({
        connected: false,
        enabled: false,
      });
      return;
    }

    // Try to get user info to verify connection is still valid
    let userInfo = null;
    if (!company.calendly.accessToken) {
      res.json({
        connected: !!company.calendly.userUri,
        enabled: company.calendly.enabled,
        userUri: company.calendly.userUri,
        publicLink: company.calendly.publicLink,
        connectedAt: company.calendly.connectedAt,
        userInfo: null,
      });
      return;
    }

    try {
      // Check if token is expired and refresh if needed
      let accessTokenToUse = company.calendly.accessToken;

      if (
        company.calendly.tokenExpiresAt &&
        company.calendly.tokenExpiresAt < new Date() &&
        company.calendly.refreshToken
      ) {
        try {
          const refreshResult = await calendlyService.refreshAccessToken(
            company.calendly.refreshToken
          );

          // Update company with new tokens
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

          accessTokenToUse = refreshResult.accessToken;
        } catch (refreshError) {
          console.warn('Calendly token refresh failed:', refreshError);
          // Continue with original token - it might still work
        }
      }

      userInfo = await calendlyService.getCurrentUser(accessTokenToUse);
    } catch (error) {
      console.warn('Calendly token validation failed:', error);
      // If token is invalid and we have a refresh token, try to refresh
      if (
        error instanceof Error &&
        error.message.includes('authentication failed') &&
        company.calendly.refreshToken
      ) {
        try {
          const refreshResult = await calendlyService.refreshAccessToken(
            company.calendly.refreshToken
          );

          // Update company with new tokens
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

          // Retry with new token
          userInfo = await calendlyService.getCurrentUser(
            refreshResult.accessToken
          );
        } catch (refreshError) {
          console.warn(
            'Calendly token refresh failed after validation error:',
            refreshError
          );
        }
      }
    }

    res.json({
      connected: !!company.calendly.userUri,
      enabled: company.calendly.enabled,
      userUri: company.calendly.userUri,
      publicLink: company.calendly.publicLink,
      connectedAt: company.calendly.connectedAt,
      userInfo: userInfo
        ? {
            name: userInfo.name,
            email: userInfo.email,
            schedulingUrl: userInfo.scheduling_url,
          }
        : null,
    });
  } catch (error) {
    console.error('Get Calendly status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Set public Calendly link (alternative to OAuth)
 * POST /api/v1/companies/calendly/public-link
 */
export const setCalendlyPublicLink = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { publicLink } = req.body;

    if (!publicLink || typeof publicLink !== 'string') {
      res.status(400).json({ message: 'Public Calendly link is required' });
      return;
    }

    // Validate that it's a Calendly URL
    let url: URL;
    try {
      url = new URL(publicLink);
    } catch {
      res.status(400).json({ message: 'Invalid URL format' });
      return;
    }

    // Security: Validate hostname to prevent SSRF attacks
    const hostname = url.hostname.toLowerCase();
    if (!hostname.includes('calendly.com')) {
      res.status(400).json({
        message: 'Invalid Calendly link. Must be a calendly.com URL',
      });
      return;
    }

    // Security: Only allow HTTPS URLs
    if (url.protocol !== 'https:') {
      res.status(400).json({
        message: 'Calendly link must use HTTPS protocol',
      });
      return;
    }

    const company = await Company.findOne({ userId });
    if (!company) {
      res.status(404).json({ message: 'Company profile not found' });
      return;
    }

    if (!company.calendly) {
      company.calendly = {
        enabled: false,
      };
    }

    company.calendly.publicLink = publicLink.trim();
    company.calendly.enabled = true;
    company.calendly.connectedAt = new Date();

    await company.save();

    res.json({
      message: 'Public Calendly link set successfully',
      calendly: {
        publicLink: company.calendly.publicLink,
        enabled: company.calendly.enabled,
      },
    });
  } catch (error) {
    console.error('Set Calendly public link error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Disconnect Calendly account
 * DELETE /api/v1/companies/calendly/disconnect
 */
export const disconnectCalendly = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
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

    if (!company.calendly) {
      res.json({
        message: 'Calendly account disconnected successfully',
      });
      return;
    }

    company.calendly.enabled = false;
    company.calendly.accessToken = undefined;
    company.calendly.refreshToken = undefined;
    company.calendly.tokenExpiresAt = undefined;
    // Keep userUri and publicLink in case user wants to reconnect

    await company.save();

    res.json({
      message: 'Calendly account disconnected successfully',
    });
  } catch (error) {
    console.error('Disconnect Calendly error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
