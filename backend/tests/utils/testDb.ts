import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo: MongoMemoryServer | null = null;

export const connectTestDb = async (): Promise<void> => {
  // Disconnect existing connection if any (from index.ts or previous tests)
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }

  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  process.env.MONGODB_URI = uri;

  await mongoose.connect(uri, {
    dbName: 'talent-hub-test',
  });
};

export const disconnectTestDb = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.dropDatabase();
    } catch (error) {
      // Ignore dropDatabase errors (e.g., permission issues with MongoMemoryServer)
      // This is safe in test environment
    }
    await mongoose.connection.close();
  }

  if (mongo) {
    await mongo.stop();
    mongo = null;
  }
};

export const clearDatabase = async (): Promise<void> => {
  const collections = mongoose.connection.collections;

  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({}))
  );
};
