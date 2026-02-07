import { Router } from 'express';
import { roleController } from './role.controller';

const router = Router();

router.get('/', (req, res, next) => roleController.list(req, res, next));

export { router as roleRouter };
