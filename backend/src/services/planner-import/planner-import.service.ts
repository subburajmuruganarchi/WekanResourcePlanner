/**
 * Import MongoDB data from WeKan Resource Planner Excel sheets.
 *
 * Default input: split sheet files in backend/data/planner/
 *   - Resource.xlsx — employees, job roles, skills
 *   - Project.xlsx — project master
 *   - Project_Allocation.xlsx — weekly planned hours → allocation_percent
 *   - r360 data.xlsx (optional) — access roles (admin/manager/employee)
 */

import fs from 'fs';
import { Types } from 'mongoose';
import path from 'path';
import bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import { Role } from '../../modules/roles/role.model';
import { Employee } from '../../modules/employees/employee.model';
import { EmployeeSkill } from '../../modules/employees/employee-skill.model';
import { Skill } from '../../modules/skills/skill.model';
import { Project } from '../../modules/projects/project.model';
import { ProjectSkillRequirement } from '../../modules/projects/project-skill-requirement.model';
import { ProjectRoleEffort } from '../../modules/projects/project-role-effort.model';
import { ProjectAllocation } from '../../modules/allocations/allocation.model';
import { WeeklyAllocationEntry } from '../../modules/weekly-allocations/weekly-allocation-entry.model';
import { startOfUtcWeek } from '../../common/utils/week.util';
import {
    ProjectStatus,
    ProjectPriority,
    BillingType,
    SkillLevel,
    CreatedByRole,
    WeeklyAllocationSource,
    WeeklyAllocationStatus,
} from '../../common/types/enums';

const SEED_TAG = 'wekan-planner-2026';
const PASSWORD_PLAIN = 'Admin123!';
const DEFAULT_SHEETS_DIR = path.join(__dirname, '../../../data/planner');

export interface PlannerImportOptions {
    resourceBuffer?: Buffer;
    projectBuffer?: Buffer;
    allocationBuffer?: Buffer;
    resourceOnly?: boolean;
    persistToDisk?: boolean;
    sheetsDir?: string;
    fallbackWorkbookPath?: string;
}

export interface PlannerImportResult {
    employeesUpserted: number;
    projectsUpserted: number;
    allocationsUpserted: number;
    weeklyEntriesUpserted: number;
    jobRoles: number;
    skills: number;
    resourceOnly: boolean;
    message: string;
}
const ALLOCATION_SHEET_NAME = 'Project_Allocation';
const DEFAULT_XLSX =
    process.env.PLANNER_XLSX_PATH ||
    'C:/Users/Wekan/Downloads/25.05.25 Copy of WeKan Resource Planner 2026.xlsx';

const ACCESS_ROLES = {
    ADMIN: 'Admin',
    PM: 'Project Manager',
    EMPLOYEE: 'Employee',
} as const;

const HOURS_PER_WEEK = 40;

function cellText(cell: ExcelJS.Cell): string {
    let v: unknown = cell.value;
    if (v && typeof v === 'object' && 'result' in (v as object)) v = (v as { result: unknown }).result;
    if (v && typeof v === 'object' && 'text' in (v as object)) v = (v as { text: string }).text;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (v == null) return '';
    return String(v).replace(/\s+/g, ' ').trim();
}

function cellNumber(cell: ExcelJS.Cell): number {
    const t = cellText(cell);
    const n = Number(t);
    return Number.isFinite(n) ? n : 0;
}

function parseName(full: string): { first: string; last: string } {
    const parts = full.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { first: 'Unknown', last: 'User' };
    if (parts.length === 1) return { first: parts[0], last: '-' };
    return { first: parts[0], last: parts.slice(1).join(' ') };
}

function mapProjectStatus(sheetStatus: string): ProjectStatus {
    const s = sheetStatus.trim().toLowerCase();
    if (s === 'active') return ProjectStatus.ACTIVE;
    if (s === 'completed') return ProjectStatus.COMPLETED;
    if (s === 'proposal lost' || s === 'lost') return ProjectStatus.ON_HOLD;
    return ProjectStatus.PLANNING;
}

function mapPriority(type: string, status: ProjectStatus): ProjectPriority {
    if (status === ProjectStatus.ACTIVE) return ProjectPriority.HIGH;
    if (type.toLowerCase().includes('internal')) return ProjectPriority.MEDIUM;
    return ProjectPriority.LOW;
}

