
import { Project } from '../projects/project.model';
import { Employee } from '../employees/employee.model';
import { ProjectAllocation } from '../allocations/allocation.model';
import { ProjectStatus, BillingType } from '../../common/types/enums';
import ExcelJS from 'exceljs';
import { format, startOfWeek, addWeeks, isWithinInterval } from 'date-fns';
import _ from 'lodash';

/**
 * 🚀 MASTER CONFIGURATION (Mirrored from User provided Apps Script)
 */
const CONFIG = {
  COLORS: {
    HEADER_BG: 'EFEFEF', // ExcelJS uses hex without #
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
    SPECTRUM: ['93C47D', 'D9EAD3', 'F4CCCC', 'EA9999', 'E06666'] 
  },
  // SORTING PRIORITY: Broad Categories
  CATEGORY_PRIORITY: [
    "architect",
    "full stack", "fullstack",
    "backend", "back end", "java", "node", "python",
    "frontend", "front end", "react", "angular",
    "mobile", "ios", "android",
    "data", "qa", "test", "design", "product", "manager"
  ],
  // SORTING PRIORITY: Seniority
  SENIORITY_PRIORITY: [
    ["vp", "director", "head"],
    ["principal", "staff", "lead", "manager"],
    ["senior", "sr.", "sr ", "iii"], 
    ["ii", "mid"],
    ["i ", "jun", "assoc", "intern"]
  ]
};

export class ReportsService {
    
