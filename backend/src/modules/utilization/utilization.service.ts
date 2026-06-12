import { Types, type PipelineStage } from 'mongoose';
import { WeeklyAllocationEntry } from '../weekly-allocations/weekly-allocation-entry.model';
import { Employee } from '../employees/employee.model';
import { Project } from '../projects/project.model';
import {
    parseWeekStartParam,
    startOfUtcWeek,
    weekStartToIsoDate,
    listUtcWeekStarts,
} from '../../common/utils/week.util';
import {
    weeklyCapacityEngine,
    type WeeklyHourCell,
} from '../../services/weekly-capacity/weekly-capacity.engine';
import { weeklyActualsSyncService } from '../../services/weekly-actuals/weekly-actuals-sync.service';
import { AppError } from '../../common/errors/app-error';
import {
    pipelineOverrunProjects,
    pipelineUnderutilizedEmployees,
    pipelineUtilizationVarianceByProject,
} from './utilization.aggregations';
import type {
    UtilizationVarianceResponse,
    UtilizationVarianceRow,
    EmployeeUtilizationDetail,
    ProjectUtilizationDetail,
    UtilizationDashboardSummary,
} from './utilization.types';

export class UtilizationService {
    async getVarianceReport(params: {
        weekStartFrom: Date;
        weekStartTo: Date;
        employeeId?: string;
        projectId?: string;
    }): Promise<UtilizationVarianceResponse> {
        const weekFrom = startOfUtcWeek(params.weekStartFrom);
        const weekTo = startOfUtcWeek(params.weekStartTo);

        const filter: Record<string, unknown> = {
            week_start: { $gte: weekFrom, $lte: weekTo },
        };
        if (params.employeeId) filter.employee_id = new Types.ObjectId(params.employeeId);
        if (params.projectId) filter.project_id = new Types.ObjectId(params.projectId);

        const entries = await WeeklyAllocationEntry.find(filter)
            .populate('employee_id', 'first_name last_name')
            .populate('project_id', 'project_name project_code')
            .lean();

        const rows: UtilizationVarianceRow[] = entries.map((e) => {
            const emp = e.employee_id as { _id?: Types.ObjectId; first_name?: string; last_name?: string };
            const proj = e.project_id as {
                _id?: Types.ObjectId;
                project_name?: string;
                project_code?: string;
            };
            const planned = e.planned_hours;
            const actual = e.actual_hours;
            return {
                employeeId: (emp._id ?? e.employee_id).toString(),
                employeeName: emp.first_name
                    ? `${emp.first_name} ${emp.last_name ?? ''}`.trim()
                    : undefined,
                projectId: (proj._id ?? e.project_id).toString(),
                projectName: proj.project_name,
                projectCode: proj.project_code,
                weekStart: weekStartToIsoDate(e.week_start),
                plannedHours: planned,
                actualHours: actual,
                forecastHours: e.forecast_hours,
                varianceHours: e.variance_hours,
                deltaHours: weeklyCapacityEngine.actualMinusPlannedVariance(planned, actual),
                variancePercent: weeklyCapacityEngine.variancePercent(planned, actual),
                actualUtilizationPercent: weeklyCapacityEngine.actualUtilizationPercent(actual),
                forecastAccuracyPercent: weeklyCapacityEngine.forecastAccuracyPercent(
                    e.forecast_hours,
                    actual
                ),
            };
        });

        const totalPlanned = rows.reduce((s, r) => s + r.plannedHours, 0);
        const totalActual = rows.reduce((s, r) => s + r.actualHours, 0);
        const totalVariance = rows.reduce((s, r) => s + r.varianceHours, 0);
        const avgVariancePercent =
            rows.length > 0
                ? Math.round(
                      (rows.reduce((s, r) => s + r.variancePercent, 0) / rows.length) * 100
                  ) / 100
                : 0;

        const underutilized = await WeeklyAllocationEntry.aggregate(
            pipelineUnderutilizedEmployees(weekTo) as unknown as PipelineStage[]
        );

        const overrunProjects = await WeeklyAllocationEntry.aggregate(
            pipelineOverrunProjects(weekTo) as unknown as PipelineStage[]
        );

        return {
            weekStartFrom: weekStartToIsoDate(weekFrom),
            weekStartTo: weekStartToIsoDate(weekTo),
            rows,
            summary: {
                totalPlannedHours: Math.round(totalPlanned * 100) / 100,
                totalActualHours: Math.round(totalActual * 100) / 100,
                totalVarianceHours: Math.round(totalVariance * 100) / 100,
                avgVariancePercent,
                underutilizedEmployeeCount: underutilized.length,
                overrunProjectCount: overrunProjects.length,
            },
            underutilizedEmployees: underutilized.map((u) => ({
                employeeId: u.employeeId.toString(),
                employeeName: u.employeeName,
                plannedHours: u.plannedHours,
                actualHours: u.actualHours,
                varianceHours: u.varianceHours,
            })),
            overrunProjects: overrunProjects.map((p) => ({
                projectId: p.projectId.toString(),
                projectName: p.projectName,
                projectCode: p.projectCode,
                plannedHours: p.plannedHours,
                actualHours: p.actualHours,
                overrunHours: p.overrunHours,
            })),
        };
    }

