import { Okr, IOkr, IKeyResult, OkrStatus } from './okr.model';
import { Employee } from '../employees/employee.model';
import { Types } from 'mongoose';
import { AppError } from '../../common/errors/app-error';

// ── Types ──────────────────────────────────────────────────────

export interface KeyResultInput {
    title: string;
    target: number;
    achieved?: number;
    unit: string;
    status?: string;
}

export interface CreateOkrInput {
    employeeId: string;
    objective: string;
    periodQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    periodYear: number;
    status?: OkrStatus;
    keyResults: KeyResultInput[];
    createdBy?: string;
}

export interface UpdateOkrInput {
    objective?: string;
    status?: OkrStatus;
    keyResults?: KeyResultInput[];
}

export interface UpdateProgressInput {
    keyResultId: string;
    achieved: number;
    status?: string;
}

export interface ComputedKeyResult {
    id: string;
    title: string;
    target: number;
    achieved: number;
    unit: string;
    status: string;
    achievementPercent: number;
}

export interface OkrResponse {
    id: string;
    employeeId: string;
    employeeName?: string;
    objective: string;
    period: string;
    periodQuarter: string;
    periodYear: number;
    status: string;
    keyResults: ComputedKeyResult[];
    achievementPercent: number;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface OkrSummaryResponse {
    okrs: OkrResponse[];
    overallScore: number;
}

// ── Service ─────────────────────────────────────────────────────

export class OkrService {

    // ─── Achievement Computation ──────────────────────────────

    /**
     * Compute achievement % for a single key result.
     * Handles 3 scenarios:
     *   - Higher is better (default): achieved/target * 100
     *   - Lower is better (detected by unit/keywords): target/achieved * 100
     *   - Zero target (e.g. "zero incidents"): achieved=0 → 100%, else 0%
     */
    private computeKeyResultAchievement(kr: IKeyResult): number {
        const lowerIsBetterUnits = ['hours', 'ms', 'seconds', 'minutes', 'days'];
        const lowerIsBetterKeywords = ['reduce', 'under', 'zero', 'decrease', 'minimize', 'fewer'];

        const isLowerBetter =
            lowerIsBetterUnits.includes(kr.unit.toLowerCase()) ||
            lowerIsBetterKeywords.some(k => kr.title.toLowerCase().includes(k));

        if (kr.target === 0) {
            // Zero target: achieved 0 = 100%, otherwise 0
            return kr.achieved === 0 ? 100 : 0;
        }

        if (isLowerBetter) {
            // Lower is better: achieved ≤ target is great
            return Math.min(100, Math.round((kr.target / Math.max(kr.achieved, 0.01)) * 100));
        }

        // Higher is better (default)
        return Math.min(100, Math.round((kr.achieved / kr.target) * 100));
    }

    /**
     * Compute achievement % for an entire OKR (average of its key results).
     */
    private computeOkrAchievement(keyResults: IKeyResult[]): number {
        if (keyResults.length === 0) return 0;
        const total = keyResults.reduce(
            (sum, kr) => sum + this.computeKeyResultAchievement(kr), 0
        );
        return Math.round(total / keyResults.length);
    }

    /**
     * Compute overall score across multiple OKRs (average of OKR achievements).
     */
    private computeOverallScore(okrs: IOkr[]): number {
        if (okrs.length === 0) return 0;
        const total = okrs.reduce(
            (sum, okr) => sum + this.computeOkrAchievement(okr.key_results), 0
        );
        return Math.round(total / okrs.length);
    }

    // ─── Response Mapping ─────────────────────────────────────

    private mapToResponse(okr: IOkr, employeeName?: string): OkrResponse {
        const keyResults: ComputedKeyResult[] = okr.key_results.map(kr => ({
            id: (kr as any)._id?.toString() || '',
            title: kr.title,
            target: kr.target,
            achieved: kr.achieved,
            unit: kr.unit,
            status: kr.status,
            achievementPercent: this.computeKeyResultAchievement(kr),
        }));

        return {
            id: okr._id.toString(),
            employeeId: okr.employee_id.toString(),
            employeeName,
            objective: okr.objective,
            period: okr.period,
            periodQuarter: okr.period_quarter,
            periodYear: okr.period_year,
            status: okr.status,
            keyResults,
            achievementPercent: this.computeOkrAchievement(okr.key_results),
            createdBy: okr.created_by?.toString(),
            createdAt: okr.created_at?.toISOString(),
            updatedAt: okr.updated_at?.toISOString(),
        };
    }

    // ─── CRUD ─────────────────────────────────────────────────

    async create(input: CreateOkrInput): Promise<OkrResponse> {
        if (!Types.ObjectId.isValid(input.employeeId)) {
            throw new AppError('Invalid employee ID', 400);
        }

        const employee = await Employee.findById(input.employeeId).lean();
        if (!employee) {
            throw new AppError('Employee not found', 404);
        }

        const period = `${input.periodQuarter}-${input.periodYear}`;

        const okr = new Okr({
            employee_id: input.employeeId,
            objective: input.objective,
            period,
            period_quarter: input.periodQuarter,
            period_year: input.periodYear,
            status: input.status || 'Draft',
            key_results: input.keyResults.map(kr => ({
                title: kr.title,
                target: kr.target,
                achieved: kr.achieved || 0,
                unit: kr.unit,
                status: kr.status || 'Not Started',
            })),
            created_by: input.createdBy ? new Types.ObjectId(input.createdBy) : undefined,
        });

        await okr.save();

        const name = `${(employee as any).first_name} ${(employee as any).last_name}`.trim();
        return this.mapToResponse(okr, name);
    }

