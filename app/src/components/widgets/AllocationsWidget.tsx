'use client';

import { Calendar, Briefcase, Users, AlertCircle, Clock } from 'lucide-react';
import LogoHeader from './LogoHeader';

interface Allocation {
    projectId: string;
    projectName?: string;
    allocationPercentage: number;
    allocationStartDate?: string;
    allocationEndDate?: string;
}

interface EmployeeAllocation {
    employeeId: string;
    name: string;
    department?: string;
    position?: string;
    profileImage?: string;
    totalAllocationPercent: number;
    availabilityPercent: number;
    allocations: Allocation[];
}

interface WidgetData {
    dateStart?: string;
    dateEnd?: string;
    employeeCount?: number;
    employees: EmployeeAllocation[];
}

function getAllocationColor(percent: number, isDark: boolean) {
    if (percent >= 90) return {
        bar: '#ef4444', ring: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
        badge: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2', badgeText: isDark ? '#fca5a5' : '#dc2626',
        glow: 'rgba(239, 68, 68, 0.15)',
    };
    if (percent >= 70) return {
        bar: '#f97316', ring: isDark ? 'rgba(249, 115, 22, 0.3)' : '#fed7aa',
        badge: isDark ? 'rgba(249, 115, 22, 0.1)' : '#fff7ed', badgeText: isDark ? '#fdba74' : '#ea580c',
        glow: 'rgba(249, 115, 22, 0.15)',
    };
    if (percent >= 40) return {
        bar: '#F59E0B', ring: isDark ? 'rgba(245, 158, 11, 0.3)' : '#fde68a',
        badge: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb', badgeText: isDark ? '#fcd34d' : '#d97706',
        glow: 'rgba(245, 158, 11, 0.15)',
    };
    return {
        bar: '#10B981', ring: isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0',
        badge: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5', badgeText: isDark ? '#6ee7b7' : '#059669',
        glow: 'rgba(16, 185, 129, 0.15)',
    };
}

const PROJECT_COLORS = [
    { bg: '#3B82F6', light: '#eff6ff', dark: 'rgba(59,130,246,0.12)', text: '#2563eb', darkText: '#93c5fd' },
    { bg: '#8b5cf6', light: '#f5f3ff', dark: 'rgba(139,92,246,0.12)', text: '#7c3aed', darkText: '#c4b5fd' },
    { bg: '#06b6d4', light: '#ecfeff', dark: 'rgba(6,182,212,0.12)', text: '#0891b2', darkText: '#67e8f9' },
    { bg: '#F59E0B', light: '#fffbeb', dark: 'rgba(245,158,11,0.1)', text: '#d97706', darkText: '#fcd34d' },
    { bg: '#10B981', light: '#ecfdf5', dark: 'rgba(16,185,129,0.1)', text: '#059669', darkText: '#6ee7b7' },
    { bg: '#ec4899', light: '#fdf2f8', dark: 'rgba(236,72,153,0.12)', text: '#db2777', darkText: '#f9a8d4' },
    { bg: '#ef4444', light: '#fef2f2', dark: 'rgba(239,68,68,0.1)', text: '#dc2626', darkText: '#fca5a5' },
    { bg: '#14b8a6', light: '#f0fdfa', dark: 'rgba(20,184,166,0.1)', text: '#0d9488', darkText: '#5eead4' },
];

function getInitials(name: string) {
    return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr?: string) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
}

function formatDateShort(dateStr?: string) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return dateStr; }
}

