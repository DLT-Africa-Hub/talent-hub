import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Graduate, { GraduateDocument } from '../models/Graduate.model';
import Match from '../models/Match.model';
import Job from '../models/Job.model';
import Application from '../models/Application.model';
import Company from '../models/Company.model';
import {
  AIServiceError,
  generateAssessmentQuestions,
  generateFeedback,
  generateProfileEmbedding,
} from '../services/aiService';
import { queueGraduateMatching } from '../services/aiMatching.service';
import {
  notifyGraduateAppliedToJob,
  notifyCompanyJobApplicationReceived,
  notifyGraduateProfileUpdated,
} from '../services/notification.dispatcher';
import { createNotification } from '../services/notification.service';

const { ObjectId } = mongoose.Types;

const requireAuthenticatedUserId = (
  req: Request,
  res: Response
): string | null => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return null;
  }
  if (!ObjectId.isValid(userId)) {
    res.status(400).json({ message: 'Invalid user identifier' });
    return null;
  }
  return userId;
};

const findGraduateOrRespond = async (
  userId: string,
  res: Response,
  options?: { populate?: boolean }
): Promise<GraduateDocument | null> => {
  const query = Graduate.findOne({ userId: new ObjectId(userId) });
  if (options?.populate) {
    query.populate('userId', 'email role');
  }

  const graduate = await query;
  if (!graduate) {
    res.status(404).json({ message: 'Profile not found' });
    return null;
  }
  return graduate;
};

const sanitizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const trimmed = value
    .map((item) => (typeof item === 'string' ? item.trim() : null))
    .filter((item): item is string => Boolean(item && item.length > 0));
  return Array.from(new Set(trimmed));
};

const EXPERIENCE_LEVELS = new Set(['entry level', 'mid level', 'senior level'] as const);
const POSITION_OPTIONS = new Set([
  'frontend developer',
  'backend developer',
  'fullstack developer',
  'mobile developer',
  'devops engineer',
  'data engineer',
  'security engineer',
  'other',
] as const);

const parsePhoneNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const digitsOnly = value.replace(/\D+/g, '');
    if (digitsOnly.length === 0) {
      return null;
    }
    const parsed = Number(digitsOnly);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const validateExperienceLevel = (
  value: unknown
): value is typeof EXPERIENCE_LEVELS extends Set<infer T> ? T : never =>
  typeof value === 'string' && EXPERIENCE_LEVELS.has(value as never);

const validatePosition = (
  value: unknown
): value is typeof POSITION_OPTIONS extends Set<infer T> ? T : never =>
  typeof value === 'string' && POSITION_OPTIONS.has(value as never);

type PopulatedJobLean = {
  _id: mongoose.Types.ObjectId;
  title?: string;
  companyId?: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId; companyName: string };
  location?: string;
  jobType?: string;
  description?: string;
  requirements?: {
    skills?: string[];
    education?: string;
    experience?: string;
  };
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

type MatchLean = {
  _id: mongoose.Types.ObjectId;
  graduateId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId | PopulatedJobLean | null;
  score: number;
  status: 'pending' | 'accepted' | 'rejected';
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
};

const isPopulatedJob = (
  value: unknown
): value is PopulatedJobLean & {
  _id: mongoose.Types.ObjectId;
} => {
  return (
    !!value &&
    typeof value === 'object' &&
    '_id' in value &&
    (value as { _id: unknown })._id instanceof mongoose.Types.ObjectId
  );
};

const buildProfileSummary = (
  graduate: GraduateDocument,
  summary?: string,
  additionalContext?: string
): string => {
  const lines = [
    `Name: ${graduate.firstName} ${graduate.lastName}`,
    `Skills: ${graduate.skills.join(', ') || 'N/A'}`,
    `Education: ${graduate.education.degree} in ${graduate.education.field} from ${graduate.education.institution}`,
    `Interests: ${graduate.interests.join(', ') || 'N/A'}`,
  ];

  if (graduate.workExperiences.length > 0) {
    const workSummaries = graduate.workExperiences.map((exp) => {
      const startYear = exp.startDate
        ? new Date(exp.startDate).getFullYear()
        : 'unknown';
      const endYear = exp.endDate
        ? new Date(exp.endDate).getFullYear()
        : 'present';
      return `${exp.title} at ${exp.company} (${startYear} - ${endYear})`;
    });
    lines.push(`Work Experience: ${workSummaries.join('; ')}`);
  }

  if (summary && summary.trim().length > 0) {
    lines.push(`Assessment Summary: ${summary.trim()}`);
  }

  if (additionalContext && additionalContext.trim().length > 0) {
    lines.push(`Additional Context: ${additionalContext.trim()}`);
  }

  return lines.join('\n');
};