function mapBilling(type: string): BillingType | undefined {
    const t = type.toLowerCase();
    if (t.includes('internal')) return BillingType.NON_BILLABLE;
    if (t.includes('customer') || t.includes('projected')) return BillingType.BILLABLE;
    return undefined;
}

function projectCodeFromRow(pid: string, name: string): string {
    const id = pid.trim().toUpperCase().replace(/\s+/g, '');
    if (/^P\d+$/i.test(id)) return `WK-${id}`;
    const slug = name
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 24)
        .toUpperCase();
    return `WK-${slug || 'PROJECT'}`;
}

function isDummyResource(name: string, eid: string): boolean {
    const n = name.toLowerCase();
    const id = eid.toLowerCase();
    return n.includes('dummy') || n.includes('z dummy') || id.startsWith('z');
}

interface RoleProfile {
    level: SkillLevel;
    years: number;
}

/** Ordered most-specific first — SDE III must be checked before SDE II. */
const ROLE_PROFILE_RULES: { pattern: RegExp; profile: RoleProfile }[] = [
    { pattern: /associate\s+architect/i, profile: { level: SkillLevel.EXPERT, years: 7 } },
    { pattern: /mobile\s+architect|architect/i, profile: { level: SkillLevel.EXPERT, years: 10 } },
    { pattern: /sde\s*iii/i, profile: { level: SkillLevel.EXPERT, years: 6 } },
    { pattern: /sde\s*ii/i, profile: { level: SkillLevel.INTERMEDIATE, years: 4 } },
    { pattern: /sde\s*i\b/i, profile: { level: SkillLevel.BEGINNER, years: 2 } },
    { pattern: /\bsde\b/i, profile: { level: SkillLevel.BEGINNER, years: 2 } },
    { pattern: /lead|senior|principal/i, profile: { level: SkillLevel.EXPERT, years: 6 } },
    { pattern: /qa/i, profile: { level: SkillLevel.INTERMEDIATE, years: 3 } },
    { pattern: /dba|database\s+administrator/i, profile: { level: SkillLevel.EXPERT, years: 5 } },
    { pattern: /consultant/i, profile: { level: SkillLevel.INTERMEDIATE, years: 5 } },
];

function roleProfile(jobRoleName: string): RoleProfile {
    const name = jobRoleName.trim();
    if (!name) return { level: SkillLevel.INTERMEDIATE, years: 3 };
    for (const rule of ROLE_PROFILE_RULES) {
        if (rule.pattern.test(name)) return rule.profile;
    }
    return { level: SkillLevel.INTERMEDIATE, years: 3 };
}

function inferSkillLevel(jobRoleName: string, skillIndex: number): SkillLevel {
    const base = roleProfile(jobRoleName).level;
    if (skillIndex === 0) return base;
    if (base === SkillLevel.EXPERT) return SkillLevel.INTERMEDIATE;
    if (base === SkillLevel.INTERMEDIATE) return SkillLevel.BEGINNER;
    return SkillLevel.BEGINNER;
}

function inferExperienceYears(jobRoleName: string, skillIndex: number): number {
    const baseYears = roleProfile(jobRoleName).years;
    return skillIndex === 0 ? baseYears : Math.max(1, baseYears - 1);
}

function isLikelySkillName(name: string): boolean {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 60) return false;
    if (/resources freed|date were not|not confirmed|as date/i.test(trimmed)) return false;
    return true;
}

function parseSheetDate(cell: ExcelJS.Cell): Date | null {
    const raw = cell.value;
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        return new Date(Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate()));
    }
    const text = cellText(cell);
    if (!text) return null;
    const m = text.match(/^(\d{1,2})[-\s/]?([A-Za-z]{3,9})$/);
    if (m) {
        const months: Record<string, number> = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
        };
        const mon = months[m[2].slice(0, 3).toLowerCase()];
        if (mon == null) return null;
        const year = mon >= 4 ? 2026 : 2025;
        return new Date(Date.UTC(year, mon, Number(m[1])));
    }
    const d = new Date(text);
    return Number.isNaN(d.getTime()) ? null : d;
}

