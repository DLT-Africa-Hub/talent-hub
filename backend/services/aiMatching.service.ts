import mongoose from 'mongoose';
import Graduate from '../models/Graduate.model';
import Job from '../models/Job.model';
import Match from '../models/Match.model';
import { aiConfig } from '../config/secrets';
import { AsyncTaskQueue } from '../utils/asyncQueue';
import {
  AIServiceError,
  findMatches,
  GraduateMatchMetadata,
  MatchJobEmbedding,
  MatchJobMetadata,
  MatchOptions,
} from './aiService';

const matchQueue = new AsyncTaskQueue('ai-matching');

type LeanGraduateEducation = {
  degree?: string;
  field?: string;
  institution?: string;
  graduationYear?: number;
};

type LeanWorkExperience = {
  _id?: mongoose.Types.ObjectId;
  company?: string;
  title?: string;
  startDate?: Date;
  endDate?: Date;
};

type LeanGraduateEmbedding = {
  _id: mongoose.Types.ObjectId;
  skills?: string[];
  education?: LeanGraduateEducation;
  workExperiences?: LeanWorkExperience[];
  updatedAt?: Date;
  assessmentData?: {
    embedding?: unknown;
    attempts?: number;
    questionSetVersion?: number;
    needsRetake?: boolean;
    lastScore?: number;
  };
};

type LeanJobEmbedding = {
  _id: mongoose.Types.ObjectId;
  status?: string;
  embedding?: unknown;
  requirements?: {
    skills?: string[];
    education?: string;
    experience?: string;
  };
  updatedAt?: Date;
};

const toObjectId = (value: mongoose.Types.ObjectId | string): mongoose.Types.ObjectId =>
  typeof value === 'string' ? new mongoose.Types.ObjectId(value) : value;

const isVector = (value: unknown): value is number[] =>
  Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'number');

const scoreToPercentage = (score: number): number => Math.round(score * 100);

const sanitizeStringArray = (values?: unknown[]): string[] => {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }

  return result;
};

const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365;

const computeWorkExperienceStats = (
  experiences?: LeanWorkExperience[]
): { totalYears?: number; latestYear?: number } => {
  if (!Array.isArray(experiences) || experiences.length === 0) {
    return {};
  }

  let totalMilliseconds = 0;
  let latest: Date | undefined;

  for (const experience of experiences) {
    if (!experience.startDate) {
      continue;
    }

    const start = new Date(experience.startDate);
    if (Number.isNaN(start.getTime())) {
      continue;
    }

    const endRaw = experience.endDate ? new Date(experience.endDate) : new Date();
    if (Number.isNaN(endRaw.getTime()) || endRaw < start) {
      continue;
    }

    totalMilliseconds += endRaw.getTime() - start.getTime();
    if (!latest || endRaw > latest) {
      latest = endRaw;
    }
  }

  if (totalMilliseconds === 0 && !latest) {
    return {};
  }

  const totalYears =
    totalMilliseconds > 0 ? Number((totalMilliseconds / MS_PER_YEAR).toFixed(2)) : undefined;
  const latestYear = latest ? latest.getUTCFullYear() : undefined;
  return { totalYears, latestYear };
};

const extractExperienceYears = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }

  const match = value.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return undefined;
  }

  const parsed = Number.parseFloat(match[1]);
  if (Number.isNaN(parsed) || parsed < 0) {
    return undefined;
  }
  return Number(parsed.toFixed(2));
};

const buildGraduateMetadata = (graduate: LeanGraduateEmbedding): GraduateMatchMetadata => {
  const metadata: GraduateMatchMetadata = {};

  const skills = sanitizeStringArray(graduate.skills);
  if (skills.length > 0) {
    metadata.skills = skills;
  }

  if (graduate.education) {
    const parts = [
      typeof graduate.education.degree === 'string' ? graduate.education.degree.trim() : null,
      typeof graduate.education.field === 'string' ? graduate.education.field.trim() : null,
    ].filter((value): value is string => !!value && value.length > 0);
    if (parts.length > 0) {
      metadata.education = parts.join(' ');
    }
  }

  const { totalYears, latestYear } = computeWorkExperienceStats(graduate.workExperiences);
  if (typeof totalYears === 'number') {
    metadata.experienceYears = totalYears;
  }
  if (typeof latestYear === 'number') {
    metadata.latestExperienceYear = latestYear;
  }

  return metadata;
};

const buildJobMetadata = (job: LeanJobEmbedding): MatchJobMetadata => {
  const metadata: MatchJobMetadata = {};

  const skills = sanitizeStringArray(job.requirements?.skills);
  if (skills.length > 0) {
    metadata.skills = skills;
  }

  if (typeof job.requirements?.education === 'string') {
    const trimmed = job.requirements.education.trim();
    if (trimmed.length > 0) {
      metadata.education = trimmed;
    }
  }

  const experienceYears = extractExperienceYears(job.requirements?.experience);
  if (typeof experienceYears === 'number') {
    metadata.experienceYears = experienceYears;
  }

  if (job.updatedAt instanceof Date && !Number.isNaN(job.updatedAt.getTime())) {
    metadata.updatedAt = job.updatedAt.toISOString();
  }

  return metadata;
};

