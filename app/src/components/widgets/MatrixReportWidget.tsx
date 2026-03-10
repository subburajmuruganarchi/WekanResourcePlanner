'use client';

import LogoHeader from './LogoHeader';

interface ProjectMatrix {
    projectId: string;
    projectName: string;
    allocations: {
        week: string;
        percent: number;
    }[];
}

interface WidgetData {
    weeks: string[];
    projects: ProjectMatrix[];
    totalResourceCount: number;
}

function getHeatmapColor(percent: number, isDark: boolean) {
    if (percent === 0) return isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc';
    if (percent < 30) return isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5';
    if (percent < 70) return isDark ? 'rgba(59, 130, 246, 0.3)' : '#eff6ff';
    if (percent < 100) return isDark ? 'rgba(245, 158, 11, 0.4)' : '#fffbeb';
    return isDark ? 'rgba(239, 68, 68, 0.5)' : '#fef2f2';
}

function getHeatmapTextColor(percent: number, isDark: boolean) {
    if (percent === 0) return isDark ? '#475569' : '#94a3b8';
    if (percent < 30) return '#10B981';
    if (percent < 70) return '#3B82F6';
    if (percent < 100) return '#F59E0B';
    return '#ef4444';
}

export default function MatrixReportWidget({ data, isDark = false }: { data: WidgetData, isDark?: boolean }) {
    const bg = isDark ? '#0F172A' : '#ffffff';
    const border = isDark ? 'rgba(59, 130, 246, 0.08)' : '#e2e8f0';
    const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
    const textSecondary = isDark ? '#94a3b8' : '#64748b';

    if (!data || !data.projects || data.projects.length === 0) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: textSecondary, background: bg, borderRadius: 12, border: `1px solid ${border}` }}>
                <p>No matrix data available.</p>
            </div>
        );
    }

    return (
        <div style={{
            background: bg, borderRadius: 12, overflow: 'hidden', border: `1px solid ${border}`,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
            <LogoHeader isDark={isDark} />

            <div style={{ padding: '24px 28px', borderBottom: `1px solid ${border}` }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: textPrimary }}>Resource Capacity Matrix</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: textSecondary }}>Projected allocations across the next {data.weeks.length} weeks</p>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr>
                            <th style={{
                                padding: '16px 20px', textAlign: 'left', color: textSecondary,
                                fontWeight: 600, borderBottom: `1px solid ${border}`,
                                position: 'sticky', left: 0, background: bg, zIndex: 10
                            }}>Project</th>
                            {data.weeks.map(week => (
                                <th key={week} style={{
                                    padding: '16px 12px', textAlign: 'center', color: textSecondary,
                                    fontWeight: 600, borderBottom: `1px solid ${border}`, minWidth: 80
                                }}>
                                    {week}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.projects.map((proj) => (
                            <tr key={proj.projectId}>
                                <td style={{
                                    padding: '14px 20px', fontWeight: 600, color: textPrimary,
                                    borderBottom: `1px solid ${border}`,
                                    position: 'sticky', left: 0, background: bg, zIndex: 5
                                }}>
                                    {proj.projectName}
                                </td>
                                {proj.allocations.map((alloc, aidx) => {
                                    const cellBg = getHeatmapColor(alloc.percent, isDark);
                                    const cellText = getHeatmapTextColor(alloc.percent, isDark);
                                    return (
                                        <td key={aidx} style={{
                                            padding: '12px', borderBottom: `1px solid ${border}`,
                                            textAlign: 'center'
                                        }}>
                                            <div style={{
                                                background: cellBg, color: cellText,
                                                padding: '8px 4px', borderRadius: 8,
                                                fontWeight: 700, fontSize: 12,
                                                transition: 'all 0.2s ease'
                                            }}>
                                                {alloc.percent}%
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ padding: '16px 28px', background: isDark ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: textSecondary }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: getHeatmapColor(10, isDark) }} />
                    Low (0-30%)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: textSecondary }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: getHeatmapColor(50, isDark) }} />
                    Optimal (30-70%)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: textSecondary }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: getHeatmapColor(85, isDark) }} />
                    High (70-100%)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: textSecondary }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: getHeatmapColor(100, isDark) }} />
                    Over-allocated
                </div>
            </div>

            <div style={{ padding: '12px 28px', fontSize: 11, color: textSecondary, textAlign: 'center', borderTop: `1px solid ${border}` }}>
                WeKan Enterprise Solutions • Resource 360
            </div>
        </div>
    );
}