function parseSkillList(raw: string): string[] {
    return raw
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => isLikelySkillName(s));
}

function departmentLabel(resourceType: string, location: string): string {
    if (resourceType && location) return `${resourceType} · ${location}`;
    return resourceType || location || 'Engineering';
}

async function loadWorksheet(
    sheetName: string,
    options: {
        explicitPath?: string;
        buffer?: Buffer;
        fallbackWorkbook?: ExcelJS.Workbook;
        sheetsDir?: string;
    } = {}
): Promise<ExcelJS.Worksheet> {
    const sheetsDir = options.sheetsDir ?? process.env.PLANNER_SHEETS_DIR ?? DEFAULT_SHEETS_DIR;

    if (options.buffer) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(options.buffer as unknown as ExcelJS.Buffer);
        const worksheet = workbook.getWorksheet(sheetName) || workbook.worksheets[0];
        if (worksheet) {
            console.log(`Loaded "${sheetName}" from uploaded file`);
            return worksheet;
        }
        throw new Error(`Could not find worksheet "${sheetName}" in uploaded file.`);
    }

    const candidates = [
        options.explicitPath,
        path.join(sheetsDir, `${sheetName}.xlsx`),
    ].filter((value): value is string => !!value);

    for (const filePath of candidates) {
        if (!fs.existsSync(filePath)) continue;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet(sheetName) || workbook.worksheets[0];
        if (worksheet) {
            console.log(`Loaded "${sheetName}" from ${filePath}`);
            return worksheet;
        }
    }

    const fallbackWorksheet = options.fallbackWorkbook?.getWorksheet(sheetName);
    if (fallbackWorksheet) {
        console.log(`Loaded "${sheetName}" from fallback workbook`);
        return fallbackWorksheet;
    }

    throw new Error(
        `Could not load worksheet "${sheetName}". Place ${sheetName}.xlsx in ${sheetsDir} or upload it via Admin Inputs.`
    );
}

async function tryLoadWorksheet(
    sheetName: string,
    options: { fallbackWorkbook?: ExcelJS.Workbook } = {}
): Promise<ExcelJS.Worksheet | undefined> {
    try {
        return await loadWorksheet(sheetName, options);
    } catch {
        return undefined;
    }
}

function parseWeekMonday(header: string): Date | null {
    const h = header.trim();
    // "5-Jan", "12-Jan", "3 Nov", "24-Nov"
    const m1 = h.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})$/);
    if (m1) {
        const months: Record<string, number> = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
        };
        const mon = months[m1[2].slice(0, 3).toLowerCase()];
        if (mon == null) return null;
        const year = mon >= 4 ? 2026 : 2025; // Jan–Mar → 2026 in this workbook
        return startOfUtcWeek(new Date(Date.UTC(year, mon, Number(m1[1]))));
    }
    const d = new Date(h);
    return Number.isNaN(d.getTime()) ? null : startOfUtcWeek(d);
}

async function upsertAccessRole(roleName: string): Promise<Types.ObjectId> {
    const doc = await Role.findOneAndUpdate(
        { role_name: roleName },
        { $setOnInsert: { role_name: roleName, is_active: true, department: 'WeKan' } },
        { upsert: true, new: true }
    );
    return doc!._id;
}

async function upsertJobRole(roleName: string): Promise<Types.ObjectId> {
    const name = roleName.trim() || 'Consultant';
    const doc = await Role.findOneAndUpdate(
        { role_name: name },
        {
            $setOnInsert: {
                role_name: name,
                is_active: true,
                department: 'Engineering',
                default_rate: 100,
            },
        },
        { upsert: true, new: true }
    );
    return doc!._id;
}

async function upsertSkill(name: string, category: string): Promise<Types.ObjectId | undefined> {
    const trimmed = name.trim().slice(0, 120);
    if (!trimmed) return undefined;
    const doc = await Skill.findOneAndUpdate(
        { name: trimmed },
        { $setOnInsert: { name: trimmed, category, is_active: true, description: SEED_TAG } },
        { upsert: true, new: true }
    );
    return doc!._id;
}

interface R360AccessRow {
    email: string;
    roles: string[];
}

