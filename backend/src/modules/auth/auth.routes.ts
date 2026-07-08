import { Router } from 'express';
import { AuthController } from './auth.controller';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();
const authController = new AuthController();

router.post('/login', authController.login.bind(authController));
router.post('/google-login', authController.googleLogin.bind(authController));
router.get('/me', requireRole(), authController.me.bind(authController));
router.post('/change-password', requireRole(), authController.changePassword.bind(authController));

export { router as authRouter };
