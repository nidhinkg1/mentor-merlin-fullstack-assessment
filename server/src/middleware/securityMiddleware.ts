import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config/env.js';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'test' ? 10000 : 500, // Max 500 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP address, please try again after 15 minutes',
  },
  skip: () => config.nodeEnv === 'test',
});

// Strict rate limiter for authentication endpoints (prevent credential brute-forcing)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'test' ? 10000 : 25, // 25 login/register attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. For security, please try again in 15 minutes.',
    });
  },
  skip: () => config.nodeEnv === 'test',
});

// Reservation rate limiter to mitigate booking spam and automated hoarding
export const reservationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'test' ? 10000 : 40, // 40 reservation creation attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many reservation requests received. Please wait a moment and try again.',
    });
  },
  skip: () => config.nodeEnv === 'test',
});