export default function AllocationsWidget({ data, isDark = false }: { data: WidgetData, isDark?: boolean }) {
    const bg = isDark ? '#0F172A' : '#f8fafc';
    const cardBg = isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff';
    const border = isDark ? 'rgba(59, 130, 246, 0.08)' : '#e2e8f0';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#94a3b8' : '#64748b';
    const textMuted = isDark ? '#475569' : '#94a3b8';

    if (!data || !data.employees || data.employees.length === 0) {
        return (
            <div style={{
                padding: '48px 24px', textAlign: 'center',
                background: bg, borderRadius: '16px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                border: `1px solid ${border}`,
            }}>
                <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
                <h2 style={{ margin: '0 0 8px', color: textPrimary, fontSize: '20px', fontWeight: 700 }}>
                    No Allocations Found
                </h2>
                <p style={{ margin: 0, color: textSecondary, fontSize: '14px' }}>
                    No project allocations in the selected date range.
                </p>
            </div>
        );
    }

    const employees = data.employees;

    return (
        <div style={{
            background: bg, minHeight: '300px',
            maxHeight: '700px', overflow: 'auto',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            borderRadius: '12px',
            border: `1px solid ${border}`,
        }}>
            <LogoHeader isDark={isDark} />

            {/* ══════════ HEADER ══════════ */}
            <div style={{
                background: isDark
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                borderBottom: `1px solid ${border}`,
                padding: '24px 28px 20px',
                backdropFilter: isDark ? 'blur(16px)' : undefined,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, #F59E0B, #ef4444)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)',
                    }}>
                        <Briefcase size={22} style={{ color: '#fff' }} />
                    </div>
                    <div>
                        <h1 style={{
                            margin: 0, fontSize: '22px', fontWeight: 800,
                            color: textPrimary, lineHeight: 1.2, letterSpacing: '-0.3px',
                        }}>
                            Project Allocations
                        </h1>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: textMuted }}>
                            Resource utilization breakdown
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {data.dateStart && data.dateEnd && (
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '7px',
                            background: cardBg,
                            border: `1px solid ${border}`,
                            borderRadius: '12px', padding: '8px 14px',
                        }}>
                            <Calendar size={14} style={{ color: '#3B82F6' }} />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: textSecondary }}>
                                {formatDate(data.dateStart)} — {formatDate(data.dateEnd)}
                            </span>
                        </div>
                    )}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '7px',
                        background: cardBg,
                        border: `1px solid ${border}`,
                        borderRadius: '12px', padding: '8px 14px',
                    }}>
                        <Users size={14} style={{ color: isDark ? '#a78bfa' : '#7c3aed' }} />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: textPrimary }}>
                            {employees.length}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: textSecondary }}>
                            {employees.length === 1 ? 'Employee' : 'Employees'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ══════════ EMPLOYEE CARDS ══════════ */}
            <div style={{ padding: '20px 28px 28px' }}>
                <div style={{ display: 'grid', gap: '16px' }}>
                    {employees.map((emp, empIdx) => {
                        const allocColors = getAllocationColor(emp.totalAllocationPercent, isDark);
                        return (
                            <div key={emp.employeeId || empIdx} style={{
                                background: cardBg,
                                border: `1px solid ${border}`,
                                borderRadius: '16px', overflow: 'hidden',
                                backdropFilter: isDark ? 'blur(12px)' : undefined,
                            }}>
                                <div style={{
                                    padding: '20px 22px',
                                    display: 'flex', alignItems: 'center', gap: '16px',
                                    borderBottom: `1px solid ${border}`,
                                }}>
                                    <div style={{
                                        width: '56px', height: '56px', borderRadius: '50%',
                                        flexShrink: 0, overflow: 'hidden',
                                        border: `3px solid ${allocColors.ring}`,
                                        background: isDark ? '#334155' : '#e2e8f0',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {emp.profileImage ? (
                                            <img src={emp.profileImage} alt={emp.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: '18px', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b' }}>
                                                {getInitials(emp.name)}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{
                                            margin: '0 0 5px', fontSize: '17px', fontWeight: 700,
                                            color: textPrimary,
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                            {emp.name}
                                        </h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {emp.position && (
                                                <span style={{
                                                    fontSize: '11px', fontWeight: 600, color: textSecondary,
                                                    background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f1f5f9',
                                                    padding: '3px 9px', borderRadius: '6px',
                                                }}>{emp.position}</span>
                                            )}
                                            {emp.department && (
                                                <span style={{
                                                    fontSize: '11px', fontWeight: 600,
                                                    color: isDark ? '#818cf8' : '#6366f1',
                                                    background: isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff',
                                                    padding: '3px 9px', borderRadius: '6px',
                                                }}>{emp.department}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Allocation gauge */}
                                    <div style={{ flexShrink: 0, textAlign: 'center', minWidth: '90px' }}>
                                        <div style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto 4px' }}>
                                            <svg width="60" height="60" viewBox="0 0 60 60">
                                                <circle cx="30" cy="30" r="25" fill="none"
                                                    stroke={isDark ? 'rgba(30, 41, 59, 0.8)' : '#f1f5f9'}
                                                    strokeWidth="5" />
                                                <circle cx="30" cy="30" r="25" fill="none"
                                                    stroke={allocColors.bar}
                                                    strokeWidth="5" strokeLinecap="round"
                                                    strokeDasharray={`${(emp.totalAllocationPercent / 100) * 157} 157`}
                                                    transform="rotate(-90 30 30)"
                                                    style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
                                                />
                                            </svg>
                                            <div style={{
                                                position: 'absolute', top: '50%', left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                fontSize: '14px', fontWeight: 800,
                                                color: allocColors.badgeText,
                                            }}>
                                                {emp.totalAllocationPercent}%
                                            </div>
                                        </div>
                                        <div style={{
                                            fontSize: '10px', fontWeight: 600, color: textMuted,
                                            textTransform: 'uppercase', letterSpacing: '0.5px',
                                        }}>Allocated</div>
                                    </div>
                                </div>

                                {/* Allocation breakdown */}
                                <div style={{ padding: '16px 22px 20px' }}>
                                    <div style={{
                                        display: 'flex', height: '8px', borderRadius: '4px',
                                        background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#f1f5f9',
                                        overflow: 'hidden', marginBottom: '16px',
                                    }}>
                                        {emp.allocations.map((alloc, ai) => {
                                            const projColor = PROJECT_COLORS[ai % PROJECT_COLORS.length];
                                            return (
                                                <div key={alloc.projectId || ai} style={{
                                                    width: `${Math.max(alloc.allocationPercentage, 2)}%`,
                                                    background: projColor.bg,
                                                    transition: 'width 0.6s ease-out',
                                                    borderRight: ai < emp.allocations.length - 1
                                                        ? `1px solid ${isDark ? 'rgba(15,23,42,0.8)' : '#f1f5f9'}` : undefined,
                                                }} />
                                            );
                                        })}
                                    </div>

                                    <div style={{ display: 'grid', gap: '10px' }}>
                                        {emp.allocations.map((alloc, ai) => {
                                            const projColor = PROJECT_COLORS[ai % PROJECT_COLORS.length];
                                            return (
                                                <div key={alloc.projectId || ai} style={{
                                                    display: 'flex', alignItems: 'center', gap: '14px',
                                                    background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                                                    borderRadius: '12px', padding: '14px 16px',
                                                    border: `1px solid ${border}`,
                                                }}>
                                                    <div style={{
                                                        width: '10px', height: '10px', borderRadius: '50%',
                                                        background: projColor.bg, flexShrink: 0,
                                                    }} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{
                                                            fontSize: '14px', fontWeight: 700, color: textPrimary,
                                                            marginBottom: '3px',
                                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                        }}>
                                                            {alloc.projectName || alloc.projectId}
                                                        </div>
                                                        {(alloc.allocationStartDate || alloc.allocationEndDate) && (
                                                            <div style={{
                                                                display: 'flex', alignItems: 'center', gap: '5px',
                                                                fontSize: '11px', fontWeight: 500, color: textMuted,
                                                            }}>
                                                                <Clock size={10} />
                                                                {formatDateShort(alloc.allocationStartDate)} — {formatDateShort(alloc.allocationEndDate)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{
                                                        flexShrink: 0,
                                                        background: isDark ? projColor.dark : projColor.light,
                                                        color: isDark ? projColor.darkText : projColor.text,
                                                        padding: '6px 14px', borderRadius: '20px',
                                                        fontSize: '13px', fontWeight: 800, letterSpacing: '-0.2px',
                                                    }}>
                                                        {alloc.allocationPercentage}%
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {emp.availabilityPercent > 0 && (
                                        <div style={{
                                            marginTop: '12px',
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '10px 14px',
                                            background: isDark ? 'rgba(16,185,129,0.06)' : '#f0fdf4',
                                            borderRadius: '10px',
                                            border: `1px solid ${isDark ? 'rgba(16,185,129,0.12)' : '#bbf7d0'}`,
                                        }}>
                                            <div style={{
                                                width: '8px', height: '8px', borderRadius: '50%',
                                                background: '#10B981',
                                            }} />
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981' }}>
                                                {emp.availabilityPercent}% available
                                            </span>
                                            <span style={{ fontSize: '11px', fontWeight: 500, color: textMuted }}>
                                                — open for new assignments
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ══════════ FOOTER ══════════ */}
            <div style={{
                padding: '14px 28px', textAlign: 'center',
                fontSize: '11px', fontWeight: 500, letterSpacing: '0.3px',
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
