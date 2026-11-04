import http from 'http';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDatabase } from '../config/db.js';
import { User, RoomType, Reservation } from '../models/index.js';
import { generateToken } from '../utils/auth.js';
import { normalizeToMidnightUtc } from '../utils/dateUtils.js';

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

const runStage5Verification = async () => {
  console.log('='.repeat(80));
  console.log('MENTOR MERLIN - STAGE 5 AUTOMATED VERIFICATION');
  console.log('STAFF FRONT DESK & OPERATIONS DASHBOARD SUITE');
  console.log('='.repeat(80));

  let server: http.Server | null = null;
  const testReservationIds: mongoose.Types.ObjectId[] = [];
  let testRoomTypeId: mongoose.Types.ObjectId | null = null;
  let testGuestUserId: mongoose.Types.ObjectId | null = null;

  try {
    // 1. Connect to MongoDB Atlas
    console.log('\n[1/7] Connecting to MongoDB Atlas database...');
    await connectDatabase();
    console.log('✓ Successfully connected to MongoDB Atlas');

    // 2. Start ephemeral HTTP server
    console.log('\n[2/7] Initializing Express Application on Ephemeral Port...');
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server!.listen(0, () => {
        const addr = server!.address() as { port: number };
        console.log(`✓ Test HTTP server listening on port ${addr.port}`);
        resolve();
      });
    });

    // 3. Locate baseline users
    console.log('\n[3/7] Verifying Baseline Staff, Admin, and Guest Accounts...');
    const staffUser = await User.findOne({ email: 'staff@hotel.com' });
    const adminUser = await User.findOne({ email: 'admin@hotel.com' });
    const guestUser = await User.findOne({ email: 'guest@hotel.com' });

    if (!staffUser || !adminUser || !guestUser) {
      throw new Error('Required seed users (staff, admin, guest) not found in database.');
    }

    const staffToken = generateToken({
      userId: staffUser._id.toString(),
      role: staffUser.role,
    });

    const adminToken = generateToken({
      userId: adminUser._id.toString(),
      role: adminUser.role,
    });

    const guestToken = generateToken({
      userId: guestUser._id.toString(),
      role: guestUser.role,
    });

    console.log(`✓ Staff User: ${staffUser.email} (Role: ${staffUser.role})`);
    console.log(`✓ Admin User: ${adminUser.email} (Role: ${adminUser.role})`);
    console.log(`✓ Guest User: ${guestUser.email} (Role: ${guestUser.role})`);

    // 4. Test RBAC Protection on all Staff Endpoints
    console.log('\n[4/7] Testing Staff & Admin RBAC Authorization Security...');

    const staffEndpoints = [
      { path: '/api/staff/dashboard/stats', method: 'GET' },
      { path: '/api/staff/arrivals', method: 'GET' },
      { path: '/api/staff/departures', method: 'GET' },
      { path: '/api/staff/reservations', method: 'GET' },
    ];

    for (const ep of staffEndpoints) {
      // Test unauthenticated access (401)
      const noAuthRes = await makeRequest(server!, ep.path, ep.method);
      if (noAuthRes.status !== 401) {
        throw new Error(`Expected 401 for unauthenticated ${ep.method} ${ep.path}, got ${noAuthRes.status}`);
      }

      // Test guest access (403 Forbidden)
      const guestRes = await makeRequest(server!, ep.path, ep.method, undefined, guestToken);
      if (guestRes.status !== 403) {
        throw new Error(`Expected 403 for guest access to ${ep.method} ${ep.path}, got ${guestRes.status}`);
      }

      // Test staff access (200 OK)
      const staffRes = await makeRequest(server!, ep.path, ep.method, undefined, staffToken);
      if (staffRes.status !== 200) {
        throw new Error(`Expected 200 for staff access to ${ep.method} ${ep.path}, got ${staffRes.status}`);
      }

      // Test admin access (200 OK)
      const adminRes = await makeRequest(server!, ep.path, ep.method, undefined, adminToken);
      if (adminRes.status !== 200) {
        throw new Error(`Expected 200 for admin access to ${ep.method} ${ep.path}, got ${adminRes.status}`);
      }

      console.log(`  ✓ ${ep.path}: 401 unauth, 403 guest blocked, 200 staff allowed, 200 admin allowed`);
    }

    // 5. Setup Controlled Test Dataset for Operations Dashboard
    console.log('\n[5/7] Seeding Isolated Test Dataset for Accurate KPI & Operations Audit...');

    // Create a temporary isolated RoomType
    const testRoomType = await RoomType.create({
      name: `Stage 5 Test Penthouse Suite ${Date.now()}`,
      description: 'Temporary room type for automated Stage 5 dashboard verification.',
      pricePerNight: 500,
      capacity: 4,
      totalInventory: 10,
      amenities: ['King Bed', 'Balcony', 'City View'],
      isActive: true,
    });
    testRoomTypeId = testRoomType._id;
    console.log(`✓ Created test room type: "${testRoomType.name}" (Inventory: 10)`);

    // Create a temporary guest user
    const testGuest = await User.create({
      name: 'Stage5 Test Guest',
      email: `stage5.guest.${Date.now()}@example.com`,
      passwordHash: 'hashed_password_for_test',
      role: 'guest',
    });
    testGuestUserId = testGuest._id;
    console.log(`✓ Created test guest: "${testGuest.name}" (${testGuest.email})`);

    // Define dates based on UTC midnight
    const today = normalizeToMidnightUtc(new Date());
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);
    const inFiveDays = new Date(today);
    inFiveDays.setUTCDate(inFiveDays.getUTCDate() + 5);
    const inSevenDays = new Date(today);
    inSevenDays.setUTCDate(inSevenDays.getUTCDate() + 7);

    // Reservation A: Today's Arrival (CheckIn: Today, CheckOut: Tomorrow, roomCount: 2, status: 'Confirmed')
    const resA = await Reservation.create({
      reservationReference: `MM-S5A-${Date.now()}`,
      guestId: testGuestUserId,
      roomTypeId: testRoomTypeId,
      checkIn: today,
      checkOut: tomorrow,
      roomCount: 2,
      guestCount: 3,
      pricePerNightSnapshot: 500,
      totalAmount: 1000,
      status: 'Confirmed',
    });
    testReservationIds.push(resA._id);

    // Reservation B: Today's Departure & Currently Occupied (CheckIn: Yesterday, CheckOut: Today, roomCount: 3, status: 'Checked-in')
    const resB = await Reservation.create({
      reservationReference: `MM-S5B-${Date.now()}`,
      guestId: testGuestUserId,
      roomTypeId: testRoomTypeId,
      checkIn: yesterday,
      checkOut: today,
      roomCount: 3,
      guestCount: 4,
      pricePerNightSnapshot: 500,
      totalAmount: 1500,
      status: 'Checked-in',
    });
    testReservationIds.push(resB._id);

    // Reservation C: Today's Departure already completed (CheckIn: 2 days ago, CheckOut: Today, roomCount: 1, status: 'Checked-out')
    const resC = await Reservation.create({
      reservationReference: `MM-S5C-${Date.now()}`,
      guestId: testGuestUserId,
      roomTypeId: testRoomTypeId,
      checkIn: twoDaysAgo,
      checkOut: today,
      roomCount: 1,
      guestCount: 2,
      pricePerNightSnapshot: 500,
      totalAmount: 1000,
      status: 'Checked-out',
    });
    testReservationIds.push(resC._id);

    // Reservation D: Past Cancelled (CheckIn: 2 days ago, CheckOut: Yesterday, roomCount: 2, status: 'Cancelled')
    const resD = await Reservation.create({
      reservationReference: `MM-S5D-${Date.now()}`,
      guestId: testGuestUserId,
      roomTypeId: testRoomTypeId,
      checkIn: twoDaysAgo,
      checkOut: yesterday,
      roomCount: 2,
      guestCount: 2,
      pricePerNightSnapshot: 500,
      totalAmount: 1000,
      status: 'Cancelled',
    });
    testReservationIds.push(resD._id);

    // Reservation E: Future Booking (CheckIn: in 5 days, CheckOut: in 7 days, roomCount: 1, status: 'Confirmed')
    const resE = await Reservation.create({
      reservationReference: `MM-S5E-${Date.now()}`,
      guestId: testGuestUserId,
      roomTypeId: testRoomTypeId,
      checkIn: inFiveDays,
      checkOut: inSevenDays,
      roomCount: 1,
      guestCount: 2,
      pricePerNightSnapshot: 500,
      totalAmount: 1000,
      status: 'Confirmed',
    });
    testReservationIds.push(resE._id);

    console.log(`✓ Seeded 5 test reservations covering all lifecycle states and arrivals/departures:`);
    console.log(`  - Res A (${resA.reservationReference}): Check-in Today (2 rooms, Confirmed -> Today's Arrival)`);
    console.log(`  - Res B (${resB.reservationReference}): Check-out Today (3 rooms, Checked-in -> Occupied & Today's Departure)`);
    console.log(`  - Res C (${resC.reservationReference}): Check-out Today (1 room, Checked-out -> Departed)`);
    console.log(`  - Res D (${resD.reservationReference}): Past (2 rooms, Cancelled)`);
    console.log(`  - Res E (${resE.reservationReference}): Future (1 room, Confirmed)`);

    // 6. Test Dashboard KPI Calculations
    console.log('\n[6/7] Verifying Real-Time Dashboard KPI Metrics & Calculations...');
    const statsRes = await makeRequest(server!, '/api/staff/dashboard/stats', 'GET', undefined, staffToken);
    if (statsRes.status !== 200 || !statsRes.data?.data) {
      throw new Error(`Failed to fetch dashboard stats: HTTP ${statsRes.status}`);
    }

    const stats = statsRes.data.data;
    console.log('✓ Received Dashboard KPI Stats:');
    console.log(`  - Total Room Inventory: ${stats.totalRoomInventory}`);
    console.log(`  - Currently Occupied Rooms: ${stats.occupiedRooms}`);
    console.log(`  - Available Rooms: ${stats.availableRooms}`);
    console.log(`  - Occupancy Rate: ${stats.occupancyRate}%`);
    console.log(`  - Today's Arrivals Count: ${stats.todayArrivalsCount}`);
    console.log(`  - Today's Departures Count: ${stats.todayDeparturesCount}`);

    if (typeof stats.todayArrivalsCount !== 'number' || stats.todayArrivalsCount < 1) {
      throw new Error(`Expected todayArrivalsCount >= 1, got ${stats.todayArrivalsCount}`);
    }
    if (typeof stats.todayDeparturesCount !== 'number' || stats.todayDeparturesCount < 2) {
      throw new Error(`Expected todayDeparturesCount >= 2, got ${stats.todayDeparturesCount}`);
    }

    // Verify Inventory Consistency: availableRooms = totalRoomInventory - occupiedRooms
    if (stats.availableRooms !== stats.totalRoomInventory - stats.occupiedRooms) {
      throw new Error(
        `KPI math discrepancy: availableRooms (${stats.availableRooms}) != total (${stats.totalRoomInventory}) - occupied (${stats.occupiedRooms})`
      );
    }
    console.log('✓ Verified: availableRooms = totalRoomInventory - occupiedRooms');

    // Verify Occupancy Percentage
    const expectedRate = Number(((stats.occupiedRooms / stats.totalRoomInventory) * 100).toFixed(1));
    if (stats.occupancyRate !== expectedRate) {
      throw new Error(`Occupancy rate mismatch: got ${stats.occupancyRate}%, expected ${expectedRate}%`);
    }
    console.log(`✓ Verified: occupancyRate correctly matches formula: ${stats.occupancyRate}%`);

    // Verify that occupied rooms count includes Reservation B's 3 rooms (room count, NOT reservation count!)
    if (stats.occupiedRooms < 3) {
      throw new Error(`Expected at least 3 occupied rooms from test reservation B, got ${stats.occupiedRooms}`);
    }
    console.log('✓ Verified: occupancy is correctly calculated based on total room units, not document count.');

    // 7. Test Arrivals & Departures Endpoints
    console.log('\n[7/7] Testing Front Desk Arrivals, Departures, Pagination & Transitions...');

    // A. Arrivals Endpoint
    const arrivalsRes = await makeRequest(server!, '/api/staff/arrivals', 'GET', undefined, staffToken);
    if (arrivalsRes.status !== 200 || !Array.isArray(arrivalsRes.data?.data)) {
      throw new Error(`Failed to fetch arrivals: HTTP ${arrivalsRes.status}`);
    }
    const arrivalRefs = arrivalsRes.data.data.map((r: any) => r.reservationReference);
    if (!arrivalRefs.includes(resA.reservationReference)) {
      throw new Error(`Reservation A (${resA.reservationReference}) not found in today's arrivals list`);
    }
    console.log(`✓ Arrivals list returned ${arrivalsRes.data.data.length} reservation(s); includes ${resA.reservationReference}`);

    // B. Departures Endpoint
    const departuresRes = await makeRequest(server!, '/api/staff/departures', 'GET', undefined, staffToken);
    if (departuresRes.status !== 200 || !Array.isArray(departuresRes.data?.data)) {
      throw new Error(`Failed to fetch departures: HTTP ${departuresRes.status}`);
    }
    const departureRefs = departuresRes.data.data.map((r: any) => r.reservationReference);
    if (!departureRefs.includes(resB.reservationReference) || !departureRefs.includes(resC.reservationReference)) {
      throw new Error(`Expected departures to include Res B and Res C, got: ${departureRefs.join(', ')}`);
    }
    console.log(`✓ Departures list returned ${departuresRes.data.data.length} reservation(s); includes ${resB.reservationReference} and ${resC.reservationReference}`);

    // C. Paginated Front Desk Reservations Search & Filter
    // 1. Search by guest name
    const searchRes = await makeRequest(
      server!,
      `/api/staff/reservations?search=Stage5&page=1&limit=10`,
      'GET',
      undefined,
      staffToken
    );
    if (searchRes.status !== 200 || !searchRes.data?.pagination) {
      throw new Error(`Search request failed: HTTP ${searchRes.status}`);
    }
    if (searchRes.data.pagination.total !== 5) {
      throw new Error(`Expected 5 search results for 'Stage5', got ${searchRes.data.pagination.total}`);
    }
    console.log(`✓ Search by guest name: correctly found all 5 test reservations (Page 1 of ${searchRes.data.pagination.totalPages})`);

    // 2. Filter by status 'Checked-in'
    const filterRes = await makeRequest(
      server!,
      `/api/staff/reservations?search=Stage5&status=Checked-in`,
      'GET',
      undefined,
      staffToken
    );
    if (filterRes.status !== 200 || filterRes.data.pagination.total !== 1) {
      throw new Error(`Expected 1 filtered result for status=Checked-in, got ${filterRes.data.pagination?.total}`);
    }
    if (filterRes.data.data[0].reservationReference !== resB.reservationReference) {
      throw new Error(`Filter result mismatch: expected ${resB.reservationReference}, got ${filterRes.data.data[0].reservationReference}`);
    }
    console.log(`✓ Status filtering: correctly filtered exclusively 'Checked-in' reservation (${resB.reservationReference})`);

    // D. Front Desk Status Transitions & KPI Reactivity
    console.log('\nTesting Front Desk Lifecycle Status Transitions & Live KPI Updates:');
    const initialOccupied = stats.occupiedRooms;

    // Transition Res A: Confirmed -> Checked-in
    console.log(`- Performing Check-in for Res A (${resA.reservationReference}, 2 rooms)...`);
    const checkInRes = await makeRequest(
      server!,
      `/api/staff/reservations/${resA._id}/status`,
      'PATCH',
      { status: 'Checked-in' },
      staffToken
    );
    if (checkInRes.status !== 200 || checkInRes.data?.data?.status !== 'Checked-in') {
      throw new Error(`Check-in transition failed: HTTP ${checkInRes.status}`);
    }
    console.log(`  ✓ Res A status updated to 'Checked-in' successfully`);

    // Check KPI update: occupiedRooms should increase by 2
    const statsAfterCheckIn = await makeRequest(server!, '/api/staff/dashboard/stats', 'GET', undefined, staffToken);
    const newOccupied = statsAfterCheckIn.data.data.occupiedRooms;
    if (newOccupied !== initialOccupied + 2) {
      throw new Error(`Occupied rooms did not increase by 2. Before: ${initialOccupied}, After: ${newOccupied}`);
    }
    console.log(`  ✓ KPI occupancy updated dynamically: Occupied rooms increased from ${initialOccupied} -> ${newOccupied}`);

    // Transition Res A: Checked-in -> Checked-out
    console.log(`- Performing Check-out for Res A (${resA.reservationReference}, 2 rooms)...`);
    const checkOutRes = await makeRequest(
      server!,
      `/api/staff/reservations/${resA._id}/status`,
      'PATCH',
      { status: 'Checked-out' },
      staffToken
    );
    if (checkOutRes.status !== 200 || checkOutRes.data?.data?.status !== 'Checked-out') {
      throw new Error(`Check-out transition failed: HTTP ${checkOutRes.status}`);
    }
    console.log(`  ✓ Res A status updated to 'Checked-out' successfully`);

    // Check KPI update: occupiedRooms should decrease back by 2
    const statsAfterCheckOut = await makeRequest(server!, '/api/staff/dashboard/stats', 'GET', undefined, staffToken);
    const finalOccupied = statsAfterCheckOut.data.data.occupiedRooms;
    if (finalOccupied !== initialOccupied) {
      throw new Error(`Occupied rooms did not decrease back to ${initialOccupied}. Got: ${finalOccupied}`);
    }
    console.log(`  ✓ KPI occupancy updated dynamically: Occupied rooms returned to ${finalOccupied}`);

    // E. Illegal Status Transition Rejections
    console.log('\nTesting Rejection of Invalid Lifecycle Status Transitions:');

    // Attempt 1: Checked-out -> Checked-in (Res A is now Checked-out)
    const invalidTrans1 = await makeRequest(
      server!,
      `/api/staff/reservations/${resA._id}/status`,
      'PATCH',
      { status: 'Checked-in' },
      staffToken
    );
    if (invalidTrans1.status !== 400) {
      throw new Error(`Expected 400 for Checked-out -> Checked-in, got ${invalidTrans1.status}`);
    }
    console.log('  ✓ Correctly rejected illegal transition: Checked-out -> Checked-in (HTTP 400 Bad Request)');

    // Attempt 2: Cancelled -> Checked-in (Res D is Cancelled)
    const invalidTrans2 = await makeRequest(
      server!,
      `/api/staff/reservations/${resD._id}/status`,
      'PATCH',
      { status: 'Checked-in' },
      staffToken
    );
    if (invalidTrans2.status !== 400) {
      throw new Error(`Expected 400 for Cancelled -> Checked-in, got ${invalidTrans2.status}`);
    }
    console.log('  ✓ Correctly rejected illegal transition: Cancelled -> Checked-in (HTTP 400 Bad Request)');

    // Attempt 3: Non-existent ID
    const fakeId = new mongoose.Types.ObjectId();
    const notFoundRes = await makeRequest(
      server!,
      `/api/staff/reservations/${fakeId}/status`,
      'PATCH',
      { status: 'Checked-in' },
      staffToken
    );
    if (notFoundRes.status !== 404) {
      throw new Error(`Expected 404 for non-existent reservation, got ${notFoundRes.status}`);
    }
    console.log('  ✓ Correctly rejected non-existent reservation status update (HTTP 404 Not Found)');

    console.log('\n' + '='.repeat(80));
    console.log('STAGE 5 AUDIT & VERIFICATION RESULTS: ALL TESTS PASSED SUCCESSFULLY! ✓');
    console.log('='.repeat(80));
  } catch (error: any) {
    console.error('\n❌ STAGE 5 VERIFICATION FAILED:', error.message || error);
    process.exitCode = 1;
  } finally {
    // Clean up test data
    console.log('\nPerforming safe test data cleanup...');
    try {
      if (testReservationIds.length > 0) {
        const deletedRes = await Reservation.deleteMany({ _id: { $in: testReservationIds } });
        console.log(`✓ Cleaned up ${deletedRes.deletedCount} temporary test reservations`);
      }
      if (testRoomTypeId) {
        await RoomType.findByIdAndDelete(testRoomTypeId);
        console.log(`✓ Cleaned up temporary test room type`);
      }
      if (testGuestUserId) {
        await User.findByIdAndDelete(testGuestUserId);
        console.log(`✓ Cleaned up temporary test guest user`);
      }

      // Verify baseline records are intact
      const preservedStaff = await User.findOne({ email: 'staff@hotel.com' });
      const preservedGuest = await User.findOne({ email: 'guest@hotel.com' });
      const preservedAdmin = await User.findOne({ email: 'admin@hotel.com' });
      const totalRoomTypes = await RoomType.countDocuments();

      if (!preservedStaff || !preservedGuest || !preservedAdmin) {
        console.error('CRITICAL: Seed accounts were affected during verification!');
      } else {
        console.log(`✓ Atlas database verification: Seed accounts intact (Staff, Admin, Guest present)`);
        console.log(`✓ Atlas database verification: ${totalRoomTypes} active room types preserved`);
      }
    } catch (cleanupErr) {
      console.error('Error during test cleanup:', cleanupErr);
    }

    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    await mongoose.disconnect();
    console.log('✓ Disconnected cleanly from database\n');
  }
};

runStage5Verification();
