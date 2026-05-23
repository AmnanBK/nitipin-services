import { Router } from 'express';
import multer from 'multer';
import { getTravelerById, updateTraveler, updateTravelerStatus, updateTravelerCountry, getTravelerBalance, getTravelerReviews, getBuyerById, updateBuyer, createBuyerAddress, getBuyerAddresses, updateBuyerAddress, deleteBuyerAddress, setDefaultBuyerAddress, getCountries, topUpBuyer } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Routes for traveler profile
router.get('/api/travelers/:id', getTravelerById);
router.put('/api/travelers/:id', authMiddleware, upload.single('photo'), updateTraveler);
router.patch('/api/travelers/:id/status', authMiddleware, updateTravelerStatus);
router.patch('/api/travelers/:id/country', authMiddleware, updateTravelerCountry);
router.get('/api/travelers/:id/balance', authMiddleware, getTravelerBalance);
router.get('/api/travelers/:id/reviews', getTravelerReviews);

// Routes for buyer profile
router.get('/api/buyers/:id', authMiddleware, getBuyerById);
router.put('/api/buyers/:id', authMiddleware, upload.single('photo'), updateBuyer);
router.post('/api/buyers/:id/addresses', authMiddleware, createBuyerAddress);
router.get('/api/buyers/:id/addresses', authMiddleware, getBuyerAddresses);
router.put('/api/buyers/:id/addresses/:address_id', authMiddleware, updateBuyerAddress);
router.delete('/api/buyers/:id/addresses/:address_id', authMiddleware, deleteBuyerAddress);
router.patch('/api/buyers/:id/addresses/:address_id/default', authMiddleware, setDefaultBuyerAddress);
router.post('/api/buyers/:id/topup', authMiddleware, topUpBuyer);

// Public routes
router.get('/api/countries', getCountries);

export default router;
