import { Router } from 'express';
import { getTravelerById, updateTraveler } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Routes for traveler profile
router.get('/travelers/:id', authMiddleware, getTravelerById);
router.get('/api/travelers/:id', authMiddleware, getTravelerById);
router.put('/travelers/:id', authMiddleware, updateTraveler);
router.put('/api/travelers/:id', authMiddleware, updateTraveler);

// Fallback/debug route to see if path is stripped by gateway
router.get('/:id', authMiddleware, getTravelerById);
router.put('/:id', authMiddleware, updateTraveler);

export default router;
