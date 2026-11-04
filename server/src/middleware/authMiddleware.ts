import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError.js';
import { verifyToken } from '../utils/auth.js';
import { User } from '../models/User.js';
import { UserRole } from '../types/user.types.js';

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token missing');
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('User associated with this token no longer exists');
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const authenticateOptional = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId);
      if (user) {
        req.user = {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      }
    } catch {
      // For optional auth, ignore invalid token and proceed as guest/anonymous
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Access denied: insufficient permissions'));
    }

    next();
  };
};
