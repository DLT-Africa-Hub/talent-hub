import { Request, Response } from 'express';
import User from '../models/User.model';
import Job from '../models/Job.model';
import Match from '../models/Match.model';

/**
 * Get all users
 * GET /api/admin/users
 */
export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    // TODO: Add pagination
    const users = await User.find().select('-password');
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all jobs
 * GET /api/admin/jobs
 */
export const getAllJobs = async (_req: Request, res: Response): Promise<void> => {
  try {
    // TODO: Add pagination and filters
    const jobs = await Job.find()
      .populate('companyId')
      .sort({ createdAt: -1 });
    res.json({ jobs });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all matches
 * GET /api/admin/matches
 */
export const getAllMatches = async (_req: Request, res: Response): Promise<void> => {
  try {
    // TODO: Add pagination and filters
    const matches = await Match.find()
      .populate('graduateId')
      .populate('jobId')
      .sort({ score: -1 });
    res.json({ matches });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get AI activity and performance logs
 * GET /api/admin/ai-stats
 */
export const getAIStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    // TODO: Implement AI activity tracking
    // Track embedding generations, matches, feedback requests
    
    const stats = {
      totalEmbeddings: 0, // TODO: Count from database
      totalMatches: 0, // TODO: Count from Match model
      totalFeedback: 0, // TODO: Count feedback generations
      averageMatchScore: 0, // TODO: Calculate from matches
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get AI stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete a user
 * DELETE /api/admin/users/:userId
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // TODO: Add cascade delete for related records
    await User.findByIdAndDelete(userId);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

