import { Router } from 'express';
import { registerTraveler } from '../controllers/authController';

const router = Router();

router.post('/register/traveler', registerTraveler);

export default router;
