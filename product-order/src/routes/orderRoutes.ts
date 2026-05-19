import { Router } from 'express';
import { authMiddleware, authorize } from '../middleware/authMiddleware';
import {
  createCheckout,
  approveOrder,
  rejectOrCancelOrder,
  purchaseOrder,
  shipOrder,
  completeOrder,
  getOrders,
  getOrderById,
  getEscrowStatus
} from '../controllers/orderController';

const router = Router();

// ==== GET ENDPOINTS ====
// Semua user yang login (buyer maupun traveler) bisa melihat daftar pesanan mereka
router.get('/', authMiddleware, getOrders);
router.get('/:id', authMiddleware, getOrderById);
router.get('/:id/escrow', authMiddleware, getEscrowStatus);

// ==== POST (CHECKOUT) ====
// Endpoint checkout wajib punya role 'buyer'
router.post('/', authMiddleware, authorize('buyer'), createCheckout);

// ==== PATCH (STATUS TRANSITIONS) ====

// Traveler: Approve pesanan masuk
router.patch('/:id/approve', authMiddleware, authorize('traveler'), approveOrder);

// Traveler: Reject pesanan
router.patch('/:id/reject', authMiddleware, authorize('traveler'), rejectOrCancelOrder);

// Buyer: Cancel pesanan (sebelum dikirim)
router.patch('/:id/cancel', authMiddleware, authorize('buyer'), rejectOrCancelOrder);

// Traveler: Tandai sudah dibeli (harus ada bukti)
router.patch('/:id/purchased', authMiddleware, authorize('traveler'), purchaseOrder);

// Traveler: Tandai pesanan sudah dikirim
router.patch('/:id/ship', authMiddleware, authorize('traveler'), shipOrder);

// Buyer: Tandai pesanan diterima / selesai (harus ada bukti)
router.patch('/:id/complete', authMiddleware, authorize('buyer'), completeOrder);

export default router;
