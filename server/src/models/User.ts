import { Schema, model } from 'mongoose';
import { IUserDocument, USER_ROLES } from '../types/user.types.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [emailRegex, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Omit from default queries for security
    },
    role: {
      type: String,
      enum: {
        values: USER_ROLES,
        message: 'Role must be one of: guest, staff, admin',
      },
      default: 'guest',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret['passwordHash'];
        delete ret['__v'];
        return ret;
      },
    },
  }
);

// Explicit model export
export const User = model<IUserDocument>('User', userSchema);
