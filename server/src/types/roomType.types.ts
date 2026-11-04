import { Document, Types } from 'mongoose';

export interface IRoomType {
  name: string;
  description: string;
  capacity: number;
  facilities: string[];
  pricePerNight: number;
  totalInventory: number;
  isActive: boolean;
  imageUrl?: string;
  version?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoomTypeDocument extends IRoomType, Document<Types.ObjectId> {}

