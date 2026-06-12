
import { Project } from '../projects/project.model';
import { Employee } from '../employees/employee.model';
import { ProjectAllocation } from '../allocations/allocation.model';
import { ProjectRoleEffort } from '../projects/project-role-effort.model';
import { Role } from '../roles/role.model';
import { ProjectStatus } from '../../common/types/enums';
import ExcelJS from 'exceljs';
import _ from 'lodash';
import {
    addUtcWeeks,
    buildForwardUtcWeeks,
    buildHistoricUtcWeeks,
    currentUtcMonday,
    formatMonthYearHeaderUtc,
    formatWeekHeaderUtc,
} from './report-week.util';

const HOURS_PER_WEEK = 40;

/**
 * Report colour palette (aligned with legacy Resource Planner sheets).
 */
const CONFIG = {
    COLORS: {
        HEADER_BG: 'EFEFEF',
        HEADER_TEXT: '000000',
        MONTH_BG: '434343',
        MONTH_TEXT: 'FFFFFF',
        CURRENT_WEEK: 'FFF2CC',
        EXT: 'CFE2F3',
        INT: 'FFE599',
        PROJ: '808080',
        PROJ_TEXT: 'FFFFFF',
        BENCH: 'EA9999',
        TOTAL: 'E6E6E6',
        SPACER: 'F3F3F3',
        META_TEXT: '666666',
        OVERALLOCATED: '6FA8DC',
        OVERALLOCATED_DARK: '3D85C6',
        BENCH_LIGHT: 'F4CCCC',
        BENCH_HEAVY: 'E06666',
    },
    CATEGORY_PRIORITY: [
        'architect',
        'full stack', 'fullstack',
        'backend', 'back end', 'java', 'node', 'python',
        'frontend', 'front end', 'react', 'angular',
        'mobile', 'ios', 'android',
        'data', 'qa', 'test', 'design', 'product', 'manager',
    ],
    SENIORITY_PRIORITY: [
        ['vp', 'director', 'head'],
        ['principal', 'staff', 'lead', 'manager'],
        ['senior', 'sr.', 'sr ', 'iii'],
        ['ii', 'mid'],
        ['i ', 'jun', 'assoc', 'intern'],
    ],
};

type ProjectType = 'External' | 'Internal' | 'Projected';

interface ProjectRow {
    name: string;
    code: string;
    type: ProjectType;
    hours: number[];
}

interface ResourceRow {
    id: string;
    name: string;
    role: string;
    category: string;
    projects: ProjectRow[];
    totalHours: number[];
}

interface ReportData {
    resourceMap: Record<string, ResourceRow>;
    projectMap: Record<string, { id: string; name: string; code: string; resources: ResourceRow[]; totalHours: number[] }>;
    weeks: Date[];
}

type ReportHorizon = 'forward' | 'history';

export class ReportsService {
    private deriveCategory(roleName: string): string {
        const r = roleName.toLowerCase();
        if (r.includes('architect') || r.includes('principal')) return 'Architect';
        if (r.includes('full stack') || r.includes('fullstack') || r.includes('mern')) return 'Fullstack';
        if (r.includes('back end') || r.includes('backend') || r.includes('java') || r.includes('node')) return 'Backend';
        if (r.includes('front end') || r.includes('frontend') || r.includes('react')) return 'Frontend';
        if (r.includes('mobile') || r.includes('ios') || r.includes('android')) return 'Mobile';
        if (r.includes('data')) return 'Data';
        if (r.includes('qa') || r.includes('quality') || r.includes('test')) return 'Testing';
        if (r.includes('design') || r.includes('ux')) return 'Design';
        return 'Other';
    }

    private getCategoryRank(roleName: string): number {
        const r = roleName.toLowerCase();
        for (let i = 0; i < CONFIG.CATEGORY_PRIORITY.length; i++) {
            if (r.includes(CONFIG.CATEGORY_PRIORITY[i])) return i;
        }
        return 99;
    }

    private getSeniorityRank(roleName: string): number {
        const r = roleName.toLowerCase();
        for (let i = 0; i < CONFIG.SENIORITY_PRIORITY.length; i++) {
            const keywords = CONFIG.SENIORITY_PRIORITY[i];
            if (keywords.some((k) => r.includes(k))) return i;
        }
        return 3;
    }

