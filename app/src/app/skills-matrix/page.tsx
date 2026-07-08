import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import {
    PageHeader,
    Section,
    MetricCard,
    MetricGrid,
    PageSkeleton,
    StatusBadge,
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEmployees } from '@/lib/use-employees';
import { useSkills } from '@/lib/use-skills';
import { useAuth } from '@/lib/auth-context';
import { canSeeManagementDashboard } from '@/lib/roles';
import { cn } from '@/lib/utils';
import type { EmployeeSkill } from '@/types/api';

function levelColor(level: string | undefined): string {
    switch (level) {
        case 'Expert':
            return 'bg-brand-600 text-white';
        case 'Intermediate':
            return 'bg-brand-200 text-brand-900';
        case 'Beginner':
            return 'bg-sky-100 text-sky-900';
        default:
            return 'bg-muted text-muted-foreground';
    }
}

function levelAbbrev(level: string | undefined): string {
    switch (level) {
        case 'Expert':
            return 'E';
        case 'Intermediate':
            return 'I';
        case 'Beginner':
            return 'B';
        default:
            return '—';
    }
}

function normalizeSkillName(name: string): string {
    return name.trim().toLowerCase();
}

function findSkill(employeeSkills: EmployeeSkill[] | undefined, skillName: string): EmployeeSkill | undefined {
    const target = normalizeSkillName(skillName);
    return employeeSkills?.find((s) => normalizeSkillName(s.name) === target);
}

