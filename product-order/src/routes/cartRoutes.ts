import { Router } from 'express';
import { authMiddleware, authorize } from '../middleware/authMiddleware';
import { getCart, addItemToCart, updateCartItem, removeCartItem } from '../controllers/cartController';

const router = Router();

// Semua rute keranjang membutuhkan autentikasi dan role 'buyer'
router.use(authMiddleware, authorize('buyer'));

router.get('/', getCart);
router.post('/items', addItemToCart);
router.put('/items/:product_id', updateCartItem);
router.delete('/items/:product_id', removeCartItem);

export default router;
