import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

import { generalLimit } from './middleware/rateLimit';
import { logDatabaseStatus } from './db/connection';

// Route imports
import { authRouter } from './routes/auth';
import { mapRouter } from './routes/map';
import { eventsRouter } from './routes/events';
import { placesRouter } from './routes/places';
import { verificationRouter } from './routes/verification';
import { ratingsRouter } from './routes/ratings';
import { buddiesRouter } from './routes/buddies';
import { messagesRouter } from './routes/messages';
import { aiCallRouter } from './routes/aiCall';
import { emergencyRouter } from './routes/emergency';
import { distressRouter } from './routes/distress';

export const app = express();
const PORT = process.env.PORT || 3001;

// 1. Security & Core Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  process.env.WEB_APP_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or matching origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow dev frontend flexibility while supporting credentials
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global General Rate Limiter
app.use('/api/', generalLimit);

// 2. Healthcheck & Status
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ami-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    demoMode: process.env.DEMO_MODE === 'true' || !process.env.GEMINI_API_KEY,
  });
});

// 3. Mount API Routers
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/map', mapRouter);
app.use('/api/v1/events', eventsRouter);
app.use('/api/v1/places', placesRouter);
app.use('/api/v1/verification', verificationRouter);
app.use('/api/v1/ratings', ratingsRouter);
app.use('/api/v1/buddies', buddiesRouter);
app.use('/api/v1/messages', messagesRouter);
app.use('/api/v1/ai-call', aiCallRouter);
app.use('/api/v1/emergency', emergencyRouter);
app.use('/api/v1/distress', distressRouter);

// 4. 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Endpoint ${req.method} ${req.originalUrl} does not exist.`,
  });
});

// 5. Global Error Handler (Never leak stack traces in production)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const isDev = process.env.NODE_ENV !== 'production';
  console.error('[UNHANDLED_ERROR]', err);

  res.status(err.status || 500).json({
    success: false,
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message: isDev ? err.message : 'An unexpected server error occurred.',
    ...(isDev && { stack: err.stack }),
  });
});

// 6. Server Initialization
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🌸 Ami API Server running on port ${PORT}`);
    console.log(`📡 Base URL: http://localhost:${PORT}/api/v1`);
    logDatabaseStatus();
    console.log(`===============================================`);
  });

  const gracefulShutdown = () => {
    console.log('[API] Gracefully shutting down...');
    server.close(() => {
      console.log('[API] Closed HTTP server.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

export default app;
