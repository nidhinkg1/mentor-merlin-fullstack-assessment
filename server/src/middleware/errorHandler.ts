import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../errors/AppError.js';
import { config } from '../config/env.js';

export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    message = 'Validation failed';
    details = err;
  } else if (err.name === 'CastError') {
    // Invalid MongoDB ObjectId
    statusCode = 400;
    message = 'Invalid ID parameter format';
  } else if ((err as { code?: number }).code === 11000) {
    // Duplicate key error
    statusCode = 409;
    message = 'A duplicate entry already exists for a unique field';
  } else if (err.message) {
    message = err.message;
  }

  const responseBody: Record<string, unknown> = {
    success: false,
    message,
    ...(details !== undefined && { details }),
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(responseBody);
};

