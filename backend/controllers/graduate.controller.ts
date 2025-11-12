import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Graduate, { GraduateDocument } from '../models/Graduate.model';
import Match from '../models/Match.model';
import Job from '../models/Job.model';
import Application from '../models/Application.model';
import {
  AIServiceError,
  generateFeedback,
  generateProfileEmbedding,
} from '../services/aiService';
import { queueGraduateMatching } from '../services/aiMatching.service';

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

type PopulatedJobLean = {
  _id: mongoose.Types.ObjectId;
  title?: string;
  companyId?: mongoose.Types.ObjectId;
  location?: string;
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

export const getProfile = async (req: Request, res: Response): Promise<void> => {
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
      skills = [],
      education,
      interests = [],
      socials,
      portfolio,
      profilePictureUrl,
      workExperiences = [],
    } = req.body;

    if (
      typeof firstName !== 'string' ||
      typeof lastName !== 'string' ||
      !education ||
      typeof education !== 'object'
    ) {
      res.status(400).json({
        message:
          'firstName, lastName, and education { degree, field, institution, graduationYear } are required',
      });
      return;
    }

    const { degree, field, institution, graduationYear } = education;
    if (
      typeof degree !== 'string' ||
      typeof field !== 'string' ||
      typeof institution !== 'string' ||
      typeof graduationYear !== 'number'
    ) {
      res.status(400).json({
        message:
          'Education must include degree, field, institution, and graduationYear',
      });
      return;
    }

    const graduate = await Graduate.create({
      userId: userObjectId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      profilePictureUrl:
        typeof profilePictureUrl === 'string'
          ? profilePictureUrl.trim()
          : undefined,
      skills: sanitizeStringArray(skills),
      education: {
        degree: degree.trim(),
        field: field.trim(),
        institution: institution.trim(),
        graduationYear,
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
      portfolio:
        typeof portfolio === 'string' ? portfolio.trim() : undefined,
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

    if (typeof profilePictureUrl === 'string') {
      graduate.profilePictureUrl = profilePictureUrl.trim();
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
    if (typeof profilePictureUrl !== 'string' || profilePictureUrl.trim() === '') {
      res.status(400).json({ message: 'profilePictureUrl must be a non-empty string' });
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
      res.status(400).json({ message: 'skills must contain at least one value' });
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

    const { summary, additionalContext, jobRequirements } = req.body as {
      summary?: string;
      additionalContext?: string;
      jobRequirements?: {
        skills?: string[];
        education?: string;
        experience?: string;
      };
    };

    const profileText = buildProfileSummary(
      graduate,
      summary,
      additionalContext
    );

    let embedding: number[];
    try {
      embedding = await generateProfileEmbedding(profileText);
    } catch (embeddingError) {
      if (embeddingError instanceof AIServiceError) {
        res
          .status(embeddingError.statusCode ?? 503)
          .json({ message: embeddingError.message });
        return;
      }

      console.error('Unexpected embedding generation error:', embeddingError);
      res.status(500).json({ message: 'Failed to generate assessment embedding' });
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

        const aiFeedback = await generateFeedback(
          {
            skills: graduate.skills,
            education: `${graduate.education.degree} in ${graduate.education.field}`,
            experience: graduate.workExperiences
              .map((exp) => `${exp.title} at ${exp.company}`)
              .join('; '),
          },
          requirementsPayload
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

    graduate.assessmentData = {
      submittedAt: new Date(),
      embedding,
      feedback,
    };

    await graduate.save();

    queueGraduateMatching(graduate._id);

    res.json({
      message: 'Assessment submitted successfully',
      assessmentData: graduate.assessmentData,
    });
  } catch (error) {
    console.error('Assessment submission error:', error);
    res.status(500).json({ message: 'Internal server error' });
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
      .populate<{ jobId: mongoose.Types.ObjectId | PopulatedJobLean }>(
        'jobId',
        'title companyId location requirements salary status createdAt updatedAt'
      )
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
          job = {
            id: jobSource._id.toHexString(),
            title: jobSource.title,
            companyId: jobSource.companyId,
            location: jobSource.location,
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

    const job = await Job.findById(jobId);
    if (!job || job.status !== 'active') {
      res.status(404).json({ message: 'Job not found or not active' });
      return;
    }

    const existingApplication = await Application.findOne({
      graduateId: graduate._id,
      jobId,
    });
    if (existingApplication) {
      res.status(409).json({ message: 'Application already exists for this job' });
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

    res.status(201).json({
      message: 'Application submitted',
      application: application.toObject({ versionKey: false }),
    });
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

    const { applicationId } = req.params;
    if (!applicationId || !ObjectId.isValid(applicationId)) {
      res.status(400).json({ message: 'Invalid applicationId' });
      return;
    }

    const { status } = req.body as { status?: unknown };
    if (!isWithdrawStatus(status)) {
      res.status(400).json({ message: 'Only status "withdrawn" is allowed' });
      return;
    }

    const application = await Application.findOne({
      _id: applicationId,
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

    res.json({
      message: 'Application status updated',
      status: application.status,
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
