import http from 'http';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDatabase } from '../config/db.js';
import { User, RoomType, Reservation } from '../models/index.js';
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

const runStage6Verification = async () => {
  console.log('='.repeat(80));
  console.log('MENTOR MERLIN - STAGE 6 END-TO-END AUTOMATED VERIFICATION');
  console.log('GUEST RESERVATION FLOW & OPERATIONAL SECURITY AUDIT');
  console.log('='.repeat(80));

  let server: http.Server | null = null;
  const testReservationIds: mongoose.Types.ObjectId[] = [];
  const testUserIds: mongoose.Types.ObjectId[] = [];
  let testRoomTypeId: mongoose.Types.ObjectId | null = null;

  try {
    // 1. Connect to MongoDB Atlas
    console.log('\n[1/12] Connecting to MongoDB Atlas database...');
    await connectDatabase();
    console.log('✓ Successfully connected to MongoDB Atlas');

    // 2. Start ephemeral HTTP server
    console.log('\n[2/12] Initializing Express Application on Ephemeral Port...');
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server!.listen(0, () => {
        const addr = server!.address() as { port: number };
        console.log(`✓ Test HTTP server listening on port ${addr.port}`);
        resolve();
      });
    });

    // 3. Verify baseline accounts
    console.log('\n[3/12] Verifying Baseline Accounts in Atlas...');
    const staffUser = await User.findOne({ email: 'staff@hotel.com' });
    const baselineGuest = await User.findOne({ email: 'guest@hotel.com' });
    if (!staffUser || !baselineGuest) {
      throw new Error('Baseline seed accounts not found in Atlas.');
    }
    console.log('✓ Baseline staff and guest accounts intact.');

    // 4. Test Step 1: Guest Registration
    console.log('\n[4/12] Testing Guest Registration (POST /api/auth/register)...');
    const newGuestEmail = `e2e.guest.${Date.now()}@example.com`;
    const regRes = await makeRequest(server!, '/api/auth/register', 'POST', {
      name: 'E2E Guest Traveler',
      email: newGuestEmail,
      password: 'Password@123',
    });

    if (regRes.status !== 201 || !regRes.data?.token || !regRes.data?.user) {
      throw new Error(`Guest registration failed: HTTP ${regRes.status}`);
    }
    const newGuestToken = regRes.data.token;
    const newGuestId = new mongoose.Types.ObjectId(regRes.data.user.id);
    testUserIds.push(newGuestId);
    console.log(`✓ Guest registered successfully: ${newGuestEmail} (Role: ${regRes.data.user.role})`);

    // 5. Test Step 2: Guest Login
    console.log('\n[5/12] Testing Guest Login (POST /api/auth/login)...');
    const loginRes = await makeRequest(server!, '/api/auth/login', 'POST', {
      email: newGuestEmail,
      password: 'Password@123',
    });

    if (loginRes.status !== 200 || !loginRes.data?.token) {
      throw new Error(`Guest login failed: HTTP ${loginRes.status}`);
    }
    console.log('✓ Guest login succeeded; received valid JWT session.');

    // Also register a second guest for data isolation tests
    const secondGuestEmail = `second.guest.${Date.now()}@example.com`;
    const secondRegRes = await makeRequest(server!, '/api/auth/register', 'POST', {
      name: 'Second Guest Traveler',
      email: secondGuestEmail,
      password: 'Password@123',
    });
    const secondGuestToken = secondRegRes.data.token;
    testUserIds.push(new mongoose.Types.ObjectId(secondRegRes.data.user.id));

    // 6. Test Step 3: Browse Room Types
    console.log('\n[6/12] Testing Room Catalog Discovery (GET /api/rooms)...');
    const roomsRes = await makeRequest(server!, '/api/rooms', 'GET');
    if (roomsRes.status !== 200 || !Array.isArray(roomsRes.data?.data) || roomsRes.data.data.length === 0) {
      throw new Error(`Failed to browse rooms: HTTP ${roomsRes.status}`);
    }
    const targetRoom = roomsRes.data.data[0];
    console.log(`✓ Retrieved ${roomsRes.data.data.length} active room types. Selected "${targetRoom.name}" for booking test.`);

    // 7. Test Step 4: Availability Search with Live Night Calculation
    console.log('\n[7/12] Testing Live Date-Range Availability Search (GET /api/availability/search)...');
    const baseDate = normalizeToMidnightUtc(new Date());
    const checkInDate = new Date(baseDate);
    checkInDate.setUTCDate(checkInDate.getUTCDate() + 10);
    const checkOutDate = new Date(baseDate);
    checkOutDate.setUTCDate(checkOutDate.getUTCDate() + 13); // 3 nights

    const checkInStr = checkInDate.toISOString().split('T')[0];
    const checkOutStr = checkOutDate.toISOString().split('T')[0];

    const availRes = await makeRequest(
      server!,
      `/api/availability/search?checkIn=${checkInStr}&checkOut=${checkOutStr}&guestCount=2&roomCount=1`,
      'GET'
    );

    if (availRes.status !== 200 || !Array.isArray(availRes.data?.data)) {
      throw new Error(`Availability search failed: HTTP ${availRes.status}`);
    }
    const availItem = availRes.data.data.find((item: any) => item.roomType._id === targetRoom._id);
    if (!availItem) {
      throw new Error(`Target room ${targetRoom.name} not found in availability results.`);
    }

    if (availItem.nights !== 3) {
      throw new Error(`Expected 3 nights, got ${availItem.nights}`);
    }
    const expectedTotal = targetRoom.pricePerNight * 3;
    if (availItem.totalAmount !== expectedTotal) {
      throw new Error(`Expected totalAmount ${expectedTotal}, got ${availItem.totalAmount}`);
    }
    console.log(`✓ Server-authoritative calculation confirmed: 3 nights × $${targetRoom.pricePerNight} = $${availItem.totalAmount}`);

    // Test date validation: past dates
    const pastRes = await makeRequest(
      server!,
      `/api/availability/search?checkIn=2020-01-01&checkOut=2020-01-03`,
      'GET'
    );
    if (pastRes.status !== 400) {
      throw new Error(`Expected 400 for past check-in date, got ${pastRes.status}`);
    }
    console.log('✓ Correctly rejected past check-in date (HTTP 400 Bad Request)');

    // 8. Test Step 5: Booking Creation & Price Tampering Resistance
    console.log('\n[8/12] Testing Booking Creation & Server-Authoritative Price Protection...');
    const bookingRes = await makeRequest(
      server!,
      '/api/reservations',
      'POST',
      {
        roomTypeId: targetRoom._id,
        checkIn: checkInStr,
        checkOut: checkOutStr,
        roomCount: 1,
        guestCount: 2,
        specialRequests: 'High floor preferred, late arrival.',
        // Malicious client attempting to tamper price to $1
        totalAmount: 1,
        pricePerNight: 1,
      },
      newGuestToken
    );

    if (bookingRes.status !== 201 || !bookingRes.data?.data) {
      throw new Error(`Booking creation failed: HTTP ${bookingRes.status}: ${JSON.stringify(bookingRes.data)}`);
    }
    const bookedReservation = bookingRes.data.data;
    testReservationIds.push(new mongoose.Types.ObjectId(bookedReservation._id));

    // Confirm server calculated price, ignoring tampered $1
    if (bookedReservation.totalAmount === 1 || bookedReservation.totalAmount !== expectedTotal) {
      throw new Error(`Price tampering check failed! Total amount: ${bookedReservation.totalAmount}`);
    }
    console.log(`✓ Booking confirmed: Reference: ${bookedReservation.reservationReference}`);
    console.log(`✓ Price tampering resisted: Server enforced real total $${bookedReservation.totalAmount} (ignored fake $1)`);

    // 9. Test Step 6: Guest Dashboard (GET /api/reservations/my)
    console.log("\n[9/12] Testing Guest Dashboard History (GET /api/reservations/my)...");
    const myBookingsRes = await makeRequest(server!, '/api/reservations/my', 'GET', undefined, newGuestToken);
    if (myBookingsRes.status !== 200 || !Array.isArray(myBookingsRes.data?.data)) {
      throw new Error(`Failed to fetch guest reservations: HTTP ${myBookingsRes.status}`);
    }
    const foundRes = myBookingsRes.data.data.find((r: any) => r._id === bookedReservation._id);
    if (!foundRes) {
      throw new Error('Booked reservation not found in guest reservation history.');
    }
    console.log(`✓ Guest dashboard returned ${myBookingsRes.data.data.length} reservation(s); includes ${bookedReservation.reservationReference}`);

    // 10. Test Step 7: Cross-Guest Isolation & Data Protection
    console.log('\n[10/12] Testing Guest Cross-Account Data Isolation...');
    // Access own reservation -> 200 OK
    const ownRes = await makeRequest(
      server!,
      `/api/reservations/${bookedReservation._id}`,
      'GET',
      undefined,
      newGuestToken
    );
    if (ownRes.status !== 200) {
      throw new Error(`Owner should be allowed to view own reservation, got ${ownRes.status}`);
    }

    // Second guest attempts to view first guest's reservation -> 403 Forbidden
    const unauthRes = await makeRequest(
      server!,
      `/api/reservations/${bookedReservation._id}`,
      'GET',
      undefined,
      secondGuestToken
    );
    if (unauthRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for cross-guest access, got ${unauthRes.status}`);
    }
    console.log('✓ Cross-guest data isolation strictly enforced (HTTP 403 Forbidden for unauthorized guest)');

    // 11. Test Step 8: Cancellation Workflow & Inventory Restoration
    console.log('\n[11/12] Testing Guest Cancellation Workflow & Inventory Restoration...');
    const cancelRes = await makeRequest(
      server!,
      `/api/reservations/${bookedReservation._id}/cancel`,
      'PATCH',
      undefined,
      newGuestToken
    );
    if (cancelRes.status !== 200 || cancelRes.data?.data?.status !== 'Cancelled') {
      throw new Error(`Cancellation failed: HTTP ${cancelRes.status}`);
    }
    console.log(`✓ Reservation ${bookedReservation.reservationReference} successfully cancelled.`);

    // Attempt double cancellation -> 400 Bad Request
    const doubleCancelRes = await makeRequest(
      server!,
      `/api/reservations/${bookedReservation._id}/cancel`,
      'PATCH',
      undefined,
      newGuestToken
    );
    if (doubleCancelRes.status !== 400) {
      throw new Error(`Expected 400 for duplicate cancellation, got ${doubleCancelRes.status}`);
    }
    console.log('✓ Duplicate cancellation safely rejected (HTTP 400 Bad Request)');

    // 12. Test Step 9: Staff Dashboard & Security Boundary Check
    console.log('\n[12/12] Verifying Staff Security Boundaries & Stage 5 Backward Compatibility...');
    // Guest blocked from staff routes
    const guestStaffRes = await makeRequest(
      server!,
      '/api/staff/dashboard/stats',
      'GET',
      undefined,
      newGuestToken
    );
    if (guestStaffRes.status !== 403) {
      throw new Error(`Expected 403 for guest accessing staff dashboard, got ${guestStaffRes.status}`);
    }

    // Staff access succeeds
    const staffLoginRes = await makeRequest(server!, '/api/auth/login', 'POST', {
      email: 'staff@hotel.com',
      password: 'Password@123',
    });
    const staffToken = staffLoginRes.data.token;

    const staffStatsRes = await makeRequest(
      server!,
      '/api/staff/dashboard/stats',
      'GET',
      undefined,
      staffToken
    );
    if (staffStatsRes.status !== 200) {
      throw new Error(`Staff dashboard failed: HTTP ${staffStatsRes.status}`);
    }
    console.log('✓ Staff dashboard operational; guest security boundaries strictly intact.');

    console.log('\n' + '='.repeat(80));
    console.log('STAGE 6 E2E VERIFICATION RESULTS: ALL 12 AUDIT PHASES PASSED! ✓');
    console.log('='.repeat(80));
  } catch (error: any) {
    console.error('\n❌ STAGE 6 VERIFICATION FAILED:', error.message || error);
    process.exitCode = 1;
  } finally {
    // Clean up temporary test data
    console.log('\nPerforming safe E2E test data cleanup...');
    try {
      if (testReservationIds.length > 0) {
        const deletedRes = await Reservation.deleteMany({ _id: { $in: testReservationIds } });
        console.log(`✓ Cleaned up ${deletedRes.deletedCount} temporary test reservations`);
      }
      if (testUserIds.length > 0) {
        const deletedUsers = await User.deleteMany({ _id: { $in: testUserIds } });
        console.log(`✓ Cleaned up ${deletedUsers.deletedCount} temporary test users`);
      }
      if (testRoomTypeId) {
        await RoomType.findByIdAndDelete(testRoomTypeId);
      }

      // Verify baseline demo records
      const preservedStaff = await User.findOne({ email: 'staff@hotel.com' });
      const preservedGuest = await User.findOne({ email: 'guest@hotel.com' });
      const preservedAdmin = await User.findOne({ email: 'admin@hotel.com' });
      const totalRoomTypes = await RoomType.countDocuments();

      if (!preservedStaff || !preservedGuest || !preservedAdmin) {
        console.error('CRITICAL: Baseline accounts were affected during verification!');
      } else {
        console.log(`✓ Atlas database verification: Baseline demo accounts intact (Staff, Admin, Guest present)`);
        console.log(`✓ Atlas database verification: ${totalRoomTypes} active room types preserved`);
      }
    } catch (cleanupErr) {
      console.error('Error during cleanup:', cleanupErr);
    }

    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    await mongoose.disconnect();
    console.log('✓ Disconnected cleanly from database\n');
  }
};

runStage6Verification();

