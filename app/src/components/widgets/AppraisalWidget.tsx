'use client';

import LogoHeader from './LogoHeader';

interface KeyResult {
    title: string;
    target: number;
    achieved: number;
    unit: string;
    status: string;
    achievementPercent: number;
}

interface OKR {
    okrId: string;
    objective: string;
    period: string;
    keyResults: KeyResult[];
    okrAchievementPercent: number;
}

interface Employee {
    employeeId: string;
    name: string;
    department?: string;
    position?: string;
    profileImage?: string;
}

interface ReviewSummary {
    totalReviews: number;
    averageRating: number;
    projectsWorkedOn: string[];
    strengths: string[];
    areasForImprovement: string[];
}

interface Scores {
    okrScore: number;
    reviewScore: number;
    compositeScore: number;
    formula: string;
}

interface Hike {
    hikePercent: number;
    band: string;
    bandEmoji: string;
}

interface WidgetData {
    found: boolean;
    message?: string;
    employee: Employee | null;
    okrs: OKR[];
    reviewSummary: ReviewSummary | null;
    scores: Scores | null;
    hike: Hike | null;
}

function getInitials(name: string) {
    return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function getBandColor(band: string) {
    if (band.includes('Outstanding')) return '#10B981';
    if (band.includes('Exceeds')) return '#3B82F6';
    if (band.includes('Meets')) return '#F59E0B';
    if (band.includes('Needs')) return '#f97316';
    return '#ef4444';
}

function getStatusStyle(status: string, isDark: boolean) {
    if (status === 'completed' || status === 'exceeded') {
        return { bg: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5', color: '#10B981', label: status === 'exceeded' ? 'Exceeded' : 'Done' };
    }
    if (status === 'on_track') {
        return { bg: isDark ? 'rgba(59, 130, 246, 0.12)' : '#eff6ff', color: '#3B82F6', label: 'On Track' };
    }
    return { bg: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb', color: '#F59E0B', label: 'Behind' };
}

export default function AppraisalWidget({ data, isDark = false }: { data: WidgetData, isDark?: boolean }) {
    const bg = isDark ? '#0F172A' : '#f8fafc';
    const cardBg = isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff';
    const border = isDark ? 'rgba(59, 130, 246, 0.08)' : '#e2e8f0';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#94a3b8' : '#64748b';
    const textMuted = isDark ? '#475569' : '#94a3b8';

    if (!data || !data.found || !data.employee || !data.scores || !data.hike) {
        return (
            <div style={{
                padding: 48, textAlign: 'center', color: textSecondary, background: bg,
                borderRadius: 16, border: `1px solid ${border}`,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: textPrimary }}>
                    No Appraisal Data Found
                </p>
                {data?.message && (
                    <p style={{ margin: '8px 0 0', fontSize: 13, color: textSecondary }}>{data.message}</p>
                )}
            </div>
        );
    }

    const { employee, okrs, reviewSummary, scores, hike } = data;
    const bandColor = getBandColor(hike.band);

    return (
        <div style={{
            background: bg, minHeight: 300,
            maxHeight: 900, overflow: 'auto',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            borderRadius: 12, border: `1px solid ${border}`,
        }}>
            <LogoHeader isDark={isDark} />

            {/* ── Header ─────────────────────────────────── */}
            <div style={{
                padding: '28px 28px 24px',
                background: isDark
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                borderBottom: `1px solid ${border}`,
                backdropFilter: isDark ? 'blur(16px)' : undefined,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                        overflow: 'hidden',
                        border: `3px solid ${bandColor}40`,
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
                        <h1 style={{
                            margin: '0 0 4px', fontSize: 22, fontWeight: 800,
                            color: textPrimary, letterSpacing: -0.3,
                        }}>
                            {employee.name}
                        </h1>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {employee.position && (
                                <span style={{
                                    fontSize: 12, fontWeight: 600, color: textSecondary,
                                    background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f1f5f9',
                                    padding: '4px 10px', borderRadius: 8,
                                }}>
                                    {employee.position}
                                </span>
                            )}
                            {employee.department && (
                                <span style={{
                                    fontSize: 12, fontWeight: 600,
                                    color: isDark ? '#818cf8' : '#6366f1',
                                    background: isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff',
                                    padding: '4px 10px', borderRadius: 8,
                                }}>
                                    {employee.department}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Hike Recommendation Card ────────────────── */}
            <div style={{ padding: '20px 28px 0' }}>
                <div style={{
                    background: isDark ? `linear-gradient(135deg, ${bandColor}10, ${bandColor}05)` : `linear-gradient(135deg, ${bandColor}12, ${bandColor}06)`,
                    border: `2px solid ${bandColor}25`,
                    borderRadius: 16, padding: '24px',
                    textAlign: 'center', marginBottom: 20,
                    backdropFilter: isDark ? 'blur(12px)' : undefined,
                }}>
                    <div style={{
                        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: 1, color: bandColor, marginBottom: 12,
                    }}>
                        {hike.bandEmoji} Hike Recommendation
                    </div>

                    <div style={{
                        fontSize: 48, fontWeight: 900, color: bandColor,
                        lineHeight: 1, marginBottom: 4,
                    }}>
                        {hike.hikePercent}%
                    </div>

                    <div style={{ fontSize: 16, fontWeight: 700, color: bandColor, marginBottom: 16 }}>
                        {hike.band}
                    </div>

                    {/* Score breakdown */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 24, flexWrap: 'wrap',
                    }}>
                        {/* OKR Score */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: '50%',
                                border: `4px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 6px', position: 'relative',
                                background: `conic-gradient(#8b5cf6 ${scores.okrScore * 3.6}deg, ${isDark ? 'rgba(30,41,59,0.5)' : '#f1f5f9'} 0deg)`,
                            }}>
                                <div style={{
                                    width: 50, height: 50, borderRadius: '50%',
                                    background: isDark ? '#0F172A' : '#ffffff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 16, fontWeight: 800, color: '#8b5cf6',
                                }}>
                                    {scores.okrScore}
                                </div>
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                OKR (60%)
                            </div>
                        </div>

                        <div style={{ fontSize: 20, fontWeight: 300, color: textMuted }}>+</div>

                        {/* Review Score */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: '50%',
                                border: `4px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 6px',
                                background: `conic-gradient(#0ea5e9 ${scores.reviewScore * 3.6}deg, ${isDark ? 'rgba(30,41,59,0.5)' : '#f1f5f9'} 0deg)`,
                            }}>
                                <div style={{
                                    width: 50, height: 50, borderRadius: '50%',
                                    background: isDark ? '#0F172A' : '#ffffff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 16, fontWeight: 800, color: '#0ea5e9',
                                }}>
                                    {scores.reviewScore}
                                </div>
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Reviews (40%)
                            </div>
                        </div>

                        <div style={{ fontSize: 20, fontWeight: 300, color: textMuted }}>=</div>

                        {/* Composite */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: '50%',
                                border: `4px solid ${bandColor}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 6px',
                                background: `conic-gradient(${bandColor} ${scores.compositeScore * 3.6}deg, ${isDark ? 'rgba(30,41,59,0.5)' : '#f1f5f9'} 0deg)`,
                            }}>
                                <div style={{
                                    width: 50, height: 50, borderRadius: '50%',
                                    background: isDark ? '#0F172A' : '#ffffff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 16, fontWeight: 800, color: bandColor,
                                }}>
                                    {scores.compositeScore}
                                </div>
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: bandColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Composite
                            </div>
                        </div>
                    </div>

                    <div style={{
                        marginTop: 14, fontSize: 11, fontWeight: 500,
                        color: textSecondary, fontStyle: 'italic',
                    }}>
                        {scores.formula}
                    </div>
                </div>
            </div>

            {/* ── OKR Details ────────────────────────────── */}
            <div style={{ padding: '0 28px 20px' }}>
                <div style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: 0.8, color: textMuted, marginBottom: 12,
                    display: 'flex', alignItems: 'center', gap: 6,
                }}>
                    🎯 OKR Achievement ({okrs.length} objective{okrs.length !== 1 ? 's' : ''})
                </div>

                {okrs.map((okr, oi) => (
                    <div key={okr.okrId || oi} style={{
                        background: cardBg, border: `1px solid ${border}`,
                        borderRadius: 14, padding: '18px 20px', marginBottom: 12,
                        backdropFilter: isDark ? 'blur(12px)' : undefined,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: textPrimary }}>
                                    {okr.objective}
                                </h3>
                                <span style={{ fontSize: 11, fontWeight: 600, color: textMuted }}>
                                    {okr.period}
                                </span>
                            </div>
                            <div style={{
                                flexShrink: 0, textAlign: 'center',
                                background: okr.okrAchievementPercent >= 90 ? 'rgba(16, 185, 129, 0.12)' :
                                    okr.okrAchievementPercent >= 70 ? 'rgba(59, 130, 246, 0.12)' :
                                        'rgba(245, 158, 11, 0.12)',
                                color: okr.okrAchievementPercent >= 90 ? '#10B981' :
                                    okr.okrAchievementPercent >= 70 ? '#3B82F6' : '#F59E0B',
                                borderRadius: 10, padding: '8px 12px', minWidth: 55,
                            }}>
                                <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>
                                    {okr.okrAchievementPercent}%
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {okr.keyResults.map((kr, ki) => {
                                const st = getStatusStyle(kr.status, isDark);
                                const barColor = kr.achievementPercent >= 100 ? '#10B981' :
                                    kr.achievementPercent >= 70 ? '#3B82F6' : '#F59E0B';
                                return (
                                    <div key={ki} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: textPrimary, flex: 1, minWidth: 0 }}>
                                                {kr.title}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                                <span style={{
                                                    fontSize: 11, fontWeight: 700,
                                                    color: st.color, background: st.bg,
                                                    padding: '2px 8px', borderRadius: 6,
                                                }}>
                                                    {st.label}
                                                </span>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: textSecondary }}>
                                                    {kr.achieved}/{kr.target} {kr.unit}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{
                                            height: 6, borderRadius: 3,
                                            background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#f1f5f9',
                                            overflow: 'hidden',
                                        }}>
                                            <div style={{
                                                width: `${Math.min(100, kr.achievementPercent)}%`,
                                                height: '100%', borderRadius: 3,
                                                background: barColor,
                                                transition: 'width 0.5s ease',
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Review Summary ──────────────────────────── */}
            {reviewSummary && (
                <div style={{ padding: '0 28px 20px' }}>
                    <div style={{
                        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: 0.8, color: textMuted, marginBottom: 12,
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        📝 Peer Review Summary
                    </div>

                    <div style={{
                        background: cardBg, border: `1px solid ${border}`,
                        borderRadius: 14, padding: '18px 20px',
                        backdropFilter: isDark ? 'blur(12px)' : undefined,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: 20, fontWeight: 800, color: '#F59E0B' }}>
                                    {reviewSummary.averageRating}
                                </span>
                                <span style={{ fontSize: 16, color: '#F59E0B' }}>★</span>
                                <span style={{ fontSize: 12, fontWeight: 500, color: textSecondary }}>
                                    / 5 avg
                                </span>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: textMuted }}>
                                from {reviewSummary.totalReviews} review{reviewSummary.totalReviews !== 1 ? 's' : ''}
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                            {reviewSummary.projectsWorkedOn.map(p => (
                                <span key={p} style={{
                                    fontSize: 11, fontWeight: 700,
                                    color: isDark ? '#93c5fd' : '#2563eb',
                                    background: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                                    padding: '3px 10px', borderRadius: 6,
                                }}>
                                    {p}
                                </span>
                            ))}
                        </div>

                        {reviewSummary.strengths && reviewSummary.strengths.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', marginBottom: 6 }}>
                                    Strengths
                                </div>
                                {reviewSummary.strengths.slice(0, 3).map((s, i) => (
                                    <div key={i} style={{
                                        fontSize: 12, fontWeight: 500, color: textPrimary,
                                        padding: '4px 8px', marginBottom: 4,
                                        borderLeft: '3px solid #10B981',
                                        background: isDark ? 'rgba(16, 185, 129, 0.06)' : '#ecfdf5',
                                        borderRadius: '0 6px 6px 0',
                                    }}>
                                        {s}
                                    </div>
                                ))}
                            </div>
                        )}

                        {reviewSummary.areasForImprovement && reviewSummary.areasForImprovement.length > 0 && (
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', marginBottom: 6 }}>
                                    Growth Areas
                                </div>
                                {reviewSummary.areasForImprovement.slice(0, 2).map((s, i) => (
                                    <div key={i} style={{
                                        fontSize: 12, fontWeight: 500, color: textPrimary,
                                        padding: '4px 8px', marginBottom: 4,
                                        borderLeft: '3px solid #F59E0B',
                                        background: isDark ? 'rgba(245, 158, 11, 0.06)' : '#fffbeb',
                                        borderRadius: '0 6px 6px 0',
                                    }}>
                                        {s}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Footer ─────────────────────────────────── */}
            <div style={{
                padding: '14px 28px', textAlign: 'center',
                fontSize: '11px', fontWeight: 500, letterSpacing: 0.3,
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
