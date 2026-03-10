'use client';

import LogoHeader from './LogoHeader';

interface Skill {
    skillName: string;
    skillLevel: string;
    skillCategory?: string;
}

interface EmployeeData {
    employeeId: string;
    name: string;
    department?: string;
    position?: string;
    profileImage?: string;
}

interface SingleResult {
    found: boolean;
    allEmployees?: false;
    message?: string;
    employee: EmployeeData | null;
    skills: Skill[];
    totalSkills: number;
}

interface AllEmployeesResult {
    found: boolean;
    allEmployees: true;
    employees: (EmployeeData & { skills: Skill[]; totalSkills: number })[];
    totalEmployees: number;
}

type WidgetData = SingleResult | AllEmployeesResult;

const LEVEL_CONFIG: Record<string, {
    rank: number;
    emoji: string;
    label: string;
    color: string;
    bg: string;
    border: string;
    bar: string;
    glow: string;
}> = {
    Expert: {
        rank: 3, emoji: '🔥', label: 'Expert',
        color: '#c4b5fd', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.2)', bar: '#a78bfa', glow: 'rgba(139, 92, 246, 0.2)',
    },
    Intermediate: {
        rank: 2, emoji: '⚡', label: 'Intermediate',
        color: '#fcd34d', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.2)', bar: '#fbbf24', glow: 'rgba(245, 158, 11, 0.2)',
    },
    Beginner: {
        rank: 1, emoji: '🌱', label: 'Beginner',
        color: '#6ee7b7', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.2)', bar: '#34d399', glow: 'rgba(16, 185, 129, 0.2)',
    },
};

