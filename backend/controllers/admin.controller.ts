import mongoose, { FilterQuery } from 'mongoose';
import { Request, Response } from 'express';
import User, { IUser } from '../models/User.model';
import Job, { IJob } from '../models/Job.model';
import Match, { IMatch } from '../models/Match.model';
import Graduate from '../models/Graduate.model';
import Company from '../models/Company.model';
import Application, { IApplication } from '../models/Application.model';
import {
  buildPaginationMeta,
  parsePaginationParams,
} from '../utils/pagination.utils';

const sanitizeQueryString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const mapUserResponse = (user: IUser) => ({
  id: user._id.toString(),
  email: user.email,
  role: user.role,
  emailVerified: user.emailVerified,
  emailVerifiedAt: user.emailVerifiedAt,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = parsePaginationParams(req);
    const filters: FilterQuery<IUser> = {};

    const role = sanitizeQueryString(req.query.role);
    if (role) {
      filters.role = role as IUser['role'];
    }

    const emailVerifiedParam = sanitizeQueryString(req.query.emailVerified);
    if (emailVerifiedParam) {
      filters.emailVerified = emailVerifiedParam === 'true';
    }

    const search = sanitizeQueryString(req.query.q ?? req.query.search);
    if (search) {
      const regex = new RegExp(search, 'i');
      filters.$or = [{ email: regex }];
    }

    const [users, total] = await Promise.all([
      User.find(filters)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IUser[]>(),
      User.countDocuments(filters),
    ]);

    res.success(users.map(mapUserResponse), {
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.fail('Internal server error', 500);
  }
};

export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  const search = sanitizeQueryString(req.query.q ?? req.query.search);
  if (!search) {
    res.fail('Query parameter "q" is required', 400);
    return;
  }

  await getAllUsers(req, res);
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.fail('Invalid userId', 400);
      return;
    }

    const user = await User.findById(userId).select('-password').lean<IUser | null>();
    if (!user) {
      res.fail('User not found', 404);
      return;
    }

    res.success(mapUserResponse(user));
  } catch (error) {
    console.error('Get user detail error:', error);
    res.fail('Internal server error', 500);
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.fail('Invalid userId', 400);
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.fail('User not found', 404);
      return;
    }

    const { role, email, emailVerified } = req.body as Partial<{
      role: IUser['role'];
      email: string;
      emailVerified: boolean;
    }>;

    let updated = false;

    if (role) {
      if (!['graduate', 'company', 'admin'].includes(role)) {
        res.fail('Invalid role supplied', 400);
        return;
      }
      if (user.role !== role) {
        user.role = role;
        updated = true;
      }
    }

    if (typeof email === 'string' && email.trim().length > 0) {
      const normalizedEmail = email.trim().toLowerCase();
      if (user.email !== normalizedEmail) {
        const existing = await User.findOne({
          _id: { $ne: user._id },
          email: normalizedEmail,
        }).lean();
        if (existing) {
          res.fail('Email already in use', 409);
          return;
        }
        user.email = normalizedEmail;
        updated = true;
      }
    }

    if (typeof emailVerified === 'boolean') {
      if (user.emailVerified !== emailVerified) {
        user.emailVerified = emailVerified;
        user.emailVerifiedAt = emailVerified ? new Date() : undefined;
        updated = true;
      }
    }

    if (!updated) {
      res.success({
        message: 'No changes applied',
        user: mapUserResponse(user.toObject()),
      });
      return;
    }

    await user.save();

    res.success({
      message: 'User updated successfully',
      user: mapUserResponse(user.toObject()),
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.fail('Internal server error', 500);
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.fail('Invalid userId', 400);
      return;
    }

    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) {
      res.fail('User not found', 404);
      return;
    }

    res.success({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.fail('Internal server error', 500);
  }
};

export const getAllJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = parsePaginationParams(req);
    const filters: FilterQuery<IJob> = {};

    const status = sanitizeQueryString(req.query.status);
    if (status) {
      filters.status = status as IJob['status'];
    }

    const companyId = sanitizeQueryString(req.query.companyId);
    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      filters.companyId = new mongoose.Types.ObjectId(companyId);
    }

    const [jobs, total] = await Promise.all([
      Job.find(filters)
        .populate('companyId', 'companyName industry')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(filters),
    ]);

    res.success(jobs, {
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.fail('Internal server error', 500);
  }
};

