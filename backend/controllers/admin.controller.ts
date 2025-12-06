import mongoose, { FilterQuery } from 'mongoose';
import { Request, Response } from 'express';
import User, { IUser } from '../models/User.model';
import Job, { IJob } from '../models/Job.model';
import Match, { IMatch } from '../models/Match.model';
import Graduate, { IGraduate } from '../models/Graduate.model';
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

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
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
      const regex = new RegExp(escapeRegExp(search), 'i');
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

export const searchUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  const search = sanitizeQueryString(req.query.q ?? req.query.search);
  if (!search) {
    res.fail('Query parameter "q" is required', 400);
    return;
  }

  await getAllUsers(req, res);
};

export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.fail('Invalid userId', 400);
      return;
    }

    const user = await User.findById(userId)
      .select('-password')
      .lean<IUser | null>();
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

export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
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

export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
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



export const getAllMatches = async (
  req: Request,
  res: Response
): Promise<void> => {
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

export const getAIStats = async (
  _req: Request,
  res: Response
): Promise<void> => {
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
      Graduate.countDocuments({
        'assessmentData.embedding.0': { $exists: true },
      }),
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

export const getSystemStats = async (
  _req: Request,
  res: Response
): Promise<void> => {
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
        Application.find()
          .sort({ updatedAt: -1 })
          .limit(5)
          .lean<IApplication[]>(),
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
        metadata: {
          matchId: match._id,
          graduateId: match.graduateId,
          jobId: match.jobId,
        },
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

export const getHealthStatus = async (
  _req: Request,
  res: Response
): Promise<void> => {
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

/**
 * Get rank statistics for all graduates
 * GET /api/admin/rank-statistics
 */
export const getRankStatistics = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
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

    res.json({
      rankStatistics: rankStats,
      total: totalWithRank,
    });
  } catch (error) {
    console.error('Error fetching rank statistics:', error);
    res.status(500).json({ message: 'Failed to fetch rank statistics' });
  }
};

export const getDatabaseStats = async (
  _req: Request,
  res: Response
): Promise<void> => {
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


export const getGraduatesCount = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const total = await Graduate.countDocuments();

    res.success({
      total,
    });
  } catch (error) {
    console.error('Get all graduates error:', error);
    res.fail('Internal server error', 500);
  }
};

export const getCompanyCount = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const total = await Company.countDocuments();

    res.success({
      total,
    });
  } catch (error) {
    console.error('Get all graduates error:', error);
    res.fail('Internal server error', 500);
  }
};

export const getActiveJobsCount = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const total = await Job.countDocuments({ status: 'active' });

    res.success({
      total,
    });
  } catch (error) {
    console.error('Get active jobs count error:', error);
    res.fail('Internal server error', 500);
  }
};

export const getApplicationActivityDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { jobId, graduateId } = req.query;

 
    if (!jobId || !graduateId) {
      res.fail('jobId and graduateId are required', 400);
      return;
    }


    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      res.fail('Invalid jobId', 400);
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(graduateId)) {
      res.fail('Invalid graduateId', 400);
      return;
    }

  
    const graduate = await Graduate.findById(graduateId)
      .select('firstName lastName')
      .lean();

    if (!graduate) {
      res.fail('Graduate not found', 404);
      return;
    }


    const job = await Job.findById(jobId)
      .select('title companyId')
      .populate('companyId', 'companyName')
      .lean();

    if (!job) {
      res.fail('Job not found', 404);
      return;
    }

   
    const company = job.companyId as unknown as { companyName: string } | null;

    if (!company) {
      res.fail('Company not found', 404);
      return;
    }


    const graduateName = `${graduate.firstName} ${graduate.lastName}`;

    res.success({
      graduateName,
      jobTitle: job.title,
      companyName: company.companyName,
    });
  } catch (error) {
    console.error('Get application activity detail error:', error);
    res.fail('Internal server error', 500);
  }
};

export const getCompanyById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { companyId } = req.params;


    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      res.fail('Invalid companyId', 400);
      return;
    }


    const company = await Company.findById(companyId).lean();

    if (!company) {
      res.fail('Company not found', 404);
      return;
    }

    res.success(company);
  } catch (error) {
    console.error('Get company by id error:', error);
    res.fail('Internal server error', 500);
  }
};



