import ExcelJS from 'exceljs';
import { Types } from 'mongoose';
import { ImportWriteOptions, mongooseSessionOpts } from './types/import-write.options';
import { Role } from '../../modules/roles/role.model';
import { Skill } from '../../modules/skills/skill.model';
import {
    ProjectStatus,
    ProjectPriority,
    BillingType,
    SkillLevel,
} from '../../common/types/enums';
import { startOfUtcWeek } from '../../common/utils/week.util';

export const SEED_TAG = 'wekan-planner-2026';
export const PASSWORD_PLAIN = 'Admin123!';
export const HOURS_PER_WEEK = 40;

export function cellText(cell: ExcelJS.Cell): string {
    let v: unknown = cell.value;
    if (v && typeof v === 'object' && 'result' in (v as object)) v = (v as { result: unknown }).result;
    if (v && typeof v === 'object' && 'text' in (v as object)) v = (v as { text: string }).text;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (v == null) return '';
    return String(v).replace(/\s+/g, ' ').trim();
}

export function cellNumber(cell: ExcelJS.Cell): number {
    const t = cellText(cell);
    const n = Number(t);
    return Number.isFinite(n) ? n : 0;
}

export function parseName(full: string): { first: string; last: string } {
    const parts = full.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { first: 'Unknown', last: 'User' };
    if (parts.length === 1) return { first: parts[0], last: '-' };
    return { first: parts[0], last: parts.slice(1).join(' ') };
}

/** Canonical sheet EID form, e.g. e059 → E059. */
export function normalizeEmployeeCode(code: string): string {
    const trimmed = code.trim().toUpperCase();
    const match = trimmed.match(/^E(\d+)$/i);
    if (match) return `E${parseInt(match[1], 10)}`;
    return trimmed;
}

/** Lookup keys for E059 vs E59 vs sheet padding mismatches. */
export function employeeCodeLookupKeys(code: string): string[] {
    const normalized = normalizeEmployeeCode(code);
    const keys = new Set<string>([normalized, code.trim().toUpperCase()]);
    const match = normalized.match(/^E(\d+)$/i);
    if (match) {
        const num = parseInt(match[1], 10);
        keys.add(`E${num}`);
        keys.add(`E${String(num).padStart(3, '0')}`);
        keys.add(`E${String(num).padStart(4, '0')}`);
    }
    return [...keys];
}

/** Stable import email when Resource row is missing or invalid. */
export function allocationImportEmail(employeeCode: string): string {
    const slug = normalizeEmployeeCode(employeeCode).replace(/[^A-Z0-9]/g, '').toLowerCase() || 'unknown';
    return `${slug}@import.wekan.local`;
}

export function mapProjectStatus(sheetStatus: string): ProjectStatus {
    const s = sheetStatus.trim().toLowerCase();
    if (!s) return ProjectStatus.PLANNING;
    if (
        s === 'active' ||
        s === 'in progress' ||
        s === 'in-progress' ||
        s === 'ongoing' ||
        s === 'live' ||
        s === 'started'
    ) {
        return ProjectStatus.ACTIVE;
    }
    if (s === 'completed' || s === 'done' || s === 'closed') return ProjectStatus.COMPLETED;
    if (
        s === 'proposal lost' ||
        s === 'lost' ||
        s === 'on hold' ||
        s === 'on-hold' ||
        s === 'onhold' ||
        s === 'hold'
    ) {
        return ProjectStatus.ON_HOLD;
    }
    if (s === 'planning' || s === 'planned' || s === 'proposal') return ProjectStatus.PLANNING;
    return ProjectStatus.PLANNING;
}

export function mapPriority(type: string, status: ProjectStatus): ProjectPriority {
    if (status === ProjectStatus.ACTIVE) return ProjectPriority.HIGH;
    if (type.toLowerCase().includes('internal')) return ProjectPriority.MEDIUM;
    return ProjectPriority.LOW;
}

export function mapBilling(type: string): BillingType | undefined {
    const t = type.toLowerCase();
    if (t.includes('internal')) return BillingType.NON_BILLABLE;
    if (t.includes('customer') || t.includes('projected')) return BillingType.BILLABLE;
    return undefined;
}

export function projectCodeFromRow(pid: string, name: string): string {
    const id = pid.trim().toUpperCase().replace(/\s+/g, '');
    if (/^P\d+$/i.test(id)) return `WK-${id}`;
    const slug = name
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 24)
        .toUpperCase();
    return `WK-${slug || 'PROJECT'}`;
}

export function isDummyResource(name: string, eid: string): boolean {
    const n = name.toLowerCase();
    const id = eid.toLowerCase();
    return n.includes('dummy') || n.includes('z dummy') || id.startsWith('z');
}

interface RoleProfile {
    level: SkillLevel;
    years: number;
}

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

export function roleProfile(jobRoleName: string): RoleProfile {
    const name = jobRoleName.trim();
    if (!name) return { level: SkillLevel.INTERMEDIATE, years: 3 };
    for (const rule of ROLE_PROFILE_RULES) {
        if (rule.pattern.test(name)) return rule.profile;
    }
    return { level: SkillLevel.INTERMEDIATE, years: 3 };
}

