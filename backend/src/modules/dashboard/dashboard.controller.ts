import { Request, Response, NextFunction } from 'express';
import { collectDashboardMetrics, type DashboardScopeFilter } from './dashboard-metrics.service';
import { parseDashboardPeriodQuery } from './dashboard-period.util';
import { buildAllocationHeatmap, buildStaffingRiskSummary } from '../../services/dashboard-heatmap.service';
import {
    buildDeliveryRiskSummary,
    buildSkillGapForecastSummary,
    buildRaidSuggestions,
} from '../../services/risk/risk-intelligence.service';
import { resolveDataScope, toProjectScopeFilter } from '../../common/utils/data-scope.util';
import { buildPortfolioCapacityForecast } from '../../services/capacity/portfolio-capacity-forecast.service';

function parsePeriod(req: Request, res: Response): ReturnType<typeof parseDashboardPeriodQuery> | null {
    try {
        return parseDashboardPeriodQuery(req.query as Record<string, unknown>);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid period';
        res.status(400).json({ status: 'error', message });
        return null;
    }
}

function scopeFilterFromRequest(req: Request): Promise<DashboardScopeFilter | undefined> {
    return resolveDataScope(req.user).then((scope) => toProjectScopeFilter(scope));
}

export class DashboardController {
    async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const period = parsePeriod(req, res);
            if (!period) return;
            const scopeFilter = await scopeFilterFromRequest(req);
            const data = await collectDashboardMetrics(period, scopeFilter);
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
            const scopeFilter = await scopeFilterFromRequest(req);
            const data = await buildAllocationHeatmap(period, scopeFilter);
            res.json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }

    async getStaffingRisks(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const scopeFilter = await scopeFilterFromRequest(req);
            const data = await buildStaffingRiskSummary(12, scopeFilter);
            res.json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }

    async getDeliveryRisks(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const scopeFilter = await scopeFilterFromRequest(req);
            const data = await buildDeliveryRiskSummary(12, scopeFilter);
            res.json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }

    async getSkillGapForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const scopeFilter = await scopeFilterFromRequest(req);
            const data = await buildSkillGapForecastSummary(12, scopeFilter);
            res.json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }

    async getRaidSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const scopeFilter = await scopeFilterFromRequest(req);
            const data = await buildRaidSuggestions(10, scopeFilter);
            res.json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }

    async getCapacityForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const scopeFilter = await scopeFilterFromRequest(req);
            const data = await buildPortfolioCapacityForecast(scopeFilter);
            res.json({ status: 'success', data });
        } catch (error) {
            next(error);
        }
    }
}

export const dashboardController = new DashboardController();