    private deriveCategory(roleName: string): string {
        const r = roleName.toLowerCase();
        if (r.includes("architect") || r.includes("principal")) return "Architect";
        if (r.includes("full stack") || r.includes("fullstack") || r.includes("mern")) return "Fullstack";
        if (r.includes("back end") || r.includes("backend") || r.includes("java") || r.includes("node")) return "Backend";
        if (r.includes("front end") || r.includes("frontend") || r.includes("react")) return "Frontend";
        if (r.includes("mobile") || r.includes("ios") || r.includes("android")) return "Mobile";
        if (r.includes("data")) return "Data";
        if (r.includes("qa") || r.includes("quality") || r.includes("test")) return "Testing";
        if (r.includes("design") || r.includes("ux")) return "Design";
        return "Other";
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
            if (keywords.some(k => r.includes(k))) return i;
        }
        return 3; 
    }

    private getBandwidthColor(val: number): string {
        if (val < -10) return CONFIG.COLORS.SPECTRUM[0]; 
        if (val <= 10) return CONFIG.COLORS.SPECTRUM[1]; 
        if (val <= 20) return CONFIG.COLORS.SPECTRUM[2]; 
        if (val <= 30) return CONFIG.COLORS.SPECTRUM[3]; 
        return CONFIG.COLORS.SPECTRUM[4];                
    }

    private async getReportData(numWeeks: number = 12, startFromToday: boolean = true) {
        const today = new Date();
        const start = startFromToday ? startOfWeek(today) : addWeeks(startOfWeek(today), -4);
        const weeks = Array.from({ length: numWeeks }).map((_, i) => addWeeks(start, i));
        
        const employees = await Employee.find({ 
            status: { $nin: ['Inactive', 'Terminated'] },
            last_name: { $not: /^Dummy/i }
        }).populate('role_id');

        const employeeIds = employees.map(e => e._id);
        const allocations = await ProjectAllocation.find({
            employee_id: { $in: employeeIds }
        }).populate('project_id');

        const resourceMap: any = {};

        employees.forEach((emp: any) => {
            const roleName = emp.position || 'No Role';
            resourceMap[emp._id.toString()] = {
                id: emp._id,
                name: `${emp.first_name} ${emp.last_name}`,
                role: roleName,
                category: this.deriveCategory(roleName),
                projects: [],
                totalHours: new Array(numWeeks).fill(0)
            };
        });

        allocations.forEach((alloc: any) => {
            const empId = alloc.employee_id.toString();
            if (resourceMap[empId]) {
                const proj = alloc.project_id;
                const hours = weeks.map(week => {
                    const weekEnd = addWeeks(week, 1);
                    // Check if allocation interval overlaps with week
                    const allocStart = alloc.start_date;
                    const allocEnd = alloc.end_date || addWeeks(allocStart, 52); // Default to a year if no end date
                    
                    if (allocStart < weekEnd && allocEnd >= week) {
                        // For simplicity in this demo, we use the allocation_percent to derive hours
                        // In a real system we might have weekly hour overrides
                        return (alloc.allocation_percent / 100) * 40;
                    }
                    return 0;
                });

                resourceMap[empId].projects.push({
                    name: proj.project_name,
                    type: proj.billing_type || 'External',
                    hours: hours
                });

                hours.forEach((h, i) => {
                    resourceMap[empId].totalHours[i] += h;
                });
            }
        });

        return { resourceMap, weeks };
    }

    public async generateConsolidatedReport(numWeeks: number = 12) {
        const { resourceMap, weeks } = await this.getReportData(numWeeks);
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Consolidated View');

        // Setup Headers
        const dateHeaders = weeks.map(w => format(w, 'MMM d'));
        const headers = ["Role", "Resource", "Project", ...dateHeaders];
        
        // Month Headers row
        const monthRow = sheet.addRow(new Array(headers.length).fill(''));
        let currentMonth = '';
        let monthStartCol = 4;
        weeks.forEach((w, i) => {
            const m = format(w, 'MMMM yyyy').toUpperCase();
            if (m !== currentMonth) {
                if (currentMonth) {
                    sheet.mergeCells(1, monthStartCol, 1, i + 3);
                    const cell = sheet.getCell(1, monthStartCol);
                    cell.value = currentMonth;
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CONFIG.COLORS.MONTH_BG } };
                    cell.font = { color: { argb: CONFIG.COLORS.MONTH_TEXT }, bold: true };
                    cell.alignment = { horizontal: 'center' };
                }
                currentMonth = m;
                monthStartCol = i + 4;
            }
        });
        // Final merge
        sheet.mergeCells(1, monthStartCol, 1, weeks.length + 3);
        const lastMonthCell = sheet.getCell(1, monthStartCol);
        lastMonthCell.value = currentMonth;
        lastMonthCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CONFIG.COLORS.MONTH_BG } };
        lastMonthCell.font = { color: { argb: CONFIG.COLORS.MONTH_TEXT }, bold: true };
        lastMonthCell.alignment = { horizontal: 'center' };

        const headerRow = sheet.addRow(headers);
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CONFIG.COLORS.HEADER_BG } };
            cell.font = { bold: true };
            cell.border = { bottom: { style: 'medium', color: { argb: '000000' } } };
        });

        const sortedResources = _.values(resourceMap).sort((a: any, b: any) => a.name.localeCompare(b.name));

        sortedResources.forEach((p: any) => {
            p.projects.forEach((proj: any) => {
                const row = sheet.addRow([p.role, p.name, proj.name, ...proj.hours]);
                const isInternal = proj.type.toLowerCase().includes('internal');
                const isProjected = proj.type.toLowerCase().includes('projected');
                
                let bgColor = CONFIG.COLORS.EXT;
                let fColor = '000000';

                if (isInternal) bgColor = CONFIG.COLORS.INT;
                else if (isProjected) {
                    bgColor = CONFIG.COLORS.PROJ;
                    fColor = CONFIG.COLORS.PROJ_TEXT;
                }

                row.eachCell((cell, colNumber) => {
                    if (colNumber > 2) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                        cell.font = { color: { argb: fColor } };
                    }
                });
            });

            const bandwidth = p.totalHours.map((h: number) => 40 - h);
            const bandRow = sheet.addRow([p.role, p.name, 'Bandwidth', ...bandwidth]);
            bandRow.eachCell((cell, colNumber) => {
                if (colNumber > 2) {
                    const val = bandwidth[colNumber - 4];
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.getBandwidthColor(val) } };
                }
                cell.font = { bold: true };
            });

            // Spacer
            sheet.addRow([]);
        });

        sheet.getColumn(1).width = 25;
        sheet.getColumn(2).width = 25;
        sheet.getColumn(3).width = 30;
        for (let i = 4; i <= headers.length; i++) {
            sheet.getColumn(i).width = 12;
        }

        return workbook;
    }

    public async generateRoleSummaryReport(isPercentage: boolean = false) {
        const { resourceMap, weeks } = await this.getReportData(12);
        const workbook = new ExcelJS.Workbook();
        const sheetName = isPercentage ? 'Role %' : 'Role Hrs';
        const sheet = workbook.addWorksheet(sheetName);

        const roles: any = {};
        const grandTotal: any = { 
            internal: new Array(weeks.length).fill(0), 
            external: new Array(weeks.length).fill(0), 
            projected: new Array(weeks.length).fill(0), 
            capacity: new Array(weeks.length).fill(0) 
        };

        _.values(resourceMap).forEach((p: any) => {
            if (!roles[p.role]) {
                roles[p.role] = { 
                    internal: new Array(weeks.length).fill(0), 
                    external: new Array(weeks.length).fill(0), 
                    projected: new Array(weeks.length).fill(0), 
                    capacity: new Array(weeks.length).fill(0) 
                };
            }

            for (let i = 0; i < weeks.length; i++) {
                roles[p.role].capacity[i] += 40;
                grandTotal.capacity[i] += 40;
            }

            p.projects.forEach((proj: any) => {
                const type = proj.type.toLowerCase();
                const isInt = type.includes('internal');
                const isProj = type.includes('projected');

                proj.hours.forEach((h: number, i: number) => {
                    if (isInt) {
                        roles[p.role].internal[i] += h;
                        grandTotal.internal[i] += h;
                    } else if (isProj) {
                        roles[p.role].projected[i] += h;
                        grandTotal.projected[i] += h;
                    } else {
                        roles[p.role].external[i] += h;
                        grandTotal.external[i] += h;
                    }
                });
            });
        });

        const sortedRoles = Object.keys(roles).sort((a: any, b: any) => {
            const catA = this.getCategoryRank(a);
            const catB = this.getCategoryRank(b);
            if (catA !== catB) return catA - catB;
            const senA = this.getSeniorityRank(a);
            const senB = this.getSeniorityRank(b);
            if (senA !== senB) return senA - senB;
            return a.localeCompare(b);
        });

        // Setup Headers
        const dateHeaders = weeks.map(w => format(w, 'MMM d'));
        const headers = ["Specific Role", "Type", ...dateHeaders];
        
        const headerRow = sheet.addRow(headers);
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CONFIG.COLORS.HEADER_BG } };
            cell.font = { bold: true };
            cell.border = { bottom: { style: 'medium', color: { argb: '000000' } } };
        });

        const addBlock = (label: string, data: any) => {
            const createRow = (typeLabel: string, rowData: number[], bgColor: string, fColor: string, isBold: boolean) => {
                const displayData = isPercentage ? rowData.map((v, i) => data.capacity[i] ? (v/data.capacity[i]) : 0) : rowData;
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
            
            const benchHours = data.capacity.map((cap: number, i: number) => 
                cap - (data.internal[i] + data.external[i] + data.projected[i])
            );
            createRow('Bench', benchHours, CONFIG.COLORS.BENCH, '000000', true);

            if (!isPercentage) {
                createRow('Total Capacity', data.capacity, CONFIG.COLORS.TOTAL, '000000', false);
            }
            sheet.addRow([]); // Spacer
        };

        addBlock('All Roles (Total)', grandTotal);
        sortedRoles.forEach(r => addBlock(r, roles[r]));

        sheet.getColumn(1).width = 30;
        sheet.getColumn(2).width = 15;
        for (let i = 3; i <= headers.length; i++) {
            sheet.getColumn(i).width = 12;
        }

        return workbook;
    }

    public async generateBandwidthReport() {
        const { resourceMap, weeks } = await this.getReportData(12);
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Bandwidth');

        const dateHeaders = weeks.map(w => format(w, 'MMM d'));
        const headers = ["Type", "Role", "Resource", ...dateHeaders];
        
        const headerRow = sheet.addRow(headers);
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CONFIG.COLORS.HEADER_BG } };
            cell.font = { bold: true };
        });

        const sortedResources = _.values(resourceMap).sort((a: any, b: any) => {
            // Sort by current week bandwidth (first column)
            const bwA = 40 - a.totalHours[0];
            const bwB = 40 - b.totalHours[0];
            if (bwA !== bwB) return bwB - bwA;
            return a.name.localeCompare(b.name);
        });

        sortedResources.forEach((p: any) => {
            const avail = p.totalHours.map((h: number) => 40 - h);
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
        
        return workbook;
    }
}
