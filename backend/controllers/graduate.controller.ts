import { Request, Response } from 'express';
import Graduate from '../models/Graduate.model';
import { generateEmbedding } from '../services/aiService';

/**
 * Get graduate profile
 * GET /api/graduates/profile
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: Get userId from authenticated request (req.user.userId)
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const graduate = await Graduate.findOne({ userId }).populate('userId', 'email');
    
    if (!graduate) {
      res.status(404).json({ message: 'Profile not found' });
      return;
    }

    res.json(graduate);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Create or update graduate profile
 * POST /api/graduates/profile
 */
export const createOrUpdateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { firstName, lastName, skills, education, interests } = req.body;

    // TODO: Validate input data

    const graduate = await Graduate.findOneAndUpdate(
      { userId },
      {
        firstName,
        lastName,
        skills,
        education,
        interests,
      },
      { new: true, upsert: true }
    );

    res.json({
      message: 'Profile updated successfully',
      graduate,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Submit assessment for AI evaluation
 * POST /api/graduates/assessment
 */
export const submitAssessment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const graduate = await Graduate.findOne({ userId });
    if (!graduate) {
      res.status(404).json({ message: 'Profile not found' });
      return;
    }

    // Generate embedding for graduate profile
    const profileText = `
      Skills: ${graduate.skills.join(', ')}
      Education: ${graduate.education.degree} in ${graduate.education.field}
      Interests: ${graduate.interests.join(', ')}
    `;

    const embedding = await generateEmbedding(profileText);

    // Update graduate with embedding
    graduate.assessmentData = {
      submittedAt: new Date(),
      embedding,
    };

    await graduate.save();

    // TODO: Trigger matching process with all active jobs

    res.json({
      message: 'Assessment submitted successfully',
      assessmentData: graduate.assessmentData,
    });
  } catch (error) {
    console.error('Assessment submission error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get matches for graduate
 * GET /api/graduates/matches
 */
export const getMatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // TODO: Implement match retrieval logic
    // Query Match model for graduate's matches
    // Populate job details and return ranked matches

    res.json({
      message: 'Matches retrieved successfully',
      matches: [], // TODO: Return actual matches
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

