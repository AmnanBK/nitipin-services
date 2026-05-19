import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { getNotifications } from '../controllers/notificationController';

const router = Router();

// Endpoint untuk mengambil notifikasi (wajib login, berlaku untuk buyer dan traveler)
router.get('/', authMiddleware, getNotifications);

export default router;
