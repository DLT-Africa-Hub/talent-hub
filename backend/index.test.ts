import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app';

dotenv.config();

let mongo: any = null;

async function startTestServer() {
  try {
    // Try to use mongodb-memory-server for in-memory testing
    let uri: string;

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongo = await MongoMemoryServer.create();
      uri = mongo.getUri();
      console.log('✅ Using in-memory MongoDB for testing');
    } catch (error) {
      // Fallback to local MongoDB if mongodb-memory-server is not available
      console.log(
        '⚠️  mongodb-memory-server not available, using local MongoDB'
      );
      uri =
        process.env.MONGODB_URI ||
        'mongodb://localhost:27017/talent-hub-e2e-test';
      console.log(`✅ Using local MongoDB: ${uri}`);
    }

    // Set the MongoDB URI for the app
    process.env.MONGODB_URI = uri;
    process.env.NODE_ENV = 'test';

    const PORT = process.env.PORT || 3090;

    await mongoose.connect(uri, {
      dbName: 'talent-hub-e2e-test',
    });

    console.log('✅ Connected to test MongoDB');

    const server = app.listen(PORT, () => {
      console.log(`🧪 Test server running on port ${PORT}`);
      console.log(`📊 Using database: talent-hub-e2e-test`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down test server...');
      server.close(async () => {
        try {
          await mongoose.connection.dropDatabase();
          await mongoose.connection.close();
          if (mongo && typeof mongo.stop === 'function') {
            await mongo.stop();
          }
          console.log('✅ Test server shut down gracefully');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    return server;
  } catch (error) {
    console.error('❌ Failed to start test server:', error);
    if (mongo && typeof mongo.stop === 'function') {
      await mongo.stop();
    }
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startTestServer().catch((error) => {
    console.error('Failed to start test server:', error);
    process.exit(1);
  });
}

export default startTestServer;
