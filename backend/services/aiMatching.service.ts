import mongoose from 'mongoose';
import Graduate from '../models/Graduate.model';
import Job from '../models/Job.model';
import Match from '../models/Match.model';
import Company from '../models/Company.model';
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
import { notifyGraduateMatchedToJob } from './notification.dispatcher';

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

type RankLetter = 'A' | 'B' | 'C' | 'D';

type LeanGraduateEmbedding = {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  skills?: string[];
  education?: LeanGraduateEducation;
  workExperiences?: LeanWorkExperience[];
  updatedAt?: Date;
  rank?: string;
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
  companyId?: mongoose.Types.ObjectId;
  title?: string;
  preferedRank?: string;
  requirements?: {
    skills?: string[];
    education?: string;
    experience?: string;
  };
  updatedAt?: Date;
};

const toObjectId = (
  value: mongoose.Types.ObjectId | string
): mongoose.Types.ObjectId =>
  typeof value === 'string' ? new mongoose.Types.ObjectId(value) : value;

const normalizeId = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof mongoose.Types.ObjectId) {
    return value.toHexString();
  }
  return null;
};

const isVector = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => typeof item === 'number');

const scoreToPercentage = (score: number): number => Math.round(score * 100);

const VALID_RANKS: RankLetter[] = ['A', 'B', 'C', 'D'];

const normalizeRankLetter = (value?: string | null): RankLetter | undefined => {
  if (!value || typeof value !== 'string') {
    return undefined;
  }
  const letter = value.trim().charAt(0).toUpperCase();
  return VALID_RANKS.includes(letter as RankLetter)
    ? (letter as RankLetter)
    : undefined;
};

const parseRankPreference = (
  preference?: string | null
): Set<RankLetter> | null => {
  if (!preference || typeof preference !== 'string') {
    return null;
  }

  const parts = preference
    .split(/(?:\b(?:and|or)\b|,|\/)/gi)
    .map((part) => normalizeRankLetter(part))
    .filter((value): value is RankLetter => Boolean(value));

  if (parts.length > 0) {
    return new Set(parts);
  }

  const fallback = normalizeRankLetter(preference);
  return fallback ? new Set([fallback]) : null;
};

const doesRankMeetPreference = (
  graduateRank?: RankLetter,
  preferedRank?: string | null
): boolean => {
  if (!preferedRank || preferedRank.trim().length === 0) {
    return true;
  }

  if (!graduateRank) {
    return false;
  }

  const allowed = parseRankPreference(preferedRank);
  if (!allowed || allowed.size === 0) {
    return true;
  }

  return allowed.has(graduateRank);
};

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

    const endRaw = experience.endDate
      ? new Date(experience.endDate)
      : new Date();
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
    totalMilliseconds > 0
      ? Number((totalMilliseconds / MS_PER_YEAR).toFixed(2))
      : undefined;
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

