import { Router } from 'express';
import {
  getDashboardStats,
  getTodayArrivals,
  getTodayDepartures,
  getAllReservations,
} from '../controllers/staffController.js';
import { updateReservationStatus } from '../controllers/reservationController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

// Protect all staff routes strictly for 'staff' and 'admin' roles
router.use(authenticate, authorize('staff', 'admin'));

// Dashboard KPIs
router.get('/dashboard/stats', getDashboardStats);

// Operational Lists
router.get('/arrivals', getTodayArrivals);
router.get('/departures', getTodayDepartures);

// Front Desk Paginated Management
router.get('/reservations', getAllReservations);

// Front Desk Lifecycle Actions (Check-in / Check-out)
router.patch('/reservations/:id/status', updateReservationStatus);

export const staffRoutes = router;

