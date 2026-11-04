import mongoose, { Types } from 'mongoose';
import { RoomType } from '../models/RoomType.js';
import { Reservation } from '../models/Reservation.js';
import { ACTIVE_RESERVATION_STATUSES, IReservationDocument } from '../types/reservation.types.js';
import { validateStayDates, generateReservationReference } from '../utils/dateUtils.js';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/AppError.js';
import { computeMinAvailableForInterval } from './availabilityService.js';

export interface CreateReservationInput {
  guestId: string;
  roomTypeId: string;
  checkIn: string | Date;
  checkOut: string | Date;
  guestCount: number;
  roomCount?: number;
  specialRequests?: string;
}

const MAX_TRANSACTION_RETRIES = 3;
const MAX_COMMIT_RETRIES = 3;

/**
 * Commits a MongoDB transaction with bounded retry handling for UnknownTransactionCommitResult.
 * When a commit acknowledgment is lost due to a transient network issue, MongoDB attaches
 * the UnknownTransactionCommitResult label. Per MongoDB transaction specifications, commitTransaction()
 * must be retried on the SAME session without restarting the entire transaction from scratch.
 */
export const commitWithRetry = async (
  session: mongoose.ClientSession,
  maxRetries = MAX_COMMIT_RETRIES
): Promise<void> => {
  let commitAttempt = 0;
  while (commitAttempt < maxRetries) {
    commitAttempt++;
    try {
      await session.commitTransaction();
      return;
    } catch (error: any) {
      const isUnknownCommit =
        error.hasErrorLabel && error.hasErrorLabel('UnknownTransactionCommitResult');

      if (isUnknownCommit && commitAttempt < maxRetries) {
        const delay = Math.pow(2, commitAttempt) * 30 + Math.random() * 30;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw error;
    }
  }
};

/**
 * Creates a reservation using a multi-document ACID transaction.
 * Concurrency protection is achieved by atomically incrementing the target RoomType's version
 * inside the transaction, forcing concurrent conflicting requests on the same room type to serialize,
 * retry, and recalculate availability.
 */
export const createReservationTransaction = async (
  input: CreateReservationInput
): Promise<IReservationDocument> => {
  const { guestId, roomTypeId, guestCount, roomCount = 1, specialRequests } = input;

  // 1. Basic validation
  if (!roomTypeId || !Types.ObjectId.isValid(roomTypeId)) {
    throw new BadRequestError('Invalid room type ID format');
  }

  const requestedRooms = Math.max(1, Number(roomCount) || 1);
  const requestedGuests = Math.max(1, Number(guestCount) || 1);

  // 2. Validate dates
  const { checkIn, checkOut, nights } = validateStayDates(input.checkIn, input.checkOut);

  let attempt = 0;

  while (attempt < MAX_TRANSACTION_RETRIES) {
    attempt++;
    const session = await mongoose.startSession();

    try {
      session.startTransaction({
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
      });

      // 3. Concurrency Lock: Atomically update the target RoomType version within the session.
      // Competing concurrent transactions on this room type will encounter write conflicts,
      // forcing them into the retry loop where availability is freshly recalculated.
      const room = await RoomType.findOneAndUpdate(
        { _id: roomTypeId, isActive: true },
        { $inc: { version: 1 } },
        { session, new: true }
      );

      if (!room) {
        throw new NotFoundError('Room type not found or is currently inactive');
      }

      // 4. Validate Guest Capacity on Server
      const maxCapacity = room.capacity * requestedRooms;
      if (requestedGuests > maxCapacity) {
        throw new BadRequestError(
          `Guest count (${requestedGuests}) exceeds maximum capacity (${maxCapacity}) for ${requestedRooms} room(s)`
        );
      }

      // 5. Query active reservations inside the transaction snapshot
      const overlappingReservations = await Reservation.find({
        roomTypeId: room._id,
        status: { $in: ACTIVE_RESERVATION_STATUSES },
        checkIn: { $lt: checkOut },
        checkOut: { $gt: checkIn },
      }).session(session);

      // 6. Calculate exact nightly room availability
      const minAvailable = computeMinAvailableForInterval(
        overlappingReservations,
        checkIn,
        checkOut,
        room.totalInventory
      );

      if (minAvailable < requestedRooms) {
        throw new ConflictError(
          `Insufficient room inventory: only ${Math.max(0, minAvailable)} room(s) available for the selected dates, but ${requestedRooms} requested`
        );
      }

      // 7. Server-Authoritative Price Calculation
      const pricePerNightSnapshot = room.pricePerNight;
      const totalAmount = nights * pricePerNightSnapshot * requestedRooms;

      // 8. Generate Unique Reference
      let reservationReference = generateReservationReference();
      while (await Reservation.exists({ reservationReference }).session(session)) {
        reservationReference = generateReservationReference();
      }

      // 9. Insert Reservation inside the Transaction
      const [newReservation] = await Reservation.create(
        [
          {
            reservationReference,
            guestId: new Types.ObjectId(guestId),
            roomTypeId: room._id,
            checkIn,
            checkOut,
            roomCount: requestedRooms,
            guestCount: requestedGuests,
            pricePerNightSnapshot,
            totalAmount,
            status: 'Confirmed',
            specialRequests: typeof specialRequests === 'string' ? specialRequests.trim() : '',
          },
        ],
        { session }
      );

      // 10. Commit Transaction with retry for UnknownTransactionCommitResult
      await commitWithRetry(session);
      return newReservation!;
    } catch (error: any) {
      // Only abort when session is actively in transaction, without masking original error
      if (session.inTransaction()) {
        try {
          await session.abortTransaction();
        } catch {
          // Do not allow an abort failure to mask the original exception
        }
      }

      // Inspect error labels / codes for transient conflicts
      const isTransient = error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError');
      const isWriteConflict = error.code === 112 || error.message?.includes('WriteConflict');

      if ((isTransient || isWriteConflict) && attempt < MAX_TRANSACTION_RETRIES) {
        // Bounded exponential backoff with random jitter
        const delay = Math.pow(2, attempt) * 40 + Math.random() * 40;
        await new Promise((r) => setTimeout(r, delay));
        continue; // Retry with freshly created transaction session
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  throw new ConflictError('Concurrent booking conflict. Please retry your request.');
};