export const getProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const graduate = await findGraduateOrRespond(userId, res, {
      populate: true,
    });
    if (!graduate) {
      return;
    }

    res.json({
      graduate: graduate.toObject({ versionKey: false }),
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const userObjectId = new ObjectId(userId);

    const existing = await Graduate.findOne({ userId: userObjectId });
    if (existing) {
      res.status(400).json({ message: 'Profile already exists' });
      return;
    }

    const {
      firstName,
      lastName,
      phoneNumber,
      expLevel,
      expYears,
      position,
      skills = [],
      education,
      interests = [],
      socials,
      portfolio,
      profilePictureUrl,
      location,
      workExperiences = [],
    } = req.body;

    if (
      typeof firstName !== 'string' ||
      typeof lastName !== 'string'
    ) {
      res.status(400).json({
        message:
          'firstName, lastName, phoneNumber, expLevel, expYears, and position are required',
      });
      return;
    }

    const parsedPhone = parsePhoneNumber(phoneNumber);
    if (parsedPhone === null) {
      res.status(400).json({ message: 'phoneNumber must be a valid numeric value' });
      return;
    }

    if (!validateExperienceLevel(expLevel)) {
      res.status(400).json({ message: 'expLevel must be one of entry level, mid level, or senior level' });
      return;
    }

    const yearsValue =
      typeof expYears === 'number' && Number.isFinite(expYears)
        ? expYears
        : typeof expYears === 'string'
          ? Number.parseFloat(expYears)
          : NaN;
    if (!Number.isFinite(yearsValue) || yearsValue < 3) {
      res.status(400).json({ message: 'expYears must be at least 3 years' });
      return;
    }

    if (!validatePosition(position)) {
      res.status(400).json({
        message:
          'position must be one of frontend developer, backend developer, fullstack developer, mobile developer, devops engineer, data engineer, security engineer, other',
      });
      return;
    }

    // Validate education if provided (optional)
    let educationData: {
      degree: string;
      field: string;
      institution: string;
      graduationYear: number;
    } | undefined;

    if (education && typeof education === 'object') {
      const { degree, field, institution, graduationYear } = education;
      if (
        typeof degree !== 'string' ||
        typeof field !== 'string' ||
        typeof institution !== 'string' ||
        typeof graduationYear !== 'number'
      ) {
        res.status(400).json({
          message:
            'If education is provided, it must include degree, field, institution, and graduationYear',
        });
        return;
      }
      educationData = {
        degree: degree.trim(),
        field: field.trim(),
        institution: institution.trim(),
        graduationYear,
      };
    }

    const existingPhone = await Graduate.findOne({
      phoneNumber: parsedPhone,
    }).lean();
    if (existingPhone) {
      res
        .status(400)
        .json({
          message: 'Phone number is already associated with another graduate',
        });
      return;
    }

    const graduate = await Graduate.create({
      userId: userObjectId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: parsedPhone,
      expLevel,
      expYears: yearsValue,
      position,
      profilePictureUrl:
        typeof profilePictureUrl === 'string'
          ? profilePictureUrl.trim()
          : undefined,
      location:
        typeof location === 'string'
          ? location.trim()
          : undefined,
      skills: sanitizeStringArray(skills),
      education: educationData || {
        degree: 'Not specified',
        field: 'Not specified',
        institution: 'Not specified',
        graduationYear: new Date().getFullYear(),
      },
      interests: sanitizeStringArray(interests),
      socials:
        typeof socials === 'object' && socials !== null
          ? {
              github:
                typeof socials.github === 'string'
                  ? socials.github.trim()
                  : undefined,
              twitter:
                typeof socials.twitter === 'string'
                  ? socials.twitter.trim()
                  : undefined,
              linkedin:
                typeof socials.linkedin === 'string'
                  ? socials.linkedin.trim()
                  : undefined,
            }
          : undefined,
      portfolio: typeof portfolio === 'string' ? portfolio.trim() : undefined,
      workExperiences: Array.isArray(workExperiences)
        ? workExperiences
            .map((exp) => {
              if (!exp || typeof exp !== 'object') {
                return null;
              }
              const { company, title, startDate, endDate, description } = exp;
              if (
                typeof company !== 'string' ||
                typeof title !== 'string' ||
                !startDate
              ) {
                return null;
              }
              const parsedStart = new Date(startDate);
              if (Number.isNaN(parsedStart.getTime())) {
                return null;
              }
              let parsedEnd: Date | undefined;
              if (endDate) {
                const end = new Date(endDate);
                if (!Number.isNaN(end.getTime())) {
                  parsedEnd = end;
                }
              }
              return {
                company: company.trim(),
                title: title.trim(),
                startDate: parsedStart,
                endDate: parsedEnd,
                description:
                  typeof description === 'string'
                    ? description.trim()
                    : undefined,
              };
            })
            .filter((exp): exp is NonNullable<typeof exp> => exp !== null)
        : [],
    });

    res.status(201).json({
      message: 'Profile created successfully',
      graduate: graduate.toObject({ versionKey: false }),
    });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const graduate = await findGraduateOrRespond(userId, res);
    if (!graduate) {
      return;
    }

    const {
      firstName,
      lastName,
      interests,
      socials,
      portfolio,
      skills,
      education,
      profilePictureUrl,
      location,
      summary,
      phoneNumber,
      expLevel,
      expYears,
      position,
    } = req.body;

    if (typeof firstName === 'string' && firstName.trim().length > 0) {
      graduate.firstName = firstName.trim();
    }

    if (typeof lastName === 'string' && lastName.trim().length > 0) {
      graduate.lastName = lastName.trim();
    }

    if (Array.isArray(interests)) {
      graduate.interests = sanitizeStringArray(interests);
    }

    if (Array.isArray(skills)) {
      graduate.skills = sanitizeStringArray(skills);
    }

    if (
      typeof socials === 'object' &&
      socials !== null &&
      (typeof socials.github === 'string' ||
        typeof socials.twitter === 'string' ||
        typeof socials.linkedin === 'string')
    ) {
      graduate.socials = {
        github:
          typeof socials.github === 'string'
            ? socials.github.trim()
            : graduate.socials?.github,
        twitter:
          typeof socials.twitter === 'string'
            ? socials.twitter.trim()
            : graduate.socials?.twitter,
        linkedin:
          typeof socials.linkedin === 'string'
            ? socials.linkedin.trim()
            : graduate.socials?.linkedin,
      };
    }

    if (typeof portfolio === 'string') {
      graduate.portfolio = portfolio.trim();
    }

    if (summary !== undefined) {
      graduate.summary = typeof summary === 'string' && summary.trim().length > 0
        ? summary.trim()
        : undefined;
    }

    if (typeof profilePictureUrl === 'string') {
      graduate.profilePictureUrl = profilePictureUrl.trim();
    }

    if (location !== undefined) {
      graduate.location = typeof location === 'string' && location.trim().length > 0
        ? location.trim()
        : undefined;
    }

    if (phoneNumber !== undefined) {
      const parsedPhone = parsePhoneNumber(phoneNumber);
      if (parsedPhone === null) {
        res
          .status(400)
          .json({ message: 'phoneNumber must be a valid numeric value' });
        return;
      }

      if (graduate.phoneNumber !== parsedPhone) {
        const existingWithPhone = await Graduate.findOne({
          phoneNumber: parsedPhone,
          _id: { $ne: graduate._id },
        }).lean();

        if (existingWithPhone) {
          res
            .status(400)
            .json({
              message:
                'Phone number is already associated with another graduate',
            });
          return;
        }

        graduate.phoneNumber = parsedPhone;
      }
    }

    if (expLevel !== undefined) {
      if (!validateExperienceLevel(expLevel)) {
        res
          .status(400)
          .json({ message: 'expLevel must be one of entry, mid, or senior' });
        return;
      }
      graduate.expLevel = expLevel;
    }

    if (expYears !== undefined) {
      const yearsValue =
        typeof expYears === 'number' && Number.isFinite(expYears)
          ? expYears
          : typeof expYears === 'string'
            ? Number.parseFloat(expYears)
            : NaN;
      if (!Number.isFinite(yearsValue) || yearsValue < 3) {
        res.status(400).json({ message: 'expYears must be at least 3 years' });
        return;
      }
      graduate.expYears = yearsValue;
    }

    if (position !== undefined) {
      if (!validatePosition(position)) {
        res.status(400).json({
          message:
            'position must be one of frontend developer, backend developer, fullstack developer, mobile developer, devops engineer, data engineer, security engineer, other',
        });
        return;
      }
      graduate.position = position;
    }

    if (education && typeof education === 'object') {
      const { degree, field, institution, graduationYear } = education;
      if (
        typeof degree === 'string' &&
        typeof field === 'string' &&
        typeof institution === 'string' &&
        typeof graduationYear === 'number'
      ) {
        graduate.education = {
          degree: degree.trim(),
          field: field.trim(),
          institution: institution.trim(),
          graduationYear,
        };
      }
    }

    await graduate.save();

    // Emit notification for profile update
    try {
      const graduateUserId = graduate.userId instanceof mongoose.Types.ObjectId
        ? graduate.userId.toString()
        : String(graduate.userId);
      
      await notifyGraduateProfileUpdated({
        graduateId: graduateUserId,
        graduateName: `${graduate.firstName} ${graduate.lastName}`.trim(),
      });
    } catch (error) {
      console.error('Failed to send profile update notification:', error);
    }

    res.json({
      message: 'Profile updated successfully',
      graduate: graduate.toObject({ versionKey: false }),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProfilePicture = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const graduate = await findGraduateOrRespond(userId, res);
    if (!graduate) {
      return;
    }

    const { profilePictureUrl } = req.body;
    if (
      typeof profilePictureUrl !== 'string' ||
      profilePictureUrl.trim() === ''
    ) {
      res
        .status(400)
        .json({ message: 'profilePictureUrl must be a non-empty string' });
      return;
    }

    graduate.profilePictureUrl = profilePictureUrl.trim();
    await graduate.save();

    res.json({
      message: 'Profile picture updated',
      profilePictureUrl: graduate.profilePictureUrl,
    });
  } catch (error) {
    console.error('Update profile picture error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const replaceSkills = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const graduate = await findGraduateOrRespond(userId, res);
    if (!graduate) {
      return;
    }

    const { skills } = req.body;
    if (!Array.isArray(skills)) {
      res.status(400).json({ message: 'skills must be an array of strings' });
      return;
    }

    const sanitizedSkills = sanitizeStringArray(skills);
    if (sanitizedSkills.length === 0) {
      res
        .status(400)
        .json({ message: 'skills must contain at least one value' });
      return;
    }

    graduate.skills = sanitizedSkills;
    await graduate.save();

    res.json({
      message: 'Skills updated successfully',
      skills: graduate.skills,
    });
  } catch (error) {
    console.error('Replace skills error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const addSkill = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const graduate = await findGraduateOrRespond(userId, res);
    if (!graduate) {
      return;
    }

    const { skill } = req.body;
    if (typeof skill !== 'string' || skill.trim() === '') {
      res.status(400).json({ message: 'skill must be a non-empty string' });
      return;
    }

    const normalizedSkill = skill.trim();
    if (!graduate.skills.includes(normalizedSkill)) {
      graduate.skills.push(normalizedSkill);
      graduate.skills = sanitizeStringArray(graduate.skills);
      await graduate.save();
    }

    res.status(201).json({
      message: 'Skill added',
      skills: graduate.skills,
    });
  } catch (error) {
    console.error('Add skill error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const removeSkill = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const graduate = await findGraduateOrRespond(userId, res);
    if (!graduate) {
      return;
    }

    const { skill } = req.body;
    if (typeof skill !== 'string' || skill.trim() === '') {
      res.status(400).json({ message: 'skill must be a non-empty string' });
      return;
    }

    const normalizedSkill = skill.trim();
    graduate.skills = graduate.skills.filter((s) => s !== normalizedSkill);
    await graduate.save();

    res.json({
      message: 'Skill removed',
      skills: graduate.skills,
    });
  } catch (error) {
    console.error('Remove skill error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateEducation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const graduate = await findGraduateOrRespond(userId, res);
    if (!graduate) {
      return;
    }

    const { degree, field, institution, graduationYear } = req.body;
    if (
      typeof degree !== 'string' ||
      typeof field !== 'string' ||
      typeof institution !== 'string' ||
      typeof graduationYear !== 'number'
    ) {
      res.status(400).json({
        message:
          'degree, field, institution, and graduationYear are required to update education',
      });
      return;
    }

    graduate.education = {
      degree: degree.trim(),
      field: field.trim(),
      institution: institution.trim(),
      graduationYear,
    };
    await graduate.save();

    res.json({
      message: 'Education updated successfully',
      education: graduate.education,
    });
  } catch (error) {
    console.error('Update education error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const addWorkExperience = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const graduate = await findGraduateOrRespond(userId, res);
    if (!graduate) {
      return;
    }

    const { company, title, startDate, endDate, description } = req.body;
    if (
      typeof company !== 'string' ||
      typeof title !== 'string' ||
      !startDate
    ) {
      res.status(400).json({
        message: 'company, title, and startDate are required',
      });
      return;
    }

    const parsedStart = new Date(startDate);
    if (Number.isNaN(parsedStart.getTime())) {
      res.status(400).json({ message: 'startDate must be a valid date' });
      return;
    }

    let parsedEnd: Date | undefined;
    if (endDate) {
      const end = new Date(endDate);
      if (Number.isNaN(end.getTime())) {
        res.status(400).json({ message: 'endDate must be a valid date' });
        return;
      }
      parsedEnd = end;
    }

    graduate.workExperiences.push({
      company: company.trim(),
      title: title.trim(),
      startDate: parsedStart,
      endDate: parsedEnd,
      description:
        typeof description === 'string' ? description.trim() : undefined,
    });

    await graduate.save();

    const newExperience =
      graduate.workExperiences[graduate.workExperiences.length - 1];

    res.status(201).json({
      message: 'Work experience added',
      workExperience: newExperience,
    });
  } catch (error) {
    console.error('Add work experience error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateWorkExperience = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const graduate = await findGraduateOrRespond(userId, res);
    if (!graduate) {
      return;
    }

    const { experienceId } = req.params;
    if (!experienceId || !ObjectId.isValid(experienceId)) {
      res.status(400).json({ message: 'Invalid experienceId' });
      return;
    }

    const experienceObjectId = new ObjectId(experienceId);
    const experienceIndex = graduate.workExperiences.findIndex(
      (exp) => exp._id && exp._id.equals(experienceObjectId)
    );

    if (experienceIndex === -1) {
      res.status(404).json({ message: 'Work experience not found' });
      return;
    }

    const experience = graduate.workExperiences[experienceIndex];

    const { company, title, startDate, endDate, description } = req.body;

    if (typeof company === 'string' && company.trim().length > 0) {
      experience.company = company.trim();
    }
    if (typeof title === 'string' && title.trim().length > 0) {
      experience.title = title.trim();
    }
    if (startDate) {
      const parsedStart = new Date(startDate);
      if (Number.isNaN(parsedStart.getTime())) {
        res.status(400).json({ message: 'startDate must be a valid date' });
        return;
      }
      experience.startDate = parsedStart;
    }
    if (endDate === null || endDate === '') {
      experience.endDate = undefined;
    } else if (endDate !== undefined) {
      const parsedEnd = new Date(endDate);
      if (Number.isNaN(parsedEnd.getTime())) {
        res.status(400).json({ message: 'endDate must be a valid date' });
        return;
      }
      experience.endDate = parsedEnd;
    }
    if (typeof description === 'string') {
      experience.description = description.trim();
    }

    graduate.workExperiences[experienceIndex] = experience;

    graduate.markModified('workExperiences');
    await graduate.save();

    res.json({
      message: 'Work experience updated',
      workExperience: graduate.workExperiences[experienceIndex],
    });
  } catch (error) {
    console.error('Update work experience error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteWorkExperience = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const graduate = await findGraduateOrRespond(userId, res);
    if (!graduate) {
      return;
    }

    const { experienceId } = req.params;
    if (!experienceId || !ObjectId.isValid(experienceId)) {
      res.status(400).json({ message: 'Invalid experienceId' });
      return;
    }

    const experienceObjectId = new ObjectId(experienceId);
    const experienceIndex = graduate.workExperiences.findIndex(
      (exp) => exp._id && exp._id.equals(experienceObjectId)
    );

    if (experienceIndex === -1) {
      res.status(404).json({ message: 'Work experience not found' });
      return;
    }

    graduate.workExperiences.splice(experienceIndex, 1);
    graduate.markModified('workExperiences');
    await graduate.save();

    res.json({ message: 'Work experience removed' });
  } catch (error) {
    console.error('Delete work experience error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAssessmentQuestions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const graduate = await findGraduateOrRespond(userId, res);
    if (!graduate) {
      return;
    }

    if (!graduate.skills || graduate.skills.length === 0) {
      res
        .status(400)
        .json({ message: 'Graduate profile must include at least one skill' });
      return;
    }

    const rawCount = req.query.count;
    let count: number | undefined;
    if (typeof rawCount === 'string' && rawCount.trim().length > 0) {
      const parsed = Number.parseInt(rawCount, 10);

      if (Number.isNaN(parsed) || parsed <= 0 || parsed > 3) {
        res.status(400).json({ message: 'count must be a positive integer up to 3' });

        return;
      }
      count = parsed;
    }
    // Default to 3 questions if not specified
    if (!count) {
      count = 3;
    }

    const language =
      typeof req.query.language === 'string' &&
      req.query.language.trim().length > 0
        ? req.query.language.trim()
        : undefined;

    const questionSetVersion =
      typeof graduate.assessmentData?.questionSetVersion === 'number'
        ? graduate.assessmentData.questionSetVersion
        : 1;

    const attempts = graduate.assessmentData?.attempts ?? 0;

    const questions = await generateAssessmentQuestions(graduate.skills, {
      attempt: questionSetVersion,
      numQuestions: count || 3, // Default to 3 questions
      language,
    });

    // Store questions in assessmentData for later scoring
    if (!graduate.assessmentData) {
      graduate.assessmentData = {
        submittedAt: new Date(), // Temporary date, will be updated on submission
        attempts: 0,
        needsRetake: false,
        questionSetVersion: 1,
      };
    }
    // Store questions temporarily (we'll use them when calculating score)
    graduate.assessmentData.currentQuestions = questions;
    await graduate.save();

    res.json({
      questionSetVersion,
      attempts,
      needsRetake: graduate.assessmentData?.needsRetake ?? false,
      questions,
    });
  } catch (error) {
    if (error instanceof AIServiceError) {
      console.error('AI Service Error:', {
        message: error.message,
        statusCode: error.statusCode,
        cause: error.cause,
      });
      res.status(error.statusCode ?? 503).json({ message: error.message });
      return;
    }

    console.error('Assessment question generation error:', error);
    res
      .status(500)
      .json({ message: 'Failed to generate assessment questions' });
  }
};

export const submitAssessment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const graduate = await findGraduateOrRespond(userId, res);
    if (!graduate) {
      return;
    }

    const { answers } = req.body as { answers?: string[] | unknown };
    
    if (!answers) {
      res.status(400).json({ message: 'Answers array is required' });
      return;
    }

    if (!Array.isArray(answers)) {
      res.status(400).json({ 
        message: 'Answers must be an array',
        received: typeof answers,
        value: answers
      });
      return;
    }

    if (answers.length === 0) {
      res.status(400).json({ message: 'Answers array cannot be empty' });
      return;
    }

    // Filter out any empty or invalid answers
    const validAnswers = answers.filter((answer): answer is string => 
      typeof answer === 'string' && answer.trim().length > 0
    );

    if (validAnswers.length === 0) {
      res.status(400).json({ message: 'At least one valid answer is required' });
      return;
    }

    // Get the questions that were asked (we need to fetch them again or store them)
    // For now, we'll calculate score based on the answers provided
    // The questions should match the order of answers
    const questionSetVersion =
      typeof graduate.assessmentData?.questionSetVersion === 'number'
        ? graduate.assessmentData.questionSetVersion
        : 1;

    // Get stored questions from assessmentData for scoring
    const storedQuestions = graduate.assessmentData?.currentQuestions;

    // Calculate score using valid answers
    let correctAnswers = 0;
    let score: number | undefined = undefined;
    if (storedQuestions && Array.isArray(storedQuestions) && storedQuestions.length === validAnswers.length) {
      storedQuestions.forEach((q, index) => {
        if (validAnswers[index] === q.answer) {
          correctAnswers++;
        }
      });
      score = Math.round((correctAnswers / storedQuestions.length) * 100);
    }
    const passed = score !== undefined && score >= 60;

    // Calculate rank based on assessment score
    // A: 90-100%, B: 75-89%, C: 60-74%, D: Below 60%
    const rankThresholds = [
      { minScore: 90, rank: 'A' },
      { minScore: 75, rank: 'B' },
      { minScore: 60, rank: 'C' },
      { minScore: 0, rank: 'D' },
    ] as const;

    const rank =
      score !== undefined
        ? rankThresholds.find((threshold) => score >= threshold.minScore)
            ?.rank
        : undefined;

    const {
      summary,
      additionalContext,
      jobRequirements,
      feedbackLanguage,
      feedbackTemplateOverrides,
    } = req.body as {
      summary?: string;
      additionalContext?: string;
      jobRequirements?: {
        skills?: string[];
        education?: string;
        experience?: string;
      };
      feedbackLanguage?: string;
      feedbackTemplateOverrides?: Record<string, unknown>;
    };

    const profileText = buildProfileSummary(
      graduate,
      summary,
      additionalContext
    );

    // Generate embedding - required for AI matching
    let embedding: number[];
    try {
      embedding = await generateProfileEmbedding(profileText);
    } catch (embeddingError) {
      if (embeddingError instanceof AIServiceError) {
        res.status(embeddingError.statusCode ?? 503).json({
          message: 'Failed to generate profile embedding for AI matching',
          error: embeddingError.message,
        });
        return;
      }

        console.error('Unexpected embedding generation error:', embeddingError);
      res.status(500).json({
        message: 'Failed to generate profile embedding. Please try again.',
      });
      return;
    }

    let feedback: string | undefined;
    if (
      jobRequirements &&
      typeof jobRequirements === 'object' &&
      Array.isArray(jobRequirements.skills)
    ) {
      try {
        const requirementsPayload = {
          skills: jobRequirements.skills,
          education:
            typeof jobRequirements.education === 'string'
              ? jobRequirements.education
              : undefined,
          experience:
            typeof jobRequirements.experience === 'string'
              ? jobRequirements.experience
              : undefined,
        };

        const templateOverrides =
          feedbackTemplateOverrides &&
          typeof feedbackTemplateOverrides === 'object'
            ? Object.fromEntries(
                Object.entries(
                  feedbackTemplateOverrides as Record<string, unknown>
                )
                  .filter((entry): entry is [string, string] => {
                    const [, value] = entry;
                    return typeof value === 'string' && value.trim().length > 0;
                  })
                  .map(([key, value]) => [key, value.trim()])
              )
            : undefined;

        const language =
          typeof feedbackLanguage === 'string' &&
          feedbackLanguage.trim().length >= 2
            ? feedbackLanguage.trim()
            : undefined;

        const aiFeedback = await generateFeedback(
          {
            skills: graduate.skills,
            education: `${graduate.education.degree} in ${graduate.education.field}`,
            experience: graduate.workExperiences
              .map((exp) => `${exp.title} at ${exp.company}`)
              .join('; '),
          },
          requirementsPayload,
          {
            language,
            additionalContext:
              typeof additionalContext === 'string'
                ? additionalContext
                : undefined,
            templateOverrides,
          }
        );
        feedback = aiFeedback.feedback;
      } catch (feedbackError) {
        if (feedbackError instanceof AIServiceError) {
          console.error('Feedback generation error:', feedbackError.message, {
            statusCode: feedbackError.statusCode,
          });
        } else {
          console.error('Feedback generation error:', feedbackError);
        }
      }
    }

    const previousData = graduate.assessmentData;
    const attempts = (previousData?.attempts ?? 0) + 1;

    graduate.assessmentData = {
      submittedAt: new Date(),
      embedding, // Embedding is now required and always generated successfully
      feedback,
      attempts,
      needsRetake: score !== undefined && !passed, // Set needsRetake based on score
      lastScore: score,
      questionSetVersion,
    };
    // Remove temporary questions storage
    if (graduate.assessmentData) {
      delete graduate.assessmentData.currentQuestions;
    }

    // Update rank if score is available
    if (rank) {
      graduate.rank = rank;
    }

    await graduate.save();

    console.log(`✅ Assessment submitted successfully for user ${userId}. Score: ${score ?? 'N/A'}%, Passed: ${passed}`);

    queueGraduateMatching(graduate._id);

    res.json({
      message: 'Assessment submitted successfully',
      assessmentData: graduate.assessmentData,
      score,
      passed,
    });
  } catch (error) {
    console.error('Assessment submission error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAvailableJobs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const graduate = await findGraduateOrRespond(userId, res);
    if (!graduate) {
      return;
    }

    const parsePositiveInt = (
      value: unknown,
      fallback: number,
      options?: { min?: number; max?: number }
    ): number => {
      if (typeof value !== 'string') {
        return fallback;
      }
      const parsed = Number.parseInt(value, 10);
      if (Number.isNaN(parsed)) {
        return fallback;
      }
      const min = options?.min ?? 1;
      const max = options?.max ?? 100;
      return Math.min(max, Math.max(min, parsed));
    };

    const page = parsePositiveInt(req.query.page, 1, { min: 1 });
    const limit = parsePositiveInt(req.query.limit, 20, { min: 1, max: 100 });
    const skip = (page - 1) * limit;

    const search =
      typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const jobType =
      typeof req.query.jobType === 'string' ? req.query.jobType.trim() : '';
    const sortBy =
      typeof req.query.sortBy === 'string' ? req.query.sortBy.trim() : 'createdAt';

    const jobFilter: Record<string, unknown> = { status: 'active' };
    
    // Search filter
    if (search.length > 0) {
      jobFilter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    // Job type filter
    if (jobType && jobType !== 'all') {
      const jobTypeMap: Record<string, string> = {
        'full-time': 'Full time',
        'contract': 'Contract',
        'internship': 'Internship',
        'part-time': 'Part time',
      };
      const mappedJobType = jobTypeMap[jobType.toLowerCase()] || jobType;
      jobFilter.jobType = mappedJobType;
    }

    // Sort options
    const sortOptions: Record<string, Record<string, 1 | -1>> = {
      createdAt: { createdAt: -1 },
      title: { title: 1 },
      salary: { 'salary.min': -1, 'salary.max': -1 },
    };
    const sort = sortOptions[sortBy] || sortOptions.createdAt;

    const [jobs, total] = await Promise.all([
      Job.find(jobFilter)
        .select(
          'title companyId location requirements salary jobType status preferedRank createdAt updatedAt description'
        )
        .populate('companyId', 'companyName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(jobFilter),
    ]);

    if (jobs.length === 0) {
      res.json({
        jobs: [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
      return;
    }

    const jobIds = jobs.map((job) => job._id);
    const matches = await Match.find({
      graduateId: graduate._id,
      jobId: { $in: jobIds },
    })
      .select('jobId score')
      .lean();

    const matchScores = new Map<string, number>();
    matches.forEach((match) => {
      if (match.jobId) {
        matchScores.set(match.jobId.toString(), match.score);
      }
    });

    const jobsPayload = jobs.map((job) => {
      const companyName =
        job.companyId &&
        typeof job.companyId === 'object' &&
        'companyName' in job.companyId
          ? (job.companyId as { companyName: string }).companyName
          : undefined;

      return {
        id: job._id.toString(),
        title: job.title,
        companyName,
        companyId:
          job.companyId instanceof mongoose.Types.ObjectId
            ? job.companyId.toString()
            : undefined,
        location: job.location,
        jobType: job.jobType,
        salary: job.salary,
        requirements: job.requirements,
        matchScore: matchScores.get(job._id.toString()) ?? null,
        preferedRank: job.preferedRank,
        status: job.status,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      };
    });

    res.json({
      jobs: jobsPayload,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Available jobs fetch error:', error);
    res.status(500).json({ message: 'Failed to load available jobs' });
  }
};

export const getMatches = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const graduate = await findGraduateOrRespond(userId, res);
    if (!graduate) {
      return;
    }

    const { status } = req.query;
    const matchQuery: Record<string, unknown> = { graduateId: graduate._id };
    if (typeof status === 'string') {
      matchQuery.status = status;
    }

    const matchesRaw = await Match.find(matchQuery)
      .populate<{
        jobId: mongoose.Types.ObjectId | PopulatedJobLean;
      }>({
        path: 'jobId',
        select: 'title companyId location requirements salary status jobType description createdAt updatedAt',
        populate: {
          path: 'companyId',
          select: 'companyName',
        },
      })
      .sort({ score: -1, createdAt: -1 })
      .lean();

    const matches: MatchLean[] = matchesRaw as unknown as MatchLean[];

    res.json({
      matches: matches.map((match: MatchLean) => {
        let job: Record<string, unknown> | null = null;

        const jobSource = match.jobId;
        if (jobSource instanceof mongoose.Types.ObjectId) {
          job = { id: jobSource.toString() };
        } else if (isPopulatedJob(jobSource)) {
          // Extract company name if companyId is populated
          let companyName: string | undefined;
          if (
            jobSource.companyId &&
            typeof jobSource.companyId === 'object' &&
            'companyName' in jobSource.companyId
          ) {
            companyName = (jobSource.companyId as { companyName: string }).companyName;
          }

          job = {
            id: jobSource._id.toHexString(),
            title: jobSource.title,
            companyId: jobSource.companyId instanceof mongoose.Types.ObjectId
              ? jobSource.companyId
              : jobSource.companyId?._id || jobSource.companyId,
            companyName,
            location: jobSource.location,
            jobType: jobSource.jobType,
            description: jobSource.description,
            requirements: jobSource.requirements,
            salary: jobSource.salary,
            status: jobSource.status,
            createdAt: jobSource.createdAt,
            updatedAt: jobSource.updatedAt,
          };
        }

        return {
          id: match._id.toString(),
          score: match.score,
          status: match.status,
          feedback: match.feedback,
          createdAt: match.createdAt,
          updatedAt: match.updatedAt,
          job,
        };
      }),
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMatchById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const graduate = await findGraduateOrRespond(userId, res);
    if (!graduate) {
      return;
    }

    const { matchId } = req.params;
    if (!matchId || !ObjectId.isValid(matchId)) {
      res.status(400).json({ message: 'Invalid matchId' });
      return;
    }

    const matchRaw = await Match.findOne({
      _id: matchId,
      graduateId: graduate._id,
    })
      .populate<{ jobId: mongoose.Types.ObjectId | PopulatedJobLean }>(
        'jobId',
        'title description companyId location requirements salary status createdAt updatedAt'
      )
      .lean();

    const match = matchRaw as unknown as MatchLean | null;

    if (!match) {
      res.status(404).json({ message: 'Match not found' });
      return;
    }

    res.json({
      match: {
        id: match._id.toString(),
        score: match.score,
        status: match.status,
        feedback: match.feedback,
        createdAt: match.createdAt,
        updatedAt: match.updatedAt,
        job:
          match.jobId instanceof mongoose.Types.ObjectId
            ? { id: match.jobId.toString() }
            : match.jobId,
      },
    });
  } catch (error) {
    console.error('Get match detail error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const applyToJob = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const graduate = await findGraduateOrRespond(userId, res);
    if (!graduate) {
      return;
    }

    const { jobId } = req.params;
    if (!jobId || !ObjectId.isValid(jobId)) {
      res.status(400).json({ message: 'Invalid jobId' });
      return;
    }

    const job = await Job.findById(jobId)
      .select('title companyId status')
      .lean();
    if (!job || job.status !== 'active') {
      res.status(404).json({ message: 'Job not found or not active' });
      return;
    }

    const company = await Company.findById(job.companyId)
      .select('userId companyName')
      .lean();

    const existingApplication = await Application.findOne({
      graduateId: graduate._id,
      jobId,
    });
    if (existingApplication) {
      res
        .status(409)
        .json({ message: 'Application already exists for this job' });
      return;
    }

    const match = await Match.findOne({
      graduateId: graduate._id,
      jobId,
    });

    const { coverLetter, resume } = req.body as {
      coverLetter?: string;
      resume?: string;
    };

    const application = await Application.create({
      graduateId: graduate._id,
      jobId,
      matchId: match?._id,
      status: 'pending',
      coverLetter:
        typeof coverLetter === 'string' ? coverLetter.trim() : undefined,
      resume: typeof resume === 'string' ? resume.trim() : undefined,
    });

    const persistedApplicationId = application._id as mongoose.Types.ObjectId;

    res.status(201).json({
      message: 'Application submitted',
      application: application.toObject({ versionKey: false }),
    });

    // Emit notifications for both graduate and company
    try {
      const graduateName = `${graduate.firstName || ''} ${graduate.lastName || ''}`.trim() || 'A graduate';

      // Notify graduate
      if (graduate.userId) {
        await notifyGraduateAppliedToJob({
          applicationId: persistedApplicationId.toString(),
          jobId: jobId,
          jobTitle: job.title,
          companyId: company?.userId?.toString() || company?._id?.toString() || '',
          companyName: company?.companyName || 'Company',
          graduateId: graduate.userId.toString(),
        });
      }

      // Notify company
      if (company?.userId) {
        await notifyCompanyJobApplicationReceived({
          applicationId: persistedApplicationId.toString(),
          jobId: jobId,
          jobTitle: job.title,
          graduateId: graduate._id.toString(),
          graduateName: graduateName,
          companyId: company.userId.toString(),
        });
      }
      } catch (error) {
      console.error('Failed to send application notifications:', error);
    }
  } catch (error) {
    console.error('Apply to job error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getApplications = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const graduate = await findGraduateOrRespond(userId, res);
    if (!graduate) {
      return;
    }

    const applications = await Application.find({ graduateId: graduate._id })
      .populate('jobId', 'title companyId location status')
      .sort({ appliedAt: -1 })
      .lean();

    res.json({
      applications: applications.map((application) => ({
        id: application._id.toString(),
        job: application.jobId,
        status: application.status,
        coverLetter: application.coverLetter,
        resume: application.resume,
        appliedAt: application.appliedAt,
        reviewedAt: application.reviewedAt,
        matchId: application.matchId?.toString(),
      })),
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const isWithdrawStatus = (value: unknown): value is 'withdrawn' =>
  value === 'withdrawn';

export const updateApplicationStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const graduate = await findGraduateOrRespond(userId, res);
    if (!graduate) {
      return;
    }

    const { applicationId: applicationIdParam } = req.params;
    if (!applicationIdParam || !ObjectId.isValid(applicationIdParam)) {
      res.status(400).json({ message: 'Invalid applicationId' });
      return;
    }

    const { status } = req.body as { status?: unknown };
    if (!isWithdrawStatus(status)) {
      res.status(400).json({ message: 'Only status "withdrawn" is allowed' });
      return;
    }

    const application = await Application.findOne({
      _id: applicationIdParam,
      graduateId: graduate._id,
    });
    if (!application) {
      res.status(404).json({ message: 'Application not found' });
      return;
    }

    if (application.status === status) {
      res.json({
        message: 'Application status updated',
        status: application.status,
      });
      return;
    }

    application.status = 'withdrawn';
    application.reviewedAt = new Date();
    await application.save();

    const persistedApplicationId = application._id as mongoose.Types.ObjectId;

    try {
      const job = await Job.findById(application.jobId)
        .select('title companyId')
        .lean();

      if (job?.companyId) {
        const company = await Company.findById(job.companyId)
          .select('userId companyName')
          .lean();

        if (company?.userId) {
          await createNotification({
            userId: company.userId,
            type: 'application',
            title: 'Application withdrawn',
            message: `${graduate.firstName} ${graduate.lastName} withdrew their application for ${job.title}`,
            relatedId: persistedApplicationId,
            relatedType: 'application',
            email: {
              subject: `Application withdrawn for ${job.title}`,
              text: [
                `Hi ${company.companyName || 'there'},`,
                '',
                `${graduate.firstName} ${graduate.lastName} has withdrawn their application for "${job.title}".`,
                'Sign in to Talent Hub to update your pipeline if needed.',
              ].join('\n'),
            },
          });
        }
      }
    } catch (notificationError) {
      console.error(
        'Failed to notify company about withdrawn application:',
        notificationError
      );
    }

    res.json({
      message: 'Application status updated',
      status: application.status,
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
