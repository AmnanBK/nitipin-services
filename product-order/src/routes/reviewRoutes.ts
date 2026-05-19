import { Router } from 'express';
import { authMiddleware, authorize } from '../middleware/authMiddleware';
import { createReview, getReviews } from '../controllers/reviewController';

const router = Router();

// Semua orang (publik) bisa melihat review. 
// Filter menggunakan ?traveler_id=xxx
router.get('/', getReviews);

// Hanya buyer yang bisa memberikan ulasan (harus login)
router.post('/', authMiddleware, authorize('buyer'), createReview);

export default router;
