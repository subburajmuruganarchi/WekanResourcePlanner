import { Router } from 'express';
import { skillController } from './skill.controller';

const router = Router();

router.get('/', (req, res, next) => skillController.list(req, res, next));

export { router as skillRouter };
