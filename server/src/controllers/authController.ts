import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { BadRequestError, ConflictError, UnauthorizedError } from '../errors/AppError.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';
import { RegisterDto, LoginDto } from '../types/auth.types.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const register = async (
  req: Request<unknown, unknown, RegisterDto>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new BadRequestError('Name must be at least 2 characters long');
    }

    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      throw new BadRequestError('Please provide a valid email address');
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new BadRequestError('Password must be at least 6 characters long');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for existing user with identical email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictError('An account with this email address already exists');
    }

    // Security rule: Public registration strictly assigns 'guest' role
    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: hashedPassword,
      role: 'guest', // Forced guest role, ignoring any external role field
    });

    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request<unknown, unknown, LoginDto>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      throw new BadRequestError('Email and password are required');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Retrieve user including the select: false passwordHash field
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
    });

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      throw new UnauthorizedError('User profile not found');
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

