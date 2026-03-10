import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.utils';

export function requireRole(...allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        // Look for Bearer token
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                status: 'error',
                message: 'No token provided or invalid format. Expected: Bearer <token>'
            });
            return;
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = verifyToken(token);
            req.user = decoded; // Attach payload to request

            // If allowedRoles is empty, just require valid auth (any role)
            if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
                res.status(403).json({
                    status: 'error',
                    message: `Access denied. Assigned role: ${decoded.role}. Requires one of: ${allowedRoles.join(', ')}`
                });
                return;
            }

            next();
        } catch (error) {
            res.status(401).json({
                status: 'error',
                message: 'Invalid or expired token.'
            });
            return;
        }
    };
}
