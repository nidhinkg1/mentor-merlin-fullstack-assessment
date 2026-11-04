import { Router } from 'express';
import { searchAvailability } from '../controllers/reservationController.js';

const router = Router();

// Public availability search
router.get('/search', searchAvailability);

export const availabilityRoutes = router;

