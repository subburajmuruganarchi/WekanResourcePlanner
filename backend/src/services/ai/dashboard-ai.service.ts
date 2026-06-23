import { Project } from '../../modules/projects/project.model';
import { ProjectAllocation } from '../../modules/allocations/allocation.model';
import { collectDashboardMetrics, activeDashboardProjectFilter } from '../../modules/dashboard/dashboard-metrics.service';
import type { DashboardPeriodRange } from '../../modules/dashboard/dashboard-period.util';
import { buildDeliveryRiskSummary, buildSkillGapForecastSummary } from '../risk/risk-intelligence.service';
import { DashboardInsight, DashboardStatsSnapshot } from './types';

export async function collectDashboardStats(
    period: DashboardPeriodRange
): Promise<DashboardStatsSnapshot> {
    return collectDashboardMetrics(period);
}

async function countOverAllocatedEmployees(): Promise<number> {
    const activeAllocations = await ProjectAllocation.find({ is_active: true }).lean();
    const byEmployee = new Map<string, number>();
    for (const a of activeAllocations) {
        const id = a.employee_id.toString();
        byEmployee.set(id, (byEmployee.get(id) || 0) + (a.allocation_percent || 0));
    }
    let count = 0;
    for (const total of byEmployee.values()) {
        if (total > 100) count++;
    }
    return count;
}

async function countDeliveryRiskProjects(): Promise<number> {
    const risks = await buildDeliveryRiskSummary(200);
    return risks.filter((r) => r.level === 'MEDIUM' || r.level === 'HIGH').length;
}

async function countFutureCapabilityGaps(): Promise<number> {
    const forecasts = await buildSkillGapForecastSummary(200);
    return forecasts.length;
}

/** Deterministic narrative from live stats — read-only, no LLM required. */
export async function buildDashboardInsight(
    period: DashboardPeriodRange
): Promise<DashboardInsight> {
    const metrics = await collectDashboardStats(period);

    const overAllocatedEmployees = await countOverAllocatedEmployees();
    const deliveryRiskProjects = await countDeliveryRiskProjects();
    const capabilityGaps = await countFutureCapabilityGaps();

    const plannedHours = Math.round(metrics.plannedHours);
    const loggedHours = Math.round(metrics.hoursThisWeek);
    const approvedHours = Math.round(metrics.approvedHours);
    const deliveryPct =
        plannedHours > 0
            ? Math.min(999, Math.round((Math.max(loggedHours, approvedHours) / plannedHours) * 1000) / 10)
            : loggedHours > 0 || approvedHours > 0
              ? 100
              : 0;

    const bullets: string[] = [
        `${metrics.activeProjects} active project(s) · ${metrics.totalEmployees} employees in the roster.`,
        `${plannedHours.toLocaleString()}h planned · ${loggedHours.toLocaleString()}h logged · ${approvedHours.toLocaleString()}h approved (${deliveryPct}% vs plan).`,
        `Allocation utilization averages ${metrics.avgUtilization}% for the selected period.`,
    ];

    if (metrics.pendingApprovals > 0) {
        bullets.push(`${metrics.pendingApprovals} timesheet(s) awaiting PM approval.`);
    }
    if (overAllocatedEmployees > 0) {
        bullets.push(`${overAllocatedEmployees} employee(s) committed above 100% portfolio capacity.`);
    }
    if (deliveryRiskProjects > 0) {
        bullets.push(
            `${deliveryRiskProjects} project(s) flagged for Current Delivery Risk (allocation or planner capacity).`
        );
    }
    if (capabilityGaps > 0) {
        bullets.push(
            `${capabilityGaps} project(s) have Future Capability Gap forecasts from the project plan (planning only).`
        );
    }
    if (metrics.rejectedHours > 0) {
        bullets.push(`${metrics.rejectedHours.toLocaleString()} hour(s) rejected — review rejection patterns.`);
    }

    const narrative = bullets.join(' ');

    return { narrative, bullets, metrics };
}
