import { Router } from 'express';
import { requireRole } from '../../common/middleware/role.middleware';
import { searchController } from './search.controller';

const router = Router();

router.use(requireRole());
router.get('/', (req, res, next) => searchController.search(req, res, next));

export { router as searchRouter };
