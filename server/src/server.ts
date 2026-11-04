import { createApp } from './app.js';
import { config } from './config/env.js';
import { connectDatabase } from './config/db.js';
import mongoose from 'mongoose';

const startServer = async (): Promise<void> => {
  try {
    // 1. Connect to Database
    await connectDatabase();

    // 2. Initialize Express Application
    const app = createApp();

    // 3. Start Listening
    const server = app.listen(config.port, () => {
      console.log(`[Server] Mentor Merlin API running on http://localhost:${config.port}`);
      console.log(`[Server] Health check available at http://localhost:${config.port}/api/health`);
      console.log(`[Server] Environment: ${config.nodeEnv}`);
    });

    // 4. Graceful Shutdown
    const handleShutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        try {
          await mongoose.connection.close();
          console.log('[Database] MongoDB connection closed cleanly.');
          process.exit(0);
        } catch (dbErr) {
          console.error('[Database] Error during MongoDB disconnect:', dbErr);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  } catch (error) {
    console.error('[Server] Fatal startup error:', error);
    process.exit(1);
  }
};

startServer();

