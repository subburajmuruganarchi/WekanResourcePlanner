'use client';

import { Users, Calendar, Briefcase, Code2, CheckCircle2, AlertCircle } from 'lucide-react';
import LogoHeader from './LogoHeader';

interface Candidate {
    employeeId: string;
    name: string;
    department?: string;
    position?: string;
    profileImage?: string;
    availabilityPercent: number;
    freeDays: number;
    activeAllocations?: Array<{
        projectName?: string;
        allocationPercentage: number;
    }>;
}

interface WidgetData {
    found: boolean;
    reason?: string;
    project?: {
        projectId: string;
        projectName: string;
        projectCode: string;
        projectLogo?: string | null;
        requiredSkills: Array<{
            skillName: string;
            minSkillLevel: string;
            requiredHeadcount: number;
        }>;
    };
    projectName?: string;
    projectCode?: string;
    stack?: string;
    dateStart?: string;
    dateEnd?: string;
    count?: number;
    candidates?: Candidate[];
}

function getAvailabilityColor(percent: number) {
    if (percent >= 80) return { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', bar: '#10b981', ring: 'rgba(16, 185, 129, 0.3)', glow: 'rgba(16, 185, 129, 0.2)' };
    if (percent >= 50) return { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b', bar: '#f59e0b', ring: 'rgba(245, 158, 11, 0.3)', glow: 'rgba(245, 158, 11, 0.2)' };
    if (percent >= 20) return { bg: 'rgba(249, 115, 22, 0.12)', text: '#f97316', bar: '#f97316', ring: 'rgba(249, 115, 22, 0.3)', glow: 'rgba(249, 115, 22, 0.2)' };
    return { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', bar: '#ef4444', ring: 'rgba(239, 68, 68, 0.3)', glow: 'rgba(239, 68, 68, 0.2)' };
}

function getInitials(name: string) {
    return name
        .split(' ')
        .map(p => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function formatDate(dateStr: string) {
    try {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

export default function AvailabilityWidget({ data, isDark = false, onAllocate }: { data: WidgetData, isDark?: boolean, onAllocate?: (candidate: Candidate) => void }) {
    /* ── Design tokens ── */
    const bg = isDark ? '#0F172A' : '#f8fafc';
    const cardBg = isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff';
    const border = isDark ? 'rgba(59, 130, 246, 0.08)' : '#e2e8f0';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#94a3b8' : '#64748b';
    const textMuted = isDark ? '#475569' : '#94a3b8';

    if (!data.found) {
        return (
            <div style={{
                padding: '48px 24px',
                textAlign: 'center',
                background: bg,
                borderRadius: '16px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}>
                <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
                <h2 style={{ margin: '0 0 8px', color: textPrimary, fontSize: '20px' }}>
                    Project Not Found
                </h2>
                <p style={{ margin: 0, color: textSecondary, fontSize: '14px' }}>
                    {data.reason || 'Could not find the specified project.'}
                </p>
            </div>
        );
    }

    const candidates = data.candidates || [];
    const stackItems = data.stack?.split(',').map(s => s.trim()).filter(Boolean) || [];

    return (
        <div style={{
            background: bg,
            minHeight: '300px',
            maxHeight: '700px',
            overflow: 'auto',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            borderRadius: '12px',
            border: `1px solid ${border}`,
        }}>
            <LogoHeader isDark={isDark} />

            {/* ── Header ─────────────────────────────────────── */}
            <div style={{
                background: isDark
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                borderBottom: `1px solid ${border}`,
                padding: '24px',
                backdropFilter: isDark ? 'blur(16px)' : undefined,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: data.project?.projectLogo ? 'transparent' : 'linear-gradient(135deg, #3B82F6, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
                        overflow: 'hidden',
                    }}>
                        {data.project?.projectLogo ? (
                            <img src={data.project.projectLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <Briefcase size={22} style={{ color: '#fff' }} />
                        )}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{
                            margin: 0,
                            fontSize: '22px',
                            fontWeight: 700,
                            color: textPrimary,
                            lineHeight: 1.2,
                        }}>
                            {data.projectName || data.project?.projectName || 'Project'}
                        </h1>
                        {(data.projectCode || data.project?.projectCode) && (
                            <span style={{
                                fontSize: '13px',
                                color: textMuted,
                                fontWeight: 500,
                            }}>
                                {data.projectCode || data.project?.projectCode}
                            </span>
                        )}
                    </div>
                </div>

                {/* Stack tags */}
                {stackItems.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                        {stackItems.map(s => (
                            <span key={s} style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                                color: isDark ? '#93c5fd' : '#2563eb',
                                padding: '5px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 600,
                                border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.15)' : '#bfdbfe'}`,
                            }}>
                                <Code2 size={12} />
                                {s}
                            </span>
                        ))}
                    </div>
                )}

                {/* Date range + count */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                    {data.dateStart && data.dateEnd && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            fontSize: '13px', color: textSecondary, fontWeight: 500,
                        }}>
                            <Calendar size={14} />
                            {formatDate(data.dateStart)} — {formatDate(data.dateEnd)}
                        </div>
                    )}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '13px', color: textSecondary, fontWeight: 500,
                    }}>
                        <Users size={14} />
                        <span style={{ color: textPrimary, fontWeight: 700, fontSize: '15px' }}>
                            {candidates.length}
                        </span>
                        {candidates.length === 1 ? 'candidate' : 'candidates'} available
                    </div>
                </div>
            </div>

            {/* ── Body: Candidate cards ──────────────────────── */}
            <div style={{ padding: '20px 24px 24px' }}>
                {candidates.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '40px 20px', color: textMuted,
                    }}>
                        <Users size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 500 }}>
                            {data.reason || 'No available candidates found for this criteria.'}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '14px' }}>
                        {candidates.map((c, i) => {
                            const colors = getAvailabilityColor(c.availabilityPercent);
                            return (
                                <div
                                    key={c.employeeId || i}
                                    style={{
                                        background: cardBg,
                                        border: `1px solid ${border}`,
                                        borderRadius: '14px',
                                        padding: '18px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        backdropFilter: isDark ? 'blur(12px)' : undefined,
                                        boxShadow: isDark ? `0 0 20px ${colors.glow}` : undefined,
                                    }}
                                >
                                    {/* Avatar */}
                                    <div style={{
                                        width: '56px', height: '56px', borderRadius: '50%',
                                        flexShrink: 0, overflow: 'hidden',
                                        border: `3px solid ${colors.ring}`,
                                        background: isDark ? '#334155' : '#e2e8f0',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: `0 0 12px ${colors.glow}`,
                                    }}>
                                        {c.profileImage ? (
                                            <img src={c.profileImage} alt={c.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    const parent = (e.target as HTMLImageElement).parentElement;
                                                    if (parent) {
                                                        const fallback = document.createElement('span');
                                                        fallback.textContent = getInitials(c.name);
                                                        fallback.style.cssText = `font-size:18px;font-weight:700;color:${isDark ? '#94a3b8' : '#64748b'};`;
                                                        parent.appendChild(fallback);
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: '18px', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b' }}>
                                                {getInitials(c.name)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{
                                            margin: '0 0 4px', fontSize: '16px', fontWeight: 650,
                                            color: textPrimary,
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                            {c.name}
                                        </h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                            {c.position && (
                                                <span style={{
                                                    fontSize: '11px', fontWeight: 600,
                                                    color: textSecondary,
                                                    background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f1f5f9',
                                                    padding: '3px 8px', borderRadius: '6px',
                                                }}>
                                                    {c.position}
                                                </span>
                                            )}
                                        </div>

                                        {/* Availability bar */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                flex: 1, height: '6px', borderRadius: '3px',
                                                background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#e2e8f0',
                                                overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${Math.min(100, c.availabilityPercent)}%`,
                                                    borderRadius: '3px',
                                                    background: `linear-gradient(90deg, ${colors.bar}, ${colors.bar}cc)`,
                                                    boxShadow: `0 0 8px ${colors.glow}`,
                                                }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Availability badge */}
                                    <div style={{ textAlign: 'center', flexShrink: 0, minWidth: '80px' }}>
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            gap: '4px',
                                            background: colors.bg,
                                            color: colors.text,
                                            padding: '6px 12px', borderRadius: '20px',
                                            fontSize: '14px', fontWeight: 700, marginBottom: '4px',
                                            boxShadow: `0 0 12px ${colors.glow}`,
                                        }}>
                                            {c.availabilityPercent >= 80 && <CheckCircle2 size={14} />}
                                            {c.availabilityPercent}%
                                        </div>
                                        <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 500, marginBottom: 8 }}>
                                            {c.freeDays} free {c.freeDays === 1 ? 'day' : 'days'}
                                        </div>
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
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Footer ─────────────────────────────────────── */}
            <div style={{
                padding: '14px 24px', textAlign: 'center',
                fontSize: '11px', color: textMuted,
                borderTop: `1px solid ${border}`,
                fontWeight: 500, letterSpacing: '0.3px',
                background: isDark ? 'rgba(15, 23, 42, 0.5)' : undefined,
                backdropFilter: isDark ? 'blur(8px)' : undefined,
            }}>
                WeKan Enterprise Solutions • Resource 360
            </div>
        </div>
    );
}
