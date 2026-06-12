import { HelpCircle } from 'lucide-react';
import type { RankedEmployee } from '@/lib/use-ranked-employees';
import { getCapacityDisplay } from './allocation-capacity-display';

function buildHintLines(emp: RankedEmployee, rankPosition: number): string[] {
    const matchPct = Math.round((emp.matchScore ?? 0) * 100);
    const skills =
        emp.matchingSkills?.map((s) => `${s.name} (${s.level})`).join(', ') ||
        `${emp.primarySkill} (${emp.skillLevel})`;

    const lines: string[] = [`Rank #${rankPosition} · ${matchPct}% match score`];

    if (emp.factors?.skillMatch) {
        lines.push(`Skill fit: ${skills}`);
    } else if (skills && !skills.includes('No skills on profile')) {
        lines.push(`Employee skills (no project requirement match): ${skills}`);
    } else {
        lines.push('No skills recorded on employee profile');
    }

    const capacity = getCapacityDisplay(emp);
    lines.push(capacity.headline);
    if (capacity.detail) {
        lines.push(capacity.detail);
    }

    lines.push(
        emp.experienceYears > 0
            ? `${emp.experienceYears} yrs experience on matched skills`
            : 'Experience years not recorded on profile'
    );

    if (emp.suggestedAllocationRoleName) {
        lines.push(`Suggested role: ${emp.suggestedAllocationRoleName}`);
    }

    return lines;
}

export function MatchWhyHint({ emp, rankPosition }: { emp: RankedEmployee; rankPosition: number }) {
    const lines = buildHintLines(emp, rankPosition);

    return (
        <div className="relative group/hint shrink-0">
            <button
                type="button"
                className="inline-flex items-center h-7 px-2 text-xs text-gray-500 hover:text-brand-700 rounded-md hover:bg-brand-50 transition-colors"
                aria-label="Why this match score?"
            >
                <HelpCircle className="w-3 h-3 mr-1" />
                Why?
            </button>
            <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full right-0 mb-2 z-30 w-64 rounded-lg border border-indigo-100 bg-white p-3 shadow-lg opacity-0 invisible translate-y-1 transition-all duration-150 group-hover/hint:opacity-100 group-hover/hint:visible group-hover/hint:translate-y-0 group-focus-within/hint:opacity-100 group-focus-within/hint:visible group-focus-within/hint:translate-y-0"
            >
                <p className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider mb-2">
                    Match breakdown
                </p>
                <ul className="space-y-1.5 text-xs text-gray-600 leading-relaxed">
                    {lines.map((line, i) => (
                        <li key={i} className="flex gap-1.5">
                            <span className="text-indigo-400 shrink-0">•</span>
                            <span>{line}</span>
                        </li>
                    ))}
                </ul>
                <div
                    className="absolute -bottom-1.5 right-4 h-3 w-3 rotate-45 border-r border-b border-indigo-100 bg-white"
                    aria-hidden
                />
            </div>
        </div>
    );
}
