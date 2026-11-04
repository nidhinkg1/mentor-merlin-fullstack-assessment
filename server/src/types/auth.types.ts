import { UserRole } from './user.types.js';

export interface JwtTokenPayload {
  userId: string;
  role: UserRole;
}

export interface AuthUserPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

