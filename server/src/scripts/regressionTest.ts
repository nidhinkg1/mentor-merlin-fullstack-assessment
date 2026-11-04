import http from 'http';
import mongoose, { Types } from 'mongoose';
import { createApp } from '../app.js';
import { connectDatabase } from '../config/db.js';
import { User, RoomType, Reservation } from '../models/index.js';
import { generateToken } from '../utils/auth.js';
import { validateConfig, AppConfig } from '../config/env.js';

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

const record = (suite: string, test: string, passed: boolean, details?: string) => {
  results.push({ suite, test, passed, details });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] [${suite}] ${test} ${details ? `-> ${details}` : ''}`);
  if (!passed) {
    console.error(`Assertion failed for: ${test}`);
  }
};

const makeRequest = (
  app: http.Server,
  path: string,
  method: string,
  body?: any,
  token?: string
): Promise<{ status: number; headers: http.IncomingHttpHeaders; data: any }> => {
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
          resolve({ status: res.statusCode || 500, headers: res.headers, data: parsedData });
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

const runRegressionSuite = async () => {
  console.log('================================================================');
  console.log('=== Stage 6: Production Hardening Regression & Safety Suite  ===');
  console.log('================================================================\n');

  await connectDatabase();
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  console.log(`Ephemeral test server running on port: ${address.port}\n`);

  // Ephemeral test record tracker for 100% clean teardown
  const createdReservationIds: Types.ObjectId[] = [];
  let testRoomId: Types.ObjectId | null = null;
  let testGuestUserId: Types.ObjectId | null = null;

  try {
    // 1. Retrieve seeded demo accounts
    const guestUser = await User.findOne({ email: 'guest@hotel.com' });
    const staffUser = await User.findOne({ email: 'staff@hotel.com' });
    const adminUser = await User.findOne({ email: 'admin@hotel.com' });

    if (!guestUser || !staffUser || !adminUser) {
      throw new Error('Seeded demo accounts missing from Atlas database.');
    }

    const guestToken = generateToken({ userId: guestUser._id.toString(), role: guestUser.role });
    const staffToken = generateToken({ userId: staffUser._id.toString(), role: staffUser.role });
    generateToken({ userId: adminUser._id.toString(), role: adminUser.role });

    // ==========================================
    // SUITE 1: ISS-03 - Helmet Security Headers
    // ==========================================
    console.log('\n--- 1. Testing ISS-03: Helmet Security Headers ---');
    const healthRes = await makeRequest(server, '/api/health', 'GET');
    record('ISS-03 Helmet', 'X-Content-Type-Options: nosniff header present', healthRes.headers['x-content-type-options'] === 'nosniff');
    record('ISS-03 Helmet', 'Content-Security-Policy header present', typeof healthRes.headers['content-security-policy'] === 'string' && healthRes.headers['content-security-policy'].includes('default-src'));
    record('ISS-03 Helmet', 'X-Frame-Options header present', healthRes.headers['x-frame-options'] === 'SAMEORIGIN');

    // ==========================================
    // SUITE 2: ISS-02 - Rate Limiting Headers
    // ==========================================
    console.log('\n--- 2. Testing ISS-02: Rate Limiting Middleware ---');
    const authHeadersRes = await makeRequest(server, '/api/auth/login', 'POST', { email: 'bad@hotel.com', password: 'wrong' });
    record('ISS-02 Rate Limiting', 'ratelimit-limit header exists on auth routes', authHeadersRes.headers['ratelimit-limit'] !== undefined, `limit: ${authHeadersRes.headers['ratelimit-limit']}`);
    record('ISS-02 Rate Limiting', 'ratelimit-remaining header exists on auth routes', authHeadersRes.headers['ratelimit-remaining'] !== undefined, `remaining: ${authHeadersRes.headers['ratelimit-remaining']}`);

    // ==========================================
    // SUITE 3: ISS-04 - Max Stay Validation
    // ==========================================
    console.log('\n--- 3. Testing ISS-04: Maximum Stay Duration Constraint ---');
    // 35 nights stay (violates 30 nights limit)
    const longStayRes = await makeRequest(
      server,
      '/api/availability/search?checkIn=2026-11-05&checkOut=2026-12-15&guestCount=2&roomCount=1',
      'GET'
    );
    record(
      'ISS-04 Max Stay',
      'Rejects stay exceeding 30 nights with HTTP 400',
      longStayRes.status === 400 && longStayRes.data.message?.includes('cannot exceed the maximum allowed duration of 30 nights'),
      longStayRes.data.message
    );

    // 4 nights stay (valid)
    const validStayRes = await makeRequest(
      server,
      '/api/availability/search?checkIn=2026-11-05&checkOut=2026-11-09&guestCount=2&roomCount=1',
      'GET'
    );
    record('ISS-04 Max Stay', 'Permits valid stay within 30 nights with HTTP 200', validStayRes.status === 200);

    // ==========================================
    // SUITE 4: ISS-06 - Production Environment Validation
    // ==========================================
    console.log('\n--- 4. Testing ISS-06: Production Environment Startup Guard ---');
    let productionConfigErrorThrown = false;
    try {
      const mockProdConfig: AppConfig = {
        port: 5000,
        nodeEnv: 'production',
        mongoUri: 'mongodb://localhost:27017/prod',
        clientOrigin: 'https://hotel.com',
        jwtSecret: 'fallback_development_secret_do_not_use_in_prod', // INSECURE FALLBACK
        jwtExpiresIn: '7d',
      };
      validateConfig(mockProdConfig);
    } catch (err: any) {
      productionConfigErrorThrown = err.message?.includes('[FATAL CONFIGURATION ERROR]');
    }
    record('ISS-06 Startup Guard', 'Fails fast when fallback JWT secret is used in production', productionConfigErrorThrown);

    // ==========================================
    // SUITE 5: ISS-01 - Staff Controller Search + Date Filter Combination
    // ==========================================
    console.log('\n--- 5. Testing ISS-01: Staff Search & Date Filter Combination ---');
    // Both date AND search query passed simultaneously
    const combinedFilterRes = await makeRequest(
      server,
      '/api/staff/reservations?date=2026-11-03&search=Demo',
      'GET',
      undefined,
      staffToken
    );
    record('ISS-01 Combined Query', 'Staff reservations query with date + search returns HTTP 200', combinedFilterRes.status === 200);
    record('ISS-01 Combined Query', 'Reservations data structure returned as array', Array.isArray(combinedFilterRes.data.data));

    // Regex special character sanitization test
    const regexSafeRes = await makeRequest(
      server,
      '/api/staff/reservations?search=test[.*+?^${}()',
      'GET',
      undefined,
      staffToken
    );
    record('ISS-01 Regex Sanitization', 'Special regex characters do not crash query', regexSafeRes.status === 200);

    // ==========================================
    // SUITE 6: RBAC & Security Boundary Verification
    // ==========================================
    console.log('\n--- 6. Testing RBAC & Role Boundaries ---');
    const guestAccessStaffKpi = await makeRequest(server, '/api/staff/dashboard/stats', 'GET', undefined, guestToken);
    record('RBAC', 'Guest blocked from Staff Dashboard KPIs with HTTP 403', guestAccessStaffKpi.status === 403);

    const staffAccessStaffKpi = await makeRequest(server, '/api/staff/dashboard/stats', 'GET', undefined, staffToken);
    record('RBAC', 'Staff authorized for Staff Dashboard KPIs with HTTP 200', staffAccessStaffKpi.status === 200);

    const guestAccessRoomsCreate = await makeRequest(server, '/api/rooms', 'POST', { name: 'Unauthorized' }, guestToken);
    record('RBAC', 'Guest blocked from Room Creation with HTTP 403', guestAccessRoomsCreate.status === 403);

    // ==========================================
    // SUITE 7: End-to-End Isolated Concurrency Race (5 Clients, 1 Unit)
    // ==========================================
    console.log('\n--- 7. Testing 5-Client Concurrent Booking Race on Ephemeral Unit ---');
    // Create an isolated room type with strictly 1 unit inventory
    const isolatedRoom = await RoomType.create({
      name: `Regression Race Suite ${Date.now()}`,
      description: 'Ephemeral test suite with 1 inventory unit',
      capacity: 2,
      pricePerNight: 250,
      totalInventory: 1, // EXACTLY 1 UNIT
      isActive: true,
    });
    testRoomId = isolatedRoom._id;

    // Create isolated test guest user for booking
    const testGuest = await User.create({
      name: 'Regression Test Guest',
      email: `testguest_${Date.now()}@hotel.com`,
      passwordHash: 'dummyhash123',
      role: 'guest',
    });
    testGuestUserId = testGuest._id;
    const testGuestToken = generateToken({ userId: testGuest._id.toString(), role: testGuest.role });

    const raceCheckIn = '2026-11-20';
    const raceCheckOut = '2026-11-22';

    // Fire 5 simultaneous concurrent booking requests
    console.log(' - Launching 5 concurrent booking attempts for the same 1-unit room...');
    const concurrentAttempts = [1, 2, 3, 4, 5].map((clientIndex) =>
      makeRequest(
        server,
        '/api/reservations',
        'POST',
        {
          roomTypeId: isolatedRoom._id.toString(),
          checkIn: raceCheckIn,
          checkOut: raceCheckOut,
          guestCount: 2,
          roomCount: 1,
          specialRequests: `Client ${clientIndex} race request`,
        },
        testGuestToken
      )
    );

    const raceResults = await Promise.all(concurrentAttempts);
    console.log(' - Detailed Race Statuses:', raceResults.map((r) => `${r.status} (${r.data?.message || ''})`));
    const winners = raceResults.filter((r) => r.status === 201);
    const conflicts = raceResults.filter((r) => r.status === 409);

    console.log(` - Race Outcome: ${winners.length} Winner(s) (HTTP 201), ${conflicts.length} Conflict(s) (HTTP 409)`);

    record('Concurrency Safety', 'Exactly 1 concurrent request wins (HTTP 201)', winners.length === 1);
    record('Concurrency Safety', 'Remaining 4 concurrent requests safely rejected (HTTP 409)', conflicts.length === 4);

    const winningItem = winners[0];
    if (winningItem && winningItem.data && winningItem.data.data && winningItem.data.data._id) {
      const winnerResData = winningItem.data.data;
      createdReservationIds.push(new Types.ObjectId(winnerResData._id as string));
      record('Pricing Integrity', 'Server correctly locked price ($250 * 2 nights = $500)', winnerResData.totalAmount === 500);

      // Verify availability is now 0 (sold out)
      const afterRaceAvail = await makeRequest(
        server,
        `/api/availability/search?checkIn=${raceCheckIn}&checkOut=${raceCheckOut}&guestCount=2&roomCount=1`,
        'GET'
      );
      const isSoldOut = !afterRaceAvail.data?.data?.some((r: any) => r.roomType?._id === isolatedRoom._id.toString());
      record('Inventory Consistency', 'Target room type is now reported as Sold Out', isSoldOut);

      // ==========================================
      // SUITE 8: Cancellation & Inventory Restoration
      // ==========================================
      console.log('\n--- 8. Testing Cancellation & Inventory Release ---');
      const cancelRes = await makeRequest(
        server,
        `/api/reservations/${winnerResData._id}/cancel`,
        'PATCH',
        undefined,
        testGuestToken
      );
      record('Cancellation', 'Guest can cancel own confirmed reservation with HTTP 200', cancelRes.status === 200);

      // Verify inventory is released
      const afterCancelAvail = await makeRequest(
        server,
        `/api/availability/search?checkIn=${raceCheckIn}&checkOut=${raceCheckOut}&guestCount=2&roomCount=1`,
        'GET'
      );
      const restored = !!afterCancelAvail.data?.data?.some((r: any) => r.roomType?._id === isolatedRoom._id.toString());
      record('Inventory Release', 'Cancelled room inventory is restored to availability search', restored);
    }
  } finally {
    // Teardown: Clean up ONLY the ephemeral regression test records
    console.log('\n--- Cleaning up isolated ephemeral regression records ---');
    if (createdReservationIds.length > 0) {
      await Reservation.deleteMany({ _id: { $in: createdReservationIds } });
    }
    if (testRoomId) {
      await RoomType.deleteOne({ _id: testRoomId });
    }
    if (testGuestUserId) {
      await User.deleteOne({ _id: testGuestUserId });
    }
    console.log('Teardown complete. All seeded Atlas data intact.\n');

    server.close();
    await mongoose.connection.close();
  }

  // Summary
  console.log('================================================================');
  console.log('=== REGRESSION TEST EXECUTION SUMMARY                        ===');
  console.log('================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`Total Checks Executed : ${total}`);
  console.log(`Passed Checks         : ${passed}`);
  console.log(`Failed Checks         : ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runRegressionSuite().catch((err) => {
  console.error('Regression suite failed with error:', err);
  process.exit(1);
});
