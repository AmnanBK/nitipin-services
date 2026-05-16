import { Router } from 'express';
import { registerTraveler, registerBuyer, login } from '../controllers/authController';

const router = Router();

router.post('/register/traveler', registerTraveler);
router.post('/register/buyer', registerBuyer);
router.post('/login', login);

export default router;
