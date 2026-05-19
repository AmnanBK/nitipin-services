import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { NotificationModel } from '../models/notificationModel';

// GET /api/notifications
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user_id = req.user?.id;
    const user_type = req.user?.role; // 'buyer' atau 'traveler'

    if (!user_id || !user_type) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Ambil notifikasi milik user ini saja, dan urutkan dari yang terbaru
    const notifications = await NotificationModel.find({
      user_id: String(user_id),
      user_type: String(user_type)
    }).sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Daftar notifikasi berhasil diambil',
      data: notifications
    });
  } catch (error) {
    console.error('[getNotifications]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
