import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/securityMiddleware.js';

export const createApp = (): Express => {
  const app = express();

  // HTTP Security Headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: [
            "'self'",
            'data:',
            'blob:',
            'https://images.unsplash.com',
            'https://*.unsplash.com',
          ],
          connectSrc: [
            "'self'",
            config.clientOrigin,
            'http://localhost:5173',
            'http://127.0.0.1:5173',
          ],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: config.nodeEnv === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    })
  );

  // Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: [config.clientOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );

  // Body Parsing Middleware
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // General API Rate Limiting
  app.use('/api', apiLimiter);

  // API Routes
  app.use('/api', apiRouter);

  // 404 Route Handler
  app.use(notFoundHandler);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};

