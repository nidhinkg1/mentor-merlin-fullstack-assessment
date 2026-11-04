import { Document, Types } from 'mongoose';

export type UserRole = 'guest' | 'staff' | 'admin';

export const USER_ROLES: readonly UserRole[] = ['guest', 'staff', 'admin'] as const;

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document<Types.ObjectId> {}