export const companiesStatsProvider = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page, limit, skip } = parsePaginationParams(req);



    const filters: FilterQuery<any> = {
      postedJobs: { $gte: 1 },
    };


    const [companies, total] = await Promise.all([
      Company.find(filters)
        .select('_id postedJobs hiredCandidates')
        .sort({ postedJobs: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Company.countDocuments(filters),
    ]);

    res.success(companies, {
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Companies stats provider error:', error);
    res.fail('Internal server error', 500);
  }
};

export const getAllGraduates = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page, limit, skip } = parsePaginationParams(req);

    const filters: FilterQuery<IGraduate> = {};

    // ✅ Exact filters
    const rank = sanitizeQueryString(req.query.rank);
    if (rank) {
      filters.rank = rank;
    }

    const position = sanitizeQueryString(req.query.position);
    if (position) {
      filters.position = position as IGraduate['position'];
    }

    const location = sanitizeQueryString(req.query.location);
    if (location) {
      filters.location = location;
    }

    // ✅ Search (name, rank, position, location)
    const search = sanitizeQueryString(req.query.q ?? req.query.search);
    if (search) {
      const regex = new RegExp(escapeRegExp(search), 'i');

      filters.$or = [
        { firstName: regex },
        { lastName: regex },
        { rank: regex },
        { position: regex },
        { location: regex },
      ];
    }

    const [graduates, total] = await Promise.all([
      Graduate.find(filters)
        .select(
          '_id firstName lastName skills position rank expLevel profilePictureUrl location'
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IGraduate[]>(),
      Graduate.countDocuments(filters),
    ]);

    const formattedGraduates = graduates.map((graduate) => ({
      _id: graduate._id,
      name: `${graduate.firstName} ${graduate.lastName}`,
      skills: graduate.skills,
      position: graduate.position,
      rank: graduate.rank ?? null,
      expLevel: graduate.expLevel,
      profilePictureUrl: graduate.profilePictureUrl ?? null,
      location: graduate.location ?? null,
    }));

    res.success(formattedGraduates, {
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Get all graduates error:', error);
    res.fail('Internal server error', 500);
  }
};

export const getGraduateById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { graduateId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(graduateId)) {
      res.fail('Invalid graduateId', 400);
      return;
    }

    const graduate = await Graduate.findById(graduateId).lean();

    if (!graduate) {
      res.fail('Graduate not found', 404);
      return;
    }

    res.success(graduate);
  } catch (error) {
    console.error('Get graduate by ID error:', error);
    res.fail('Internal server error', 500);
  }
};