const buildMatchOptions = (): MatchOptions => ({
  minScore: aiConfig.match.minScore,
  limit: aiConfig.match.maxResults,
});

export const queueGraduateMatching = (
  graduateId: mongoose.Types.ObjectId | string
): void => {
  const id = toObjectId(graduateId);
  matchQueue.enqueue(async () => {
    const graduate = await Graduate.findById(id)
      .select(
        '_id skills education workExperiences updatedAt assessmentData.embedding assessmentData.attempts assessmentData.questionSetVersion'
      )
      .lean<LeanGraduateEmbedding>();

    if (!graduate || !isVector(graduate.assessmentData?.embedding)) {
      return;
    }

    const jobs = await Job.find({
      status: 'active',
      embedding: { $exists: true, $type: 'array' },
    })
      .select('_id embedding requirements updatedAt')
      .limit(aiConfig.match.maxJobs)
      .lean<LeanJobEmbedding[]>();

    const jobEmbeddings: MatchJobEmbedding[] = jobs
      .filter((job) => isVector(job.embedding))
      .map((job) => ({
        id: job._id.toHexString(),
        embedding: job.embedding as number[],
        metadata: buildJobMetadata(job),
      }));

    if (jobEmbeddings.length === 0) {
      return;
    }

    try {
      const graduateMetadata = buildGraduateMetadata(graduate);
      const matches = await findMatches(graduate.assessmentData.embedding, jobEmbeddings, {
        graduateMetadata,
        matchOptions: buildMatchOptions(),
      });

      const topScoreRaw = matches.matches.reduce(
        (max, match) => Math.max(max, match.score),
        0
      );
      const topScorePercentage = Math.round(topScoreRaw * 100);
      const needsRetake = topScoreRaw < aiConfig.match.minScore;

      const questionSetVersion =
        graduate.assessmentData?.questionSetVersion ?? 1;

      await Graduate.findByIdAndUpdate(graduate._id, {
        $set: {
          'assessmentData.needsRetake': needsRetake,
          'assessmentData.lastScore': topScorePercentage,
          'assessmentData.questionSetVersion': needsRetake
            ? questionSetVersion + 1
            : questionSetVersion,
        },
      }).exec();

      if (needsRetake) {
        return;
      }

      await Promise.all(
        matches.matches
          .filter((match) => mongoose.Types.ObjectId.isValid(match.id))
          .map((match) =>
            Match.findOneAndUpdate(
              {
                graduateId: graduate._id,
                jobId: new mongoose.Types.ObjectId(match.id),
              },
              {
                $set: {
                  score: scoreToPercentage(match.score),
                },
                $setOnInsert: {
                  status: 'pending',
                },
              },
              {
                upsert: true,
                new: true,
              }
            )
          )
      );
    } catch (error) {
      if (error instanceof AIServiceError) {
        console.error(
          'AI matching error (graduate-driven):',
          error.message,
          { graduateId: graduate._id.toHexString(), statusCode: error.statusCode }
        );
      } else {
        console.error('Unexpected matching error (graduate-driven):', error);
      }
    }
  });
};

export const queueJobMatching = (jobId: mongoose.Types.ObjectId | string): void => {
  const id = toObjectId(jobId);
  matchQueue.enqueue(async () => {
    const job = await Job.findById(id)
      .select('_id status embedding requirements updatedAt')
      .lean<LeanJobEmbedding>();

    if (!job || job.status !== 'active' || !isVector(job.embedding)) {
      return;
    }

    const graduates = await Graduate.find({
      'assessmentData.embedding.0': { $exists: true },
    })
      .select('_id skills education workExperiences updatedAt assessmentData.embedding')
      .limit(aiConfig.match.maxGraduates)
      .lean<LeanGraduateEmbedding[]>();

    const jobEmbedding: MatchJobEmbedding = {
      id: job._id.toHexString(),
      embedding: job.embedding as number[],
      metadata: buildJobMetadata(job),
    };

    const matchOptions = buildMatchOptions();

    for (const graduate of graduates) {
      if (!isVector(graduate.assessmentData?.embedding)) {
        continue;
      }

      try {
        const graduateMetadata = buildGraduateMetadata(graduate);
        const matches = await findMatches(graduate.assessmentData.embedding, [jobEmbedding], {
          graduateMetadata,
          matchOptions,
        });

        const match = matches.matches.find((item) => item.id === job._id.toHexString());
        if (!match) {
          continue;
        }

        await Match.findOneAndUpdate(
          {
            graduateId: graduate._id,
            jobId: job._id,
          },
          {
            $set: {
              score: scoreToPercentage(match.score),
            },
            $setOnInsert: {
              status: 'pending',
            },
          },
          {
            upsert: true,
            new: true,
          }
        );
      } catch (error) {
        if (error instanceof AIServiceError) {
          console.error(
            'AI matching error (job-driven):',
            error.message,
            {
              jobId: job._id.toHexString(),
              graduateId: graduate._id.toHexString(),
              statusCode: error.statusCode,
            }
          );
        } else {
          console.error('Unexpected matching error (job-driven):', error);
        }
      }
    }
  });
};


