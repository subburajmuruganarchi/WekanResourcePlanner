'use client';

import { AlertCircle } from 'lucide-react';
import LogoHeader from './LogoHeader';

interface RequiredSkill {
    skillId?: string;
    skillName: string;
    minSkillLevel: string;
    requiredHeadcount: number;
    requiredDays: number;
}

interface WidgetData {
    found: boolean;
    project?: {
        projectId: string;
        projectName: string;
        projectCode: string;
        projectLogo?: string | null;
        requiredSkills: RequiredSkill[];
    } | null;
}

const LEVEL_CONFIG: Record<string, { color: string; bg: string; icon: string; glow: string }> = {
    Beginner: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', icon: '🌱', glow: 'rgba(16, 185, 129, 0.15)' },
    Intermediate: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', icon: '⚡', glow: 'rgba(245, 158, 11, 0.15)' },
    Expert: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', icon: '🔥', glow: 'rgba(139, 92, 246, 0.15)' },
};

const LEVEL_CONFIG_LIGHT: Record<string, { color: string; bg: string }> = {
    Beginner: { color: '#10b981', bg: '#ecfdf5' },
    Intermediate: { color: '#f59e0b', bg: '#fffbeb' },
    Expert: { color: '#8b5cf6', bg: '#f5f3ff' },
};

function getLevelConfig(level: string, isDark: boolean) {
    const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.Beginner;
    if (!isDark) {
        const light = LEVEL_CONFIG_LIGHT[level] || LEVEL_CONFIG_LIGHT.Beginner;
        return { ...cfg, ...light };
    }
    return cfg;
}

