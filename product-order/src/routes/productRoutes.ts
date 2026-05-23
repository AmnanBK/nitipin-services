import { Router } from 'express';
import multer from 'multer';
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
const upload = multer({ storage: multer.memoryStorage() });

// Endpoint Publik
router.get('/', getProducts);
router.get('/search', searchProductByName);
router.get('/:id', getProductById);

// Endpoint Private (Hanya Traveler)
router.post('/', authMiddleware, authorize('traveler'), upload.single('photo'), createProduct);
router.put('/:id', authMiddleware, authorize('traveler'), upload.single('photo'), updateProduct);
router.delete('/:id', authMiddleware, authorize('traveler'), deleteProduct);

export default router;