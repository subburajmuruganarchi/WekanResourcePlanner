import { Router } from 'express';
import { okrController } from './okr.controller';
import { requireRole } from '../../common/middleware/role.middleware';
import { OKR_CREATE_ROLES, ROLES } from '../../common/constants/roles';

const router = Router();

router.get('/', requireRole(), okrController.list);
router.get('/periods', requireRole(), okrController.listPeriods);
router.get('/org-rollup', requireRole(ROLES.ADMIN, ROLES.CEO, ROLES.DELIVERY_MANAGER), okrController.orgRollup);
router.get('/employee/:employeeId', requireRole(), okrController.getByEmployee);
router.post('/', requireRole(...OKR_CREATE_ROLES), okrController.create);
router.put('/:id', requireRole(...OKR_CREATE_ROLES), okrController.update);
router.patch('/:id/progress', requireRole(...OKR_CREATE_ROLES, ROLES.EMPLOYEE), okrController.updateProgress);
router.delete('/:id', requireRole(ROLES.ADMIN), okrController.delete);

export const okrRouter = router;
