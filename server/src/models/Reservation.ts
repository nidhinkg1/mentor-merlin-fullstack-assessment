import { Schema, model } from 'mongoose';
import { IReservationDocument, RESERVATION_STATUSES } from '../types/reservation.types.js';

const reservationSchema = new Schema<IReservationDocument>(
  {
    reservationReference: {
      type: String,
      required: [true, 'Reservation reference is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    guestId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Guest reference is required'],
    },
    roomTypeId: {
      type: Schema.Types.ObjectId,
      ref: 'RoomType',
      required: [true, 'Room type reference is required'],
    },
    checkIn: {
      type: Date,
      required: [true, 'Check-in date is required'],
    },
    checkOut: {
      type: Date,
      required: [true, 'Check-out date is required'],
      validate: {
        validator: function (this: unknown, value: Date) {
          const doc = this as Partial<IReservationDocument>;
          if (!doc.checkIn || !value) return true;
          return new Date(value).getTime() > new Date(doc.checkIn).getTime();
        },
        message: 'Check-out date must be strictly after check-in date',
      },
    },
    roomCount: {
      type: Number,
      required: [true, 'Number of rooms is required'],
      default: 1,
      min: [1, 'At least 1 room must be reserved'],
      validate: {
        validator: Number.isInteger,
        message: 'Room count must be an integer',
      },
    },
    guestCount: {
      type: Number,
      required: [true, 'Guest count is required'],
      min: [1, 'Guest count must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Guest count must be an integer',
      },
    },
    pricePerNightSnapshot: {
      type: Number,
      required: [true, 'Price per night snapshot is required'],
      min: [0.01, 'Price snapshot must be greater than zero'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total reservation amount is required'],
      min: [0.01, 'Total amount must be greater than zero'],
    },
    status: {
      type: String,
      enum: {
        values: RESERVATION_STATUSES,
        message: 'Invalid reservation status',
      },
      default: 'Confirmed',
      required: true,
    },
    specialRequests: {
      type: String,
      trim: true,
      maxlength: [500, 'Special requests cannot exceed 500 characters'],
      default: '',
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

// Compound and query-optimized indexes
reservationSchema.index({ guestId: 1, createdAt: -1 });
reservationSchema.index({ roomTypeId: 1, checkIn: 1, checkOut: 1, status: 1 });
reservationSchema.index({ status: 1, checkIn: 1 });
reservationSchema.index({ status: 1, checkOut: 1 });

export const Reservation = model<IReservationDocument>('Reservation', reservationSchema);
