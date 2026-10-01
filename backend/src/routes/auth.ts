import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/signup', register);
authRouter.post('/login', login);
authRouter.get('/me', authenticate, getMe);

export default authRouter;
