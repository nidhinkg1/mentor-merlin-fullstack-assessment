import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Reservation } from '../models/Reservation.js';
import { searchAvailableRooms } from '../services/availabilityService.js';
import { createReservationTransaction } from '../services/bookingService.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors/AppError.js';
import { ReservationStatus, RESERVATION_STATUSES } from '../types/reservation.types.js';

const ALLOWED_STATUS_TRANSITIONS: Record<ReservationStatus, readonly ReservationStatus[]> = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Checked-in', 'Cancelled'],
  'Checked-in': ['Checked-out'],
  'Checked-out': [],
  Cancelled: [],
};

const ALLOWED_SORT_FIELDS = ['createdAt', 'checkIn', 'checkOut', 'totalAmount'] as const;
type AllowedSortField = typeof ALLOWED_SORT_FIELDS[number];

export const searchAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { checkIn, checkOut, guestCount, roomCount } = req.query;

    const result = await searchAvailableRooms({
      checkIn: checkIn as string,
      checkOut: checkOut as string,
      guestCount: guestCount ? Number(guestCount) : 1,
      roomCount: roomCount ? Number(roomCount) : 1,
    });

    res.status(200).json({
      success: true,
      ...result,
      count: result.data.length,
    });
  } catch (error) {
    next(error);
  }
};

export const createReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ForbiddenError('Authentication required to create a reservation');
    }

    const { roomTypeId, checkIn, checkOut, guestCount, roomCount, specialRequests } = req.body;

    const reservation = await createReservationTransaction({
      guestId: req.user.id, // Strictly server-authoritative guest identity
      roomTypeId,
      checkIn,
      checkOut,
      guestCount,
      roomCount,
      specialRequests,
    });

    res.status(201).json({
      success: true,
      message: 'Reservation confirmed successfully',
      data: reservation,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyReservations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      guestId: new Types.ObjectId(req.user.id),
    };

    if (req.query.status && RESERVATION_STATUSES.includes(req.query.status as ReservationStatus)) {
      filter['status'] = req.query.status;
    }

    const sortBy = (ALLOWED_SORT_FIELDS.includes(req.query.sortBy as AllowedSortField)
      ? req.query.sortBy
      : 'createdAt') as string;
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sortOption: Record<string, 1 | -1> = { [sortBy]: sortOrder };

    const [reservations, total] = await Promise.all([
      Reservation.find(filter)
        .populate('roomTypeId', 'name description capacity facilities imageUrl pricePerNight')
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
      Reservation.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: reservations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getReservationById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid reservation ID format');
    }

    const reservation = await Reservation.findById(id)
      .populate('roomTypeId', 'name description capacity facilities imageUrl pricePerNight')
      .populate('guestId', 'name email role');

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    // Role-based authorization: Guests can only access their own reservation
    if (req.user && req.user.role === 'guest' && reservation.guestId._id.toString() !== req.user.id) {
      throw new ForbiddenError('You are not authorized to view this reservation');
    }

    res.status(200).json({
      success: true,
      data: reservation,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid reservation ID format');
    }

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    // Ownership check for guests
    if (req.user && req.user.role === 'guest' && reservation.guestId.toString() !== req.user.id) {
      throw new ForbiddenError('You are not authorized to cancel this reservation');
    }

    // Cancellation eligibility rules
    if (reservation.status === 'Cancelled') {
      throw new BadRequestError('Reservation is already cancelled');
    }

    if (reservation.status === 'Checked-out') {
      throw new BadRequestError('Cannot cancel a completed, checked-out reservation');
    }

    if (reservation.status === 'Checked-in') {
      throw new BadRequestError('Cannot cancel an active reservation that is already checked-in');
    }

    reservation.status = 'Cancelled';
    await reservation.save();

    res.status(200).json({
      success: true,
      message: 'Reservation cancelled successfully; inventory has been released',
      data: reservation,
    });
  } catch (error) {
    next(error);
  }
};

export const updateReservationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status: targetStatus } = req.body;

    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid reservation ID format');
    }

    if (!targetStatus || !RESERVATION_STATUSES.includes(targetStatus)) {
      throw new BadRequestError(`Invalid target status. Allowed: ${RESERVATION_STATUSES.join(', ')}`);
    }

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    const allowedNext = ALLOWED_STATUS_TRANSITIONS[reservation.status];
    if (!allowedNext.includes(targetStatus)) {
      throw new BadRequestError(
        `Invalid status transition: Cannot transition from '${reservation.status}' to '${targetStatus}'. Allowed: ${allowedNext.length > 0 ? allowedNext.join(', ') : 'None (Terminal state)'}`
      );
    }

    reservation.status = targetStatus;
    await reservation.save();

    res.status(200).json({
      success: true,
      message: `Reservation status transitioned from '${reservation.status}' to '${targetStatus}' successfully`,
      data: reservation,
    });
  } catch (error) {
    next(error);
  }
};

