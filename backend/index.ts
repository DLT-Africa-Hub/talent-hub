import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';

// Import routes
import authRoutes from './routes/auth.routes';
import graduateRoutes from './routes/graduate.routes';
import companyRoutes from './routes/company.routes';
import adminRoutes from './routes/admin.routes';
import { loggingMiddleware } from './middleware/logging.middleware';
import { responseFormatter } from './middleware/response.middleware';
import { apiLimiter } from './middleware/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import openApiDocument from './docs/openapi.json';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// Middleware
app.use(
    cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
    })
);
app.use(loggingMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(responseFormatter);
app.use(apiLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
    res.success({ status: 'ok', message: 'Talent Hub API is running' });
});

app.get(`${API_PREFIX}/health`, (_req, res) => {
    res.success({ status: 'ok', message: 'Talent Hub API is running' });
});

// API documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

// Routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/graduates`, graduateRoutes);
app.use(`${API_PREFIX}/companies`, companyRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

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