    /** Negative = overallocated (blue), positive = bench (red spectrum). */
    private getBandwidthColor(val: number): string {
        if (val < 0) {
            if (val <= -16) return CONFIG.COLORS.OVERALLOCATED_DARK;
            if (val <= -8) return CONFIG.COLORS.OVERALLOCATED;
            return '9FC5E8';
        }
        if (val >= 24) return CONFIG.COLORS.BENCH_HEAVY;
        if (val >= 16) return CONFIG.COLORS.BENCH;
        if (val >= 8) return CONFIG.COLORS.BENCH_LIGHT;
        return 'D9EAD3';
    }

    private classifyProjectType(proj: { billing_type?: string; status?: string }): ProjectType {
        const billing = (proj.billing_type || '').toLowerCase();
        const status = (proj.status || '').toLowerCase();
        if (billing.includes('non-billable') || billing.includes('internal')) return 'Internal';
        if (status === ProjectStatus.PLANNING.toLowerCase() || billing.includes('projected')) return 'Projected';
        return 'External';
    }

    private projectTypeColor(type: ProjectType): { bg: string; fg: string } {
        if (type === 'Internal') return { bg: CONFIG.COLORS.INT, fg: '000000' };
        if (type === 'Projected') return { bg: CONFIG.COLORS.PROJ, fg: CONFIG.COLORS.PROJ_TEXT };
        return { bg: CONFIG.COLORS.EXT, fg: '000000' };
    }

    private computeWeekHours(alloc: { start_date: Date; end_date?: Date; allocation_percent: number }, weeks: Date[]): number[] {
        return weeks.map((week) => {
            const weekEnd = addUtcWeeks(week, 1);
            const allocStart = alloc.start_date;
            const allocEnd = alloc.end_date || addUtcWeeks(allocStart, 52);
            if (allocStart < weekEnd && allocEnd >= week) {
                return Math.round((alloc.allocation_percent / 100) * HOURS_PER_WEEK * 10) / 10;
            }
            return 0;
        });
    }

    private async buildHistoricWeeks(forwardWeeks: number, currentMonday: Date): Promise<Date[]> {
        const bounds = await ProjectAllocation.aggregate([
            {
                $group: {
                    _id: null,
                    minStart: { $min: '$start_date' },
                    maxEnd: { $max: '$end_date' },
                },
            },
        ]);

        const minStart = bounds[0]?.minStart
            ? new Date(bounds[0].minStart)
            : addUtcWeeks(currentMonday, -12);
        const maxEnd = bounds[0]?.maxEnd
            ? new Date(bounds[0].maxEnd)
            : addUtcWeeks(currentMonday, forwardWeeks);

        return buildHistoricUtcWeeks(minStart, maxEnd, currentMonday, forwardWeeks);
    }

    private async getReportData(numWeeks: number = 12, horizon: ReportHorizon = 'forward'): Promise<ReportData> {
        const weeks =
            horizon === 'history'
                ? await this.buildHistoricWeeks(numWeeks, currentUtcMonday())
                : buildForwardUtcWeeks(numWeeks);

        const employees = await Employee.find({
            status: { $nin: ['Inactive', 'Terminated'] },
            last_name: { $not: /^Dummy/i },
        }).populate('role_id');

        const employeeIds = employees.map((e) => e._id);
        const allocations = await ProjectAllocation.find({
            employee_id: { $in: employeeIds },
            is_active: true,
        }).populate('project_id');

        const resourceMap: Record<string, ResourceRow> = {};
        const projectMap: Record<string, ReportData['projectMap'][string]> = {};

        employees.forEach((emp: any) => {
            const roleName = emp.position || 'No Role';
            resourceMap[emp._id.toString()] = {
                id: emp._id.toString(),
                name: `${emp.first_name} ${emp.last_name}`,
                role: roleName,
                category: this.deriveCategory(roleName),
                projects: [],
                totalHours: new Array(weeks.length).fill(0),
            };
        });

        allocations.forEach((alloc: any) => {
            const empId = alloc.employee_id.toString();
            const proj = alloc.project_id;
            if (!proj || !resourceMap[empId]) return;

            const hours = this.computeWeekHours(alloc, weeks);
            const type = this.classifyProjectType(proj);

            resourceMap[empId].projects.push({
                name: proj.project_name,
                code: proj.project_code,
                type,
                hours,
            });

            hours.forEach((h, i) => {
                resourceMap[empId].totalHours[i] += h;
            });

            const projId = proj._id.toString();
            if (!projectMap[projId]) {
                projectMap[projId] = {
                    id: projId,
                    name: proj.project_name,
                    code: proj.project_code,
                    resources: [],
                    totalHours: new Array(weeks.length).fill(0),
                };
            }

            let resRow = projectMap[projId].resources.find((r) => r.id === empId);
            if (!resRow) {
                resRow = {
                    ...resourceMap[empId],
                    projects: [
                        {
                            name: proj.project_name,
                            code: proj.project_code,
                            type,
                            hours,
                        },
                    ],
                    totalHours: [...hours],
                };
                projectMap[projId].resources.push(resRow);
            } else {
                const existing = resRow.projects.find((p) => p.code === proj.project_code);
                if (existing) {
                    hours.forEach((h, i) => {
                        existing.hours[i] += h;
                    });
                } else {
                    resRow.projects.push({ name: proj.project_name, code: proj.project_code, type, hours });
                }
                hours.forEach((h, i) => {
                    resRow!.totalHours[i] += h;
                });
            }

            hours.forEach((h, i) => {
                projectMap[projId].totalHours[i] += h;
            });
        });

        return { resourceMap, projectMap, weeks };
    }

