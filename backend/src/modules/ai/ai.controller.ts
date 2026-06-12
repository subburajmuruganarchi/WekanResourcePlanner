import { Request, Response, NextFunction } from 'express';
import { buildDashboardInsight } from '../../services/ai/dashboard-ai.service';
import { parseDashboardPeriodQuery } from '../dashboard/dashboard-period.util';
import { explainAllocationRank } from '../../services/ai/allocation-ai.service';
import { assessStaffingRisk } from '../../services/ai/staffing-risk.service';
import { analyzePendingApprovals } from '../../services/ai/approval-ai.service';
import { buildTimeEntrySuggestions } from '../../services/ai/forecast-ai.service';
import { getAuthEmployeeId } from '../../common/utils/auth-user.util';

export class AiController {
    async dashboardSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            let period;
            try {
                period = parseDashboardPeriodQuery(req.query as Record<string, unknown>);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Invalid period';
                res.status(400).json({ status: 'error', message });
                return;
            }
            const insight = await buildDashboardInsight(period);
            res.json({ status: 'success', data: insight });
        } catch (error) {
            next(error);
        }
    }

    async explainAllocation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { projectId, employeeId, startDate, endDate } = req.query;
            if (!projectId || !employeeId) {
                res.status(400).json({ status: 'error', message: 'projectId and employeeId are required' });
                return;
            }
            const explanation = await explainAllocationRank({
                projectId: projectId as string,
                employeeId: employeeId as string,
                startDate: startDate as string | undefined,
                endDate: endDate as string | undefined,
            });
            if (!explanation) {
                res.status(404).json({ status: 'error', message: 'Employee not found in ranking for this project' });
                return;
            }
            res.json({ status: 'success', data: explanation });
        } catch (error) {
            next(error);
        }
    }

    async staffingRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { projectId } = req.params;
            const assessment = await assessStaffingRisk(projectId);
            res.json({ status: 'success', data: assessment });
        } catch (error) {
            if (error instanceof Error && error.message === 'Project not found') {
                res.status(404).json({ status: 'error', message: error.message });
                return;
            }
            next(error);
        }
    }

    async approvalAnomalies(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const pmUserId = getAuthEmployeeId(req.user);
            if (!pmUserId) {
                res.status(401).json({ status: 'error', message: 'Authentication required.' });
                return;
            }
            const includeAll = req.user?.role === 'Admin';
            const summary = await analyzePendingApprovals(pmUserId, { includeAll });
            res.json({ status: 'success', data: summary });
        } catch (error) {
            next(error);
        }
    }

    async timeEntrySuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { employeeId, week } = req.query;
            if (!employeeId || !week) {
                res.status(400).json({ status: 'error', message: 'employeeId and week query params are required' });
                return;
            }
            const suggestions = await buildTimeEntrySuggestions(employeeId as string, week as string);
            res.json({ status: 'success', data: suggestions });
        } catch (error) {
            next(error);
        }
    }
}

export const aiController = new AiController();
