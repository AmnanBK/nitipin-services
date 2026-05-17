import { Router } from 'express';
import { getTravelerById, updateTraveler, updateTravelerStatus, updateTravelerCountry } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Routes for traveler profile
router.get('/travelers/:id', authMiddleware, getTravelerById);
router.get('/api/travelers/:id', authMiddleware, getTravelerById);
router.put('/travelers/:id', authMiddleware, updateTraveler);
router.put('/api/travelers/:id', authMiddleware, updateTraveler);
router.patch('/travelers/:id/status', authMiddleware, updateTravelerStatus);
router.patch('/api/travelers/:id/status', authMiddleware, updateTravelerStatus);
router.patch('/travelers/:id/country', authMiddleware, updateTravelerCountry);
router.patch('/api/travelers/:id/country', authMiddleware, updateTravelerCountry);

// Fallback/debug route to see if path is stripped by gateway
router.get('/:id', authMiddleware, getTravelerById);
router.put('/:id', authMiddleware, updateTraveler);
router.patch('/:id/status', authMiddleware, updateTravelerStatus);
router.patch('/:id/country', authMiddleware, updateTravelerCountry);

export default router;
