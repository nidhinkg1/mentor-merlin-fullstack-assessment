import { Router } from 'express';
import { healthRoutes } from './healthRoutes.js';
import { authRoutes } from './authRoutes.js';
import { roomRoutes } from './roomRoutes.js';
import { availabilityRoutes } from './availabilityRoutes.js';
import { reservationRoutes } from './reservationRoutes.js';
import { staffRoutes } from './staffRoutes.js';

const router = Router();

// Health check endpoint
router.use('/health', healthRoutes);

// Authentication endpoints
router.use('/auth', authRoutes);

// Room management endpoints
router.use('/rooms', roomRoutes);

// Availability search endpoints
router.use('/availability', availabilityRoutes);

// Reservation & booking endpoints
router.use('/reservations', reservationRoutes);

// Staff front desk & operations dashboard endpoints
router.use('/staff', staffRoutes);

export const apiRouter = router;


