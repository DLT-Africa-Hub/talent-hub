/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Company from '../models/Company.model';
import Job from '../models/Job.model';
import Match from '../models/Match.model';
import Application from '../models/Application.model';
import Graduate from '../models/Graduate.model';
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
// Import middleware to ensure global types are loaded
import '../middleware/auth.middleware';
import { createNotification } from '../services/notification.service';

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

  res.json({
    message: 'Company profile updated successfully',
    company,
  });
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

  const { title, jobType, preferedRank, description, requirements, location, salary, status } =
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

  const validatedLocation = location ? validateOptionalString(location, 'Location', res) : null;
  if (location && validatedLocation === null) return;

  const validatedSalary = validateSalary(salary, res);
  if (salary !== undefined && validatedSalary === null) return;

  const validatedStatus = status
    ? validateOptionalEnum(status, ['active', 'closed', 'draft'] as const, 'Status', res)
    : null;
  if (status && validatedStatus === null) return;

  const jobText = `
    Title: ${validatedTitle}
    Type: ${validatedJobType}
    Preferred Rank: ${validatedPreferedRank}
    Description: ${validatedDescription}
    Required Skills: ${validatedSkills.join(', ')}
  `;

  let embedding: number[];
  try {
    embedding = await generateJobEmbedding(jobText);
  } catch (error) {
    if (error instanceof AIServiceError) {
      res.status(error.statusCode ?? 503).json({ message: error.message });
      return;
    }

    console.error('Error generating embedding:', error);
    res.status(500).json({ message: 'Failed to generate job embedding' });
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
    },
    ...deleteUndefined({
      location: validatedLocation,
      salary: validatedSalary,
      status: validatedStatus,
    }),
    embedding,
  });

  await job.save();

  queueJobMatching(job._id as mongoose.Types.ObjectId);

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

  res.json({
    jobs,
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

  const { title, jobType, preferedRank, description, requirements, location, salary, status } =
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

  const updatedJob = await Job.findById(job._id).select('-embedding').lean();

  res.json({
    message: 'Job updated successfully',
    job: updatedJob,
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
        select: 'firstName lastName skills education rank',
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

  try {
    const graduate = await Graduate.findById(match.graduateId)
      .select('firstName lastName userId')
      .lean();

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

  const updatedMatch = await Match.findById(matchId)
    .populate({
      path: 'graduateId',
      select: 'firstName lastName skills education rank',
      populate: {
        path: 'userId',
        select: 'email',
      },
    })
    .lean();

  res.json({
    message: `Match ${validatedStatus} successfully`,
    match: updatedMatch,
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
        select: 'firstName lastName skills education rank',
        populate: {
          path: 'userId',
          select: 'email',
        },
      })
      .populate({
        path: 'jobId',
        select: 'title companyId',
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
