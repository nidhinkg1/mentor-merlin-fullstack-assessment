import { connectDatabase } from '../config/db.js';
import { User, RoomType, Reservation } from '../models/index.js';

const auditDb = async (): Promise<void> => {
  await connectDatabase();

  const users = await User.find({}, 'name email role createdAt');
  const rooms = await RoomType.find({}, 'name pricePerNight totalInventory isActive version');
  const reservations = await Reservation.find({}, 'reservationReference status roomTypeId checkIn checkOut totalAmount');

  console.log('=== ATLAS DATABASE AUDIT ===');
  console.log(`\n--- USERS (${users.length}) ---`);
  users.forEach((u) => console.log(` - ${u.email} [${u.role}] (id: ${u._id})`));

  console.log(`\n--- ROOM TYPES (${rooms.length}) ---`);
  rooms.forEach((r) =>
    console.log(
      ` - ${r.name} [$${r.pricePerNight}/night, inv: ${r.totalInventory}, active: ${r.isActive}, ver: ${r.version || 0}]`
    )
  );

  console.log(`\n--- RESERVATIONS (${reservations.length}) ---`);
  reservations.forEach((res) =>
    console.log(
      ` - ${res.reservationReference} [${res.status}] (checkIn: ${res.checkIn.toISOString()}, total: $${res.totalAmount})`
    )
  );

  process.exit(0);
};

auditDb().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});