export const getAllCompanies = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page, limit, skip } = parsePaginationParams(req);
    const filters: FilterQuery<any> = {};

    // Filter by industry
    const industry = sanitizeQueryString(req.query.industry);
    if (industry) {
      filters.industry = industry;
    }

    // Filter by company size (range)
    const minSize = sanitizeQueryString(req.query.minSize);
    const maxSize = sanitizeQueryString(req.query.maxSize);
    if (minSize || maxSize) {
      filters.companySize = {};
      if (minSize) filters.companySize.$gte = parseInt(minSize);
      if (maxSize) filters.companySize.$lte = parseInt(maxSize);
    }

    // Filter by location
    const location = sanitizeQueryString(req.query.location);
    if (location) {
      const regex = new RegExp(escapeRegExp(location), 'i');
      filters.location = regex;
    }

    // Search by company name
    const search = sanitizeQueryString(req.query.q ?? req.query.search);
    if (search) {
      const regex = new RegExp(escapeRegExp(search), 'i');
      filters.companyName = regex;
    }

    // Get companies with their user status
    const [companies, total] = await Promise.all([
      Company.find(filters)
        .populate('userId', 'emailVerified createdAt')
        .select('_id companyName industry companySize location postedJobs hiredCandidates userId createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Company.countDocuments(filters),
    ]);

    // Format response with status derived from user emailVerified
    const formattedCompanies = companies.map((company: any) => {
      const user = company.userId;
      let status: 'Active' | 'Pending' | 'Suspended' = 'Pending';
      
      if (user?.emailVerified) {
        status = 'Active';
      }

      return {
        id: company._id.toString(),
        name: company.companyName,
        industry: company.industry,
        size: company.companySize,
        location: company.location || 'Not specified',
        jobs: company.postedJobs || 0,
        candidates: Array.isArray(company.hiredCandidates) 
          ? company.hiredCandidates.length 
          : 0,
        status,
        joined: company.createdAt,
        userId: user?._id?.toString(),
      };
    });

    res.success(formattedCompanies, {
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Get all companies error:', error);
    res.fail('Internal server error', 500);
  }
};


export const getCompanyDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { companyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      res.fail('Invalid companyId', 400);
      return;
    }

    // Get company with user info
    const company = await Company.findById(companyId)
      .populate('userId', 'email emailVerified createdAt lastLoginAt')
      .lean();

    if (!company) {
      res.fail('Company not found', 404);
      return;
    }

    // Get company's jobs
    const jobs = await Job.find({ companyId: company._id })
      .select('title status createdAt location salary')
      .sort({ createdAt: -1 })
      .lean();

    // Get applications for company's jobs
    const jobIds = jobs.map(job => job._id);
    const applications = await Application.find({ jobId: { $in: jobIds } })
      .populate('graduateId', 'firstName lastName')
      .populate('jobId', 'title')
      .select('status createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    const user = company.userId as any;

    res.success({
      company: {
        id: company._id.toString(),
        name: company.companyName,
        industry: company.industry,
        size: company.companySize,
        description: company.description,
        website: company.website,
        location: company.location,
        postedJobs: company.postedJobs || 0,
        hiredCandidates: Array.isArray(company.hiredCandidates) 
          ? company.hiredCandidates.length 
          : 0,
        status: user?.emailVerified ? 'Active' : 'Pending',
        joined: company.createdAt,
        updatedAt: company.updatedAt,
      },
      user: {
        email: user?.email,
        emailVerified: user?.emailVerified,
        lastLogin: user?.lastLoginAt,
      },
      jobs: jobs.map(job => ({
        id: job._id.toString(),
        title: job.title,
        status: job.status,
        location: job.location,
        salary: job.salary,
        createdAt: job.createdAt,
      })),
      applications: applications.map((app: any) => ({
        id: app._id.toString(),
        jobTitle: app.jobId?.title,
        candidateName: app.graduateId 
          ? `${app.graduateId.firstName} ${app.graduateId.lastName}`
          : 'Unknown',
        status: app.status,
        appliedAt: app.createdAt,
        updatedAt: app.updatedAt,
      })),
      stats: {
        totalJobs: jobs.length,
        activeJobs: jobs.filter(j => j.status === 'active').length,
        totalApplications: applications.length,
        pendingApplications: applications.filter(a => a.status === 'pending').length,
      },
    });
  } catch (error) {
    console.error('Get company details error:', error);
    res.fail('Internal server error', 500);
  }
};


export const toggleCompanyStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { companyId } = req.params;
    const { active } = req.body as { active: boolean };

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      res.fail('Invalid companyId', 400);
      return;
    }

    const company = await Company.findById(companyId).populate('userId');
    if (!company) {
      res.fail('Company not found', 404);
      return;
    }

    const user = await User.findById(company.userId);
    if (!user) {
      res.fail('Associated user not found', 404);
      return;
    }

    // Update user email verification status to activate/deactivate
    user.emailVerified = active;
    user.emailVerifiedAt = active ? new Date() : undefined;
    await user.save();

    res.success({
      message: `Company ${active ? 'activated' : 'deactivated'} successfully`,
      company: {
        id: company._id.toString(),
        name: company.companyName,
        status: active ? 'Active' : 'Suspended',
      },
    });
  } catch (error) {
    console.error('Toggle company status error:', error);
    res.fail('Internal server error', 500);
  }
};

