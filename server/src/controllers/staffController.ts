import { Request, Response, NextFunction } from 'express';
import { RoomType } from '../models/RoomType.js';
import { Reservation } from '../models/Reservation.js';
import { User } from '../models/User.js';
import { getTodayMidnightUtc } from '../utils/dateUtils.js';
import { ReservationStatus, RESERVATION_STATUSES } from '../types/reservation.types.js';

const ALLOWED_STAFF_SORT_FIELDS = ['checkIn', 'checkOut', 'createdAt', 'totalAmount', 'status'] as const;
type AllowedStaffSortField = typeof ALLOWED_STAFF_SORT_FIELDS[number];

/**
 * GET /api/staff/dashboard/stats
 * Aggregates operational KPIs for the hotel's current business date.
 */
export const getDashboardStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const today = getTodayMidnightUtc();
    const tomorrow = new Date(today.getTime() + 86400000);

    // 1. Total Physical Room Inventory across active room types
    const activeRooms = await RoomType.find({ isActive: true });
    const totalRoomInventory = activeRooms.reduce((sum, r) => sum + r.totalInventory, 0);

    // 2. Currently Occupied Rooms (Sum of roomCount for all 'Checked-in' guests)
    const occupiedReservations = await Reservation.find({ status: 'Checked-in' });
    const occupiedRooms = occupiedReservations.reduce((sum, r) => sum + r.roomCount, 0);

    // 3. Available Rooms
    const availableRooms = Math.max(0, totalRoomInventory - occupiedRooms);

    // 4. Today's Arrivals (checkIn == today, status Confirmed or Checked-in)
    const todayArrivalsCount = await Reservation.countDocuments({
      checkIn: { $gte: today, $lt: tomorrow },
      status: { $in: ['Confirmed', 'Checked-in'] },
    });

    // 5. Today's Departures (checkOut == today, status Checked-in or Checked-out)
    const todayDeparturesCount = await Reservation.countDocuments({
      checkOut: { $gte: today, $lt: tomorrow },
      status: { $in: ['Checked-in', 'Checked-out'] },
    });

    // 6. Pending Bookings Count
    const pendingReservationsCount = await Reservation.countDocuments({
      status: 'Pending',
    });

    // 7. Occupancy Rate Percentage
    const occupancyRate =
      totalRoomInventory > 0 ? Math.round((occupiedRooms / totalRoomInventory) * 1000) / 10 : 0;

    res.status(200).json({
      success: true,
      data: {
        totalRoomInventory,
        occupiedRooms,
        availableRooms,
        todayArrivalsCount,
        todayDeparturesCount,
        pendingReservationsCount,
        occupancyRate,
        businessDate: today.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/staff/arrivals
 * Retrieves reservations scheduled to arrive today.
 */
export const getTodayArrivals = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const today = getTodayMidnightUtc();
    const tomorrow = new Date(today.getTime() + 86400000);

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      checkIn: { $gte: today, $lt: tomorrow },
      status: { $in: ['Confirmed', 'Checked-in'] },
    };

    if (typeof req.query.search === 'string' && req.query.search.trim().length > 0) {
      const term = req.query.search.trim();
      const users = await User.find({
        $or: [{ name: new RegExp(term, 'i') }, { email: new RegExp(term, 'i') }],
      }).select('_id');
      const userIds = users.map((u) => u._id);

      filter['$or'] = [
        { reservationReference: new RegExp(term, 'i') },
        { guestId: { $in: userIds } },
      ];
    }

    const [arrivals, total] = await Promise.all([
      Reservation.find(filter)
        .populate('guestId', 'name email')
        .populate('roomTypeId', 'name capacity pricePerNight')
        .sort({ checkIn: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit),
      Reservation.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: arrivals,
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

/**
 * GET /api/staff/departures
 * Retrieves reservations scheduled to depart today.
 */
export const getTodayDepartures = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const today = getTodayMidnightUtc();
    const tomorrow = new Date(today.getTime() + 86400000);

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      checkOut: { $gte: today, $lt: tomorrow },
      status: { $in: ['Checked-in', 'Checked-out'] },
    };

    if (typeof req.query.search === 'string' && req.query.search.trim().length > 0) {
      const term = req.query.search.trim();
      const users = await User.find({
        $or: [{ name: new RegExp(term, 'i') }, { email: new RegExp(term, 'i') }],
      }).select('_id');
      const userIds = users.map((u) => u._id);

      filter['$or'] = [
        { reservationReference: new RegExp(term, 'i') },
        { guestId: { $in: userIds } },
      ];
    }

    const [departures, total] = await Promise.all([
      Reservation.find(filter)
        .populate('guestId', 'name email')
        .populate('roomTypeId', 'name capacity pricePerNight')
        .sort({ checkOut: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit),
      Reservation.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: departures,
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

/**
 * GET /api/staff/reservations
 * Comprehensive server-side paginated, searchable, filterable reservation table for Front Desk.
 */
export const getAllReservations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const andConditions: Record<string, unknown>[] = [];

    // 1. Status Filter
    if (req.query.status && RESERVATION_STATUSES.includes(req.query.status as ReservationStatus)) {
      andConditions.push({ status: req.query.status });
    }

    // 2. Specific Date or Date-range Filter
    if (req.query.date && typeof req.query.date === 'string') {
      const targetDate = new Date(req.query.date);
      if (!isNaN(targetDate.getTime())) {
        const dStart = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()));
        const dEnd = new Date(dStart.getTime() + 86400000);
        andConditions.push({
          $or: [
            { checkIn: { $gte: dStart, $lt: dEnd } },
            { checkOut: { $gte: dStart, $lt: dEnd } },
          ],
        });
      }
    }

    // 3. Search by Reference or Guest Name/Email (safely escaped)
    if (typeof req.query.search === 'string' && req.query.search.trim().length > 0) {
      const term = req.query.search.trim();
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const users = await User.find({
        $or: [{ name: new RegExp(escapedTerm, 'i') }, { email: new RegExp(escapedTerm, 'i') }],
      }).select('_id');
      const userIds = users.map((u) => u._id);

      andConditions.push({
        $or: [
          { reservationReference: new RegExp(escapedTerm, 'i') },
          { guestId: { $in: userIds } },
        ],
      });
    }

    const filter: Record<string, unknown> = andConditions.length > 0 ? { $and: andConditions } : {};

    // 4. Stable Sorting
    const sortBy = (ALLOWED_STAFF_SORT_FIELDS.includes(req.query.sortBy as AllowedStaffSortField)
      ? req.query.sortBy
      : 'checkIn') as string;
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
    const sortOption: Record<string, 1 | -1> = { [sortBy]: sortOrder, _id: 1 };

    const [reservations, total] = await Promise.all([
      Reservation.find(filter)
        .populate('guestId', 'name email')
        .populate('roomTypeId', 'name capacity pricePerNight facilities')
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
