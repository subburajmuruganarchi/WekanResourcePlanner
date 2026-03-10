'use client';

import LogoHeader from './LogoHeader';

interface Candidate {
    employeeId: string;
    name: string;
    department?: string;
    position?: string;
    profileImage?: string;
    availabilityPercent: number;
    freeDays: number;
    activeAllocations?: Array<{ projectName?: string; allocationPercentage?: number }>;
}

interface StaffingData {
    projectName?: string;
    projectCode?: string;
    stack: string;
    dateStart: string;
    dateEnd: string;
    count: number;
    candidates: Candidate[];
}

function initials(n: string) {
    return n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function fmtDate(iso: string) {
    try {
        const d = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return iso; }
}

function daysBetween(a: string, b: string) {
    try {
        const d1 = new Date(a.includes('T') ? a : `${a}T00:00:00`);
        const d2 = new Date(b.includes('T') ? b : `${b}T00:00:00`);
        return Math.ceil((d2.getTime() - d1.getTime()) / 86400000) + 1;
    } catch { return 0; }
}

function RankBadge({ rank, isDark }: { rank: number; isDark: boolean }) {
    const palette = [
        { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', fg: '#78350f', ring: '#fde68a', glow: 'rgba(251,191,36,0.3)' },
        { bg: 'linear-gradient(135deg, #94a3b8, #64748b)', fg: '#1e293b', ring: '#cbd5e1', glow: 'rgba(148,163,184,0.2)' },
        { bg: 'linear-gradient(135deg, #d97706, #b45309)', fg: '#fff7ed', ring: '#fcd34d', glow: 'rgba(217,119,6,0.25)' },
    ];
    const c = palette[rank - 1];
    const fallback = { bg: isDark ? '#334155' : '#e2e8f0', fg: isDark ? '#94a3b8' : '#64748b', ring: 'transparent', glow: 'none' };
    const style = c || fallback;

    return (
        <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: style.bg, color: style.fg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, lineHeight: 1,
            boxShadow: rank <= 3 ? `0 0 0 2px ${style.ring}, 0 0 10px ${style.glow}` : 'none',
        }}>
            {rank}
        </div>
    );
}

function AvailBar({ pct, isDark }: { pct: number; isDark: boolean }) {
    let barColor: string;
    if (pct >= 75) barColor = '#10B981';
    else if (pct >= 45) barColor = '#F59E0B';
    else if (pct >= 20) barColor = '#f97316';
    else barColor = '#ef4444';

    return (
        <div style={{
            width: '100%', height: '6px', borderRadius: '3px',
            background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#f1f5f9',
            overflow: 'hidden',
        }}>
            <div style={{
                height: '100%', borderRadius: '3px',
                width: `${Math.min(pct, 100)}%`,
                background: barColor,
                transition: 'width 0.6s cubic-bezier(.4,0,.2,1)',
                boxShadow: isDark ? `0 0 6px ${barColor}40` : undefined,
            }} />
        </div>
    );
}

