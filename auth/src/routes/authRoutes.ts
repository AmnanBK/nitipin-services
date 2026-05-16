import { Router } from 'express';
import { registerTraveler, registerBuyer, login, refresh } from '../controllers/authController';

const router = Router();

router.post('/register/traveler', registerTraveler);
router.post('/register/buyer', registerBuyer);
router.post('/login', login);
router.post('/refresh', refresh);

export default router;