export const getAllMatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = parsePaginationParams(req);
    const filters: FilterQuery<IMatch> = {};

    const status = sanitizeQueryString(req.query.status);
    if (status) {
      filters.status = status as IMatch['status'];
    }

    const graduateId = sanitizeQueryString(req.query.graduateId);
    if (graduateId && mongoose.Types.ObjectId.isValid(graduateId)) {
      filters.graduateId = new mongoose.Types.ObjectId(graduateId);
    }

    const jobId = sanitizeQueryString(req.query.jobId);
    if (jobId && mongoose.Types.ObjectId.isValid(jobId)) {
      filters.jobId = new mongoose.Types.ObjectId(jobId);
    }

    const [matches, total] = await Promise.all([
      Match.find(filters)
        .populate('graduateId', 'firstName lastName userId')
        .populate('jobId', 'title companyId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Match.countDocuments(filters),
    ]);

    res.success(matches, {
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.fail('Internal server error', 500);
  }
};

export const getAIStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalMatches,
      averageMatchScoreAgg,
      totalEmbeddings,
      totalFeedback,
      activeJobs,
      closedJobs,
    ] = await Promise.all([
      Match.countDocuments(),
      Match.aggregate<{ averageScore: number }>([
        {
          $group: {
            _id: null,
            averageScore: { $avg: '$score' },
          },
        },
      ]),
      Graduate.countDocuments({ 'assessmentData.embedding.0': { $exists: true } }),
      Graduate.countDocuments({
        'assessmentData.feedback': { $exists: true, $nin: [null, ''] },
      }),
      Job.countDocuments({ status: 'active' }),
      Job.countDocuments({ status: 'closed' }),
    ]);

    const averageMatchScore = averageMatchScoreAgg[0]?.averageScore ?? 0;

    res.success({
      totalMatches,
      averageMatchScore,
      totalEmbeddings,
      totalFeedback,
      jobs: {
        active: activeJobs,
        closed: closedJobs,
      },
    });
  } catch (error) {
    console.error('Get AI stats error:', error);
    res.fail('Internal server error', 500);
  }
};

export const getSystemStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalGraduates,
      totalCompanies,
      totalJobs,
      totalMatches,
      totalApplications,
    ] = await Promise.all([
      User.countDocuments(),
      Graduate.countDocuments(),
      Company.countDocuments(),
      Job.countDocuments(),
      Match.countDocuments(),
      Application.countDocuments(),
    ]);

    res.success({
      totals: {
        users: totalUsers,
        graduates: totalGraduates,
        companies: totalCompanies,
        jobs: totalJobs,
        matches: totalMatches,
        applications: totalApplications,
      },
      uptimeSeconds: process.uptime(),
      process: {
        pid: process.pid,
        memory: process.memoryUsage(),
      },
      database: {
        name: mongoose.connection.db?.databaseName ?? null,
        state: mongoose.connection.readyState,
      },
    });
  } catch (error) {
    console.error('Get system stats error:', error);
    res.fail('Internal server error', 500);
  }
};

export const getUserActivityLogs = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const [recentUsers, recentJobs, recentMatches, recentApplications] =
      await Promise.all([
        User.find().sort({ createdAt: -1 }).limit(5).lean<IUser[]>(),
        Job.find().sort({ createdAt: -1 }).limit(5).lean<IJob[]>(),
        Match.find().sort({ updatedAt: -1 }).limit(5).lean<IMatch[]>(),
        Application.find().sort({ updatedAt: -1 }).limit(5).lean<IApplication[]>(),
      ]);

    const logs = [
      ...recentUsers.map((user) => ({
        type: 'user',
        action: 'created',
        timestamp: user.createdAt,
        summary: `User ${user.email} (${user.role}) registered`,
        metadata: { userId: user._id },
      })),
      ...recentJobs.map((job) => ({
        type: 'job',
        action: 'created',
        timestamp: job.createdAt,
        summary: `Job "${job.title}" created`,
        metadata: { jobId: job._id, companyId: job.companyId },
      })),
      ...recentMatches.map((match) => ({
        type: 'match',
        action: 'updated',
        timestamp: match.updatedAt,
        summary: `Match ${match._id?.toString()} status ${match.status}`,
        metadata: { matchId: match._id, graduateId: match.graduateId, jobId: match.jobId },
      })),
      ...recentApplications.map((application) => ({
        type: 'application',
        action: 'updated',
        timestamp: application.updatedAt ?? application.createdAt,
        summary: `Application ${application._id?.toString()} status ${application.status}`,
        metadata: {
          applicationId: application._id,
          graduateId: application.graduateId,
          jobId: application.jobId,
        },
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 20);

    res.success(logs);
  } catch (error) {
    console.error('Get user activity logs error:', error);
    res.fail('Internal server error', 500);
  }
};

export const getHealthStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const memory = process.memoryUsage();
    res.success({
      status: 'ok',
      timestamp: new Date(),
      uptimeSeconds: process.uptime(),
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
      },
      database: {
        connected: mongoose.connection.readyState === 1,
        name: mongoose.connection.db?.databaseName ?? null,
      },
      versions: {
        node: process.version,
      },
    });
  } catch (error) {
    console.error('Admin health error:', error);
    res.fail('Internal server error', 500);
  }
};

export const getDatabaseStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      res.fail('Database connection not initialized', 503);
      return;
    }

    const stats = await db.command({ dbStats: 1, scale: 1024 });
    res.success(stats);
  } catch (error) {
    console.error('Database stats error:', error);
    res.fail('Internal server error', 500);
  }
};

