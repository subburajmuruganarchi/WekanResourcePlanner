import { Request, Response, NextFunction } from 'express';
import { features } from '../../config/features';

/**
 * Gate experimental modules behind env feature flags for safe rollout.
 */
export function requireFeature(featureKey: keyof typeof features) {
    return (_req: Request, res: Response, next: NextFunction): void => {
        const enabled = features[featureKey];
        if (!enabled) {
            res.status(404).json({
                status: 'error',
                message: `Feature "${featureKey}" is disabled. Set the corresponding FEATURE_* env variable to enable.`,
            });
            return;
        }
        next();
    };
}