    async getEmployeeUtilization(
        employeeId: string,
        params: { weekStartFrom: Date; weekStartTo: Date }
    ): Promise<EmployeeUtilizationDetail> {
        if (!Types.ObjectId.isValid(employeeId)) {
            throw new AppError('Invalid employee id', 400);
        }

        const employee = await Employee.findById(employeeId).lean();
        if (!employee) throw new AppError('Employee not found', 404);

        const report = await this.getVarianceReport({
            weekStartFrom: params.weekStartFrom,
            weekStartTo: params.weekStartTo,
            employeeId,
        });

        const weeks = listUtcWeekStarts(
            startOfUtcWeek(params.weekStartFrom),
            startOfUtcWeek(params.weekStartTo)
        );

        const weekDetails = weeks.map((w) => {
            const iso = weekStartToIsoDate(w);
            const projects = report.rows.filter((r) => r.weekStart === iso);
            const cells = projects.map((p) => ({
                projectId: p.projectId,
                plannedHours: p.plannedHours,
                actualHours: p.actualHours,
                forecastHours: p.forecastHours,
            })) as WeeklyHourCell[];
            const m = weeklyCapacityEngine.computeEmployeeWeek({
                employeeId,
                weekStart: iso,
                cells,
            });
            return {
                weekStart: iso,
                metrics: {
                    plannedHours: m.plannedHours,
                    actualHours: m.actualHours,
                    forecastHours: m.forecastHours,
                    planVarianceHours: m.planVarianceHours,
                    deltaHours: m.varianceHours,
                    actualUtilizationPercent: m.actualUtilizationPercent,
                    variancePercent: m.variancePercent,
                    forecastAccuracyPercent: m.forecastAccuracyPercent,
                },
                projects,
            };
        });

        return {
            employeeId,
            employeeName: `${employee.first_name} ${employee.last_name}`.trim(),
            weekStartFrom: report.weekStartFrom,
            weekStartTo: report.weekStartTo,
            weeks: weekDetails,
        };
    }

    async getProjectUtilization(
        projectId: string,
        params: { weekStartFrom: Date; weekStartTo: Date }
    ): Promise<ProjectUtilizationDetail> {
        if (!Types.ObjectId.isValid(projectId)) {
            throw new AppError('Invalid project id', 400);
        }

        const project = await Project.findById(projectId).lean();
        if (!project) throw new AppError('Project not found', 404);

        const report = await this.getVarianceReport({
            weekStartFrom: params.weekStartFrom,
            weekStartTo: params.weekStartTo,
            projectId,
        });

        const weeks = listUtcWeekStarts(
            startOfUtcWeek(params.weekStartFrom),
            startOfUtcWeek(params.weekStartTo)
        );

        const weekDetails = weeks.map((w) => {
            const iso = weekStartToIsoDate(w);
            const rows = report.rows.filter((r) => r.weekStart === iso);
            const plannedHours = rows.reduce((s, r) => s + r.plannedHours, 0);
            const actualHours = rows.reduce((s, r) => s + r.actualHours, 0);
            return {
                weekStart: iso,
                plannedHours,
                actualHours,
                overrunHours: Math.max(0, actualHours - plannedHours),
                contributors: rows.map((r) => ({
                    employeeId: r.employeeId,
                    employeeName: r.employeeName,
                    actualHours: r.actualHours,
                    plannedHours: r.plannedHours,
                })),
            };
        });

        return {
            projectId,
            projectName: project.project_name,
            projectCode: project.project_code,
            weekStartFrom: report.weekStartFrom,
            weekStartTo: report.weekStartTo,
            weeks: weekDetails,
        };
    }

    async getDashboardSummary(weekStart?: Date): Promise<UtilizationDashboardSummary> {
        const week = startOfUtcWeek(weekStart ?? new Date());
        const report = await this.getVarianceReport({
            weekStartFrom: week,
            weekStartTo: week,
        });

        const employeeWeeks = new Map<string, { planned: number; actual: number }>();
        for (const r of report.rows) {
            const key = r.employeeId;
            const cur = employeeWeeks.get(key) ?? { planned: 0, actual: 0 };
            cur.planned += r.plannedHours;
            cur.actual += r.actualHours;
            employeeWeeks.set(key, cur);
        }

        let utilSum = 0;
        let varSum = 0;
        let count = 0;
        for (const { planned, actual } of employeeWeeks.values()) {
            utilSum += weeklyCapacityEngine.actualUtilizationPercent(actual);
            varSum += weeklyCapacityEngine.variancePercent(planned, actual);
            count++;
        }

        return {
            weekStart: weekStartToIsoDate(week),
            totalPlannedHours: report.summary.totalPlannedHours,
            totalActualHours: report.summary.totalActualHours,
            planVarianceHours: report.summary.totalVarianceHours,
            avgActualUtilizationPercent:
                count > 0 ? Math.round((utilSum / count) * 100) / 100 : 0,
            avgVariancePercent: report.summary.avgVariancePercent,
            overrunProjects: report.overrunProjects.map((p) => ({
                projectId: p.projectId,
                projectName: p.projectName ?? p.projectCode ?? 'Project',
                overrunHours: p.overrunHours,
            })),
        };
    }

    async runActualsSync(params: {
        weekStartFrom: Date;
        weekStartTo: Date;
        employeeId?: string;
        projectId?: string;
        actorId?: string;
    }) {
        return weeklyActualsSyncService.syncApprovedActuals({
            weekStartFrom: startOfUtcWeek(params.weekStartFrom),
            weekStartTo: startOfUtcWeek(params.weekStartTo),
            employeeIds: params.employeeId
                ? [new Types.ObjectId(params.employeeId)]
                : undefined,
            projectIds: params.projectId
                ? [new Types.ObjectId(params.projectId)]
                : undefined,
            actorId:
                params.actorId && Types.ObjectId.isValid(params.actorId)
                    ? new Types.ObjectId(params.actorId)
                    : undefined,
        });
    }
}

export const utilizationService = new UtilizationService();
