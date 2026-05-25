import { Project } from '../../modules/projects/project.model';
import { ProjectAllocation } from '../../modules/allocations/allocation.model';
import { collectDashboardMetrics } from '../../modules/dashboard/dashboard-metrics.service';
import { projectService } from '../../modules/projects/project.service';
import { DashboardInsight, DashboardStatsSnapshot } from './types';

export async function collectDashboardStats(): Promise<DashboardStatsSnapshot> {
    return collectDashboardMetrics();
}

/** Deterministic narrative from live stats — read-only, no LLM required. */
export async function buildDashboardInsight(): Promise<DashboardInsight> {
    const metrics = await collectDashboardStats();

    const overAllocatedEmployees = await countOverAllocatedEmployees();
    const staffingRiskProjects = await countProjectsWithSkillGaps();

    const bullets: string[] = [
        `${metrics.activeProjects} active project(s) with ${metrics.totalEmployees} active employees.`,
        `Average utilization across allocations is ${metrics.avgUtilization}%.`,
        `${metrics.hoursThisWeek.toLocaleString()} hour(s) logged this week.`,
    ];

    if (metrics.pendingApprovals > 0) {
        bullets.push(`${metrics.pendingApprovals} timesheet(s) awaiting PM approval.`);
    }
    if (overAllocatedEmployees > 0) {
        bullets.push(`${overAllocatedEmployees} employee(s) allocated above 100% capacity.`);
    }
    if (staffingRiskProjects > 0) {
        bullets.push(`${staffingRiskProjects} project(s) have open skill or headcount gaps.`);
    }
    if (metrics.rejectedHours > 0) {
        bullets.push(`${metrics.rejectedHours.toLocaleString()} hour(s) rejected lifetime — review rejection patterns.`);
    }

    const narrative = bullets.join(' ');

    return { narrative, bullets, metrics };
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

async function countProjectsWithSkillGaps(): Promise<number> {
    const projects = await Project.find({ status: 'Active' }).select('_id').lean();
    let count = 0;
    for (const p of projects) {
        const detail = await projectService.findById(p._id.toString());
        if (!detail) continue;
        const gaps = detail.skillRequirements?.some((r) => (r.remainingHeadcount ?? 0) > 0);
        if (gaps) count++;
    }
    return count;
}
