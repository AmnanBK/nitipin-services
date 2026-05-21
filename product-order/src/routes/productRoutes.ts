import { Router } from 'express';
import { authMiddleware, authorize } from '../middleware/authMiddleware';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  searchProductByName
} from '../controllers/productController';

const router = Router();

// Endpoint Publik
router.get('/', getProducts);
router.get('/search', searchProductByName);
router.get('/:id', getProductById);

// Endpoint Private (Hanya Traveler)
router.post('/', authMiddleware, authorize('traveler'), createProduct);
router.put('/:id', authMiddleware, authorize('traveler'), updateProduct);
router.delete('/:id', authMiddleware, authorize('traveler'), deleteProduct);

export default router;