export const getAllJobs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page, limit, skip } = parsePaginationParams(req);
    const filters: FilterQuery<IJob> = {};

    // Filter by status
    const status = sanitizeQueryString(req.query.status);
    if (status) {
      filters.status = status as IJob['status'];
    }

    // Filter by company
    const companyId = sanitizeQueryString(req.query.companyId);
    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      filters.companyId = new mongoose.Types.ObjectId(companyId);
    }

    // Filter by job type
    const jobType = sanitizeQueryString(req.query.jobType);
    if (jobType) {
      filters.jobType = jobType as IJob['jobType'];
    }

    // Filter by preferred rank
    const preferedRank = sanitizeQueryString(req.query.preferedRank);
    if (preferedRank) {
      filters.preferedRank = preferedRank as IJob['preferedRank'];
    }

    // Filter by location
    const location = sanitizeQueryString(req.query.location);
    if (location) {
      const regex = new RegExp(escapeRegExp(location), 'i');
      filters.location = regex;
    }

    // Search by title
    const search = sanitizeQueryString(req.query.q ?? req.query.search);
    if (search) {
      const regex = new RegExp(escapeRegExp(search), 'i');
      filters.title = regex;
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

    // Get applicant counts for each job
    const jobIds = jobs.map((job) => job._id);
    const applicationCounts = await Application.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      { $group: { _id: '$jobId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(
      applicationCounts.map((item) => [item._id.toString(), item.count])
    );

    const jobsWithCounts = jobs.map((job: any) => ({
      ...job,
      applicantsCount: countMap.get(job._id.toString()) || 0,
      views: job.views || 0,
    }));

    res.success(jobsWithCounts, {
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.fail('Internal server error', 500);
  }
};

/**
 * Get job details by ID
 * GET /api/admin/jobs/:jobId
 */
export const getJobById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      res.fail('Invalid jobId', 400);
      return;
    }

    const job = await Job.findById(jobId)
      .populate('companyId', 'companyName industry website location')
      .lean();

    if (!job) {
      res.fail('Job not found', 404);
      return;
    }

    // Get applications for this job
    const applications = await Application.find({ jobId: job._id })
      .populate('graduateId', 'firstName lastName email profilePictureUrl')
      .select('status createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    const applicationStats = {
      total: applications.length,
      pending: applications.filter((a) => a.status === 'pending').length,
      reviewed: applications.filter((a) => a.status === 'reviewed').length,
      shortlisted: applications.filter((a) => a.status === 'shortlisted')
        .length,
      rejected: applications.filter((a) => a.status === 'rejected').length,
      hired: applications.filter((a) => a.status === 'hired').length,
    };

    res.success({
      job,
      applications: applications.map((app: any) => ({
        id: app._id.toString(),
        candidate: app.graduateId
          ? {
              id: app.graduateId._id.toString(),
              name: `${app.graduateId.firstName} ${app.graduateId.lastName}`,
              email: app.graduateId.email,
              profilePicture: app.graduateId.profilePictureUrl,
            }
          : null,
        status: app.status,
        appliedAt: app.createdAt,
        updatedAt: app.updatedAt,
      })),
      stats: applicationStats,
    });
  } catch (error) {
    console.error('Get job by ID error:', error);
    res.fail('Internal server error', 500);
  }
};

/**
 * Update job status (activate/deactivate)
 * PUT /api/admin/jobs/:jobId/status
 */
export const updateJobStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { jobId } = req.params;
    const { status } = req.body as { status: IJob['status'] };

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      res.fail('Invalid jobId', 400);
      return;
    }

    if (!['active', 'closed', 'draft'].includes(status)) {
      res.fail('Invalid status. Must be active, closed, or draft', 400);
      return;
    }

    const job = await Job.findByIdAndUpdate(
      jobId,
      { status },
      { new: true, runValidators: true }
    )
      .populate('companyId', 'companyName')
      .lean();

    if (!job) {
      res.fail('Job not found', 404);
      return;
    }

    res.success({
      message: `Job status updated to ${status} successfully`,
      job: {
        id: job._id.toString(),
        title: job.title,
        company: (job.companyId as any)?.companyName,
        status: job.status,
      },
    });
  } catch (error) {
    console.error('Update job status error:', error);
    res.fail('Internal server error', 500);
  }
};

/**
 * Update job details
 * PUT /api/admin/jobs/:jobId
 */
export const updateJob = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      res.fail('Invalid jobId', 400);
      return;
    }

    const job = await Job.findById(jobId);
    if (!job) {
      res.fail('Job not found', 404);
      return;
    }

    const {
      title,
      jobType,
      description,
      requirements,
      location,
      salary,
      preferedRank,
      status,
      directContact,
    } = req.body as Partial<IJob>;

    let updated = false;

    if (title && title.trim()) {
      job.title = title.trim();
      updated = true;
    }

    if (jobType) {
      if (
        !['Full time', 'Part time', 'Contract', 'Internship'].includes(jobType)
      ) {
        res.fail('Invalid job type', 400);
        return;
      }
      job.jobType = jobType;
      updated = true;
    }

    if (description) {
      job.description = description;
      updated = true;
    }

    if (requirements) {
      job.requirements = requirements;
      updated = true;
    }

    if (location !== undefined) {
      job.location = location;
      updated = true;
    }

    if (salary !== undefined) {
      job.salary = salary;
      updated = true;
    }

    if (preferedRank) {
      if (
        !['A', 'B', 'C', 'D', 'A and B', 'B and C', 'C and D'].includes(
          preferedRank
        )
      ) {
        res.fail('Invalid preferred rank', 400);
        return;
      }
      job.preferedRank = preferedRank;
      updated = true;
    }

    if (status) {
      if (!['active', 'closed', 'draft'].includes(status)) {
        res.fail('Invalid status', 400);
        return;
      }
      job.status = status;
      updated = true;
    }

    if (typeof directContact === 'boolean') {
      job.directContact = directContact;
      updated = true;
    }

    if (!updated) {
      res.success({
        message: 'No changes applied',
        job: job.toObject(),
      });
      return;
    }

    await job.save();

    res.success({
      message: 'Job updated successfully',
      job: job.toObject(),
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.fail('Internal server error', 500);
  }
};

