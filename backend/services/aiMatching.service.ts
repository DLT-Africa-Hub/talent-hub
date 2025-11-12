import mongoose from 'mongoose';
import Graduate from '../models/Graduate.model';
import Job from '../models/Job.model';
import Match from '../models/Match.model';
import { aiConfig } from '../config/secrets';
import { AsyncTaskQueue } from '../utils/asyncQueue';
import { AIServiceError, findMatches } from './aiService';

const matchQueue = new AsyncTaskQueue('ai-matching');

type LeanGraduateEmbedding = {
  _id: mongoose.Types.ObjectId;
  assessmentData?: {
    embedding?: unknown;
  };
};

type LeanJobEmbedding = {
  _id: mongoose.Types.ObjectId;
  status?: string;
  embedding?: unknown;
};

const toObjectId = (value: mongoose.Types.ObjectId | string): mongoose.Types.ObjectId =>
  typeof value === 'string' ? new mongoose.Types.ObjectId(value) : value;

const isVector = (value: unknown): value is number[] =>
  Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'number');

const scoreToPercentage = (score: number): number => Math.round(score * 100);

export const queueGraduateMatching = (
  graduateId: mongoose.Types.ObjectId | string
): void => {
  const id = toObjectId(graduateId);
  matchQueue.enqueue(async () => {
    const graduate = await Graduate.findById(id)
      .select('_id assessmentData.embedding')
      .lean();

    if (!graduate || !isVector(graduate.assessmentData?.embedding)) {
      return;
    }

    const jobs = await Job.find({
      status: 'active',
      embedding: { $exists: true, $type: 'array' },
    })
      .select('_id embedding')
      .limit(aiConfig.match.maxJobs)
      .lean<LeanJobEmbedding[]>();

    const jobEmbeddings = jobs
      .filter((job) => isVector(job.embedding))
      .map((job) => ({
        id: job._id.toHexString(),
        embedding: job.embedding as number[],
      }));

    if (jobEmbeddings.length === 0) {
      return;
    }

    try {
      const matches = await findMatches(graduate.assessmentData.embedding, jobEmbeddings);

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
      .select('_id status embedding')
      .lean<LeanJobEmbedding>();

    if (!job || job.status !== 'active' || !isVector(job.embedding)) {
      return;
    }

    const graduates = await Graduate.find({
      'assessmentData.embedding.0': { $exists: true },
    })
      .select('_id assessmentData.embedding')
      .limit(aiConfig.match.maxGraduates)
      .lean<LeanGraduateEmbedding[]>();

    for (const graduate of graduates) {
      if (!isVector(graduate.assessmentData?.embedding)) {
        continue;
      }

      try {
        const matches = await findMatches(graduate.assessmentData.embedding, [
          { id: job._id.toHexString(), embedding: job.embedding as number[] },
        ]);

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