    async findByEmployee(employeeId: string, period?: string): Promise<OkrSummaryResponse> {
        if (!Types.ObjectId.isValid(employeeId)) {
            throw new AppError('Invalid employee ID', 400);
        }

        const filter: Record<string, unknown> = { employee_id: new Types.ObjectId(employeeId) };
        if (period) filter.period = period;

        const okrs = await Okr.find(filter).sort({ period: -1, created_at: -1 }).lean() as unknown as IOkr[];

        // Get employee name
        const employee = await Employee.findById(employeeId, { first_name: 1, last_name: 1 }).lean();
        const name = employee
            ? `${(employee as any).first_name} ${(employee as any).last_name}`.trim()
            : undefined;

        return {
            okrs: okrs.map(okr => this.mapToResponse(okr, name)),
            overallScore: this.computeOverallScore(okrs),
        };
    }

    async findAll(period?: string): Promise<OkrResponse[]> {
        const filter: Record<string, unknown> = {};
        if (period) filter.period = period;

        const okrs = await Okr.find(filter).sort({ employee_id: 1, created_at: -1 }).lean() as unknown as IOkr[];

        // Bulk-fetch employee names
        const employeeIds = [...new Set(okrs.map(o => o.employee_id.toString()))];
        const employees = await Employee.find(
            { _id: { $in: employeeIds.map(id => new Types.ObjectId(id)) } },
            { first_name: 1, last_name: 1 }
        ).lean();

        const nameById = new Map(
            employees.map((e: any) => [e._id.toString(), `${e.first_name} ${e.last_name}`.trim()])
        );

        return okrs.map(okr => this.mapToResponse(okr, nameById.get(okr.employee_id.toString())));
    }

    async update(okrId: string, input: UpdateOkrInput): Promise<OkrResponse> {
        if (!Types.ObjectId.isValid(okrId)) {
            throw new AppError('Invalid OKR ID', 400);
        }

        const updateData: Record<string, unknown> = {};
        if (input.objective) updateData.objective = input.objective;
        if (input.status) updateData.status = input.status;
        if (input.keyResults) {
            updateData.key_results = input.keyResults.map(kr => ({
                title: kr.title,
                target: kr.target,
                achieved: kr.achieved || 0,
                unit: kr.unit,
                status: kr.status || 'Not Started',
            }));
        }

        const okr = await Okr.findByIdAndUpdate(okrId, updateData, { new: true }).lean() as IOkr | null;
        if (!okr) throw new AppError('OKR not found', 404);

        const employee = await Employee.findById(okr.employee_id, { first_name: 1, last_name: 1 }).lean();
        const name = employee
            ? `${(employee as any).first_name} ${(employee as any).last_name}`.trim()
            : undefined;

        return this.mapToResponse(okr, name);
    }

    async updateProgress(okrId: string, input: UpdateProgressInput): Promise<OkrResponse> {
        if (!Types.ObjectId.isValid(okrId)) {
            throw new AppError('Invalid OKR ID', 400);
        }

        const okr = await Okr.findById(okrId);
        if (!okr) throw new AppError('OKR not found', 404);

        const kr = okr.key_results.find((k: any) => k._id?.toString() === input.keyResultId);
        if (!kr) throw new AppError('Key result not found', 404);

        kr.achieved = input.achieved;

        // Auto-compute key result status based on achievement
        if (input.status) {
            kr.status = input.status as any;
        } else {
            // Auto-determine status from achieved vs target
            if (input.achieved === 0 && kr.target !== 0) {
                kr.status = 'Not Started';
            } else if (input.achieved >= kr.target && kr.target > 0) {
                kr.status = 'Completed';
            } else {
                kr.status = 'In Progress';
            }
        }

        // Auto-set OKR status to Active if any key result has progress
        if (okr.status === 'Draft') {
            const hasProgress = okr.key_results.some((k: any) => k.achieved > 0);
            if (hasProgress) {
                okr.status = 'Active';
            }
        }

        // Auto-set OKR status to Completed if all key results are completed
        const allCompleted = okr.key_results.every((k: any) => k.status === 'Completed');
        if (allCompleted && okr.key_results.length > 0) {
            okr.status = 'Completed';
        }

        await okr.save();

        const employee = await Employee.findById(okr.employee_id, { first_name: 1, last_name: 1 }).lean();
        const name = employee
            ? `${(employee as any).first_name} ${(employee as any).last_name}`.trim()
            : undefined;

        return this.mapToResponse(okr, name);
    }

    async delete(okrId: string): Promise<void> {
        if (!Types.ObjectId.isValid(okrId)) {
            throw new AppError('Invalid OKR ID', 400);
        }

        const okr = await Okr.findByIdAndDelete(okrId);
        if (!okr) throw new AppError('OKR not found', 404);
    }

    /**
     * Get available periods across all OKRs (for dropdown population).
     */
    async getAvailablePeriods(): Promise<string[]> {
        const periods = await Okr.distinct('period');
        return periods.sort().reverse();
    }
}

export const okrService = new OkrService();
