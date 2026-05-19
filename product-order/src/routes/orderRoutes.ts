import { Router } from 'express';
import { authMiddleware, authorize } from '../middleware/authMiddleware';
import { createCheckout } from '../controllers/orderController';

const router = Router();

// Endpoint checkout wajib punya role 'buyer'
router.post('/', authMiddleware, authorize('buyer'), createCheckout);

export default router;
