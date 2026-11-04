import mongoose, { Types } from 'mongoose';
import { connectDatabase } from '../config/db.js';
import { User, RoomType, Reservation } from '../models/index.js';

const runVerification = async (): Promise<void> => {
  console.log('--- Starting Model & Schema Verification ---');
  await connectDatabase();

  // 1. Verify model registration
  const registeredModels = mongoose.modelNames();
  console.log('Registered Mongoose Models:', registeredModels);
  if (!registeredModels.includes('User') || !registeredModels.includes('RoomType') || !registeredModels.includes('Reservation')) {
    throw new Error('Not all models are registered!');
  }

  // 2. Test User Validations
  console.log('\n[Testing User Validations]');
  const invalidUserEmail = new User({
    name: 'Test User',
    email: 'not-an-email',
    passwordHash: 'dummyhash123',
    role: 'guest',
  });
  const emailErr = invalidUserEmail.validateSync();
  console.log(' - Invalid email validation caught:', !!emailErr?.errors['email']);

  const invalidUserRole = new User({
    name: 'Test User',
    email: 'valid@example.com',
    passwordHash: 'dummyhash123',
    role: 'superadmin' as any,
  });
  const roleErr = invalidUserRole.validateSync();
  console.log(' - Invalid role validation caught:', !!roleErr?.errors['role']);

  const validDefaultUser = new User({
    name: 'Default Guest',
    email: 'guest@example.com',
    passwordHash: 'dummyhash123',
  });
  console.log(' - Default role assigned as guest:', validDefaultUser.role === 'guest');

  // 3. Test RoomType Validations
  console.log('\n[Testing RoomType Validations]');
  const invalidRoomType = new RoomType({
    name: 'Invalid Room',
    description: 'A test room description',
    capacity: 0, // Invalid: must be >= 1
    pricePerNight: -10, // Invalid: must be > 0
    totalInventory: -5, // Invalid: must be >= 0
  });
  const roomErr = invalidRoomType.validateSync();
  console.log(' - Zero capacity validation caught:', !!roomErr?.errors['capacity']);
  console.log(' - Negative price validation caught:', !!roomErr?.errors['pricePerNight']);
  console.log(' - Negative inventory validation caught:', !!roomErr?.errors['totalInventory']);

  const validRoomType = new RoomType({
    name: 'Deluxe Suite',
    description: 'Spacious suite with balcony',
    capacity: 2,
    pricePerNight: 150,
    totalInventory: 5,
  });
  console.log(' - Valid RoomType passes validation:', validRoomType.validateSync() === undefined);

  // 4. Test Reservation Validations
  console.log('\n[Testing Reservation Validations]');
  const now = new Date();
  const pastCheckOut = new Date(now.getTime() - 86400000); // 1 day before checkIn

  const invalidDateReservation = new Reservation({
    reservationReference: 'RES-TEST-001',
    guestId: new Types.ObjectId(),
    roomTypeId: new Types.ObjectId(),
    checkIn: now,
    checkOut: pastCheckOut, // checkOut before checkIn
    roomCount: 1,
    guestCount: 2,
    pricePerNightSnapshot: 150,
    totalAmount: 150,
    status: 'Confirmed',
  });
  const dateErr = invalidDateReservation.validateSync();
  console.log(' - Check-out before check-in validation caught:', !!dateErr?.errors['checkOut']);

  const invalidCountsReservation = new Reservation({
    reservationReference: 'RES-TEST-002',
    guestId: new Types.ObjectId(),
    roomTypeId: new Types.ObjectId(),
    checkIn: now,
    checkOut: new Date(now.getTime() + 86400000),
    roomCount: 0, // Invalid: must be >= 1
    guestCount: 0, // Invalid: must be >= 1
    pricePerNightSnapshot: 0, // Invalid: must be > 0
    totalAmount: 0, // Invalid: must be > 0
    status: 'InvalidStatus' as any, // Invalid
  });
  const countsErr = invalidCountsReservation.validateSync();
  console.log(' - Zero room count validation caught:', !!countsErr?.errors['roomCount']);
  console.log(' - Zero guest count validation caught:', !!countsErr?.errors['guestCount']);
  console.log(' - Zero price snapshot validation caught:', !!countsErr?.errors['pricePerNightSnapshot']);
  console.log(' - Zero total amount validation caught:', !!countsErr?.errors['totalAmount']);
  console.log(' - Invalid status validation caught:', !!countsErr?.errors['status']);

  // 5. Verify Index Declarations
  console.log('\n[Declared Model Indexes]');
  console.log(' - User indexes:', User.schema.indexes().map(idx => Object.keys(idx[0])));
  console.log(' - RoomType indexes:', RoomType.schema.indexes().map(idx => Object.keys(idx[0])));
  console.log(' - Reservation indexes:', Reservation.schema.indexes().map(idx => Object.keys(idx[0])));

  await mongoose.connection.close();
  console.log('\n--- Model & Schema Verification Completed Successfully ---');
};

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});

