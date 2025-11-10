import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Import routes
import authRoutes from './routes/auth.routes';
import graduateRoutes from './routes/graduate.routes';
import companyRoutes from './routes/company.routes';
import adminRoutes from './routes/admin.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', message: 'Talent Hub API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/graduates', graduateRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/admin', adminRoutes);

// Database connection
mongoose
    .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/talent-hub')
    .then(() => {
        console.log('✅ Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });

export default app;

