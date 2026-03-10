import { Router } from 'express';
import { skillController } from './skill.controller';

const router = Router();

router.get('/', (req, res, next) => skillController.list(req, res, next));
router.post('/', (req, res, next) => skillController.create(req, res, next));
router.patch('/:id', (req, res, next) => skillController.update(req, res, next));
router.delete('/:id', (req, res, next) => skillController.delete(req, res, next));

export { router as skillRouter };