export default function StaffingWidget({ data, isDark = false, onAllocate }: { data: StaffingData, isDark?: boolean, onAllocate?: (candidate: Candidate) => void }) {
    const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const bg = isDark ? '#0F172A' : '#f8fafc';
    const border = isDark ? 'rgba(59, 130, 246, 0.08)' : '#e2e8f0';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#94a3b8' : '#64748b';
    const textMuted = isDark ? '#475569' : '#94a3b8';

    const { projectName, projectCode, stack, dateStart, dateEnd, count, candidates } = data;
    const totalDays = daysBetween(dateStart, dateEnd);
    const skills = stack.split(',').map(s => s.trim()).filter(Boolean);
    const avgAvail = candidates.length
        ? Math.round(candidates.reduce((s, c) => s + c.availabilityPercent, 0) / candidates.length)
        : 0;

    const coverageScore = Math.min(100, Math.round(
        (candidates.length > 0 ? 40 : 0) +
        (avgAvail / 100) * 35 +
        Math.min(candidates.length / Math.max(skills.length, 1), 1) * 25
    ));

    let coverageLabel: string;
    let coverageColor: string;
    if (coverageScore >= 75) { coverageLabel = 'Strong'; coverageColor = '#10B981'; }
    else if (coverageScore >= 50) { coverageLabel = 'Moderate'; coverageColor = '#F59E0B'; }
    else if (coverageScore >= 25) { coverageLabel = 'Weak'; coverageColor = '#f97316'; }
    else { coverageLabel = 'Critical'; coverageColor = '#ef4444'; }

    return (
        <div style={{
            background: bg,
            maxHeight: '720px', overflow: 'auto',
            fontFamily: font, borderRadius: '12px',
            border: `1px solid ${border}`,
        }}>
            <LogoHeader isDark={isDark} />

            {/* ── Report header ─────────────────────────── */}
            <div style={{
                padding: '24px 24px 20px',
                borderBottom: `1px solid ${border}`,
                background: isDark
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                backdropFilter: isDark ? 'blur(16px)' : undefined,
            }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    marginBottom: 16,
                }}>
                    <div>
                        <div style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.8px',
                            textTransform: 'uppercase' as const,
                            color: textMuted,
                            marginBottom: 6,
                        }}>STAFFING REPORT</div>
                        <div style={{
                            fontSize: 22, fontWeight: 800, lineHeight: 1.1,
                            color: textPrimary,
                            letterSpacing: '-0.4px',
                        }}>{projectName || 'Untitled Project'}</div>
                        {projectCode && (
                            <span style={{
                                fontSize: 11, fontWeight: 600, marginTop: 5, display: 'inline-block',
                                padding: '3px 10px', borderRadius: '6px',
                                background: isDark ? 'rgba(99, 102, 241, 0.1)' : '#eef2ff',
                                color: isDark ? '#a5b4fc' : '#4f46e5',
                            }}>{projectCode}</span>
                        )}
                    </div>
                    {/* Coverage indicator */}
                    <div style={{
                        textAlign: 'right', flexShrink: 0, marginLeft: 16,
                    }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: '14px',
                            background: `${coverageColor}12`,
                            border: `2px solid ${coverageColor}25`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginLeft: 'auto', marginBottom: 4,
                            boxShadow: isDark ? `0 0 16px ${coverageColor}20` : undefined,
                        }}>
                            <span style={{
                                fontSize: 20, fontWeight: 800, color: coverageColor,
                                textShadow: isDark ? `0 0 8px ${coverageColor}40` : undefined,
                            }}>{coverageScore}</span>
                        </div>
                        <div style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.3px',
                            color: coverageColor,
                        }}>{coverageLabel}</div>
                    </div>
                </div>

                {/* Meta row */}
                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '12px',
                    fontSize: 11, color: textSecondary,
                    fontWeight: 500,
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📅 {fmtDate(dateStart)} — {fmtDate(dateEnd)}
                    </span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span>{totalDays} days</span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span style={{ fontWeight: 700, color: textPrimary }}>
                        {count} {count === 1 ? 'candidate' : 'candidates'}
                    </span>
                </div>

                {/* Tech stack pills */}
                {skills.length > 0 && (
                    <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 14,
                    }}>
                        {skills.map((sk, i) => (
                            <span key={i} style={{
                                fontSize: 10, fontWeight: 700, letterSpacing: '0.3px',
                                padding: '4px 12px', borderRadius: '100px',
                                background: isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff',
                                color: isDark ? '#a5b4fc' : '#4f46e5',
                                border: `1px solid ${isDark ? 'rgba(99,102,241,0.15)' : '#c7d2fe'}`,
                            }}>{sk}</span>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Candidate list ────────────────────────── */}
            <div style={{ padding: '4px 0' }}>
                {candidates.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '48px 24px',
                        color: textMuted,
                    }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: textPrimary }}>
                            No matching candidates found
                        </p>
                        <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 400, color: textSecondary }}>
                            Try broadening the date range or adjusting skill requirements.
                        </p>
                    </div>
                ) : (
                    candidates.map((c, idx) => (
                        <div key={c.employeeId} style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '14px 24px',
                            borderBottom: idx < candidates.length - 1
                                ? `1px solid ${border}`
                                : 'none',
                        }}>
                            <RankBadge rank={idx + 1} isDark={isDark} />

                            <div style={{
                                width: 42, height: 42, borderRadius: '12px', flexShrink: 0,
                                overflow: 'hidden', background: isDark ? '#334155' : '#e2e8f0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: `2px solid ${isDark ? 'rgba(59, 130, 246, 0.1)' : '#e2e8f0'}`,
                            }}>
                                {c.profileImage ? (
                                    <img src={c.profileImage} alt="" style={{
                                        width: '100%', height: '100%', objectFit: 'cover',
                                    }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                ) : (
                                    <span style={{
                                        fontSize: 14, fontWeight: 700,
                                        color: isDark ? '#94a3b8' : '#64748b',
                                    }}>{initials(c.name)}</span>
                                )}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 4,
                                }}>
                                    <span style={{
                                        fontSize: 13, fontWeight: 700,
                                        color: textPrimary,
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>{c.name}</span>
                                    {c.department && (
                                        <span style={{
                                            fontSize: 9, fontWeight: 700, letterSpacing: '0.3px',
                                            padding: '2px 7px', borderRadius: '6px',
                                            background: isDark ? 'rgba(139,92,246,0.12)' : '#f5f3ff',
                                            color: isDark ? '#a78bfa' : '#7c3aed',
                                            flexShrink: 0,
                                        }}>{c.department}</span>
                                    )}
                                </div>
                                <div style={{
                                    fontSize: 11, fontWeight: 500,
                                    color: textMuted,
                                    marginBottom: 6,
                                }}>{c.position || '—'}</div>
                                <AvailBar pct={c.availabilityPercent} isDark={isDark} />
                            </div>

                            <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 68 }}>
                                <div style={{
                                    fontSize: 20, fontWeight: 800, lineHeight: 1,
                                    color: c.availabilityPercent >= 75 ? '#10B981'
                                        : c.availabilityPercent >= 45 ? '#F59E0B'
                                            : '#ef4444',
                                    letterSpacing: '-0.3px',
                                    textShadow: isDark ? `0 0 8px ${c.availabilityPercent >= 75 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}` : undefined,
                                }}>{c.availabilityPercent}%</div>
                                <div style={{
                                    fontSize: 10, fontWeight: 600, marginTop: 3,
                                    color: textMuted,
                                    marginBottom: 8
                                }}>{c.freeDays} {c.freeDays === 1 ? 'day' : 'days'} free</div>
                                {onAllocate && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onAllocate(c);
                                        }}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-90 shadow-lg shadow-blue-500/20"
                                    >
                                        Allocate
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ── Footer ─────────────────────────────────── */}
            <div style={{
                padding: '14px 24px',
                borderTop: `1px solid ${border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: isDark ? 'rgba(15, 23, 42, 0.5)' : undefined,
                backdropFilter: isDark ? 'blur(8px)' : undefined,
            }}>
                <span style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.4px',
                    color: textMuted,
                }}>WEKAN ENTERPRISE SOLUTIONS</span>
                <span style={{
                    fontSize: 10, fontWeight: 500,
                    color: textMuted,
                }}>Resource 360</span>
            </div>
        </div>
    );
}
