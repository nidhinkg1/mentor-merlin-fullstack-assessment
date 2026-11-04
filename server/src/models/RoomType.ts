import { Schema, model } from 'mongoose';
import { IRoomTypeDocument } from '../types/roomType.types.js';

const roomTypeSchema = new Schema<IRoomTypeDocument>(
  {
    name: {
      type: String,
      required: [true, 'Room type name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Room type name must be at least 2 characters'],
      maxlength: [100, 'Room type name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [5, 'Description must be at least 5 characters'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    capacity: {
      type: Number,
      required: [true, 'Guest capacity is required'],
      min: [1, 'Capacity must be at least 1 guest'],
      validate: {
        validator: Number.isInteger,
        message: 'Capacity must be an integer',
      },
    },
    pricePerNight: {
      type: Number,
      required: [true, 'Price per night is required'],
      min: [0.01, 'Price per night must be greater than zero'],
    },
    totalInventory: {
      type: Number,
      required: [true, 'Total inventory count is required'],
      min: [0, 'Total inventory count cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Total inventory must be an integer',
      },
    },
    facilities: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret['__v'];
        return ret;
      },
    },
  }
);

// Model export
export const RoomType = model<IRoomTypeDocument>('RoomType', roomTypeSchema);
