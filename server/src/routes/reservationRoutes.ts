import { Router } from 'express';
import {
  createReservation,
  getMyReservations,
  getReservationById,
  cancelReservation,
  updateReservationStatus,
} from '../controllers/reservationController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { reservationLimiter } from '../middleware/securityMiddleware.js';

const router = Router();

// Guest booking operations (requires authenticated user)
router.post('/', authenticate, reservationLimiter, createReservation);
router.get('/my', authenticate, getMyReservations);
router.get('/:id', authenticate, getReservationById);
router.patch('/:id/cancel', authenticate, cancelReservation);

// Staff operational lifecycle transitions (Check-in, Check-out)
router.patch('/:id/status', authenticate, authorize('staff', 'admin'), updateReservationStatus);

export const reservationRoutes = router;

