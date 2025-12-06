/**
 * Vercel Serverless Function Entry Point
 * Simplified version that directly exports the Express app
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';

// Cache MongoDB connection for serverless
let cachedConnection: typeof mongoose | null = null;

// Lazy load app to catch initialization errors
let appInstance: any = null;
let appLoadError: Error | null = null;

async function getApp() {
  if (appLoadError) {
    throw appLoadError;
  }

  if (!appInstance) {
    try {
      const appModule = await import('../app');
      appInstance = appModule.default;
    } catch (error) {
      // Log full error details
      console.error('Failed to load Express app - Full error:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);

      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }

      // Check if it's a Zod validation error
      if (error && typeof error === 'object') {
        const errorObj = error as any;
        if ('issues' in errorObj) {
          console.error(
            'Zod validation issues:',
            JSON.stringify(errorObj.issues, null, 2)
          );
        }
        if ('format' in errorObj) {
          console.error('Zod formatted error:', errorObj.format());
        }
        // Log all error properties
        console.error('Error properties:', Object.keys(errorObj));
        console.error(
          'Full error object:',
          JSON.stringify(errorObj, Object.getOwnPropertyNames(errorObj), 2)
        );
      }

      appLoadError = error as Error;
      throw error;
    }
  }
  return appInstance;
}

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
  try {
    // Get app instance (lazy load to catch initialization errors)
    const app = await getApp();

    // Connect to MongoDB (skip for test endpoint)
    if (!req.url?.includes('/api/test') && !req.url?.includes('/health')) {
      try {
        await connectToDatabase();
      } catch (error) {
        console.error('MongoDB connection failed:', error);
        return res.status(500).json({
          success: false,
          message: 'Database connection failed',
          error:
            process.env.NODE_ENV !== 'production' ? String(error) : undefined,
        });
      }
    }

    // Wrap Express handler in a Promise to ensure Vercel waits
    return new Promise<void>((resolve, reject) => {
      try {
        // Handle request with Express
        app(req as any, res as any);

        // Resolve when response is finished
        res.on('finish', () => resolve());
        res.on('close', () => resolve());

        // Handle errors
        res.on('error', (error: Error) => {
          console.error('Response error:', error);
          reject(error);
        });
      } catch (error) {
        console.error('Handler error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Internal server error',
            error:
              process.env.NODE_ENV !== 'production' ? String(error) : undefined,
          });
        }
        reject(error);
      }
    });
  } catch (error) {
    // Log full error details for debugging
    console.error('Fatal handler error - Full details:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    // Extract error information
    let errorMessage = 'Unknown error';
    let errorStack: string | undefined;
    let errorName: string | undefined;
    let validationIssues: any = undefined;

    if (error instanceof Error) {
      errorMessage = error.message;
      errorStack = error.stack;
      errorName = error.name;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      const errorObj = error as any;

      // Handle Zod validation errors (ZodError has 'issues' property)
      if ('issues' in errorObj && Array.isArray(errorObj.issues)) {
        validationIssues = errorObj.issues;
        errorMessage = 'Configuration validation failed';

        // Format validation errors for better readability
        if (validationIssues.length > 0) {
          const formattedIssues = validationIssues.map((issue: any) => {
            const path =
              issue.path && issue.path.length > 0
                ? issue.path.join('.')
                : 'root';
            return `${path}: ${issue.message}`;
          });
          errorMessage = formattedIssues.join('; ');
        }
      }
      // Handle other object errors
      else if ('message' in errorObj) {
        errorMessage = String(errorObj.message);
        // If it's a ZodError but message is available, try to get more info
        if (errorObj.name === 'ZodError' && errorObj.format) {
          try {
            const formatted = errorObj.format();
            errorMessage = `Zod validation error: ${JSON.stringify(formatted, null, 2)}`;
          } catch {
            // If format fails, use the message
          }
        }
      } else {
        // Try to stringify, but handle circular references
        try {
          errorMessage = JSON.stringify(errorObj, null, 2);
        } catch {
          errorMessage = String(errorObj);
        }
      }
    } else {
      errorMessage = String(error);
    }

    // Always show detailed error to help with debugging
    if (!res.headersSent) {
      const errorResponse: any = {
        success: false,
        message: 'Failed to initialize application',
        error: errorMessage,
        errorName: errorName,
        ...(validationIssues && { validationIssues }),
        ...(errorStack && { stack: errorStack }),
        hint: 'Check Vercel environment variables and function logs for details',
      };

      return res.status(500).json(errorResponse);
    }
  }
}