function persistUploadedFiles(
    sheetsDir: string,
    options: Pick<PlannerImportOptions, 'resourceBuffer' | 'projectBuffer' | 'allocationBuffer'>
): void {
    fs.mkdirSync(sheetsDir, { recursive: true });
    if (options.resourceBuffer) {
        fs.writeFileSync(path.join(sheetsDir, 'Resource.xlsx'), options.resourceBuffer);
    }
    if (options.projectBuffer) {
        fs.writeFileSync(path.join(sheetsDir, 'Project.xlsx'), options.projectBuffer);
    }
    if (options.allocationBuffer) {
        fs.writeFileSync(path.join(sheetsDir, 'Project_Allocation.xlsx'), options.allocationBuffer);
    }
}

export async function runPlannerImport(
    options: PlannerImportOptions = {}
): Promise<PlannerImportResult> {
    const resourceOnly = options.resourceOnly ?? false;
    const sheetsDir = options.sheetsDir ?? process.env.PLANNER_SHEETS_DIR ?? DEFAULT_SHEETS_DIR;

    if (options.persistToDisk !== false) {
        persistUploadedFiles(sheetsDir, options);
    }

    const workbookPath =
        options.fallbackWorkbookPath ?? process.env.PLANNER_XLSX_PATH ?? DEFAULT_XLSX;

    let fallbackWorkbook: ExcelJS.Workbook | undefined;
    if (fs.existsSync(workbookPath)) {
        fallbackWorkbook = new ExcelJS.Workbook();
        await fallbackWorkbook.xlsx.readFile(workbookPath);
        console.log(`Fallback workbook available: ${workbookPath}`);
    } else if (!resourceOnly) {
        console.log(`No monolithic workbook at ${workbookPath}; using split sheets in ${sheetsDir}`);
    }

    const resourcePath = process.env.PLANNER_RESOURCE_XLSX || path.join(sheetsDir, 'Resource.xlsx');
    const wsResource = await loadWorksheet('Resource', {
        explicitPath: options.resourceBuffer ? undefined : resourcePath,
        buffer: options.resourceBuffer,
        fallbackWorkbook,
        sheetsDir,
    });

    const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, 10);

    const adminRoleId = await upsertAccessRole(ACCESS_ROLES.ADMIN);
    const pmRoleId = await upsertAccessRole(ACCESS_ROLES.PM);
    const employeeRoleId = await upsertAccessRole(ACCESS_ROLES.EMPLOYEE);

    const accessByEmail = new Map<string, Types.ObjectId>();
    const wsR360 = await tryLoadWorksheet('r360 data', { fallbackWorkbook });
    if (wsR360) {
        const hdr = wsR360.getRow(1);
        const colMap: Record<string, number> = {};
        hdr.eachCell((cell, col) => {
            colMap[cellText(cell).toLowerCase()] = col;
        });
        const colEmail = colMap.email ?? 7;
        const colRole0 = colMap['role[0]'] ?? 8;
        const colRole1 = colMap['role[1]'] ?? 9;
        for (let r = 2; r <= wsR360.rowCount; r++) {
            const row = wsR360.getRow(r);
            const email = cellText(row.getCell(colEmail)).toLowerCase();
            if (!email.includes('@')) continue;
            const roles: string[] = [];
            roles.push(cellText(row.getCell(colRole0)).toLowerCase());
            roles.push(cellText(row.getCell(colRole1)).toLowerCase());
            let accessId = employeeRoleId;
            if (roles.includes('admin')) accessId = adminRoleId;
            else if (roles.includes('manager')) accessId = pmRoleId;
            accessByEmail.set(email, accessId);
        }
    }

    // Bootstrap default admin + PM logins (always available)
    const defaultAdmin = await Employee.findOneAndUpdate(
        { email: 'admin@r360.com' },
        {
            $set: {
                first_name: 'R360',
                last_name: 'Admin',
                role_id: adminRoleId,
                password: passwordHash,
                status: 'Active',
                is_active: true,
                employee_code: 'WK-ADMIN',
                department: 'Delivery',
            },
        },
        { upsert: true, new: true }
    );
    const defaultPm = await Employee.findOneAndUpdate(
        { email: 'pm@r360.com' },
        {
            $set: {
                first_name: 'R360',
                last_name: 'PM',
                role_id: pmRoleId,
                password: passwordHash,
                status: 'Active',
                is_active: true,
                employee_code: 'WK-PM',
                department: 'Delivery',
            },
        },
        { upsert: true, new: true }
    );

    let pmFallbackId = defaultPm!._id;
    for (const [email, roleId] of accessByEmail) {
        if (roleId.equals(pmRoleId)) {
            const pm = await Employee.findOne({ email }).lean();
            if (pm) {
                pmFallbackId = pm._id;
                break;
            }
        }
    }

    const jobRoleIds = new Map<string, Types.ObjectId>();
    const employeeByEmail = new Map<string, Types.ObjectId>();
    const employeeByCode = new Map<string, Types.ObjectId>();
    const employeePrimarySkill = new Map<string, Types.ObjectId>();
    const skillCache = new Map<string, Types.ObjectId | undefined>();

    let employeesUpserted = 0;
    for (let r = 2; r <= wsResource.rowCount; r++) {
        const row = wsResource.getRow(r);
        const eid = cellText(row.getCell(1));
        const name = cellText(row.getCell(2));
        const jobRoleName = cellText(row.getCell(3));
        const resourceType = cellText(row.getCell(4));
        const availability = cellText(row.getCell(5));
        const email = cellText(row.getCell(6)).toLowerCase();
        const location = cellText(row.getCell(8));
        const skillsRaw = cellText(row.getCell(9));

        if (!email.includes('@') || isDummyResource(name, eid)) continue;

        const { first, last } = parseName(name);
        let jobRoleId = jobRoleIds.get(jobRoleName);
        if (!jobRoleId) {
            jobRoleId = await upsertJobRole(jobRoleName);
            jobRoleIds.set(jobRoleName, jobRoleId);
        }

        const accessRoleId = accessByEmail.get(email) ?? employeeRoleId;
        const isAvailable = !availability.toLowerCase().includes('not');

        const emp = await Employee.findOneAndUpdate(
            { email },
            {
                $set: {
                    first_name: first,
                    last_name: last,
                    email,
                    employee_code: eid || undefined,
                    role_id: accessRoleId,
                    job_role_id: jobRoleId,
                    position: jobRoleName,
                    department: departmentLabel(resourceType, location),
                    status: isAvailable ? 'Active' : 'Inactive',
                    is_active: isAvailable,
                    max_allocation_percent: 100,
                    password: passwordHash,
                },
            },
            { upsert: true, new: true }
        );
        employeesUpserted++;
        employeeByEmail.set(email, emp!._id);
        if (eid) employeeByCode.set(eid.toUpperCase(), emp!._id);

        const skillIdsForEmployee: Types.ObjectId[] = [];
        const skillNames = parseSkillList(skillsRaw);
        for (let i = 0; i < skillNames.length; i++) {
            const sk = skillNames[i];
            let skillId = skillCache.get(sk);
            if (!skillId) {
                skillId = await upsertSkill(sk, resourceType || 'General');
                skillCache.set(sk, skillId);
            }
            if (!skillId) continue;
            skillIdsForEmployee.push(skillId);
            await EmployeeSkill.findOneAndUpdate(
                { employee_id: emp!._id, skill_id: skillId },
                {
                    $set: {
                        employee_id: emp!._id,
                        skill_id: skillId,
                        skill_level: inferSkillLevel(jobRoleName, i),
                        experience_years: inferExperienceYears(jobRoleName, i),
                        is_primary: i === 0,
                    },
                },
                { upsert: true }
            );
        }

        if (skillIdsForEmployee.length > 0) {
            employeePrimarySkill.set(emp!._id.toString(), skillIdsForEmployee[0]);
            await EmployeeSkill.deleteMany({
                employee_id: emp!._id,
                skill_id: { $nin: skillIdsForEmployee },
            });
        }
    }

    if (resourceOnly) {
        console.log('\n--- Resource sheet seed complete ---');
        console.log(`Employees upserted: ${employeesUpserted}`);
        console.log(`Job roles: ${jobRoleIds.size}, Skills: ${skillCache.size}`);
        console.log(`Source: ${resourcePath}`);
        console.log(`Login password for all seeded users: ${PASSWORD_PLAIN}`);
        return {
            employeesUpserted,
            projectsUpserted: 0,
            allocationsUpserted: 0,
            weeklyEntriesUpserted: 0,
            jobRoles: jobRoleIds.size,
            skills: skillCache.size,
            resourceOnly: true,
            message: 'Resource sheet import complete',
        };
    }

    const projectPath = process.env.PLANNER_PROJECT_XLSX || path.join(sheetsDir, 'Project.xlsx');
    const allocationPath =
        process.env.PLANNER_ALLOCATION_XLSX || path.join(sheetsDir, 'Project_Allocation.xlsx');

    const wsProject = await loadWorksheet('Project', {
        explicitPath: options.projectBuffer ? undefined : projectPath,
        buffer: options.projectBuffer,
        fallbackWorkbook,
        sheetsDir,
    });
    const wsAlloc = await loadWorksheet(ALLOCATION_SHEET_NAME, {
        explicitPath: options.allocationBuffer ? undefined : allocationPath,
        buffer: options.allocationBuffer,
        fallbackWorkbook,
        sheetsDir,
    });

    const projectByCode = new Map<string, Types.ObjectId>();
    const projectByPid = new Map<string, string>();
    let projectsUpserted = 0;

    for (let r = 2; r <= wsProject.rowCount; r++) {
        const row = wsProject.getRow(r);
        const pid = cellText(row.getCell(1));
        const name = cellText(row.getCell(2));
        if (!name) continue;
        const type = cellText(row.getCell(3));
        const statusRaw = cellText(row.getCell(4)) || cellText(row.getCell(15));
        const confirmedStart = parseSheetDate(row.getCell(5));
        const estimatedStart = parseSheetDate(row.getCell(7));
        const durationRaw = cellText(row.getCell(8));
        const architect = cellText(row.getCell(9));
        const beRequired = cellNumber(row.getCell(10));
        const mobileRequired = cellNumber(row.getCell(11));
        const feRequired = cellNumber(row.getCell(12));
        const qaRequired = cellNumber(row.getCell(13));
        const tech = cellText(row.getCell(14));

        const code = projectCodeFromRow(pid, name);
        const status = mapProjectStatus(statusRaw);
        const start = confirmedStart || estimatedStart || new Date('2025-01-01T00:00:00.000Z');
        let end = new Date('2026-12-31T00:00:00.000Z');
        const durationWeeks = Number(durationRaw);
        if (Number.isFinite(durationWeeks) && durationWeeks > 0) {
            end = new Date(start.getTime());
            end.setUTCDate(end.getUTCDate() + durationWeeks * 7);
        }

        const ownerId = defaultAdmin!._id;
        const managerId = pmFallbackId;
        const staffingNotes = [
            architect ? `Architect: ${architect}` : '',
            beRequired ? `BE: ${beRequired}` : '',
            feRequired ? `FE: ${feRequired}` : '',
            mobileRequired ? `Mobile: ${mobileRequired}` : '',
            qaRequired ? `QA: ${qaRequired}` : '',
        ]
            .filter(Boolean)
            .join(' | ');
        const businessGoal = [tech, staffingNotes].filter(Boolean).join(' — ').slice(0, 500) || SEED_TAG;

        const doc = await Project.findOneAndUpdate(
            { project_code: code },
            {
                $set: {
                    project_name: name,
                    project_code: code,
                    project_owner_id: ownerId,
                    project_manager_id: managerId,
                    status,
                    priority: mapPriority(type, status),
                    start_date: start,
                    end_date: end,
                    billing_type: mapBilling(type),
                    business_goal: businessGoal,
                },
            },
            { upsert: true, new: true }
        );
        projectsUpserted++;
        projectByCode.set(code, doc!._id);
        if (pid) projectByPid.set(pid.toUpperCase(), code);

        const staffingRoles: { label: string; count: number }[] = [
            { label: 'SDE II (Full Stack)', count: beRequired || feRequired },
            { label: 'Mobile Developer', count: mobileRequired },
            { label: 'QA Engineer', count: qaRequired },
        ];
        for (const staffing of staffingRoles) {
            if (staffing.count <= 0) continue;
            let roleId = jobRoleIds.get(staffing.label);
            if (!roleId) {
                roleId = await upsertJobRole(staffing.label);
                jobRoleIds.set(staffing.label, roleId);
            }
            await ProjectRoleEffort.findOneAndUpdate(
                { project_id: doc!._id, role_id: roleId },
                {
                    $set: {
                        project_id: doc!._id,
                        role_id: roleId,
                        required_headcount: staffing.count,
                        required_days: 60,
                        start_date: start,
                        end_date: end,
                        hours_per_day: 8,
                    },
                },
                { upsert: true }
            );
        }

        const techSkills = parseSkillList(tech);
        const requirementRoleName =
            architect ||
            (beRequired > 0 ? 'SDE II (Backend)' : '') ||
            (feRequired > 0 ? 'SDE II (Frontend)' : '') ||
            (mobileRequired > 0 ? 'SDE II (Mobile)' : '') ||
            (qaRequired > 0 ? 'QA Engineer' : '') ||
            'SDE II (Full Stack)';
        let requirementRoleId = jobRoleIds.get(requirementRoleName);
        if (!requirementRoleId) {
            requirementRoleId = await upsertJobRole(requirementRoleName);
            jobRoleIds.set(requirementRoleName, requirementRoleId);
        }
        const requirementProfile = roleProfile(requirementRoleName);

        for (const skillName of techSkills) {
            let skillId = skillCache.get(skillName);
            if (!skillId) {
                skillId = await upsertSkill(skillName, 'Project Tech');
                skillCache.set(skillName, skillId);
            }
            if (!skillId) continue;
            await ProjectSkillRequirement.findOneAndUpdate(
                { project_id: doc!._id, skill_id: skillId },
                {
                    $set: {
                        project_id: doc!._id,
                        skill_id: skillId,
                        role_id: requirementRoleId,
                        min_skill_level: requirementProfile.level,
                        required_headcount: 1,
                        required_days: 30,
                        start_date: start,
                        end_date: end,
                    },
                },
                { upsert: true }
            );
        }
    }

    const allocHdr = wsAlloc.getRow(1);
    const weekColumns: { col: number; monday: Date }[] = [];
    allocHdr.eachCell((cell, col) => {
        if (col < 10) return;
        const label = cellText(cell);
        const monday = parseWeekMonday(label);
        if (monday) weekColumns.push({ col, monday });
    });
    weekColumns.sort((a, b) => a.monday.getTime() - b.monday.getTime());

    let allocationsUpserted = 0;
    let weeklyEntriesUpserted = 0;
    let defaultSkillId = [...skillCache.values()].find((id): id is Types.ObjectId => !!id);
    if (!defaultSkillId) {
        defaultSkillId = await upsertSkill('General', 'General');
    }

    for (let r = 2; r <= wsAlloc.rowCount; r++) {
        const row = wsAlloc.getRow(r);
        const pid = cellText(row.getCell(1)).toUpperCase();
        const projectName = cellText(row.getCell(2));
        const projectType = cellText(row.getCell(3));
        const projectStatus = cellText(row.getCell(4));
        const eid = cellText(row.getCell(5)).toUpperCase();
        const resourceName = cellText(row.getCell(6));
        const jobRoleName = cellText(row.getCell(7));
        const resourceType = cellText(row.getCell(8));
        const activeRaw = cellText(row.getCell(9));

        if (!projectName || isDummyResource(resourceName, eid)) continue;

        const code = projectByPid.get(pid) || projectCodeFromRow(pid, projectName);
        const projectId = projectByCode.get(code);
        if (!projectId) continue;

        let employeeId = employeeByCode.get(eid);
        if (!employeeId) {
            const emailGuess = [...employeeByEmail.keys()].find((e) =>
                e.startsWith(resourceName.split(' ')[0].toLowerCase())
            );
            if (emailGuess) employeeId = employeeByEmail.get(emailGuess);
        }
        if (!employeeId) continue;

        let jobRoleId = jobRoleIds.get(jobRoleName);
        if (!jobRoleId) {
            jobRoleId = await upsertJobRole(jobRoleName || 'Consultant');
            jobRoleIds.set(jobRoleName, jobRoleId);
        }

        const weeklyHours: { monday: Date; hours: number }[] = [];
        for (const w of weekColumns) {
            const hours = cellNumber(row.getCell(w.col));
            if (hours > 0) weeklyHours.push({ monday: w.monday, hours });
        }
        if (weeklyHours.length === 0) continue;

        const latest = weeklyHours[weeklyHours.length - 1];
        const percent = Math.min(100, Math.round((latest.hours / HOURS_PER_WEEK) * 100));
        const startDate = weeklyHours[0].monday;
        const endDate = weeklyHours[weeklyHours.length - 1].monday;
        const isActive =
            !activeRaw.toLowerCase().includes('not') &&
            !projectStatus.toLowerCase().includes('completed') &&
            percent > 0;
        const skillId = employeePrimarySkill.get(employeeId.toString()) || defaultSkillId;

        const allocationDoc = await ProjectAllocation.findOneAndUpdate(
            { project_id: projectId, employee_id: employeeId },
            {
                $set: {
                    project_id: projectId,
                    employee_id: employeeId,
                    role_id: jobRoleId,
                    ...(skillId ? { skill_id: skillId } : {}),
                    start_date: startDate,
                    end_date: endDate,
                    allocation_percent: percent,
                    is_active: isActive,
                    allocation_reason: `${SEED_TAG} from Project_Allocation (${latest.hours}h/wk, ${resourceType || projectType})`,
                    created_by_role: CreatedByRole.ADMIN,
                },
            },
            { upsert: true, new: true }
        );
        allocationsUpserted++;

        for (const week of weeklyHours) {
            await WeeklyAllocationEntry.findOneAndUpdate(
                {
                    employee_id: employeeId,
                    project_id: projectId,
                    week_start: week.monday,
                },
                {
                    $set: {
                        allocation_id: allocationDoc!._id,
                        employee_id: employeeId,
                        project_id: projectId,
                        week_start: week.monday,
                        planned_hours: week.hours,
                        actual_hours: 0,
                        forecast_hours: week.hours,
                        variance_hours: week.hours,
                        source: WeeklyAllocationSource.PLANNED,
                        status: WeeklyAllocationStatus.PUBLISHED,
                    },
                },
                { upsert: true }
            );
            weeklyEntriesUpserted++;
        }

        await ProjectRoleEffort.findOneAndUpdate(
            { project_id: projectId, role_id: jobRoleId },
            {
                $set: {
                    project_id: projectId,
                    role_id: jobRoleId,
                    required_headcount: 1,
                    required_days: 60,
                    start_date: startDate,
                    end_date: endDate,
                    hours_per_day: 8,
                },
            },
            { upsert: true }
        );
    }

    console.log('\n--- WeKan Planner seed complete ---');
    const junkSkills = await Skill.find({
        name: { $regex: /resources freed|date were not|not confirmed/i },
    }).select('_id');
    if (junkSkills.length > 0) {
        const junkIds = junkSkills.map((s) => s._id);
        await ProjectSkillRequirement.deleteMany({ skill_id: { $in: junkIds } });
        await EmployeeSkill.deleteMany({ skill_id: { $in: junkIds } });
        await Skill.deleteMany({ _id: { $in: junkIds } });
    }

    console.log(`Employees upserted: ${employeesUpserted}`);
    console.log(`Projects upserted: ${projectsUpserted}`);
    console.log(`Allocations upserted: ${allocationsUpserted}`);
    console.log(`Weekly grid cells upserted: ${weeklyEntriesUpserted}`);
    console.log(`Job roles: ${jobRoleIds.size}, Skills: ${skillCache.size}`);
    console.log(`Login password for all seeded users: ${PASSWORD_PLAIN}`);
    console.log('Admin login: admin@r360.com | PM: pm@r360.com');
    console.log('Sheet PMs/admins can use their @wekancode.com email if present in r360 data tab.');

    return {
        employeesUpserted,
        projectsUpserted,
        allocationsUpserted,
        weeklyEntriesUpserted,
        jobRoles: jobRoleIds.size,
        skills: skillCache.size,
        resourceOnly: false,
        message: 'WeKan Planner import complete',
    };
}
