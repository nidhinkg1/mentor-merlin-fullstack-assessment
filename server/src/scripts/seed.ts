import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import { User, RoomType } from '../models/index.js';
import { hashPassword } from '../utils/auth.js';

export const seedDatabase = async (): Promise<void> => {
  console.log('--- Starting Database Seeding ---');
  await connectDatabase();

  // 1. Seed Demo Users
  const defaultPassword = 'Password@123';
  const hashedPassword = await hashPassword(defaultPassword);

  const demoUsers = [
    {
      name: 'Demo Guest',
      email: 'guest@hotel.com',
      passwordHash: hashedPassword,
      role: 'guest' as const,
    },
    {
      name: 'Front Desk Staff',
      email: 'staff@hotel.com',
      passwordHash: hashedPassword,
      role: 'staff' as const,
    },
    {
      name: 'Hotel General Manager',
      email: 'admin@hotel.com',
      passwordHash: hashedPassword,
      role: 'admin' as const,
    },
  ];

  console.log('\n[Seeding Users]');
  for (const userData of demoUsers) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      existing.name = userData.name;
      existing.role = userData.role;
      existing.passwordHash = userData.passwordHash;
      await existing.save();
      console.log(` - Updated existing user: ${userData.email} (${userData.role})`);
    } else {
      await User.create(userData);
      console.log(` - Created new user: ${userData.email} (${userData.role})`);
    }
  }

  // 2. Seed Realistic Room Types
  const demoRoomTypes = [
    {
      name: 'Standard Queen Room',
      description: 'Comfortable and contemporary room featuring a plush queen-size bed, workstation, and en-suite rain shower.',
      capacity: 2,
      pricePerNight: 120,
      totalInventory: 8,
      facilities: ['High-speed Wi-Fi', 'Air Conditioning', 'En-suite Rain Shower', '43-inch Smart TV', 'Coffee Maker'],
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Deluxe King Suite',
      description: 'Spacious suite with an ultra-comfortable king-size bed, private furnished balcony, and city skyline views.',
      capacity: 2,
      pricePerNight: 180,
      totalInventory: 6,
      facilities: ['High-speed Wi-Fi', 'Air Conditioning', 'Private Balcony', 'Mini Bar', 'Bathrobes & Slippers', 'In-room Safe'],
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Executive Family Suite',
      description: 'Designed for families, featuring two separate sleeping zones, spacious living lounge, and dining kitchenette.',
      capacity: 4,
      pricePerNight: 280,
      totalInventory: 4,
      facilities: ['High-speed Wi-Fi', 'Two Bedrooms', 'Living Room', 'Kitchenette', 'Soaking Bathtub', 'Daily Housekeeping'],
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Presidential Penthouse',
      description: 'The pinnacle of luxury hospitality featuring panoramic ocean vistas, private heated jacuzzi, and dedicated butler service.',
      capacity: 6,
      pricePerNight: 550,
      totalInventory: 2,
      facilities: ['Panoramic Ocean View', 'Private Heated Jacuzzi', 'Dedicated Butler', 'Gourmet Kitchen', 'Sound System', 'VIP Airport Transfer'],
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
    },
  ];

  console.log('\n[Seeding Room Types]');
  for (const roomData of demoRoomTypes) {
    const existing = await RoomType.findOne({ name: roomData.name });
    if (existing) {
      existing.description = roomData.description;
      existing.capacity = roomData.capacity;
      existing.pricePerNight = roomData.pricePerNight;
      existing.totalInventory = roomData.totalInventory;
      existing.facilities = roomData.facilities;
      existing.isActive = roomData.isActive;
      existing.imageUrl = roomData.imageUrl;
      await existing.save();
      console.log(` - Updated room type: ${roomData.name} ($${roomData.pricePerNight}/night, ${roomData.totalInventory} rooms)`);
    } else {
      await RoomType.create(roomData);
      console.log(` - Created room type: ${roomData.name} ($${roomData.pricePerNight}/night, ${roomData.totalInventory} rooms)`);
    }
  }

  console.log('\n--- Database Seeding Completed Successfully ---');
  await mongoose.connection.close();
};

if (process.argv[1]?.includes('seed.ts') || process.argv[1]?.includes('seed.js')) {
  seedDatabase().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}

