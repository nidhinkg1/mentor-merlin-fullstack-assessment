import { BadRequestError } from '../errors/AppError.js';
import crypto from 'crypto';

export const normalizeToMidnightUtc = (dateInput: string | Date): Date => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new BadRequestError('Invalid date format');
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

export const getTodayMidnightUtc = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
};

export const MAX_STAY_NIGHTS = 30;

export interface ValidatedStayDates {
  checkIn: Date;
  checkOut: Date;
  nights: number;
}

export const validateStayDates = (
  checkInInput: string | Date,
  checkOutInput: string | Date
): ValidatedStayDates => {
  if (!checkInInput || !checkOutInput) {
    throw new BadRequestError('Both check-in and check-out dates are required');
  }

  const checkIn = normalizeToMidnightUtc(checkInInput);
  const checkOut = normalizeToMidnightUtc(checkOutInput);
  const today = getTodayMidnightUtc();

  if (checkIn.getTime() < today.getTime()) {
    throw new BadRequestError('Check-in date cannot be in the past');
  }

  if (checkOut.getTime() <= checkIn.getTime()) {
    throw new BadRequestError('Check-out date must be strictly after check-in date');
  }

  const diffMs = checkOut.getTime() - checkIn.getTime();
  const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (nights < 1) {
    throw new BadRequestError('Reservation must be for at least one night');
  }

  if (nights > MAX_STAY_NIGHTS) {
    throw new BadRequestError(
      `Reservation stay cannot exceed the maximum allowed duration of ${MAX_STAY_NIGHTS} nights. For extended stays, please contact reservations.`
    );
  }

  return { checkIn, checkOut, nights };
};

export const getNightIntervals = (checkIn: Date, checkOut: Date): Date[] => {
  const nights: Date[] = [];
  const current = new Date(checkIn.getTime());

  while (current.getTime() < checkOut.getTime()) {
    nights.push(new Date(current.getTime()));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return nights;
};

export const generateReservationReference = (): string => {
  const year = new Date().getUTCFullYear();
  const randomChars = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
  return `MM-${year}-${randomChars}`;
};

