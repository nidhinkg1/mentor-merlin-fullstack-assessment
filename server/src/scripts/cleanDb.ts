import { connectDatabase } from '../config/db.js';
import { User, RoomType, Reservation } from '../models/index.js';

const cleanDb = async (): Promise<void> => {
  await connectDatabase();

  console.log('--- Inspecting Current DB State ---');
  const allUsers = await User.find({}, 'name email role');
  const allRooms = await RoomType.find({}, 'name totalInventory pricePerNight');
  const allReservations = await Reservation.find({}).populate('guestId roomTypeId');

  console.log(`\nExisting Users (${allUsers.length}):`);
  for (const u of allUsers) {
    console.log(` - ${u.email} (${u.role})`);
  }

  console.log(`\nExisting Rooms (${allRooms.length}):`);
  for (const r of allRooms) {
    console.log(` - ${r.name} ($${r.pricePerNight})`);
  }

  console.log(`\nExisting Reservations (${allReservations.length}):`);
  for (const res of allReservations as any[]) {
    console.log(` - ${res.reservationReference}: Guest=${res.guestId?.email}, Room=${res.roomTypeId?.name}, Status=${res.status}`);
  }

  // 1. Identify official seeded users
  const officialUserEmails = ['guest@hotel.com', 'staff@hotel.com', 'admin@hotel.com'];
  const nonOfficialUsers = await User.find({ email: { $nin: officialUserEmails } });
  const nonOfficialUserIds = nonOfficialUsers.map((u) => u._id);

  // 2. Identify official seeded rooms
  const officialRoomNames = [
    'Standard Queen Room',
    'Deluxe King Suite',
    'Executive Family Suite',
    'Presidential Penthouse',
  ];
  const nonOfficialRooms = await RoomType.find({ name: { $nin: officialRoomNames } });
  const nonOfficialRoomIds = nonOfficialRooms.map((r) => r._id);

  console.log('\n--- Cleaning Non-Seeded Records ---');

  // Delete reservations associated with non-official users or non-official rooms
  const deletedRes = await Reservation.deleteMany({
    $or: [
      { guestId: { $in: nonOfficialUserIds } },
      { roomTypeId: { $in: nonOfficialRoomIds } },
    ],
  });
  console.log(`Deleted ${deletedRes.deletedCount} reservations tied to test data.`);

  // Delete non-official rooms (like "testing")
  const deletedRooms = await RoomType.deleteMany({ name: { $nin: officialRoomNames } });
  console.log(`Deleted ${deletedRooms.deletedCount} non-official rooms (e.g. testing).`);

  // Delete non-official users (like "test@gmail.com")
  const deletedUsers = await User.deleteMany({ email: { $nin: officialUserEmails } });
  console.log(`Deleted ${deletedUsers.deletedCount} non-official users (e.g. test@gmail.com).`);

  // Reset standard rooms inventory & versions if modified
  const defaultRooms = [
    { name: 'Standard Queen Room', totalInventory: 8, pricePerNight: 120, capacity: 2 },
    { name: 'Deluxe King Suite', totalInventory: 6, pricePerNight: 180, capacity: 2 },
    { name: 'Executive Family Suite', totalInventory: 4, pricePerNight: 280, capacity: 4 },
    { name: 'Presidential Penthouse', totalInventory: 2, pricePerNight: 550, capacity: 6 },
  ];

  for (const def of defaultRooms) {
    await RoomType.updateOne(
      { name: def.name },
      { $set: { totalInventory: def.totalInventory, pricePerNight: def.pricePerNight, capacity: def.capacity, isActive: true } }
    );
  }

  console.log('\n--- Final Verification ---');
  const finalUsers = await User.find({}, 'name email role');
  console.log(`Users remaining (${finalUsers.length}):`);
  finalUsers.forEach((u) => console.log(` - ${u.email} [${u.role}]`));

  const finalRooms = await RoomType.find({}, 'name totalInventory pricePerNight isActive');
  console.log(`Rooms remaining (${finalRooms.length}):`);
  finalRooms.forEach((r) => console.log(` - ${r.name} ($${r.pricePerNight}, inv: ${r.totalInventory}, active: ${r.isActive})`));

  const finalRes = await Reservation.find({}, 'reservationReference status');
  console.log(`Reservations remaining (${finalRes.length}):`);
  finalRes.forEach((res) => console.log(` - ${res.reservationReference} [${res.status}]`));

  console.log('\nDatabase cleanup complete. Only official seeded data remains.');
  process.exit(0);
};

cleanDb().catch((err) => {
  console.error('Clean DB failed:', err);
  process.exit(1);
});

