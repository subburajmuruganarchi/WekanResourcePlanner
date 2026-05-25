import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.utils';
import { normalizeRoleName } from '../utils/auth-user.util';

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
            decoded.role = normalizeRoleName(decoded.role);
            req.user = decoded;

            const normalizedAllowed = allowedRoles.map(normalizeRoleName);

            // If allowedRoles is empty, just require valid auth (any role)
            if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(decoded.role)) {
                res.status(403).json({
                    status: 'error',
                    message: `Access denied. Assigned role: ${decoded.role}. Requires one of: ${normalizedAllowed.join(', ')}`
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