/** Fallback when project_type was not imported yet. */
export function deriveProjectTypeLabel(projectType?: string, billingType?: string): string | undefined {
    const trimmed = projectType?.trim();
    if (trimmed) return trimmed;
    const billing = billingType?.trim().toLowerCase();
    if (billing === 'non-billable') return 'Internal';
    if (billing === 'billable') return 'Customer';
    return undefined;
}

export function inferSkillLevel(_jobRoleName: string, _skillIndex: number): SkillLevel {
    return SkillLevel.EXPERT;
}

export function inferExperienceYears(jobRoleName: string, skillIndex: number): number {
    const baseYears = roleProfile(jobRoleName).years;
    return skillIndex === 0 ? baseYears : Math.max(1, baseYears - 1);
}

export function isLikelySkillName(name: string): boolean {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 60) return false;
    if (/resources freed|date were not|not confirmed|as date/i.test(trimmed)) return false;
    return true;
}

export function parseSheetDateFromText(text: string): Date | null {
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

export function parseSheetDate(cell: ExcelJS.Cell): Date | null {
    const raw = cell.value;
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        return new Date(Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate()));
    }
    return parseSheetDateFromText(cellText(cell));
}

export function parseSkillList(raw: string): string[] {
    return raw
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => isLikelySkillName(s));
}

export function departmentLabel(resourceType: string, location: string): string {
    if (resourceType && location) return `${resourceType} · ${location}`;
    return resourceType || location || 'Engineering';
}

/** Reverse of projectCodeFromRow for WK-P101 → P101 (sheet PID column). */
export function projectCodeToPid(projectCode: string): string | null {
    const code = projectCode.trim().toUpperCase();
    const wkMatch = code.match(/^WK-(P\d+)$/);
    if (wkMatch) return wkMatch[1];
    if (/^P\d+$/.test(code)) return code;
    return null;
}

/** Sheet week column display header, e.g. 22 Jun (matches Project_Allocation tab). */
export function formatWeekSheetHeader(weekStart: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${weekStart.getUTCDate()} ${months[weekStart.getUTCMonth()]}`;
}

/** Weekly Planner tab: one week spans Plan / Act / Delta columns, e.g. "22 Jun Plan". */
export function formatWeeklyPlannerMetricHeader(
    weekStart: Date,
    metric: 'Plan' | 'Act' | 'Delta'
): string {
    return `${formatWeekSheetHeader(weekStart)} ${metric}`;
}

export function parseWeekMonday(header: string): Date | null {
    const h = header.trim();
    const m1 = h.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})$/);
    if (m1) {
        const months: Record<string, number> = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
        };
        const mon = months[m1[2].slice(0, 3).toLowerCase()];
        if (mon == null) return null;
        const year = mon >= 4 ? 2026 : 2025;
        return startOfUtcWeek(new Date(Date.UTC(year, mon, Number(m1[1]))));
    }
    const d = new Date(h);
    return Number.isNaN(d.getTime()) ? null : startOfUtcWeek(d);
}

export async function upsertAccessRole(
    roleName: string,
    writeOpts?: ImportWriteOptions
): Promise<Types.ObjectId> {
    const doc = await Role.findOneAndUpdate(
        { role_name: roleName },
        { $setOnInsert: { role_name: roleName, is_active: true, department: 'WeKan' } },
        { upsert: true, new: true, ...mongooseSessionOpts(writeOpts) }
    );
    return doc!._id;
}

export async function upsertJobRole(
    roleName: string,
    writeOpts?: ImportWriteOptions
): Promise<Types.ObjectId> {
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
        { upsert: true, new: true, ...mongooseSessionOpts(writeOpts) }
    );
    return doc!._id;
}

export async function upsertSkill(
    name: string,
    category: string,
    writeOpts?: ImportWriteOptions
): Promise<Types.ObjectId | undefined> {
    const trimmed = name.trim().slice(0, 120);
    if (!trimmed) return undefined;
    const doc = await Skill.findOneAndUpdate(
        { name: trimmed },
        { $setOnInsert: { name: trimmed, category, is_active: true, description: SEED_TAG } },
        { upsert: true, new: true, ...mongooseSessionOpts(writeOpts) }
    );
    return doc!._id;
}

export async function cleanupJunkSkills(writeOpts?: ImportWriteOptions): Promise<void> {
    const sessionOpts = mongooseSessionOpts(writeOpts);
    let junkQuery = Skill.find({
        name: { $regex: /resources freed|date were not|not confirmed/i },
    }).select('_id');
    if (writeOpts?.session) {
        junkQuery = junkQuery.session(writeOpts.session);
    }
    const junkSkills = await junkQuery;
    if (junkSkills.length === 0) return;
    const { EmployeeSkill } = await import('../../modules/employees/employee-skill.model');
    const { ProjectSkillRequirement } = await import('../../modules/projects/project-skill-requirement.model');
    const junkIds = junkSkills.map((s) => s._id);
    await ProjectSkillRequirement.deleteMany({ skill_id: { $in: junkIds } }, sessionOpts);
    await EmployeeSkill.deleteMany({ skill_id: { $in: junkIds } }, sessionOpts);
    await Skill.deleteMany({ _id: { $in: junkIds } }, sessionOpts);
}
