import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../errors/AppError.js';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError(`Cannot find route ${req.method} ${req.originalUrl}`));
};

