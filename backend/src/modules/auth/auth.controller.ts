import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { AppError } from '../../common/errors/app-error';

const authService = new AuthService();

export class AuthController {
    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email and password are required for login'
                });
            }

            const result = await authService.login(email.toLowerCase().trim(), password);

            res.status(200).json({
                status: 'success',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async googleLogin(req: Request, res: Response, next: NextFunction) {
        try {
            const { idToken } = req.body;

            if (!idToken) {
                return res.status(400).json({
                    status: 'error',
                    message: 'ID Token is required for Google login'
                });
            }

            const result = await authService.googleLogin(idToken);

            res.status(200).json({
                status: 'success',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async me(req: Request, res: Response, next: NextFunction) {
        try {
            const employeeId = req.user?.employeeId;
            if (!employeeId) {
                throw new AppError('Not authenticated.', 401);
            }

            const result = await authService.getMe(employeeId);

            res.status(200).json({
                status: 'success',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
}
