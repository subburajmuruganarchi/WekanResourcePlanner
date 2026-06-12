import { TokenPayload } from '../common/utils/jwt.utils';

declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
            requestId?: string;
        }
    }
}