export default function SkillsMatrixPage() {
    const { user } = useAuth();
    const canAccess = canSeeManagementDashboard(user?.role);
    const { employees, loading: employeesLoading } = useEmployees({ activeOnly: true });
    const { skills, loading: skillsLoading } = useSkills();

    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<string>('all');

    const activeSkills = useMemo(
        () => skills.filter((s) => s.isActive).sort((a, b) => a.name.localeCompare(b.name)),
        [skills]
    );

    /** Catalog skills plus any skills on employee profiles not yet in Skill Master. */
    const matrixSkills = useMemo(() => {
        const catalogByName = new Map(activeSkills.map((s) => [normalizeSkillName(s.name), s]));
        const extras: { id: string; name: string; category: string }[] = [];

        for (const emp of employees) {
            for (const sk of emp.skills ?? []) {
                const key = normalizeSkillName(sk.name);
                if (!key || catalogByName.has(key)) continue;
                if (extras.some((e) => normalizeSkillName(e.name) === key)) continue;
                extras.push({
                    id: `profile-${key}`,
                    name: sk.name,
                    category: 'From profiles',
                });
            }
        }

        return [...activeSkills, ...extras.sort((a, b) => a.name.localeCompare(b.name))];
    }, [activeSkills, employees]);

    const categories = useMemo(() => {
        const set = new Set(matrixSkills.map((s) => s.category).filter(Boolean));
        return ['all', ...Array.from(set).sort()];
    }, [matrixSkills]);

    const filteredSkills = useMemo(() => {
        let list = matrixSkills;
        if (category !== 'all') list = list.filter((s) => s.category === category);
        return list;
    }, [matrixSkills, category]);

    const filteredEmployees = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return employees;
        return employees.filter(
            (e) =>
                e.name.toLowerCase().includes(q) ||
                e.department?.toLowerCase().includes(q) ||
                e.jobRole?.toLowerCase().includes(q) ||
                e.role?.toLowerCase().includes(q)
        );
    }, [employees, search]);

    const coverageStats = useMemo(() => {
        const withSkills = employees.filter((e) => (e.skills?.length ?? 0) > 0).length;
        const expertCells = employees.reduce((acc, emp) => {
            return acc + (emp.skills?.filter((s) => s.skillLevel === 'Expert').length ?? 0);
        }, 0);
        const gaps = filteredSkills.filter((skill) => {
            return !employees.some((e) => findSkill(e.skills, skill.name));
        }).length;
        return { withSkills, expertCells, gaps, total: employees.length };
    }, [employees, filteredSkills]);

    const loading = employeesLoading || skillsLoading;

    if (!canAccess) {
        return <Navigate to="/workspace" replace />;
    }

    if (loading) {
        return (
            <PageContainer>
                <PageSkeleton />
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <PageHeader
                eyebrow="Resource Intelligence"
                title="Skills Matrix"
                description="Proficiency heatmap from Resource sheet skills synced to employee profiles."
                action={
                    user?.role === 'Admin' ? (
                        <Button variant="outline" size="sm" asChild>
                            <Link to="/skills">
                                <Settings2 className="w-4 h-4 mr-2" />
                                Skill Master
                            </Link>
                        </Button>
                    ) : undefined
                }
            />

            <MetricGrid className="mb-6">
                <MetricCard label="Active employees" value={String(coverageStats.total)} />
                <MetricCard label="With skills on profile" value={String(coverageStats.withSkills)} />
                <MetricCard label="Expert-level entries" value={String(coverageStats.expertCells)} />
                <MetricCard
                    label="Skill gaps"
                    value={String(coverageStats.gaps)}
                    hint="Catalog skills with no employee coverage"
                />
            </MetricGrid>

            <Section title="Filters">
                <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                        placeholder="Search employees…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="sm:max-w-xs"
                        aria-label="Search employees"
                    />
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        aria-label="Filter by skill category"
                    >
                        {categories.map((c) => (
                            <option key={c} value={c}>
                                {c === 'all' ? 'All categories' : c}
                            </option>
                        ))}
                    </select>
                </div>
            </Section>

            <Section title="Coverage matrix" className="mt-6">
                {filteredSkills.length === 0 || filteredEmployees.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                        No matrix data — add skills in Skill Master and employee profiles.
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-sm border-collapse" role="grid" aria-label="Skills coverage matrix">
                            <caption className="sr-only">
                                Employee skills matrix showing proficiency levels per skill
                            </caption>
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th
                                        scope="col"
                                        className="sticky left-0 z-10 bg-muted/95 px-3 py-2 text-left font-medium min-w-[160px]"
                                    >
                                        Employee
                                    </th>
                                    {filteredSkills.map((skill) => (
                                        <th
                                            key={skill.id}
                                            scope="col"
                                            className="px-2 py-2 text-center font-medium min-w-[72px] text-xs"
                                            title={skill.category}
                                        >
                                            <span className="line-clamp-2">{skill.name}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.map((emp) => (
                                    <tr key={emp.id} className="border-b border-border/60 hover:bg-muted/30">
                                        <th
                                            scope="row"
                                            className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium whitespace-nowrap"
                                        >
                                            <div>{emp.name}</div>
                                            <div className="text-xs text-muted-foreground font-normal">
                                                {emp.jobRole || emp.department || emp.role || '—'}
                                            </div>
                                        </th>
                                        {filteredSkills.map((skill) => {
                                            const match = findSkill(emp.skills, skill.name);
                                            const level = match?.skillLevel;
                                            return (
                                                <td key={skill.id} className="px-1 py-1 text-center">
                                                    <span
                                                        className={cn(
                                                            'inline-flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold',
                                                            levelColor(level)
                                                        )}
                                                        title={
                                                            match
                                                                ? `${skill.name}: ${level}${match.isPrimary ? ' (primary)' : ''}`
                                                                : `${skill.name}: not listed`
                                                        }
                                                        aria-label={
                                                            match
                                                                ? `${emp.name}, ${skill.name}, ${level}`
                                                                : `${emp.name}, ${skill.name}, no skill`
                                                        }
                                                    >
                                                        {levelAbbrev(level)}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <span className={cn('h-4 w-4 rounded', levelColor('Expert'))} aria-hidden /> Expert
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className={cn('h-4 w-4 rounded', levelColor('Intermediate'))} aria-hidden /> Intermediate
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className={cn('h-4 w-4 rounded', levelColor('Beginner'))} aria-hidden /> Beginner
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className={cn('h-4 w-4 rounded', levelColor(undefined))} aria-hidden /> Not listed
                    </span>
                </div>
            </Section>

            <Section title="Gap highlights" className="mt-6">
                <div className="flex flex-wrap gap-2">
                    {filteredSkills
                        .filter((skill) => !employees.some((e) => findSkill(e.skills, skill.name)))
                        .slice(0, 12)
                        .map((skill) => (
                            <StatusBadge key={skill.id} variant="warning">
                                {skill.name}
                            </StatusBadge>
                        ))}
                    {coverageStats.gaps === 0 && (
                        <p className="text-sm text-muted-foreground">All visible skills have employee coverage.</p>
                    )}
                </div>
            </Section>
        </PageContainer>
    );
}
