import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDatabase } from '../config/db.js';
import { User, RoomType } from '../models/index.js';
import http from 'http';

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

const runStage3Verification = async () => {
  console.log('=== Starting Stage 3 Comprehensive Verification ===');
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  console.log(`Ephemeral test server running on port: ${address.port}\n`);

  try {
    // 1. Health Endpoint Verification
    console.log('[1. Testing Health Endpoint]');
    const healthRes = await makeRequest(server, '/api/health', 'GET');
    console.log(` - Health check status: ${healthRes.status} (Expected: 200)`);
    console.log(` - Health DB connected: ${healthRes.data.database?.connected}`);
    if (healthRes.status !== 200 || !healthRes.data.database?.connected) {
      throw new Error('Health check verification failed');
    }

    // 2. Guest Registration
    console.log('\n[2. Testing Guest Registration]');
    const testEmail = `newguest_${Date.now()}@example.com`;
    const regRes = await makeRequest(server, '/api/auth/register', 'POST', {
      name: 'Test New Guest',
      email: testEmail,
      password: 'SecurePassword123',
      role: 'admin', // Attack attempt: user tries to register as admin!
    });
    console.log(` - Registration status: ${regRes.status} (Expected: 201)`);
    console.log(` - Assigned role: ${regRes.data.user?.role} (Must strictly be 'guest')`);
    console.log(` - Password hash exposed in response: ${'passwordHash' in (regRes.data.user || {})}`);
    if (regRes.status !== 201 || regRes.data.user?.role !== 'guest' || 'passwordHash' in regRes.data.user) {
      throw new Error('Guest registration verification failed');
    }

    // 3. Password Hashed in Database
    console.log('\n[3. Verifying Password Hashing in DB]');
    const savedUser = await User.findOne({ email: testEmail }).select('+passwordHash');
    console.log(` - Password in DB starts with $2: ${savedUser?.passwordHash?.startsWith('$2')}`);
    if (!savedUser?.passwordHash?.startsWith('$2')) {
      throw new Error('Password was not hashed with bcrypt');
    }

    // 4. Duplicate Email Registration Rejection
    console.log('\n[4. Testing Duplicate Email Registration]');
    const dupRes = await makeRequest(server, '/api/auth/register', 'POST', {
      name: 'Imposter',
      email: testEmail,
      password: 'AnotherPassword123',
    });
    console.log(` - Duplicate email status: ${dupRes.status} (Expected: 409 Conflict)`);
    console.log(` - Duplicate error message: "${dupRes.data.message}"`);
    if (dupRes.status !== 409) {
      throw new Error('Duplicate email was not rejected with 409');
    }

    // 5. Login with Valid Credentials
    console.log('\n[5. Testing Login with Valid Credentials]');
    const loginRes = await makeRequest(server, '/api/auth/login', 'POST', {
      email: testEmail,
      password: 'SecurePassword123',
    });
    console.log(` - Login status: ${loginRes.status} (Expected: 200)`);
    console.log(` - JWT token returned: ${!!loginRes.data.token}`);
    const guestToken = loginRes.data.token;
    if (loginRes.status !== 200 || !guestToken) {
      throw new Error('Valid login failed');
    }

    // 6. Login with Invalid Credentials
    console.log('\n[6. Testing Login with Invalid Credentials]');
    const badLoginRes = await makeRequest(server, '/api/auth/login', 'POST', {
      email: testEmail,
      password: 'WrongPassword!',
    });
    console.log(` - Bad login status: ${badLoginRes.status} (Expected: 401 Unauthorized)`);
    if (badLoginRes.status !== 401) {
      throw new Error('Invalid login did not return 401');
    }

    // 7. JWT Authentication & Get Current User (GET /api/auth/me)
    console.log('\n[7. Testing JWT Auth & GET /api/auth/me]');
    const meRes = await makeRequest(server, '/api/auth/me', 'GET', undefined, guestToken);
    console.log(` - /api/auth/me status: ${meRes.status} (Expected: 200)`);
    console.log(` - Returned user email: ${meRes.data.user?.email}`);
    if (meRes.status !== 200 || meRes.data.user?.email !== testEmail) {
      throw new Error('JWT authentication /api/auth/me failed');
    }

    // 8. Missing & Invalid Tokens Rejection
    console.log('\n[8. Testing Missing & Invalid Tokens]');
    const noTokenRes = await makeRequest(server, '/api/auth/me', 'GET');
    console.log(` - No token status: ${noTokenRes.status} (Expected: 401)`);
    const badTokenRes = await makeRequest(server, '/api/auth/me', 'GET', undefined, 'invalid.token.here');
    console.log(` - Invalid token status: ${badTokenRes.status} (Expected: 401)`);
    if (noTokenRes.status !== 401 || badTokenRes.status !== 401) {
      throw new Error('Missing or invalid token was not rejected with 401');
    }

    // 9. Login as Staff
    console.log('\n[9. Testing Staff Login]');
    const staffLoginRes = await makeRequest(server, '/api/auth/login', 'POST', {
      email: 'staff@hotel.com',
      password: 'Password@123',
    });
    console.log(` - Staff login status: ${staffLoginRes.status} (Expected: 200)`);
    console.log(` - Staff role: ${staffLoginRes.data.user?.role} (Expected: 'staff')`);
    const staffToken = staffLoginRes.data.token;
    if (staffLoginRes.status !== 200 || staffLoginRes.data.user?.role !== 'staff') {
      throw new Error('Staff login failed');
    }

    // 10. Role-Based Authorization: Guest cannot access Staff endpoints
    console.log('\n[10. Testing RBAC: Guest attempting to create room]');
    const guestCreateRoomRes = await makeRequest(
      server,
      '/api/rooms',
      'POST',
      {
        name: 'Unauthorized Room',
        description: 'Should never be created',
        capacity: 2,
        pricePerNight: 100,
        totalInventory: 5,
      },
      guestToken
    );
    console.log(` - Guest create room status: ${guestCreateRoomRes.status} (Expected: 403 Forbidden)`);
    if (guestCreateRoomRes.status !== 403) {
      throw new Error('Guest was not rejected with 403 Forbidden on staff endpoint');
    }

    // 11. Authorized Staff Room Creation
    console.log('\n[11. Testing Staff Room Creation]');
    const testRoomName = `Test Garden Villa ${Date.now()}`;
    const staffCreateRoomRes = await makeRequest(
      server,
      '/api/rooms',
      'POST',
      {
        name: testRoomName,
        description: 'Serene garden villa with private terrace and sunbeds.',
        capacity: 3,
        pricePerNight: 220,
        totalInventory: 4,
        facilities: ['Garden View', 'Sunbeds', 'Wi-Fi'],
        isActive: true,
      },
      staffToken
    );
    console.log(` - Staff create room status: ${staffCreateRoomRes.status} (Expected: 201)`);
    const createdRoomId = staffCreateRoomRes.data.data?._id;
    if (staffCreateRoomRes.status !== 201 || !createdRoomId) {
      throw new Error('Staff room creation failed');
    }

    // 12. Room Validation: Invalid inputs rejected
    console.log('\n[12. Testing Room Validation on Creation]');
    const badRoomRes = await makeRequest(
      server,
      '/api/rooms',
      'POST',
      {
        name: 'Bad Room',
        description: 'Too short',
        capacity: -1, // Invalid
        pricePerNight: 0, // Invalid
        totalInventory: -10, // Invalid
      },
      staffToken
    );
    console.log(` - Bad room input status: ${badRoomRes.status} (Expected: 400 Bad Request)`);
    if (badRoomRes.status !== 400) {
      throw new Error('Invalid room inputs were not rejected with 400');
    }

    // 13. Public Pagination, Sorting, and Filtering
    console.log('\n[13. Testing Room Pagination, Sorting & Filtering]');
    const paginatedRes = await makeRequest(server, '/api/rooms?page=1&limit=2&sortBy=pricePerNight&sortOrder=asc', 'GET');
    console.log(` - Public rooms status: ${paginatedRes.status} (Expected: 200)`);
    console.log(` - Returned items count: ${paginatedRes.data.data?.length} (Limit: 2)`);
    console.log(` - Pagination total: ${paginatedRes.data.pagination?.total}`);
    console.log(` - Pagination totalPages: ${paginatedRes.data.pagination?.totalPages}`);
    if (paginatedRes.status !== 200 || paginatedRes.data.data?.length > 2) {
      throw new Error('Room pagination failed');
    }

    // 14. Staff Room Update (PUT /api/rooms/:id)
    console.log('\n[14. Testing Staff Room Update]');
    const updateRes = await makeRequest(
      server,
      `/api/rooms/${createdRoomId}`,
      'PUT',
      { pricePerNight: 245, totalInventory: 5 },
      staffToken
    );
    console.log(` - Update status: ${updateRes.status} (Expected: 200)`);
    console.log(` - Updated price: $${updateRes.data.data?.pricePerNight} (Expected: $245)`);
    if (updateRes.status !== 200 || updateRes.data.data?.pricePerNight !== 245) {
      throw new Error('Staff room update failed');
    }

    // 15. Staff Room Deactivation (DELETE /api/rooms/:id)
    console.log('\n[15. Testing Staff Room Soft-Deactivation]');
    const deactRes = await makeRequest(server, `/api/rooms/${createdRoomId}`, 'DELETE', undefined, staffToken);
    console.log(` - Deactivation status: ${deactRes.status} (Expected: 200)`);
    console.log(` - Room isActive: ${deactRes.data.data?.isActive} (Expected: false)`);
    if (deactRes.status !== 200 || deactRes.data.data?.isActive !== false) {
      throw new Error('Room deactivation failed');
    }

    // Cleanup ephemeral test documents
    await User.deleteOne({ email: testEmail });
    await RoomType.findByIdAndDelete(createdRoomId);

    console.log('\n=== All Stage 3 Verifications Passed (100% Success) ===');
  } finally {
    server.close();
    await mongoose.connection.close();
  }
};

runStage3Verification().catch((err) => {
  console.error('\nVerification crashed with error:', err);
  process.exit(1);
});

