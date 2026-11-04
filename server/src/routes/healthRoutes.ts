import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const dbStatusMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbStateCode = mongoose.connection.readyState;
  const dbStatus = dbStatusMap[dbStateCode] || 'unknown';

  res.status(200).json({
    success: true,
    message: 'Mentor Merlin Hotel Reservation API is operational',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStatus,
      connected: dbStateCode === 1,
    },
  });
});

export const healthRoutes = router;

