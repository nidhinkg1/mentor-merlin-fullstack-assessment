import { Document, Types } from 'mongoose';

export type ReservationStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Checked-in'
  | 'Checked-out'
  | 'Cancelled';

export const RESERVATION_STATUSES: readonly ReservationStatus[] = [
  'Pending',
  'Confirmed',
  'Checked-in',
  'Checked-out',
  'Cancelled',
] as const;

/**
 * Statuses that represent active room occupancy / inventory consumption.
 * - 'Confirmed' and 'Checked-in' actively hold rooms.
 * - 'Checked-out' and 'Cancelled' release rooms back to available inventory.
 * - 'Pending' reservation inventory policy is detailed in documentation.
 */
export const ACTIVE_RESERVATION_STATUSES: readonly ReservationStatus[] = [
  'Confirmed',
  'Checked-in',
] as const;

export interface IReservation {
  reservationReference: string;
  guestId: Types.ObjectId;
  roomTypeId: Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  roomCount: number;
  guestCount: number;
  pricePerNightSnapshot: number;
  totalAmount: number;
  status: ReservationStatus;
  specialRequests?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReservationDocument extends IReservation, Document<Types.ObjectId> {}

