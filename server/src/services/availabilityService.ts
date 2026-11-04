import { RoomType } from '../models/RoomType.js';
import { Reservation } from '../models/Reservation.js';
import { ACTIVE_RESERVATION_STATUSES, IReservationDocument } from '../types/reservation.types.js';
import { getNightIntervals, validateStayDates, ValidatedStayDates } from '../utils/dateUtils.js';
import { IRoomTypeDocument } from '../types/roomType.types.js';
import { ClientSession } from 'mongoose';

export interface SearchAvailabilityParams {
  checkIn: string | Date;
  checkOut: string | Date;
  guestCount?: number;
  roomCount?: number;
}

export interface AvailableRoomResult {
  roomType: IRoomTypeDocument;
  availableCount: number;
  nights: number;
  pricePerNight: number;
  totalAmount: number;
}

/**
 * Calculates the minimum available room count on any individual night across the requested interval [checkIn, checkOut).
 * Accounts for multiple rooms booked per reservation.
 */
export const computeMinAvailableForInterval = (
  activeReservations: IReservationDocument[],
  checkIn: Date,
  checkOut: Date,
  totalInventory: number
): number => {
  const nights = getNightIntervals(checkIn, checkOut);
  if (nights.length === 0) return 0;

  let minAvailable = totalInventory;

  for (const night of nights) {
    const nightTime = night.getTime();

    // Sum all rooms booked across active reservations covering this specific night
    const bookedOnNight = activeReservations.reduce((sum, res) => {
      const resCheckInTime = new Date(res.checkIn).getTime();
      const resCheckOutTime = new Date(res.checkOut).getTime();

      if (resCheckInTime <= nightTime && resCheckOutTime > nightTime) {
        return sum + res.roomCount;
      }
      return sum;
    }, 0);

    const availableOnNight = totalInventory - bookedOnNight;
    if (availableOnNight < minAvailable) {
      minAvailable = availableOnNight;
    }
  }

  return Math.max(0, minAvailable);
};

export const searchAvailableRooms = async (
  params: SearchAvailabilityParams
): Promise<{
  dateRange: ValidatedStayDates;
  searchParams: { guestCount: number; roomCount: number };
  data: AvailableRoomResult[];
}> => {
  const { checkIn, checkOut, nights } = validateStayDates(params.checkIn, params.checkOut);
  const guestCount = Math.max(1, Number(params.guestCount) || 1);
  const roomCount = Math.max(1, Number(params.roomCount) || 1);

  // Retrieve active room types
  const activeRooms = await RoomType.find({ isActive: true }).sort({ pricePerNight: 1 });

  const results: AvailableRoomResult[] = [];

  for (const room of activeRooms) {
    // Capacity check: room capacity * requested rooms must accommodate total guests
    const maxCapacity = room.capacity * roomCount;
    if (guestCount > maxCapacity) {
      continue;
    }

    // Query active overlapping reservations
    const overlappingReservations = await Reservation.find({
      roomTypeId: room._id,
      status: { $in: ACTIVE_RESERVATION_STATUSES },
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn },
    });

    const minAvailable = computeMinAvailableForInterval(
      overlappingReservations,
      checkIn,
      checkOut,
      room.totalInventory
    );

    if (minAvailable >= roomCount) {
      const totalAmount = nights * room.pricePerNight * roomCount;
      results.push({
        roomType: room,
        availableCount: minAvailable,
        nights,
        pricePerNight: room.pricePerNight,
        totalAmount,
      });
    }
  }

  return {
    dateRange: { checkIn, checkOut, nights },
    searchParams: { guestCount, roomCount },
    data: results,
  };
};

/**
 * Checks availability for a specific room type within an optional transaction session.
 */
export const checkSingleRoomAvailability = async (
  roomTypeId: string | IRoomTypeDocument,
  checkIn: Date,
  checkOut: Date,
  roomCount: number,
  session?: ClientSession
): Promise<{ isAvailable: boolean; availableCount: number; room: IRoomTypeDocument }> => {
  const query = RoomType.findById(roomTypeId);
  if (session) query.session(session);
  const room = await query;

  if (!room || !room.isActive) {
    return { isAvailable: false, availableCount: 0, room: room as IRoomTypeDocument };
  }

  const resQuery = Reservation.find({
    roomTypeId: room._id,
    status: { $in: ACTIVE_RESERVATION_STATUSES },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  });
  if (session) resQuery.session(session);
  const overlapping = await resQuery;

  const availableCount = computeMinAvailableForInterval(
    overlapping,
    checkIn,
    checkOut,
    room.totalInventory
  );

  return {
    isAvailable: availableCount >= roomCount,
    availableCount,
    room,
  };
};