const LEVEL_CONFIG_LIGHT: Record<string, {
    color: string; bg: string; border: string; bar: string;
}> = {
    Expert: { color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', bar: '#8b5cf6' },
    Intermediate: { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', bar: '#f59e0b' },
    Beginner: { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', bar: '#10b981' },
};

function getConfig(level: string, isDark: boolean) {
    const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.Beginner;
    if (!isDark) {
        const light = LEVEL_CONFIG_LIGHT[level] || LEVEL_CONFIG_LIGHT.Beginner;
        return { ...cfg, ...light };
    }
    return cfg;
}

function getInitials(name: string) {
    return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function SkillBadge({ sk, isDark, cardBg, border: borderColor, textPrimary }: {
    sk: Skill; isDark: boolean; cardBg: string; border: string; textPrimary: string;
}) {
    const cfg = getConfig(sk.skillLevel, isDark);
    return (
        <div style={{
            background: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: 12,
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 8,
            backdropFilter: isDark ? 'blur(8px)' : undefined,
        }}>
            <div style={{
                fontSize: 13, fontWeight: 700, color: textPrimary,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
                {sk.skillName}
            </div>
            <span style={{
                flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', gap: 3,
                background: cfg.bg, color: cfg.color,
                border: `1px solid ${cfg.border}`,
                padding: '3px 8px', borderRadius: 6,
                fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
            }}>
                {cfg.emoji} {sk.skillLevel}
            </span>
        </div>
    );
}

function SingleEmployeeView({ employee, skills, isDark, cardBg, border: borderColor, textPrimary, textSecondary, textMuted }: {
    employee: EmployeeData; skills: Skill[]; isDark: boolean;
    cardBg: string; border: string; textPrimary: string; textSecondary: string; textMuted: string;
}) {
    const byCategory = new Map<string, Skill[]>();
    for (const s of skills) {
        const cat = s.skillCategory || 'Other';
        byCategory.set(cat, [...(byCategory.get(cat) || []), s]);
    }
    for (const [cat, arr] of byCategory) {
        arr.sort((a, b) => getConfig(b.skillLevel, isDark).rank - getConfig(a.skillLevel, isDark).rank);
        byCategory.set(cat, arr);
    }
    const categories = Array.from(byCategory.entries());

    const levelCounts = { Expert: 0, Intermediate: 0, Beginner: 0 };
    for (const s of skills) {
        if (s.skillLevel in levelCounts) levelCounts[s.skillLevel as keyof typeof levelCounts]++;
    }

    return (
        <>
            <div style={{
                padding: '28px 28px 24px',
                background: isDark
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                borderBottom: `1px solid ${borderColor}`,
                backdropFilter: isDark ? 'blur(16px)' : undefined,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                        overflow: 'hidden',
                        border: `3px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : '#e2e8f0'}`,
                        background: isDark ? '#334155' : '#e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {employee.profileImage ? (
                            <img src={employee.profileImage} alt={employee.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ fontSize: 24, fontWeight: 800, color: isDark ? '#94a3b8' : '#64748b' }}>
                                {getInitials(employee.name)}
                            </span>
                        )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: textPrimary, letterSpacing: -0.3 }}>
                            {employee.name}
                        </h1>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {employee.position && (
                                <span style={{
                                    fontSize: 12, fontWeight: 600, color: textSecondary,
                                    background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f1f5f9',
                                    padding: '4px 10px', borderRadius: 8,
                                }}>{employee.position}</span>
                            )}
                            {employee.department && (
                                <span style={{
                                    fontSize: 12, fontWeight: 600,
                                    color: isDark ? '#818cf8' : '#6366f1',
                                    background: isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff',
                                    padding: '4px 10px', borderRadius: 8,
                                }}>{employee.department}</span>
                            )}
                        </div>
                    </div>
                    <div style={{
                        flexShrink: 0, textAlign: 'center',
                        background: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4',
                        border: `1px solid rgba(16, 185, 129, 0.2)`,
                        borderRadius: 14, padding: '10px 16px',
                    }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#10B981', lineHeight: 1 }}>
                            {skills.length}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: '#10B981', letterSpacing: 0.5, marginTop: 2 }}>
                            Skills
                        </div>
                    </div>
                </div>

                {skills.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                            {(['Expert', 'Intermediate', 'Beginner'] as const).map(level => {
                                const count = levelCounts[level];
                                if (count === 0) return null;
                                const cfg = getConfig(level, isDark);
                                return (
                                    <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: cfg.color }}>
                                        <span>{cfg.emoji}</span><span>{count} {level}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#e2e8f0' }}>
                            {(['Expert', 'Intermediate', 'Beginner'] as const).map(level => {
                                const count = levelCounts[level];
                                if (count === 0) return null;
                                const cfg = getConfig(level, isDark);
                                return <div key={level} style={{ flex: count, background: cfg.bar, transition: 'flex 0.3s ease' }} />;
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ padding: '20px 28px 28px' }}>
                {categories.map(([category, catSkills]) => (
                    <div key={category} style={{ marginBottom: 20 }}>
                        <div style={{
                            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: 0.8, color: textMuted, marginBottom: 10,
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            <span>{category === 'Technical' ? '⚙️' : category === 'Soft Skills' ? '💬' : '📋'}</span>
                            {category}
                            <span style={{ fontSize: 10, fontWeight: 500 }}>({catSkills.length})</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                            {catSkills.map((sk, i) => (
                                <SkillBadge key={i} sk={sk} isDark={isDark} cardBg={cardBg} border={borderColor} textPrimary={textPrimary} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

function AllEmployeesView({ employees, isDark, cardBg, border: borderColor, textPrimary, textSecondary, textMuted }: {
    employees: (EmployeeData & { skills: Skill[]; totalSkills: number })[];
    isDark: boolean; cardBg: string; border: string;
    textPrimary: string; textSecondary: string; textMuted: string;
}) {
    const totalSkills = employees.reduce((sum, e) => sum + e.totalSkills, 0);
    const avgSkills = employees.length > 0 ? (totalSkills / employees.length).toFixed(1) : '0';

    return (
        <>
            <div style={{
                padding: '24px 28px 20px',
                background: isDark
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                borderBottom: `1px solid ${borderColor}`,
                backdropFilter: isDark ? 'blur(16px)' : undefined,
            }}>
                <h1 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: textPrimary }}>
                    👥 Team Skill Directory
                </h1>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: textSecondary, fontWeight: 500 }}>
                        {employees.length} employees
                    </span>
                    <span style={{ fontSize: 13, color: textSecondary, fontWeight: 500 }}>
                        • {totalSkills} total skills
                    </span>
                    <span style={{ fontSize: 13, color: textSecondary, fontWeight: 500 }}>
                        • ~{avgSkills} skills/person
                    </span>
                </div>
            </div>

            <div style={{ padding: '20px 28px 28px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {employees.map((emp) => {
                        const sorted = [...emp.skills].sort((a, b) =>
                            (getConfig(b.skillLevel, isDark).rank) - (getConfig(a.skillLevel, isDark).rank)
                        );
                        return (
                            <div key={emp.employeeId} style={{
                                background: cardBg,
                                border: `1px solid ${borderColor}`,
                                borderRadius: 14,
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    padding: '16px 20px',
                                    display: 'flex', alignItems: 'center', gap: 14,
                                    borderBottom: emp.skills.length > 0 ? `1px solid ${borderColor}` : 'none',
                                }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                                        overflow: 'hidden',
                                        border: `2px solid ${isDark ? 'rgba(59, 130, 246, 0.15)' : '#e2e8f0'}`,
                                        background: isDark ? '#334155' : '#e2e8f0',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {emp.profileImage ? (
                                            <img src={emp.profileImage} alt={emp.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: 14, fontWeight: 800, color: isDark ? '#94a3b8' : '#64748b' }}>
                                                {getInitials(emp.name)}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>{emp.name}</div>
                                        <div style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                                            {[emp.position, emp.department].filter(Boolean).join(' • ')}
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: 13, fontWeight: 700,
                                        color: '#10B981',
                                        background: isDark ? 'rgba(16,185,129,0.1)' : '#f0fdf4',
                                        padding: '4px 12px', borderRadius: 8,
                                    }}>
                                        {emp.totalSkills} skills
                                    </div>
                                </div>

                                {emp.skills.length > 0 && (
                                    <div style={{ padding: '12px 20px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {sorted.map((sk, j) => {
                                            const cfg = getConfig(sk.skillLevel, isDark);
                                            return (
                                                <span key={j} style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 3,
                                                    background: cfg.bg, color: cfg.color,
                                                    border: `1px solid ${cfg.border}`,
                                                    padding: '3px 10px', borderRadius: 6,
                                                    fontSize: 11, fontWeight: 600,
                                                }}>
                                                    {cfg.emoji} {sk.skillName}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

export default function EmployeeSkillsWidget({ data, isDark = false }: { data: WidgetData, isDark?: boolean }) {
    const bg = isDark ? '#0F172A' : '#f8fafc';
    const cardBg = isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff';
    const border = isDark ? 'rgba(59, 130, 246, 0.08)' : '#e2e8f0';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#94a3b8' : '#64748b';
    const textMuted = isDark ? '#475569' : '#94a3b8';

    if (!data || !data.found) {
        return (
            <div style={{
                padding: 48, textAlign: 'center', color: textSecondary, background: bg,
                borderRadius: 16, border: `1px solid ${border}`,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: textPrimary }}>Employee Not Found</p>
                {(data as any)?.message && <p style={{ margin: '8px 0 0', fontSize: 13, color: textSecondary }}>{(data as any).message}</p>}
            </div>

        );
    }

    const isAllEmployees = 'allEmployees' in data && data.allEmployees === true;

    return (
        <div style={{
            background: bg, minHeight: 250, maxHeight: 700, overflow: 'auto',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            borderRadius: 12, border: `1px solid ${border}`,
        }}>
            <LogoHeader isDark={isDark} />

            {isAllEmployees ? (
                <AllEmployeesView
                    employees={(data as AllEmployeesResult).employees}
                    isDark={isDark} cardBg={cardBg} border={border}
                    textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted}
                />
            ) : (
                (data as SingleResult).employee && (
                    <SingleEmployeeView
                        employee={(data as SingleResult).employee!}
                        skills={(data as SingleResult).skills}
                        isDark={isDark} cardBg={cardBg} border={border}
                        textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted}
                    />
                )
            )}

            <div style={{
                padding: '14px 28px', textAlign: 'center',
                fontSize: 11, fontWeight: 500, letterSpacing: 0.3,
                color: textMuted,
                borderTop: `1px solid ${border}`,
                background: isDark ? 'rgba(15, 23, 42, 0.5)' : undefined,
                backdropFilter: isDark ? 'blur(8px)' : undefined,
            }}>
                WeKan Enterprise Solutions • Resource 360
            </div>
        </div>
    );
}
