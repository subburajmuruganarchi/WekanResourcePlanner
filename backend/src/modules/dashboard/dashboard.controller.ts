import { Request, Response, NextFunction } from 'express';
import { collectDashboardMetrics } from './dashboard-metrics.service';
import { buildAllocationHeatmap, buildStaffingRiskSummary } from '../../services/dashboard-heatmap.service';

export class DashboardController {
    async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await collectDashboardMetrics();
            res.json({
                status: 'success',
                data: {
                    activeProjects: data.activeProjects,
                    totalEmployees: data.totalEmployees,
                    avgUtilization: data.avgUtilization,
                    hoursThisWeek: data.hoursThisWeek,
                    pendingApprovals: data.pendingApprovals,
                    approvedHours: data.approvedHours,
                    rejectedHours: data.rejectedHours,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async getAllocationHeatmap(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await buildAllocationHeatmap();
            res.json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }

    async getStaffingRisks(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await buildStaffingRiskSummary(6);
            res.json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }
}

export const dashboardController = new DashboardController();