    private addMonthHeaderRow(sheet: ExcelJS.Worksheet, weeks: Date[], colOffset: number) {
        const monthRow = sheet.addRow(new Array(weeks.length + colOffset).fill(''));
        let currentMonth = '';
        let monthStartCol = colOffset + 1;
        weeks.forEach((w, i) => {
            const m = formatMonthYearHeaderUtc(w);
            if (m !== currentMonth) {
                if (currentMonth) {
                    sheet.mergeCells(1, monthStartCol, 1, i + colOffset);
                    const cell = sheet.getCell(1, monthStartCol);
                    cell.value = currentMonth;
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CONFIG.COLORS.MONTH_BG } };
                    cell.font = { color: { argb: CONFIG.COLORS.MONTH_TEXT }, bold: true };
                    cell.alignment = { horizontal: 'center' };
                }
                currentMonth = m;
                monthStartCol = i + colOffset + 1;
            }
        });
        sheet.mergeCells(1, monthStartCol, 1, weeks.length + colOffset);
        const lastMonthCell = sheet.getCell(1, monthStartCol);
        lastMonthCell.value = currentMonth;
        lastMonthCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CONFIG.COLORS.MONTH_BG } };
        lastMonthCell.font = { color: { argb: CONFIG.COLORS.MONTH_TEXT }, bold: true };
        lastMonthCell.alignment = { horizontal: 'center' };
    }

    private styleHeaderRow(row: ExcelJS.Row) {
        row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CONFIG.COLORS.HEADER_BG } };
            cell.font = { bold: true };
            cell.border = { bottom: { style: 'medium', color: { argb: '000000' } } };
        });
    }

    private writeResourceMasterSchedule(
        sheet: ExcelJS.Worksheet,
        resourceMap: Record<string, ResourceRow>,
        weeks: Date[],
        options?: { includeRequiredFteRow?: boolean; includeYearInWeekHeaders?: boolean }
    ) {
        const dateHeaders = weeks.map((w) =>
            formatWeekHeaderUtc(w, options?.includeYearInWeekHeaders ?? false)
        );
        this.addMonthHeaderRow(sheet, weeks, 3);
        const headerRow = sheet.addRow(['Role', 'Resource', 'Project / Metric', ...dateHeaders]);
        this.styleHeaderRow(headerRow);

        const sortedResources = _.values(resourceMap).sort((a, b) => a.name.localeCompare(b.name));

        sortedResources.forEach((p) => {
            p.projects.forEach((proj) => {
                const row = sheet.addRow([p.role, p.name, proj.name, ...proj.hours]);
                const colors = this.projectTypeColor(proj.type);
                row.eachCell((cell, colNumber) => {
                    if (colNumber > 3) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bg } };
                        cell.font = { color: { argb: colors.fg } };
                    }
                });
            });

            const bandwidth = p.totalHours.map((h) => Math.round((HOURS_PER_WEEK - h) * 10) / 10);
            const bandRow = sheet.addRow([p.role, p.name, 'Bandwidth', ...bandwidth]);
            bandRow.eachCell((cell, colNumber) => {
                if (colNumber > 3) {
                    const val = bandwidth[colNumber - 4];
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.getBandwidthColor(val) } };
                }
                cell.font = { bold: true };
            });

            if (options?.includeRequiredFteRow) {
                const fteRow = sheet.addRow([p.role, p.name, 'Required FTE (gap)', ...new Array(weeks.length).fill('')]);
                fteRow.font = { italic: true, color: { argb: CONFIG.COLORS.META_TEXT } };
            }

            sheet.addRow([]);
        });

        sheet.getColumn(1).width = 25;
        sheet.getColumn(2).width = 25;
        sheet.getColumn(3).width = 32;
        const weekColWidth = options?.includeYearInWeekHeaders ? 14 : 12;
        for (let i = 4; i <= dateHeaders.length + 3; i++) {
            sheet.getColumn(i).width = weekColWidth;
        }
    }

    /** REPORT: Resource View — employee-wise master schedule from current week onwards. */
    public async generateResourceViewReport(numWeeks: number = 12) {
        const { resourceMap, weeks } = await this.getReportData(numWeeks, 'forward');
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Resource View');
        this.writeResourceMasterSchedule(sheet, resourceMap, weeks);
        return workbook;
    }

    /** REPORT: Consolidated History — resource master schedule including historic allocations. */
    public async generateConsolidatedHistoryReport(numWeeks: number = 12) {
        const { resourceMap, weeks } = await this.getReportData(numWeeks, 'history');
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Consolidated History');
        this.writeResourceMasterSchedule(sheet, resourceMap, weeks, {
            includeYearInWeekHeaders: true,
        });
        return workbook;
    }

    /** Backward-compatible alias. */
    public async generateConsolidatedReport(numWeeks: number = 12) {
        return this.generateConsolidatedHistoryReport(numWeeks);
    }

    /** REPORT: Project View — project-wise master schedule from current week onwards. */
    public async generateProjectViewReport(numWeeks: number = 12) {
        const { projectMap, weeks } = await this.getReportData(numWeeks, 'forward');
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Project View');

        const dateHeaders = weeks.map((w) => formatWeekHeaderUtc(w));
        this.addMonthHeaderRow(sheet, weeks, 3);
        const headerRow = sheet.addRow(['Project', 'Role', 'Resource', ...dateHeaders]);
        this.styleHeaderRow(headerRow);

        const sortedProjects = _.values(projectMap).sort((a, b) => a.name.localeCompare(b.name));

        sortedProjects.forEach((proj) => {
            const totalRow = sheet.addRow([proj.name, '—', 'Project total', ...proj.totalHours]);
            totalRow.eachCell((cell, colNumber) => {
                if (colNumber > 3) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CONFIG.COLORS.TOTAL } };
                    cell.font = { bold: true };
                }
            });

            proj.resources
                .sort((a, b) => a.name.localeCompare(b.name))
                .forEach((res) => {
                    const assignmentType =
                        res.projects.find((p) => p.code === proj.code)?.type || 'External';
                    const row = sheet.addRow([proj.name, res.role, res.name, ...res.totalHours]);
                    const colors = this.projectTypeColor(assignmentType);
                    row.eachCell((cell, colNumber) => {
                        if (colNumber > 3) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bg } };
                            cell.font = { color: { argb: colors.fg } };
                        }
                    });
                });

            sheet.addRow([]);
        });

        sheet.getColumn(1).width = 30;
        sheet.getColumn(2).width = 25;
        sheet.getColumn(3).width = 25;
        return workbook;
    }

    /** REPORT: Role Hrs / Role % — capacity & utilization by role. */
    public async generateRoleSummaryReport(isPercentage: boolean = false, numWeeks: number = 12) {
        const { resourceMap, weeks } = await this.getReportData(numWeeks, 'forward');
        const workbook = new ExcelJS.Workbook();
        const sheetName = isPercentage ? 'Role %' : 'Role Hrs';
        const sheet = workbook.addWorksheet(sheetName);

        const roles: Record<string, { internal: number[]; external: number[]; projected: number[]; capacity: number[] }> = {};
        const grandTotal = {
            internal: new Array(weeks.length).fill(0),
            external: new Array(weeks.length).fill(0),
            projected: new Array(weeks.length).fill(0),
            capacity: new Array(weeks.length).fill(0),
        };

        _.values(resourceMap).forEach((p) => {
            if (!roles[p.role]) {
                roles[p.role] = {
                    internal: new Array(weeks.length).fill(0),
                    external: new Array(weeks.length).fill(0),
                    projected: new Array(weeks.length).fill(0),
                    capacity: new Array(weeks.length).fill(0),
                };
            }

            for (let i = 0; i < weeks.length; i++) {
                roles[p.role].capacity[i] += HOURS_PER_WEEK;
                grandTotal.capacity[i] += HOURS_PER_WEEK;
            }

            p.projects.forEach((proj) => {
                proj.hours.forEach((h, i) => {
                    if (proj.type === 'Internal') {
                        roles[p.role].internal[i] += h;
                        grandTotal.internal[i] += h;
                    } else if (proj.type === 'Projected') {
                        roles[p.role].projected[i] += h;
                        grandTotal.projected[i] += h;
                    } else {
                        roles[p.role].external[i] += h;
                        grandTotal.external[i] += h;
                    }
                });
            });
        });

        const sortedRoles = Object.keys(roles).sort((a, b) => {
            const catA = this.getCategoryRank(a);
            const catB = this.getCategoryRank(b);
            if (catA !== catB) return catA - catB;
            const senA = this.getSeniorityRank(a);
            const senB = this.getSeniorityRank(b);
            if (senA !== senB) return senA - senB;
            return a.localeCompare(b);
        });

        const dateHeaders = weeks.map((w) => formatWeekHeaderUtc(w));
        const headerRow = sheet.addRow(['Specific Role', 'Type', ...dateHeaders]);
        this.styleHeaderRow(headerRow);

        const addBlock = (label: string, data: typeof grandTotal) => {
            const createRow = (typeLabel: string, rowData: number[], bgColor: string, fColor: string, isBold: boolean) => {
                const displayData = isPercentage
                    ? rowData.map((v, i) => (data.capacity[i] ? v / data.capacity[i] : 0))
                    : rowData;
                const row = sheet.addRow([label, typeLabel, ...displayData]);
                row.eachCell((cell, colNumber) => {
                    if (colNumber > 1) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                        cell.font = { color: { argb: fColor }, bold: isBold };
                    }
                    if (isPercentage && colNumber > 2) {
                        cell.numFmt = '0%';
                    }
                });
            };

            createRow('External', data.external, CONFIG.COLORS.EXT, '000000', false);
            createRow('Internal', data.internal, CONFIG.COLORS.INT, '000000', false);
            createRow('Projected', data.projected, CONFIG.COLORS.PROJ, CONFIG.COLORS.PROJ_TEXT, false);

            const benchHours = data.capacity.map(
                (cap, i) => cap - (data.internal[i] + data.external[i] + data.projected[i])
            );
            createRow('Bench', benchHours, CONFIG.COLORS.BENCH, '000000', true);

            if (!isPercentage) {
                createRow('Total Capacity', data.capacity, CONFIG.COLORS.TOTAL, '000000', false);
            }
            sheet.addRow([]);
        };

        addBlock('All Roles (Total)', grandTotal);
        sortedRoles.forEach((r) => addBlock(r, roles[r]));

        sheet.getColumn(1).width = 30;
        sheet.getColumn(2).width = 15;
        return workbook;
    }

    private writeBandwidthRows(sheet: ExcelJS.Worksheet, resources: ResourceRow[], weeks: Date[]) {
        const dateHeaders = weeks.map((w) => formatWeekHeaderUtc(w));
        const headerRow = sheet.addRow(['Type', 'Role', 'Resource', ...dateHeaders]);
        this.styleHeaderRow(headerRow);

        resources.forEach((p) => {
            const avail = p.totalHours.map((h) => Math.round((HOURS_PER_WEEK - h) * 10) / 10);
            const row = sheet.addRow([p.category, p.role, p.name, ...avail]);
            row.eachCell((cell, colNumber) => {
                if (colNumber > 3) {
                    const val = avail[colNumber - 4];
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.getBandwidthColor(val) } };
                }
            });
        });

        sheet.getColumn(1).width = 15;
        sheet.getColumn(2).width = 25;
        sheet.getColumn(3).width = 25;
    }

    /** REPORT: Bandwidth — who is overworked (negative/blue) or on bench (positive/red). */
    public async generateBandwidthReport(numWeeks: number = 12) {
        const { resourceMap, weeks } = await this.getReportData(numWeeks, 'forward');
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Bandwidth');

        const sortedResources = _.values(resourceMap).sort((a, b) => {
            const bwA = HOURS_PER_WEEK - a.totalHours[0];
            const bwB = HOURS_PER_WEEK - b.totalHours[0];
            if (bwA !== bwB) return bwB - bwA;
            return a.name.localeCompare(b.name);
        });

        this.writeBandwidthRows(sheet, sortedResources, weeks);
        return workbook;
    }

    /** REPORT: Overallocated — only resources with negative bandwidth in any upcoming week. */
    public async generateOverallocatedReport(numWeeks: number = 12) {
        const { resourceMap, weeks } = await this.getReportData(numWeeks, 'forward');
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Overallocated');

        const overallocated = _.values(resourceMap).filter((p) =>
            p.totalHours.some((h) => h > HOURS_PER_WEEK)
        );

        if (overallocated.length === 0) {
            sheet.addRow(['No overallocated resources in the selected horizon.']);
            return workbook;
        }

        this.writeBandwidthRows(sheet, overallocated, weeks);
        return workbook;
    }

    /** REPORT: Resource Analytics — FTE gaps, overallocated, and bench sections. */
    public async generateResourceAnalyticsReport(numWeeks: number = 12) {
        const { resourceMap, weeks } = await this.getReportData(numWeeks, 'forward');
        const workbook = new ExcelJS.Workbook();

        // --- Sheet 1: Required FTEs (Talent Acquisition) ---
        const fteSheet = workbook.addWorksheet('Required FTEs');
        const roleEfforts = await ProjectRoleEffort.find({
            end_date: { $gte: weeks[0] },
            start_date: { $lte: weeks[weeks.length - 1] },
        }).populate('role_id');

        const allocations = await ProjectAllocation.find({ is_active: true }).populate('employee_id');

        const fteByRoleWeek = new Map<string, number[]>();
        const roleNames = new Map<string, string>();

        for (const effort of roleEfforts) {
            const roleId = effort.role_id?._id?.toString() || effort.role_id?.toString();
            if (!roleId) continue;
            const roleDoc = effort.role_id as any;
            const roleName = roleDoc?.role_name || (await Role.findById(roleId))?.role_name || roleId;
            roleNames.set(roleId, roleName);

            if (!fteByRoleWeek.has(roleId)) {
                fteByRoleWeek.set(roleId, new Array(weeks.length).fill(0));
            }
            const row = fteByRoleWeek.get(roleId)!;

            const fulfilled = allocations.filter(
                (a) => a.project_id.toString() === effort.project_id.toString()
            ).length;

            const gap = Math.max(0, effort.required_headcount - fulfilled);
            const gapRounded = Math.round(gap * 4) / 4; // 0.25 FTE increments

            weeks.forEach((week, i) => {
                const weekEnd = addUtcWeeks(week, 1);
                if (effort.start_date < weekEnd && effort.end_date >= week) {
                    row[i] = Math.max(row[i], gapRounded);
                }
            });
        }

        const fteHeaders = ['Role', 'Metric', ...weeks.map((w) => formatWeekHeaderUtc(w))];
        fteSheet.addRow(fteHeaders).eachCell((c) => {
            c.font = { bold: true };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CONFIG.COLORS.HEADER_BG } };
        });

        [...fteByRoleWeek.entries()]
            .sort((a, b) => (roleNames.get(a[0]) || '').localeCompare(roleNames.get(b[0]) || ''))
            .forEach(([roleId, vals]) => {
                const row = fteSheet.addRow([roleNames.get(roleId) || roleId, 'Required FTE (gap)', ...vals]);
                row.eachCell((cell, col) => {
                    if (col > 2 && typeof cell.value === 'number' && cell.value > 0) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CONFIG.COLORS.BENCH } };
                    }
                });
            });

        fteSheet.getColumn(1).width = 28;
        fteSheet.getColumn(2).width = 22;

        // --- Sheet 2: Overallocated ---
        const overSheet = workbook.addWorksheet('Overallocated');
        const overallocated = _.values(resourceMap).filter((p) =>
            p.totalHours.some((h) => h > HOURS_PER_WEEK)
        );
        if (overallocated.length === 0) {
            overSheet.addRow(['No overallocated resources in the selected horizon.']);
        } else {
            this.writeBandwidthRows(overSheet, overallocated, weeks);
        }

        // --- Sheet 3: Bandwidth (bench) ---
        const benchSheet = workbook.addWorksheet('Bandwidth');
        const withBench = _.values(resourceMap).filter((p) =>
            p.totalHours.some((h) => h < HOURS_PER_WEEK)
        );
        this.writeBandwidthRows(
            benchSheet,
            withBench.sort((a, b) => a.name.localeCompare(b.name)),
            weeks
        );

        return workbook;
    }
}
