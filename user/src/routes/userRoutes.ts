import { Router } from 'express';
import { getTravelerById, updateTraveler, updateTravelerStatus, updateTravelerCountry, getTravelerBalance, getTravelerReviews, getBuyerById, updateBuyer } from '../controllers/userController';
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
router.get('/travelers/:id/balance', authMiddleware, getTravelerBalance);
router.get('/api/travelers/:id/balance', authMiddleware, getTravelerBalance);
router.get('/travelers/:id/reviews', getTravelerReviews);
router.get('/api/travelers/:id/reviews', getTravelerReviews);

// Routes for buyer profile
router.get('/buyers/:id', authMiddleware, getBuyerById);
router.get('/api/buyers/:id', authMiddleware, getBuyerById);
router.put('/buyers/:id', authMiddleware, updateBuyer);
router.put('/api/buyers/:id', authMiddleware, updateBuyer);

// Fallback/debug route to see if path is stripped by gateway
router.get('/:id', authMiddleware, getTravelerById);
router.put('/:id', authMiddleware, updateTraveler);
router.patch('/:id/status', authMiddleware, updateTravelerStatus);
router.patch('/:id/country', authMiddleware, updateTravelerCountry);
router.get('/:id/balance', authMiddleware, getTravelerBalance);
router.get('/:id/reviews', getTravelerReviews);

export default router;
