import dns from 'dns';
import mongoose from 'mongoose';
import { config } from './env.js';

// Resolve SRV records reliably when using MongoDB Atlas on Windows environments
if (config.mongoUri.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {
    // Ignore fallback if custom DNS setting is restricted
  }
}

export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[Database] MongoDB connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('[Database] MongoDB connection error:', error);
    process.exit(1);
    throw error;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[Database] MongoDB reconnected.');
});