/**
 * Delete a job
 * DELETE /api/admin/jobs/:jobId
 */
export const deleteJob = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      res.fail('Invalid jobId', 400);
      return;
    }

    // Check if job has applications
    const applicationCount = await Application.countDocuments({ jobId });
    if (applicationCount > 0) {
      res.fail(
        'Cannot delete job with existing applications. Please close the job instead.',
        400
      );
      return;
    }

    const deleted = await Job.findByIdAndDelete(jobId);
    if (!deleted) {
      res.fail('Job not found', 404);
      return;
    }

    res.success({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.fail('Internal server error', 500);
  }
};

/**
 * Get job statistics
 * GET /api/admin/jobs/statistics
 */
export const getJobStatistics = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const [
      totalJobs,
      activeJobs,
      closedJobs,
      draftJobs,
      jobsByType,
      jobsByRank,
      topCompaniesByJobs,
    ] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ status: 'active' }),
      Job.countDocuments({ status: 'closed' }),
      Job.countDocuments({ status: 'draft' }),
      Job.aggregate([
        {
          $group: {
            _id: '$jobType',
            count: { $sum: 1 },
          },
        },
      ]),
      Job.aggregate([
        {
          $group: {
            _id: '$preferedRank',
            count: { $sum: 1 },
          },
        },
      ]),
      Job.aggregate([
        {
          $group: {
            _id: '$companyId',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'companies',
            localField: '_id',
            foreignField: '_id',
            as: 'company',
          },
        },
        { $unwind: '$company' },
        {
          $project: {
            companyName: '$company.companyName',
            jobCount: '$count',
          },
        },
      ]),
    ]);

    res.success({
      totals: {
        all: totalJobs,
        active: activeJobs,
        closed: closedJobs,
        draft: draftJobs,
      },
      byType: jobsByType.reduce(
        (acc, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {} as Record<string, number>
      ),
      byRank: jobsByRank.reduce(
        (acc, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {} as Record<string, number>
      ),
      topCompanies: topCompaniesByJobs,
    });
  } catch (error) {
    console.error('Get job statistics error:', error);
    res.fail('Internal server error', 500);
  }
};

/**
 * Get applications for a specific job
 * GET /api/admin/jobs/:jobId/applications
 */
export const getJobApplications = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { jobId } = req.params;
    const { page, limit, skip } = parsePaginationParams(req);

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      res.fail('Invalid jobId', 400);
      return;
    }

    const filters: FilterQuery<any> = { jobId };

    // Filter by status
    const status = sanitizeQueryString(req.query.status);
    if (status) {
      filters.status = status;
    }

    const [applications, total] = await Promise.all([
      Application.find(filters)
        .populate('graduateId', 'firstName lastName email profilePictureUrl rank position')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Application.countDocuments(filters),
    ]);

    res.success(
      applications.map((app: any) => ({
        id: app._id.toString(),
        candidate: app.graduateId
          ? {
              id: app.graduateId._id.toString(),
              name: `${app.graduateId.firstName} ${app.graduateId.lastName}`,
              email: app.graduateId.email,
              profilePicture: app.graduateId.profilePictureUrl,
              rank: app.graduateId.rank,
              position: app.graduateId.position,
            }
          : null,
        status: app.status,
        appliedAt: app.createdAt,
        updatedAt: app.updatedAt,
      })),
      {
        pagination: buildPaginationMeta(page, limit, total),
      }
    );
  } catch (error) {
    console.error('Get job applications error:', error);
    res.fail('Internal server error', 500);
  }
};