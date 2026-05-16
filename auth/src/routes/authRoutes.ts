import { Router } from 'express';
import { registerTraveler, registerBuyer } from '../controllers/authController';

const router = Router();

router.post('/register/traveler', registerTraveler);
router.post('/register/buyer', registerBuyer);

export default router;
