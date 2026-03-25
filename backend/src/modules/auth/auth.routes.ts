import { Router } from 'express';
import { AuthController } from './auth.controller';

const router = Router();
const authController = new AuthController();

router.post('/login', authController.login.bind(authController));
router.post('/google-login', authController.googleLogin.bind(authController));

export { router as authRouter };
