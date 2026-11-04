import { Router } from 'express';
import {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteOrDeactivateRoom,
} from '../controllers/roomController.js';
import { authenticate, authenticateOptional, authorize } from '../middleware/authMiddleware.js';

const router = Router();

// Public / Guest accessible (with optional auth to detect staff privileges)
router.get('/', authenticateOptional, getRooms);
router.get('/:id', authenticateOptional, getRoomById);

// Staff / Admin protected management endpoints
router.post('/', authenticate, authorize('staff', 'admin'), createRoom);
router.put('/:id', authenticate, authorize('staff', 'admin'), updateRoom);
router.delete('/:id', authenticate, authorize('staff', 'admin'), deleteOrDeactivateRoom);

export const roomRoutes = router;

