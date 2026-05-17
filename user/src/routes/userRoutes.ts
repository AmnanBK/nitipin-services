import { Router } from 'express';
import { getTravelerById } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Routes for traveler profile
router.get('/travelers/:id', authMiddleware, getTravelerById);
router.get('/api/travelers/:id', authMiddleware, getTravelerById);

// Fallback/debug route to see if path is stripped by gateway
router.get('/:id', authMiddleware, getTravelerById);

export default router;
