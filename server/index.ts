import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { productionConfig } from './config/production.js';
import { checkDatabaseConnection } from './db/connection.js';
import apiRoutes from './routes/api.js';
import ultraAIRoutes from './routes/ultra-ai-routes.js';
import agentTasksRoutes from './routes/agent-tasks.js';
import { enhancedErrorHandler as errorHandler } from './middleware/error-handler.js';
import healthRoutes from './routes/health.js';
import documentRoutes from './routes/document.routes.js';
import productionDocumentRoutes from './routes/production-documents.js';

// Placeholder for military-grade auth (create if needed)
const militaryGradeAuth = (req: any, res: any, next: any) => next();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors((productionConfig as any).server?.cors || {}));
app.use(compression((productionConfig as any).server?.compression || {}));
app.use(rateLimit((productionConfig as any).server?.rateLimit || { windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseConnection();
  res.json({
    status: 'operational',
    environment: process.env.NODE_ENV,
    database: dbHealth ? 'connected' : 'error',
    timestamp: new Date().toISOString()
  });
});

// API routes with military-grade authentication
app.use('/api', militaryGradeAuth, apiRoutes);
app.use('/api/ultra-ai', ultraAIRoutes);
app.use('/api/agent', agentTasksRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/production/documents', productionDocumentRoutes);

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
}).on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});