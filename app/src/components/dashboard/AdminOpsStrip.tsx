import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Users, Bell, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api-client';
import { StatusBadge } from '@/components/patterns/status-badge';
import { cn } from '@/lib/utils';

interface HealthSummary {
    overallStatus: 'healthy' | 'warning' | 'critical';
    employeeCounts: { combinedActive: number };
    notifications: { unread: number };
    warnings: string[];
}

export function AdminOpsStrip({ className }: { className?: string }) {
    const navigate = useNavigate();
    const [health, setHealth] = useState<HealthSummary | null>(null);

    useEffect(() => {
        api.get<HealthSummary>('/system/health-summary')
            .then(setHealth)
            .catch(() => setHealth(null));
    }, []);

    const statusVariant =
        health?.overallStatus === 'healthy'
            ? 'success'
            : health?.overallStatus === 'warning'
              ? 'warning'
              : 'critical';

    return (
        <div className={cn('dashboard-card p-4', className)}>
            <div className="flex flex-wrap items-center gap-4 text-sm">
                <button
                    type="button"
                    onClick={() => navigate('/user-control')}
                    className="inline-flex items-center gap-2 hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Users:</span>
                    <span className="font-semibold text-card-foreground tabular-nums">
                        {health?.employeeCounts.combinedActive ?? '—'}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => navigate('/system-health')}
                    className="inline-flex items-center gap-2 hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">System:</span>
                    {health ? (
                        <StatusBadge variant={statusVariant}>{health.overallStatus}</StatusBadge>
                    ) : (
                        <span className="text-muted-foreground">—</span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => navigate('/inputs')}
                    className="inline-flex items-center gap-2 hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                    <span className="text-muted-foreground">Sync:</span>
                    <span className="font-medium text-card-foreground">Planner</span>
                </button>

                {(health?.warnings.length ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-warning">
                        <AlertTriangle className="w-4 h-4" />
                        {health!.warnings.length} warning{health!.warnings.length !== 1 ? 's' : ''}
                    </span>
                )}

                {(health?.notifications.unread ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground ml-auto">
                        <Bell className="w-4 h-4" />
                        {health!.notifications.unread} unread
                    </span>
                )}
            </div>
        </div>
    );
}
