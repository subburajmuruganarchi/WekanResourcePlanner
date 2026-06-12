import { Router } from 'express';
import multer from 'multer';
import { requireRole } from '../../common/middleware/role.middleware';
import { plannerImportController } from './planner-import.controller';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const name = file.originalname.toLowerCase();
        if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
            cb(null, true);
            return;
        }
        cb(new Error('Only Excel files (.xlsx) are allowed'));
    },
});

const router = Router();

router.post(
    '/',
    requireRole('Admin'),
    upload.fields([
        { name: 'resource', maxCount: 1 },
        { name: 'project', maxCount: 1 },
        { name: 'projectAllocation', maxCount: 1 },
    ]),
    (req, res, next) => plannerImportController.import(req, res, next)
);

export { router as plannerImportRouter };
