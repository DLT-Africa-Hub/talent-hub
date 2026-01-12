// MongoDB initialization script
// This script runs when the MongoDB container is first created

// Switch to the Recruita database
db = db.getSiblingDB('Recruita');

// Create collections with validation (optional)
db.createCollection('users');
db.createCollection('graduates');
db.createCollection('companies');
db.createCollection('jobs');
db.createCollection('matches');

// Create indexes for better query performance
db.users.createIndex({ email: 1 }, { unique: true });
db.graduates.createIndex({ userId: 1 }, { unique: true });
db.companies.createIndex({ userId: 1 }, { unique: true });
db.jobs.createIndex({ companyId: 1 });
db.matches.createIndex({ graduateId: 1, jobId: 1 }, { unique: true });
db.matches.createIndex({ score: -1 });

print('✅ MongoDB initialized successfully');

