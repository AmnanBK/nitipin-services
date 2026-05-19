import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { db } from '../config/db';
import { ReviewModel } from '../models/reviewModel';
import { RowDataPacket } from 'mysql2';

// POST /api/reviews
export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const buyer_id = req.user?.id;
    if (!buyer_id) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const { order_id, rating, comment } = req.body;

    if (!order_id || !rating || !comment) {
      res.status(400).json({ message: 'order_id, rating, dan comment wajib diisi' });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ message: 'Rating harus antara 1 sampai 5' });
      return;
    }

    // 1. Validasi Order di MySQL
    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT buyer_id, traveler_id, status FROM orders WHERE id = ?',
      [order_id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: 'Order tidak ditemukan' });
      return;
    }

    const order = rows[0];

    // Cek kepemilikan order
    if (String(order.buyer_id) !== String(buyer_id)) {
      res.status(403).json({ message: 'Ini bukan pesanan Anda' });
      return;
    }

    // Cek status harus completed
    if (order.status !== 'completed') {
      res.status(400).json({ message: 'Pesanan belum selesai (completed), tidak bisa memberi ulasan' });
      return;
    }

    // 2. Cek apakah sudah pernah direview
    const existingReview = await ReviewModel.findOne({ order_id: Number(order_id) });
    if (existingReview) {
      res.status(400).json({ message: 'Pesanan ini sudah pernah diberi ulasan' });
      return;
    }

    // 3. Simpan ke MongoDB
    const review = await ReviewModel.create({
      order_id: Number(order_id),
      traveler_id: String(order.traveler_id),
      buyer_id: String(buyer_id),
      rating: Number(rating),
      comment
    });

    res.status(201).json({ message: 'Ulasan berhasil ditambahkan', data: review });
  } catch (error) {
    console.error('[createReview]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/reviews
export const getReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { traveler_id } = req.query;

    const filter: any = {};
    if (traveler_id) {
      filter.traveler_id = String(traveler_id);
    }

    // Urutkan dari yang terbaru
    const reviews = await ReviewModel.find(filter).sort({ createdAt: -1 });

    res.status(200).json({ message: 'Daftar ulasan berhasil diambil', data: reviews });
  } catch (error) {
    console.error('[getReviews]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