export default function ProjectStackWidget({ data, isDark = false }: { data: WidgetData, isDark?: boolean }) {
    const bg = isDark ? '#0F172A' : '#f8fafc';
    const cardBg = isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff';
    const border = isDark ? 'rgba(59, 130, 246, 0.08)' : '#e2e8f0';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#94a3b8' : '#64748b';
    const textMuted = isDark ? '#475569' : '#94a3b8';

    if (!data.found || !data.project) {
        return (
            <div style={{
                padding: '48px 24px', textAlign: 'center',
                background: bg, borderRadius: '16px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}>
                <AlertCircle size={44} style={{ color: '#ef4444', marginBottom: '12px' }} />
                <h2 style={{ margin: '0 0 6px', color: textPrimary, fontSize: '18px', fontWeight: 700 }}>
                    Project Not Found
                </h2>
                <p style={{ margin: 0, color: textSecondary, fontSize: '13px' }}>
                    Could not find the specified project. Check the name or code.
                </p>
            </div>
        );
    }

    const { project } = data;
    const skills = project.requiredSkills || [];

    return (
        <div style={{
            background: bg,
            minHeight: '200px',
            maxHeight: '700px',
            overflow: 'auto',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            borderRadius: '12px',
            border: `1px solid ${border}`,
        }}>
            <LogoHeader isDark={isDark} />

            {/* ── Header ───────────────────────────────────── */}
            <div style={{
                padding: '28px 28px 20px',
                borderBottom: `1px solid ${border}`,
                background: isDark
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                backdropFilter: isDark ? 'blur(16px)' : undefined,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {project.projectLogo ? (
                        <img
                            src={project.projectLogo}
                            alt={project.projectName}
                            style={{
                                width: '52px', height: '52px', borderRadius: '14px',
                                objectFit: 'cover', flexShrink: 0,
                                border: `2px solid ${isDark ? 'rgba(99,102,241,0.3)' : '#c7d2fe'}`,
                                boxShadow: '0 4px 16px rgba(99,102,241,0.2)',
                            }}
                        />
                    ) : (
                        <div style={{
                            width: '52px', height: '52px', borderRadius: '14px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                        }}>
                            <span style={{ fontSize: '24px' }}>📋</span>
                        </div>
                    )}
                    <div>
                        <h1 style={{
                            margin: 0, fontSize: '24px', fontWeight: 800,
                            color: textPrimary, lineHeight: 1.2, letterSpacing: '-0.3px',
                        }}>
                            {project.projectName}
                        </h1>
                        <span style={{
                            fontSize: '13px', fontWeight: 600,
                            color: textMuted, letterSpacing: '0.3px',
                        }}>
                            {project.projectCode}
                        </span>
                    </div>
                </div>

                <div style={{
                    marginTop: '16px',
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: isDark ? 'rgba(99, 102, 241, 0.1)' : '#eef2ff',
                    color: isDark ? '#a5b4fc' : '#4f46e5',
                    padding: '6px 14px', borderRadius: '20px',
                    fontSize: '12px', fontWeight: 700,
                    border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.15)' : '#c7d2fe'}`,
                    boxShadow: isDark ? '0 0 12px rgba(99, 102, 241, 0.1)' : undefined,
                }}>
                    🛠 {skills.length} Required {skills.length === 1 ? 'Skill' : 'Skills'}
                </div>
            </div>

            {/* ── Skill Cards ──────────────────────────────── */}
            <div style={{ padding: '20px 28px 28px' }}>
                {skills.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '40px 20px', color: textMuted,
                    }}>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>
                            No skill requirements defined for this project.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '14px' }}>
                        {skills.map((skill, idx) => {
                            const lvl = getLevelConfig(skill.minSkillLevel, isDark);
                            return (
                                <div key={skill.skillId || idx} style={{
                                    background: cardBg,
                                    border: `1px solid ${border}`,
                                    borderRadius: '14px',
                                    padding: '20px',
                                    backdropFilter: isDark ? 'blur(12px)' : undefined,
                                    boxShadow: isDark ? `0 0 16px ${lvl.glow}` : undefined,
                                }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'space-between', marginBottom: '16px',
                                    }}>
                                        <h3 style={{
                                            margin: 0, fontSize: '18px', fontWeight: 700,
                                            color: textPrimary,
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                        }}>
                                            <span style={{
                                                width: '32px', height: '32px', borderRadius: '8px',
                                                background: lvl.bg,
                                                display: 'inline-flex', alignItems: 'center',
                                                justifyContent: 'center', fontSize: '16px',
                                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                                            }}>
                                                {lvl.icon}
                                            </span>
                                            {skill.skillName}
                                        </h3>
                                        <span style={{
                                            fontSize: '11px', fontWeight: 700,
                                            color: lvl.color,
                                            background: lvl.bg,
                                            padding: '5px 12px', borderRadius: '20px',
                                            textTransform: 'uppercase', letterSpacing: '0.5px',
                                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                                            boxShadow: isDark ? `0 0 8px ${lvl.glow}` : undefined,
                                        }}>
                                            {skill.minSkillLevel}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <div style={{
                                            flex: 1,
                                            background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                                            borderRadius: '10px', padding: '12px 14px',
                                            border: `1px solid ${border}`,
                                            backdropFilter: isDark ? 'blur(8px)' : undefined,
                                        }}>
                                            <div style={{
                                                fontSize: '11px', fontWeight: 600,
                                                color: textMuted, marginBottom: '4px',
                                                textTransform: 'uppercase', letterSpacing: '0.5px',
                                            }}>
                                                Headcount
                                            </div>
                                            <div style={{
                                                fontSize: '22px', fontWeight: 800,
                                                color: textPrimary, lineHeight: 1,
                                                display: 'flex', alignItems: 'baseline', gap: '4px',
                                            }}>
                                                {skill.requiredHeadcount}
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: textMuted }}>
                                                    {skill.requiredHeadcount === 1 ? 'person' : 'people'}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{
                                            flex: 1,
                                            background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                                            borderRadius: '10px', padding: '12px 14px',
                                            border: `1px solid ${border}`,
                                            backdropFilter: isDark ? 'blur(8px)' : undefined,
                                        }}>
                                            <div style={{
                                                fontSize: '11px', fontWeight: 600,
                                                color: textMuted, marginBottom: '4px',
                                                textTransform: 'uppercase', letterSpacing: '0.5px',
                                            }}>
                                                Duration
                                            </div>
                                            <div style={{
                                                fontSize: '22px', fontWeight: 800,
                                                color: textPrimary, lineHeight: 1,
                                                display: 'flex', alignItems: 'baseline', gap: '4px',
                                            }}>
                                                {skill.requiredDays}
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: textMuted }}>
                                                    days
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Footer ───────────────────────────────────── */}
            <div style={{
                padding: '14px 28px', textAlign: 'center',
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
