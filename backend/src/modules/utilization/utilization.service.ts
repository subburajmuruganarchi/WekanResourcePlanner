import { Types, type PipelineStage } from 'mongoose';
import { WeeklyAllocationEntry } from '../weekly-allocations/weekly-allocation-entry.model';
import { ProjectAllocation } from '../allocations/allocation.model';
import { weeklyAllocationSyncService } from '../weekly-allocations/weekly-allocation-sync.service';
import { Employee } from '../employees/employee.model';
import { Project } from '../projects/project.model';
import {
    parseWeekStartParam,
    startOfUtcWeek,
    endOfUtcWeek,
    weekStartToIsoDate,
    listUtcWeekStarts,
} from '../../common/utils/week.util';
import {
    weeklyCapacityEngine,
    WeeklyCapacityEngine,
    type WeeklyHourCell,
} from '../../services/weekly-capacity/weekly-capacity.engine';
import { weeklyActualsSyncService } from '../../services/weekly-actuals/weekly-actuals-sync.service';
import { AppError } from '../../common/errors/app-error';
import { features } from '../../config/features';
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

        const rowKey = (employeeId: string, projectId: string, weekStart: string) =>
            `${employeeId}:${projectId}:${weekStart}`;
        const rowMap = new Map<string, UtilizationVarianceRow>();

        for (const e of entries) {
            const emp = e.employee_id as {
                _id?: Types.ObjectId;
                first_name?: string;
                last_name?: string;
            };
            const proj = e.project_id as {
                _id?: Types.ObjectId;
                project_name?: string;
                project_code?: string;
            };
            const planned = e.planned_hours;
            const actual = e.actual_hours;
            const employeeId = (emp._id ?? e.employee_id).toString();
            const projectId = (proj._id ?? e.project_id).toString();
            const weekStart = weekStartToIsoDate(e.week_start);
            rowMap.set(rowKey(employeeId, projectId, weekStart), {
                employeeId,
                employeeName: emp.first_name
                    ? `${emp.first_name} ${emp.last_name ?? ''}`.trim()
                    : undefined,
                projectId,
                projectName: proj.project_name,
                projectCode: proj.project_code,
                weekStart,
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
            });
        }

        // Same source as Resource Allocation grid: fill planned from project_allocations
        // when weekly_allocation_entries do not yet exist for that week.
        if (features.weeklyAllocationsLegacyRead) {
            const legacyFilter: Record<string, unknown> = {
                is_active: true,
                start_date: { $lte: endOfUtcWeek(weekTo) },
                end_date: { $gte: weekFrom },
            };
            if (params.employeeId) {
                legacyFilter.employee_id = new Types.ObjectId(params.employeeId);
            }
            if (params.projectId) {
                legacyFilter.project_id = new Types.ObjectId(params.projectId);
            }

            const legacyAllocs = await ProjectAllocation.find(legacyFilter).lean();
            const weeks = listUtcWeekStarts(weekFrom, weekTo);
            const synthesized = weeklyAllocationSyncService.buildLegacyGridCells(
                legacyAllocs,
                weeks
            );

            const missingEmpIds = new Set<string>();
            const missingProjIds = new Set<string>();
            for (const cell of synthesized) {
                const weekIso = weekStartToIsoDate(cell.weekStart);
                if (rowMap.has(rowKey(cell.employeeId, cell.projectId, weekIso))) continue;
                missingEmpIds.add(cell.employeeId);
                missingProjIds.add(cell.projectId);
            }

            const [employees, projects] = await Promise.all([
                missingEmpIds.size
                    ? Employee.find({
                          _id: { $in: [...missingEmpIds].map((id) => new Types.ObjectId(id)) },
                      })
                          .select('first_name last_name')
                          .lean()
                    : Promise.resolve([]),
                missingProjIds.size
                    ? Project.find({
                          _id: { $in: [...missingProjIds].map((id) => new Types.ObjectId(id)) },
                      })
                          .select('project_name project_code')
                          .lean()
                    : Promise.resolve([]),
            ]);

            const empNameById = new Map(
                employees.map((e) => [
                    e._id.toString(),
                    `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim(),
                ])
            );
            const projById = new Map(
                projects.map((p) => [
                    p._id.toString(),
                    { name: p.project_name, code: p.project_code },
                ])
            );

            for (const cell of synthesized) {
                const weekIso = weekStartToIsoDate(cell.weekStart);
                const key = rowKey(cell.employeeId, cell.projectId, weekIso);
                const existing = rowMap.get(key);
                // Prefer persisted weekly planned; only fill from legacy when missing or 0.
                if (existing && existing.plannedHours > 0) continue;
                if (existing && cell.plannedHours <= 0) continue;

                const planned = cell.plannedHours;
                const actual = existing?.actualHours ?? 0;
                const forecast = existing?.forecastHours ?? cell.forecastHours;
                const projMeta = projById.get(cell.projectId);
                rowMap.set(key, {
                    employeeId: cell.employeeId,
                    employeeName:
                        existing?.employeeName ??
                        empNameById.get(cell.employeeId) ??
                        undefined,
                    projectId: cell.projectId,
                    projectName: existing?.projectName ?? projMeta?.name,
                    projectCode: existing?.projectCode ?? projMeta?.code,
                    weekStart: weekIso,
                    plannedHours: planned,
                    actualHours: actual,
                    forecastHours: forecast,
                    varianceHours: WeeklyCapacityEngine.computeVarianceHours(planned, actual),
                    deltaHours: weeklyCapacityEngine.actualMinusPlannedVariance(planned, actual),
                    variancePercent: weeklyCapacityEngine.variancePercent(planned, actual),
                    actualUtilizationPercent:
                        weeklyCapacityEngine.actualUtilizationPercent(actual),
                    forecastAccuracyPercent: weeklyCapacityEngine.forecastAccuracyPercent(
                        forecast,
                        actual
                    ),
                });
            }
        }

        const rows = [...rowMap.values()];

        const totalPlanned = rows.reduce((s, r) => s + r.plannedHours, 0);
        const totalActual = rows.reduce((s, r) => s + r.actualHours, 0);
        const totalVariance = rows.reduce((s, r) => s + r.varianceHours, 0);
        const avgVariancePercent =
            rows.length > 0
                ? Math.round(
                      (rows.reduce((s, r) => s + r.variancePercent, 0) / rows.length) * 100
                  ) / 100
                : 0;

        const capacity = features.weeklyCapacityHours ?? 40;

        const projectTotals = new Map<
            string,
            {
                projectId: string;
                projectName?: string;
                projectCode?: string;
                plannedHours: number;
                actualHours: number;
            }
        >();
        const employeeWeekTotals = new Map<
            string,
            {
                employeeId: string;
                employeeName?: string;
                plannedHours: number;
                actualHours: number;
            }
        >();

        for (const r of rows) {
            const pt = projectTotals.get(r.projectId) ?? {
                projectId: r.projectId,
                projectName: r.projectName,
                projectCode: r.projectCode,
                plannedHours: 0,
                actualHours: 0,
            };
            pt.plannedHours += r.plannedHours;
            pt.actualHours += r.actualHours;
            projectTotals.set(r.projectId, pt);

            const ewKey = `${r.employeeId}:${r.weekStart}`;
            const ew = employeeWeekTotals.get(ewKey) ?? {
                employeeId: r.employeeId,
                employeeName: r.employeeName,
                plannedHours: 0,
                actualHours: 0,
            };
            ew.plannedHours += r.plannedHours;
            ew.actualHours += r.actualHours;
            employeeWeekTotals.set(ewKey, ew);
        }

        const overrunProjects = [...projectTotals.values()]
            .filter((p) => p.actualHours > p.plannedHours + 0.01)
            .map((p) => ({
                projectId: p.projectId,
                projectName: p.projectName,
                projectCode: p.projectCode,
                plannedHours: Math.round(p.plannedHours * 100) / 100,
                actualHours: Math.round(p.actualHours * 100) / 100,
                overrunHours: Math.round((p.actualHours - p.plannedHours) * 100) / 100,
            }))
            .sort((a, b) => b.overrunHours - a.overrunHours);

        const underutilizedEmployees = [...employeeWeekTotals.values()]
            .filter(
                (e) =>
                    e.plannedHours >= capacity * 0.5 &&
                    e.actualHours < e.plannedHours * 0.5
            )
            .map((e) => ({
                employeeId: e.employeeId,
                employeeName: e.employeeName,
                plannedHours: Math.round(e.plannedHours * 100) / 100,
                actualHours: Math.round(e.actualHours * 100) / 100,
                varianceHours: Math.round((e.plannedHours - e.actualHours) * 100) / 100,
            }))
            .sort((a, b) => b.varianceHours - a.varianceHours);

        return {
            weekStartFrom: weekStartToIsoDate(weekFrom),
            weekStartTo: weekStartToIsoDate(weekTo),
            rows,
            summary: {
                totalPlannedHours: Math.round(totalPlanned * 100) / 100,
                totalActualHours: Math.round(totalActual * 100) / 100,
                totalVarianceHours: Math.round(totalVariance * 100) / 100,
                avgVariancePercent,
                underutilizedEmployeeCount: underutilizedEmployees.length,
                overrunProjectCount: overrunProjects.length,
            },
            underutilizedEmployees,
            overrunProjects,
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
