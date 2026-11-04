import http from 'http';
import mongoose, { Types } from 'mongoose';
import { createApp } from '../app.js';
import { connectDatabase } from '../config/db.js';
import { User, RoomType, Reservation } from '../models/index.js';
import { generateToken } from '../utils/auth.js';
import { commitWithRetry } from '../services/bookingService.js';

interface ApiResponse<T = any> {
  status: number;
  data: T;
}

const makeRequest = (
  app: http.Server,
  path: string,
  method: string,
  body?: any,
  token?: string
): Promise<ApiResponse> => {
  return new Promise((resolve, reject) => {
    const address = app.address() as { port: number };
    const payload = body ? JSON.stringify(body) : undefined;

    const req = http.request(
      {
        hostname: 'localhost',
        port: address.port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload && { 'Content-Length': Buffer.byteLength(payload) }),
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let parsedData;
          try {
            parsedData = JSON.parse(rawData);
          } catch {
            parsedData = rawData;
          }
          resolve({ status: res.statusCode || 500, data: parsedData });
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
};

const runStage4Verification = async () => {
  console.log('=====================================================');
  console.log('=== Stage 4: Booking & Concurrency Verification ===');
  console.log('=====================================================\n');

  await connectDatabase();
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  console.log(`Ephemeral test server running on port: ${address.port}`);

  // Retrieve test users seeded earlier
  const guestUser = await User.findOne({ email: 'guest@hotel.com' });
  const staffUser = await User.findOne({ email: 'staff@hotel.com' });

  if (!guestUser || !staffUser) {
    throw new Error('Required demo accounts missing. Please run seed script first.');
  }

  // Create second guest for ownership isolation testing
  let otherGuest = await User.findOne({ email: 'otherguest@hotel.com' });
  if (!otherGuest) {
    otherGuest = await User.create({
      name: 'Other Guest',
      email: 'otherguest@hotel.com',
      passwordHash: 'dummyhash123',
      role: 'guest',
    });
  }

  const guestToken = generateToken({ userId: guestUser._id.toString(), role: guestUser.role });
  const otherGuestToken = generateToken({ userId: otherGuest._id.toString(), role: otherGuest.role });
  const staffToken = generateToken({ userId: staffUser._id.toString(), role: staffUser.role });

  // Create isolated Room Types for testing
  const testStandardRoom = await RoomType.create({
    name: `Test Standard Room ${Date.now()}`,
    description: 'Standard testing room',
    capacity: 2,
    pricePerNight: 100,
    totalInventory: 3,
    isActive: true,
  });

  const testSingleUnitRoom = await RoomType.create({
    name: `Test Last Available Room ${Date.now()}`,
    description: 'Exclusive unit with only 1 room inventory for race testing',
    capacity: 2,
    pricePerNight: 200,
    totalInventory: 1, // EXACTLY 1 ROOM IN INVENTORY
    isActive: true,
  });

  const testInactiveRoom = await RoomType.create({
    name: `Test Inactive Room ${Date.now()}`,
    description: 'Room that is decommissioned',
    capacity: 2,
    pricePerNight: 150,
    totalInventory: 5,
    isActive: false, // Inactive
  });

  const createdReservationIds: Types.ObjectId[] = [];

  try {
    const today = new Date();
    const d1 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 10));
    const d2 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 13)); // 3 nights
    const dPast = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 2));

    const checkInStr = d1.toISOString().split('T')[0]!;
    const checkOutStr = d2.toISOString().split('T')[0]!;
    const pastCheckInStr = dPast.toISOString().split('T')[0]!;

    // 1. Availability Search - Valid
    console.log('\n[1. Testing Availability Search - Valid Dates]');
    const availRes = await makeRequest(
      server,
      `/api/availability/search?checkIn=${checkInStr}&checkOut=${checkOutStr}&guestCount=2`,
      'GET'
    );
    console.log(` - Search status: ${availRes.status} (Expected: 200)`);
    console.log(` - Nights calculated: ${availRes.data.dateRange?.nights} (Expected: 3)`);
    console.log(` - Available rooms count: ${availRes.data.count}`);
    if (availRes.status !== 200 || availRes.data.dateRange?.nights !== 3) {
      throw new Error('Valid availability search failed');
    }

    // 2. Availability Search - Past Date Rejection
    console.log('\n[2. Testing Past Date Rejection]');
    const pastRes = await makeRequest(
      server,
      `/api/availability/search?checkIn=${pastCheckInStr}&checkOut=${checkOutStr}`,
      'GET'
    );
    console.log(` - Past date rejection status: ${pastRes.status} (Expected: 400)`);
    console.log(` - Error message: "${pastRes.data.message}"`);
    if (pastRes.status !== 400) {
      throw new Error('Past check-in date was not rejected with 400');
    }

    // 3. Availability Search - CheckOut <= CheckIn Rejection
    console.log('\n[3. Testing Invalid Check-out Date]');
    const invalidDateRes = await makeRequest(
      server,
      `/api/availability/search?checkIn=${checkOutStr}&checkOut=${checkInStr}`,
      'GET'
    );
    console.log(` - Invalid date range status: ${invalidDateRes.status} (Expected: 400)`);
    if (invalidDateRes.status !== 400) {
      throw new Error('Check-out before check-in was not rejected with 400');
    }

    // 4. Inactive Room Filtering
    console.log('\n[4. Testing Inactive Room Exclusion from Search]');
    const inactiveFound = availRes.data.data?.some(
      (item: any) => item.roomType._id === testInactiveRoom._id.toString()
    );
    console.log(` - Inactive room excluded from search: ${!inactiveFound} (Expected: true)`);
    if (inactiveFound) {
      throw new Error('Inactive room was incorrectly returned in availability search');
    }

    // 5. Booking Creation - Inactive Room Rejection
    console.log('\n[5. Testing Booking Creation on Inactive Room]');
    const bookInactiveRes = await makeRequest(
      server,
      '/api/reservations',
      'POST',
      {
        roomTypeId: testInactiveRoom._id.toString(),
        checkIn: checkInStr,
        checkOut: checkOutStr,
        guestCount: 2,
        roomCount: 1,
      },
      guestToken
    );
    console.log(` - Inactive booking status: ${bookInactiveRes.status} (Expected: 404 Not Found)`);
    if (bookInactiveRes.status !== 404) {
      throw new Error('Booking on inactive room was not rejected');
    }

    // 6. Guest Capacity Validation
    console.log('\n[6. Testing Guest Capacity Validation]');
    const overCapacityRes = await makeRequest(
      server,
      '/api/reservations',
      'POST',
      {
        roomTypeId: testStandardRoom._id.toString(),
        checkIn: checkInStr,
        checkOut: checkOutStr,
        guestCount: 5, // Capacity is 2 * 1 room = 2!
        roomCount: 1,
      },
      guestToken
    );
    console.log(` - Over capacity status: ${overCapacityRes.status} (Expected: 400)`);
    console.log(` - Error message: "${overCapacityRes.data.message}"`);
    if (overCapacityRes.status !== 400) {
      throw new Error('Guest capacity violation was not rejected');
    }

    // 7. Successful Reservation & Server-Authoritative Price Calculation
    console.log('\n[7. Testing Successful Booking & Server Price Calculation]');
    const validBookingRes = await makeRequest(
      server,
      '/api/reservations',
      'POST',
      {
        roomTypeId: testStandardRoom._id.toString(),
        checkIn: checkInStr,
        checkOut: checkOutStr,
        guestCount: 2,
        roomCount: 1,
        totalAmount: 1.0, // Tampered price attempt
        pricePerNightSnapshot: 0.5, // Tampered price attempt
        specialRequests: 'High floor preferred',
      },
      guestToken
    );
    console.log(` - Booking status: ${validBookingRes.status} (Expected: 201)`);
    const booking1 = validBookingRes.data.data;
    createdReservationIds.push(new Types.ObjectId(booking1._id));

    // Expected: 3 nights * $100 * 1 room = $300
    console.log(` - Server total amount: $${booking1.totalAmount} (Expected: $300, Ignored tampered $1)`);
    console.log(` - Server price snapshot: $${booking1.pricePerNightSnapshot} (Expected: $100)`);
    console.log(` - Reservation Reference: ${booking1.reservationReference}`);
    console.log(` - Initial status: ${booking1.status} (Expected: Confirmed)`);
    if (validBookingRes.status !== 201 || booking1.totalAmount !== 300 || booking1.pricePerNightSnapshot !== 100) {
      throw new Error('Server-side price calculation failed or trusted frontend input');
    }

    // 8. Multiple Rooms in Single Booking
    console.log('\n[8. Testing Multiple Rooms in Single Booking]');
    const multiRoomRes = await makeRequest(
      server,
      '/api/reservations',
      'POST',
      {
        roomTypeId: testStandardRoom._id.toString(),
        checkIn: checkInStr,
        checkOut: checkOutStr,
        guestCount: 4, // 2 rooms * 2 capacity = 4 allowed
        roomCount: 2,
      },
      guestToken
    );
    console.log(` - Multi-room booking status: ${multiRoomRes.status} (Expected: 201)`);
    const bookingMulti = multiRoomRes.data.data;
    createdReservationIds.push(new Types.ObjectId(bookingMulti._id));
    // Expected: 3 nights * $100 * 2 rooms = $600
    console.log(` - Total for 2 rooms over 3 nights: $${bookingMulti.totalAmount} (Expected: $600)`);
    if (multiRoomRes.status !== 201 || bookingMulti.totalAmount !== 600) {
      throw new Error('Multiple rooms booking calculation failed');
    }

    // 9. Insufficient Inventory Rejection
    console.log('\n[9. Testing Insufficient Inventory Rejection]');
    // testStandardRoom totalInventory is 3. We booked 1 room + 2 rooms = 3 rooms booked.
    // Trying to book 1 more room on the exact same dates must fail with 409!
    const exhaustedRes = await makeRequest(
      server,
      '/api/reservations',
      'POST',
      {
        roomTypeId: testStandardRoom._id.toString(),
        checkIn: checkInStr,
        checkOut: checkOutStr,
        guestCount: 1,
        roomCount: 1,
      },
      guestToken
    );
    console.log(` - Sold-out booking status: ${exhaustedRes.status} (Expected: 409 Conflict)`);
    console.log(` - Error message: "${exhaustedRes.data.message}"`);
    if (exhaustedRes.status !== 409) {
      throw new Error('Booking against exhausted inventory was not rejected with 409 Conflict');
    }

    // 10. Non-Overlapping Dates Succeed
    console.log('\n[10. Testing Non-Overlapping Date Booking]');
    // Same room type, but for dates after d2 (e.g. d2 to d2 + 2 days)
    const d3 = new Date(Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), d2.getUTCDate() + 1));
    const d4 = new Date(Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), d2.getUTCDate() + 3));
    const nonOverlapRes = await makeRequest(
      server,
      '/api/reservations',
      'POST',
      {
        roomTypeId: testStandardRoom._id.toString(),
        checkIn: d3.toISOString().split('T')[0]!,
        checkOut: d4.toISOString().split('T')[0]!,
        guestCount: 2,
        roomCount: 1,
      },
      guestToken
    );
    console.log(` - Non-overlapping booking status: ${nonOverlapRes.status} (Expected: 201)`);
    if (nonOverlapRes.status !== 201) {
      throw new Error('Non-overlapping date booking failed');
    }
    createdReservationIds.push(new Types.ObjectId(nonOverlapRes.data.data._id));

    // 11. Guest Ownership & Isolation
    console.log('\n[11. Testing Guest Ownership Isolation]');
    const otherGuestAccessRes = await makeRequest(
      server,
      `/api/reservations/${booking1._id}`,
      'GET',
      undefined,
      otherGuestToken // Wrong guest!
    );
    console.log(` - Unauthorized guest access status: ${otherGuestAccessRes.status} (Expected: 403 Forbidden)`);
    if (otherGuestAccessRes.status !== 403) {
      throw new Error('Guest was able to access another guest reservation');
    }

    const staffAccessRes = await makeRequest(
      server,
      `/api/reservations/${booking1._id}`,
      'GET',
      undefined,
      staffToken // Staff should be allowed
    );
    console.log(` - Staff access status: ${staffAccessRes.status} (Expected: 200)`);
    if (staffAccessRes.status !== 200) {
      throw new Error('Staff was unable to access reservation');
    }

    // 12. Reservation History Pagination
    console.log('\n[12. Testing Reservation History Pagination (GET /api/reservations/my)]');
    const myHistoryRes = await makeRequest(
      server,
      '/api/reservations/my?page=1&limit=2&sortBy=createdAt&sortOrder=desc',
      'GET',
      undefined,
      guestToken
    );
    console.log(` - History status: ${myHistoryRes.status} (Expected: 200)`);
    console.log(` - Returned reservations on page 1: ${myHistoryRes.data.data?.length} (Limit: 2)`);
    console.log(` - Total count: ${myHistoryRes.data.pagination?.total}`);
    console.log(` - Total pages: ${myHistoryRes.data.pagination?.totalPages}`);
    if (myHistoryRes.status !== 200 || myHistoryRes.data.data?.length > 2) {
      throw new Error('History pagination failed');
    }

    // 13. Cancellation Eligibility & Inventory Restoration
    console.log('\n[13. Testing Cancellation Eligibility & Inventory Restoration]');
    const cancelRes = await makeRequest(
      server,
      `/api/reservations/${booking1._id}/cancel`,
      'PATCH',
      undefined,
      guestToken
    );
    console.log(` - Cancel status: ${cancelRes.status} (Expected: 200)`);
    console.log(` - Updated reservation status: ${cancelRes.data.data?.status} (Expected: Cancelled)`);
    if (cancelRes.status !== 200 || cancelRes.data.data?.status !== 'Cancelled') {
      throw new Error('Reservation cancellation failed');
    }

    // Attempting to cancel already cancelled reservation must fail with 400
    const cancelAgainRes = await makeRequest(
      server,
      `/api/reservations/${booking1._id}/cancel`,
      'PATCH',
      undefined,
      guestToken
    );
    console.log(` - Double cancel status: ${cancelAgainRes.status} (Expected: 400 Bad Request)`);
    if (cancelAgainRes.status !== 400) {
      throw new Error('Double cancellation was not rejected with 400');
    }

    // Now test inventory restoration: since 1 room was released, booking 1 room on d1-d2 should now SUCCEED!
    const rebookAfterCancelRes = await makeRequest(
      server,
      '/api/reservations',
      'POST',
      {
        roomTypeId: testStandardRoom._id.toString(),
        checkIn: checkInStr,
        checkOut: checkOutStr,
        guestCount: 1,
        roomCount: 1,
      },
      guestToken
    );
    console.log(` - Rebook after cancel status: ${rebookAfterCancelRes.status} (Expected: 201 Created)`);
    if (rebookAfterCancelRes.status !== 201) {
      throw new Error('Inventory was not restored after cancellation');
    }
    createdReservationIds.push(new Types.ObjectId(rebookAfterCancelRes.data.data._id));

    // 14. Status Lifecycle Transitions (Check-in, Check-out)
    console.log('\n[14. Testing Status Lifecycle Transitions]');
    const activeBooking = rebookAfterCancelRes.data.data;

    // Staff performs check-in
    const checkInRes = await makeRequest(
      server,
      `/api/reservations/${activeBooking._id}/status`,
      'PATCH',
      { status: 'Checked-in' },
      staffToken
    );
    console.log(` - Staff check-in status: ${checkInRes.status} (Expected: 200)`);
    console.log(` - New status: ${checkInRes.data.data?.status} (Expected: Checked-in)`);
    if (checkInRes.status !== 200 || checkInRes.data.data?.status !== 'Checked-in') {
      throw new Error('Check-in status transition failed');
    }

    // Attempting to cancel a Checked-in reservation must be rejected!
    const cancelCheckedInRes = await makeRequest(
      server,
      `/api/reservations/${activeBooking._id}/cancel`,
      'PATCH',
      undefined,
      guestToken
    );
    console.log(` - Cancel checked-in status: ${cancelCheckedInRes.status} (Expected: 400 Bad Request)`);
    if (cancelCheckedInRes.status !== 400) {
      throw new Error('Cancelling a checked-in reservation was not rejected');
    }

    // Staff performs check-out
    const checkOutRes = await makeRequest(
      server,
      `/api/reservations/${activeBooking._id}/status`,
      'PATCH',
      { status: 'Checked-out' },
      staffToken
    );
    console.log(` - Staff check-out status: ${checkOutRes.status} (Expected: 200)`);
    console.log(` - New status: ${checkOutRes.data.data?.status} (Expected: Checked-out)`);
    if (checkOutRes.status !== 200 || checkOutRes.data.data?.status !== 'Checked-out') {
      throw new Error('Check-out status transition failed');
    }

    // Attempting an illegal transition from terminal state Checked-out -> Confirmed
    const illegalTransitionRes = await makeRequest(
      server,
      `/api/reservations/${activeBooking._id}/status`,
      'PATCH',
      { status: 'Confirmed' },
      staffToken
    );
    console.log(` - Illegal transition from terminal state status: ${illegalTransitionRes.status} (Expected: 400)`);
    if (illegalTransitionRes.status !== 400) {
      throw new Error('Illegal transition from Checked-out was not rejected');
    }

    // =========================================================================
    // 15. CRITICAL CONCURRENCY TEST
    // =========================================================================
    console.log('\n=============================================================');
    console.log('[15. CRITICAL CONCURRENCY TEST: 5 Competitors for 1 Last Room]');
    console.log('=============================================================');
    console.log(`Target Room: "${testSingleUnitRoom.name}" | Total Inventory: 1`);

    const raceCheckIn = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 20));
    const raceCheckOut = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 22));
    const raceCheckInStr = raceCheckIn.toISOString().split('T')[0]!;
    const raceCheckOutStr = raceCheckOut.toISOString().split('T')[0]!;

    const CONCURRENT_REQUESTS = 5;
    console.log(`Firing ${CONCURRENT_REQUESTS} simultaneous booking requests...`);

    const racePromises = Array.from({ length: CONCURRENT_REQUESTS }, (_, idx) => {
      return makeRequest(
        server,
        '/api/reservations',
        'POST',
        {
          roomTypeId: testSingleUnitRoom._id.toString(),
          checkIn: raceCheckInStr,
          checkOut: raceCheckOutStr,
          guestCount: 2,
          roomCount: 1,
          specialRequests: `Competitor #${idx + 1}`,
        },
        guestToken
      );
    });

    const raceResults = await Promise.all(racePromises);

    const successfulBookings = raceResults.filter((r) => r.status === 201);
    const conflictBookings = raceResults.filter((r) => r.status === 409);
    const otherErrors = raceResults.filter((r) => r.status !== 201 && r.status !== 409);

    console.log(` - Total Requests Sent: ${CONCURRENT_REQUESTS}`);
    console.log(` - Successful (HTTP 201 Created): ${successfulBookings.length} (Expected: EXACTLY 1)`);
    console.log(` - Conflicts (HTTP 409 Sold Out): ${conflictBookings.length} (Expected: EXACTLY ${CONCURRENT_REQUESTS - 1})`);
    console.log(` - Unexpected Errors: ${otherErrors.length} (Expected: 0)`);

    if (successfulBookings.length !== 1 || conflictBookings.length !== CONCURRENT_REQUESTS - 1 || otherErrors.length > 0) {
      console.error('Race Results Details:', raceResults.map((r) => ({ status: r.status, msg: r.data?.message })));
      throw new Error(`Concurrency test failed! Expected 1 winner and ${CONCURRENT_REQUESTS - 1} conflicts.`);
    }

    // Direct database validation
    const dbReservations = await Reservation.find({
      roomTypeId: testSingleUnitRoom._id,
      status: { $in: ['Confirmed', 'Checked-in'] },
      checkIn: { $lt: raceCheckOut },
      checkOut: { $gt: raceCheckIn },
    });
    console.log(` - Direct Database Reservation Count: ${dbReservations.length} (Must be exactly 1)`);
    if (dbReservations.length !== 1) {
      throw new Error(`Data corruption / Overbooking detected! Found ${dbReservations.length} active reservations.`);
    }

    createdReservationIds.push(new Types.ObjectId(dbReservations[0]!._id));

    // Verify search endpoint reflects 0 rooms available
    const raceAvailRes = await makeRequest(
      server,
      `/api/availability/search?checkIn=${raceCheckInStr}&checkOut=${raceCheckOutStr}`,
      'GET'
    );
    const singleUnitAvailable = raceAvailRes.data.data?.find(
      (item: any) => item.roomType._id === testSingleUnitRoom._id.toString()
    );
    console.log(` - Availability search after race returns unit: ${!!singleUnitAvailable} (Expected: false / sold out)`);
    if (singleUnitAvailable) {
      throw new Error('Sold out room was still returned as available in search!');
    }

    console.log('\n=============================================================');
    console.log('=== CONCURRENCY TEST PASSED: 100% Zero-Overbooking Guarantee ===');
    console.log('=============================================================\n');

    // 16. Simulated Unit Test for commitWithRetry and inTransaction Guard
    console.log('[16. Testing commitWithRetry & inTransaction Abort Guard]');
    const testSession = await mongoose.startSession();
    testSession.startTransaction();

    let commitCalls = 0;
    const originalCommit = testSession.commitTransaction.bind(testSession);
    testSession.commitTransaction = async function () {
      commitCalls++;
      if (commitCalls === 1) {
        const simulatedError: any = new Error('Simulated transient commit network loss');
        simulatedError.errorLabels = ['UnknownTransactionCommitResult'];
        simulatedError.hasErrorLabel = (label: string) => label === 'UnknownTransactionCommitResult';
        throw simulatedError;
      }
      return originalCommit();
    };

    await commitWithRetry(testSession);
    console.log(` - commitWithRetry retried upon UnknownTransactionCommitResult: ${commitCalls === 2} (Calls: ${commitCalls})`);
    if (commitCalls !== 2) {
      throw new Error('commitWithRetry did not retry on simulated UnknownTransactionCommitResult');
    }

    const inTxAfterCommit = testSession.inTransaction();
    console.log(` - session.inTransaction() after commit: ${inTxAfterCommit} (Expected: false)`);
    if (inTxAfterCommit) {
      throw new Error('session.inTransaction() returned true after commit');
    }
    await testSession.endSession();
    console.log(' - inTransaction guard & commit retry simulated verification passed successfully!\n');

    console.log('All 16 automated test suites executed and passed successfully!');
  } finally {
    // Clean up all test data from Atlas
    console.log('\n[Cleaning up ephemeral test records from Atlas]');
    if (createdReservationIds.length > 0) {
      await Reservation.deleteMany({ _id: { $in: createdReservationIds } });
    }
    await RoomType.deleteMany({
      _id: { $in: [testStandardRoom._id, testSingleUnitRoom._id, testInactiveRoom._id] },
    });
    await User.deleteOne({ email: 'otherguest@hotel.com' });
    console.log('Cleanup finished.');

    server.close();
    await mongoose.connection.close();
  }
};

runStage4Verification().catch((err) => {
  console.error('\nStage 4 verification failed with error:', err);
  process.exit(1);
});

