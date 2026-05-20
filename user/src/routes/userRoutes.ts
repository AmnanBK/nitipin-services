import { Router } from 'express';
import multer from 'multer';
import { getTravelerById, updateTraveler, updateTravelerStatus, updateTravelerCountry, getTravelerBalance, getTravelerReviews, getBuyerById, updateBuyer, createBuyerAddress, getBuyerAddresses, updateBuyerAddress, deleteBuyerAddress, setDefaultBuyerAddress, getCountries } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Routes for traveler profile
router.get('/travelers/:id', getTravelerById);
router.get('/api/travelers/:id', getTravelerById);
router.put('/travelers/:id', authMiddleware, upload.single('photo'), updateTraveler);
router.put('/api/travelers/:id', authMiddleware, upload.single('photo'), updateTraveler);
router.patch('/travelers/:id/status', authMiddleware, updateTravelerStatus);
router.patch('/api/travelers/:id/status', authMiddleware, updateTravelerStatus);
router.patch('/travelers/:id/country', authMiddleware, updateTravelerCountry);
router.patch('/api/travelers/:id/country', authMiddleware, updateTravelerCountry);
router.get('/travelers/:id/balance', authMiddleware, getTravelerBalance);
router.get('/api/travelers/:id/balance', authMiddleware, getTravelerBalance);
router.get('/travelers/:id/reviews', getTravelerReviews);
router.get('/api/travelers/:id/reviews', getTravelerReviews);

// Routes for buyer profile
router.get('/buyers/:id', authMiddleware, getBuyerById);
router.get('/api/buyers/:id', authMiddleware, getBuyerById);
router.put('/buyers/:id', authMiddleware, upload.single('photo'), updateBuyer);
router.put('/api/buyers/:id', authMiddleware, upload.single('photo'), updateBuyer);
router.post('/buyers/:id/addresses', authMiddleware, createBuyerAddress);
router.post('/api/buyers/:id/addresses', authMiddleware, createBuyerAddress);
router.get('/buyers/:id/addresses', authMiddleware, getBuyerAddresses);
router.get('/api/buyers/:id/addresses', authMiddleware, getBuyerAddresses);
router.put('/buyers/:id/addresses/:address_id', authMiddleware, updateBuyerAddress);
router.put('/api/buyers/:id/addresses/:address_id', authMiddleware, updateBuyerAddress);
router.delete('/buyers/:id/addresses/:address_id', authMiddleware, deleteBuyerAddress);
router.delete('/api/buyers/:id/addresses/:address_id', authMiddleware, deleteBuyerAddress);
router.patch('/buyers/:id/addresses/:address_id/default', authMiddleware, setDefaultBuyerAddress);
router.patch('/api/buyers/:id/addresses/:address_id/default', authMiddleware, setDefaultBuyerAddress);

// Public routes
router.get('/countries', getCountries);
router.get('/api/countries', getCountries);

// Fallback/debug route to see if path is stripped by gateway
router.get('/:id', authMiddleware, getTravelerById);
router.put('/:id', authMiddleware, upload.single('photo'), updateTraveler);
router.patch('/:id/status', authMiddleware, updateTravelerStatus);
router.patch('/:id/country', authMiddleware, updateTravelerCountry);
router.get('/:id/balance', authMiddleware, getTravelerBalance);
router.get('/:id/reviews', getTravelerReviews);

export default router;
