'use client';



function WeKanLogo({ size = 32 }: { size?: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
                <defs>
                    <linearGradient id="wk-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#e8825c" />
                        <stop offset="100%" stopColor="#d4684b" />
                    </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="48" fill="url(#wk-grad)" />
                <polyline
                    points="22,65 38,50 50,58 72,30"
                    stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"
                />
                <circle cx="78" cy="24" r="5" fill="#e8825c" />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <span style={{ fontSize: size * 0.55, fontWeight: 300, color: '#d4684b', letterSpacing: 1, fontFamily: '"Segoe UI", Roboto, sans-serif' }}>
                    WeKan
                </span>
                <span style={{ fontSize: size * 0.25, fontWeight: 600, color: '#9ca3af', letterSpacing: 2.5, textTransform: 'uppercase', marginTop: 1 }}>
                    Enterprise Solutions
                </span>
            </div>
        </div>
    );
}

function R360Logo({ size = 28 }: { size?: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: size, height: size, background: 'linear-gradient(135deg, #3B82F6, #8b5cf6)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: size * 0.6 }}>R</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: size * 0.8, color: '#1e293b' }}>360</span>
        </div>
    );
}

export default function LogoHeader({ isDark = false }: { isDark?: boolean }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            borderBottom: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.08)' : '#f0f0f0'}`,
            background: isDark
                ? 'rgba(15, 23, 42, 0.8)'
                : 'linear-gradient(90deg, #ffffff 0%, #fafbfc 100%)',
            backdropFilter: isDark ? 'blur(16px)' : undefined,
            WebkitBackdropFilter: isDark ? 'blur(16px)' : undefined,
            flexShrink: 0,
        }}>
            <WeKanLogo size={30} />
            <R360Logo size={26} />
        </div>
    );
}