const buildGraduateMetadata = (
  graduate: LeanGraduateEmbedding
): GraduateMatchMetadata => {
  const metadata: GraduateMatchMetadata = {};

  const skills = sanitizeStringArray(graduate.skills);
  if (skills.length > 0) {
    metadata.skills = skills;
  }

  if (graduate.education) {
    const parts = [
      typeof graduate.education.degree === 'string'
        ? graduate.education.degree.trim()
        : null,
      typeof graduate.education.field === 'string'
        ? graduate.education.field.trim()
        : null,
    ].filter((value): value is string => !!value && value.length > 0);
    if (parts.length > 0) {
      metadata.education = parts.join(' ');
    }
  }

  const { totalYears, latestYear } = computeWorkExperienceStats(
    graduate.workExperiences
  );
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
        '_id userId skills education workExperiences updatedAt rank assessmentData.embedding assessmentData.attempts assessmentData.questionSetVersion'
      )
      .lean<LeanGraduateEmbedding>();

    if (!graduate || !isVector(graduate.assessmentData?.embedding)) {
      return;
    }

    const jobs = await Job.find({
      status: 'active',
      embedding: { $exists: true, $type: 'array' },
    })
      .select('_id embedding requirements updatedAt preferedRank')
      .limit(aiConfig.match.maxJobs)
      .lean<LeanJobEmbedding[]>();

    const graduateRank = normalizeRankLetter(graduate.rank);

    const eligibleJobs = jobs.filter((job) =>
      doesRankMeetPreference(graduateRank, job.preferedRank)
    );

    if (eligibleJobs.length === 0) {
      return;
    }

    const jobEmbeddings: MatchJobEmbedding[] = eligibleJobs
      .filter((job) => isVector(job.embedding))
      .map((job) => ({
        id: job._id.toHexString(),
        embedding: job.embedding as number[],
        metadata: buildJobMetadata(job),
      }));

    try {
      const graduateMetadata = buildGraduateMetadata(graduate);
      const matches = await findMatches(
        graduate.assessmentData.embedding,
        jobEmbeddings,
        {
          graduateMetadata,
          matchOptions: buildMatchOptions(),
        }
      );

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

      const matchResults = await Promise.all(
        matches.matches
          .filter((match) => mongoose.Types.ObjectId.isValid(match.id))
          .map(async (match) => {
            const jobId = new mongoose.Types.ObjectId(match.id);
            const existingMatch = await Match.findOne({
              graduateId: graduate._id,
              jobId,
            }).lean();

            const updatedMatch = await Match.findOneAndUpdate(
              {
                graduateId: graduate._id,
                jobId,
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

            const normalizedMatchId = normalizeId(updatedMatch?._id);
            const normalizedJobId = normalizeId(updatedMatch?.jobId);

            return {
              matchId: normalizedMatchId,
              jobId: normalizedJobId,
              isNew: !existingMatch,
              score: match.score,
            };
          })
      );

      const freshMatches = matchResults.filter(
        ({ matchId, jobId, isNew }) =>
          Boolean(matchId && jobId) && isNew && graduate.userId
      );

      if (freshMatches.length > 0) {
        const jobIds = Array.from(
          new Set(
            freshMatches
              .map(({ jobId }) => jobId)
              .filter((value): value is string => Boolean(value))
          )
        ).map((id) => new mongoose.Types.ObjectId(id));

        const jobs = await Job.find({ _id: { $in: jobIds } })
          .select('title companyId')
          .lean();
        const jobMap = new Map(
          jobs
            .map((job) => {
              const id = normalizeId(job._id);
              return id ? ([id, job] as const) : null;
            })
            .filter(
              (entry): entry is [string, (typeof jobs)[number]] =>
                entry !== null
            )
        );

        const uniqueCompanyIdStrings = [
          ...new Set(
            jobs
              .map((job) => normalizeId(job.companyId))
              .filter((value): value is string => Boolean(value))
          ),
        ];
        const companyIds = uniqueCompanyIdStrings.map(
          (id) => new mongoose.Types.ObjectId(id)
        );

        const companies = await Company.find({ _id: { $in: companyIds } })
          .select('companyName')
          .lean();
        const companyMap = new Map(
          companies
            .map((company) => {
              const id = normalizeId(company._id);
              return id ? ([id, company] as const) : null;
            })
            .filter(
              (entry): entry is [string, (typeof companies)[number]] =>
                entry !== null
            )
        );

        for (const { matchId, jobId, score } of freshMatches) {
          if (!matchId || !jobId) {
            continue;
          }
          const jobKey = jobId;
          const job = jobMap.get(jobKey);
          if (!job) {
            continue;
          }

          const companyKey = normalizeId(job.companyId);
          if (!companyKey) {
            continue;
          }
          const company = companyMap.get(companyKey);
          if (!company || !graduate.userId) {
            continue;
          }

          try {
            await notifyGraduateMatchedToJob({
              matchId,
              jobId: jobKey,
              jobTitle: job.title,
              companyId: companyKey,
              companyName: company.companyName,
              matchScore: score,
              graduateId: graduate.userId.toString(),
            });
          } catch (error) {
            console.error('Failed to send match notification:', error);
          }
        }
      }
    } catch (error) {
      if (error instanceof AIServiceError) {
        console.error('AI matching error (graduate-driven):', error.message, {
          graduateId: graduate._id.toHexString(),
          statusCode: error.statusCode,
        });
      } else {
        console.error('Unexpected matching error (graduate-driven):', error);
      }
    }
  });
};

export const queueJobMatching = (
  jobId: mongoose.Types.ObjectId | string
): void => {
  const id = toObjectId(jobId);
  matchQueue.enqueue(async () => {
    const job = await Job.findById(id)
      .select('_id status embedding requirements updatedAt companyId title')
      .lean<LeanJobEmbedding>();

    if (!job || job.status !== 'active' || !isVector(job.embedding)) {
      return;
    }

    const graduates = await Graduate.find({
      'assessmentData.embedding.0': { $exists: true },
    })
      .select(
        '_id userId skills education workExperiences updatedAt assessmentData.embedding'
      )
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
        const matches = await findMatches(
          graduate.assessmentData.embedding,
          [jobEmbedding],
          {
            graduateMetadata,
            matchOptions,
          }
        );

        const match = matches.matches.find(
          (item) => item.id === job._id.toHexString()
        );
        if (!match) {
          continue;
        }

        const existingMatch = await Match.findOne({
          graduateId: graduate._id,
          jobId: job._id,
        }).lean();

        const updatedMatch = await Match.findOneAndUpdate(
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

        const normalizedMatchId = normalizeId(updatedMatch?._id);
        const normalizedJobId = normalizeId(updatedMatch?.jobId);

        // Notify graduate about new match
        if (
          !existingMatch &&
          normalizedMatchId &&
          normalizedJobId &&
          graduate.userId
        ) {
          try {
            const company = await Company.findById(job.companyId)
              .select('companyName')
              .lean();
            if (company) {
              await notifyGraduateMatchedToJob({
                matchId: normalizedMatchId,
                jobId: normalizedJobId,
                jobTitle: job.title || 'Job',
                companyId: normalizeId(job.companyId) ?? '',
                companyName: company.companyName,
                matchScore: match.score,
                graduateId: graduate.userId.toString(),
              });
            }
          } catch (error) {
            console.error('Failed to send match notification:', error);
          }
        }
      } catch (error) {
        if (error instanceof AIServiceError) {
          console.error('AI matching error (job-driven):', error.message, {
            jobId: job._id.toHexString(),
            graduateId: graduate._id.toHexString(),
            statusCode: error.statusCode,
          });
        } else {
          console.error('Unexpected matching error (job-driven):', error);
        }
      }
    }
  });
};
