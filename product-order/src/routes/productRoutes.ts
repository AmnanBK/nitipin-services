import { Router } from 'express';
import { authenticate, authorizeRole } from '../middlewares/auth';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
} from '../controllers/productController';

const router = Router();

// Endpoint Publik
router.get('/', getProducts);
router.get('/:id', getProductById);

// Endpoint Private (Hanya Traveler)
router.post('/', authenticate, authorizeRole('traveler'), createProduct);
router.put('/:id', authenticate, authorizeRole('traveler'), updateProduct);
router.delete('/:id', authenticate, authorizeRole('traveler'), deleteProduct);

export default router;