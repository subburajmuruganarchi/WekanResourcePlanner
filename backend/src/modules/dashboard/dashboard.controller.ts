import { Request, Response, NextFunction } from 'express';
import { collectDashboardMetrics } from './dashboard-metrics.service';
import { parseDashboardPeriodQuery } from './dashboard-period.util';
import { buildAllocationHeatmap, buildStaffingRiskSummary } from '../../services/dashboard-heatmap.service';

function parsePeriod(req: Request, res: Response): ReturnType<typeof parseDashboardPeriodQuery> | null {
    try {
        return parseDashboardPeriodQuery(req.query as Record<string, unknown>);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid period';
        res.status(400).json({ status: 'error', message });
        return null;
    }
}

export class DashboardController {
    async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const period = parsePeriod(req, res);
            if (!period) return;
            const data = await collectDashboardMetrics(period);
            res.json({
                status: 'success',
                data: {
                    activeProjects: data.activeProjects,
                    totalEmployees: data.totalEmployees,
                    avgUtilization: data.avgUtilization,
                    plannedHours: data.plannedHours,
                    hoursThisWeek: data.hoursThisWeek,
                    approvedHours: data.approvedHours,
                    planDeliveryPercent: data.planDeliveryPercent,
                    pendingApprovals: data.pendingApprovals,
                    rejectedHours: data.rejectedHours,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async getAllocationHeatmap(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const period = parsePeriod(req, res);
            if (!period) return;
            const data = await buildAllocationHeatmap(period);
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
