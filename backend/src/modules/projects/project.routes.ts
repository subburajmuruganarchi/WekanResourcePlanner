import { Router } from 'express';
import { projectController } from './project.controller';

const router = Router();

// GET /api/projects
router.get('/', (req, res, next) => projectController.list(req, res, next));

// GET /api/projects/:id
router.get('/:id', (req, res, next) => projectController.getById(req, res, next));

export { router as projectRouter };
