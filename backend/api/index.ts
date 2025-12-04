/**
 * Vercel Serverless Function Entry Point
 * Simplified version that directly exports the Express app
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import app from '../app';

// Cache MongoDB connection for serverless
let cachedConnection: typeof mongoose | null = null;

async function connectToDatabase() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    const conn = await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    } as mongoose.ConnectOptions);
    
    cachedConnection = conn;
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Simple handler that connects to DB and passes request to Express
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Connect to MongoDB (skip for test endpoint)
  if (!req.url?.includes('/api/test')) {
    try {
      await connectToDatabase();
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Database connection failed'
      });
    }
  }

  // Wrap Express handler in a Promise to ensure Vercel waits
  return new Promise<void>((resolve) => {
    // Handle request with Express
    app(req as any, res as any);
    
    // Resolve when response is finished
    res.on('finish', () => resolve());
    res.on('close', () => resolve());
  });
}
