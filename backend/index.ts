import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import app from './app';
import { initializeSocket } from './socket/socket';

dotenv.config();

const PORT = process.env.PORT || 3090;

const httpServer = createServer(app);

export const io = initializeSocket(httpServer);

// Only connect to MongoDB and start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  mongoose
    .connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/talent-hub',
      {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        maxPoolSize: 10,
        retryWrites: true,
        w: 'majority',
      } as mongoose.ConnectOptions
    )
    .then(() => {
      console.log('✅ Connected to MongoDB');
      httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log('✅ Socket.IO initialized');
      });
    })
    .catch((error) => {
      console.error('❌ MongoDB connection error:', error);
      console.error('\n💡 Troubleshooting tips:');
      console.error('   1. Check if your IP is whitelisted in MongoDB Atlas');
      console.error(
        '   2. Verify your MONGODB_URI connection string is correct'
      );
      console.error('   3. Check your network connection');
      console.error('   4. Ensure MongoDB Atlas cluster is running');
      process.exit(1);
    });
} else {
  // In test environment, just initialize io without connecting to MongoDB
  // Tests will handle their own MongoDB connections via testDb utilities
}

export default app;
