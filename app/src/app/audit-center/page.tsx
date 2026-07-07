import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import {
    PageHeader,
    Section,
    MetricCard,
    MetricGrid,
    EnterpriseDataTable,
    PageSkeleton,
    StatusBadge,
    type DataTableColumn,
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { ROLES } from '@/lib/roles';
import { normalizeRoleName } from '@/lib/role-utils';
import { getRecentApiFailures, type ApiFailureRecord } from '@/lib/error-tracker';
import { formatDistanceToNow } from 'date-fns';

interface AuditEvent {
    id: string;
    type: 'allocation_override' | 'sync_run';
    timestamp: string;
    title: string;
    detail: string;
    severity: 'info' | 'warning' | 'critical';
    actor?: string;
    meta?: Record<string, string | number | null>;
}

function severityVariant(severity: AuditEvent['severity']) {
    switch (severity) {
        case 'critical':
            return 'critical' as const;
        case 'warning':
            return 'warning' as const;
        default:
            return 'neutral' as const;
    }
}

function typeLabel(type: AuditEvent['type']) {
    return type === 'allocation_override' ? 'Override' : 'Sync';
}

export default function AuditCenterPage() {
    const { user } = useAuth();
    const isAdmin = normalizeRoleName(user?.role) === ROLES.ADMIN;

    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [apiFailures, setApiFailures] = useState<ApiFailureRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get<AuditEvent[]>('/system/audit-center?limit=50');
            setEvents(data);
            setApiFailures(getRecentApiFailures());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load audit events');
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAdmin) void load();
    }, [isAdmin, load]);

    const stats = useMemo(() => {
        const overrides = events.filter((e) => e.type === 'allocation_override').length;
        const syncs = events.filter((e) => e.type === 'sync_run').length;
        const critical = events.filter((e) => e.severity === 'critical').length;
        return { overrides, syncs, critical, clientErrors: apiFailures.length };
    }, [events, apiFailures]);

    const sortedEvents = useMemo(
        () => [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        [events]
    );

    const columns: DataTableColumn<AuditEvent>[] = useMemo(
        () => [
            {
                id: 'when',
                header: 'When',
                accessor: (r) => (
                    <span className="text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(r.timestamp), { addSuffix: true })}
                    </span>
                ),
                sortValue: (r) => r.timestamp,
                exportValue: (r) => r.timestamp,
            },
            {
                id: 'type',
                header: 'Type',
                accessor: (r) => <StatusBadge variant="neutral">{typeLabel(r.type)}</StatusBadge>,
                sortValue: (r) => r.type,
                exportValue: (r) => typeLabel(r.type),
            },
            {
                id: 'title',
                header: 'Event',
                accessor: (r) => (
                    <div>
                        <p className="font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{r.detail}</p>
                    </div>
                ),
                sortValue: (r) => r.title,
                exportValue: (r) => `${r.title} — ${r.detail}`,
            },
            {
                id: 'actor',
                header: 'Actor',
                accessor: (r) => r.actor ?? '—',
                sortValue: (r) => r.actor ?? '',
                exportValue: (r) => r.actor ?? '',
            },
            {
                id: 'severity',
                header: 'Severity',
                accessor: (r) => <StatusBadge variant={severityVariant(r.severity)}>{r.severity}</StatusBadge>,
                sortValue: (r) => r.severity,
                exportValue: (r) => r.severity,
            },
        ],
        []
    );

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />;
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
                eyebrow="Admin"
                title="Audit Center"
                description="Allocation overrides, sheet sync history, and client-side API failures."
                action={
                    <Button variant="outline" size="sm" onClick={() => void load()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                }
            />

            {error && (
                <div role="alert" className="mb-4 rounded-lg border border-critical-border bg-critical-bg px-4 py-3 text-sm text-critical">
                    {error}
                </div>
            )}

            <MetricGrid className="mb-6">
                <MetricCard label="Allocation overrides" value={String(stats.overrides)} />
                <MetricCard label="Sync events" value={String(stats.syncs)} />
                <MetricCard label="Critical events" value={String(stats.critical)} />
                <MetricCard label="Client API errors" value={String(stats.clientErrors)} hint="This browser session" />
            </MetricGrid>

            <Section title="Audit trail">
                <EnterpriseDataTable
                    columns={columns}
                    rows={sortedEvents}
                    rowKey={(r) => r.id}
                    exportFilename="audit-trail"
                    storageKey="r360-audit-cols"
                    searchPlaceholder="Search events…"
                    emptyTitle="No audit events"
                    emptyDescription="No allocation overrides or sync runs recorded yet."
                    mobileCardRender={(r) => (
                        <div>
                            <p className="font-medium">{r.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{r.detail}</p>
                        </div>
                    )}
                />
            </Section>

            {apiFailures.length > 0 && (
                <Section title="Recent client API failures" className="mt-8">
                    <EnterpriseDataTable
                        rows={apiFailures}
                        rowKey={(r) => `${r.timestamp}-${r.endpoint}`}
                        exportFilename="client-api-failures"
                        columns={[
                            {
                                id: 'when',
                                header: 'When',
                                accessor: (r) =>
                                    formatDistanceToNow(new Date(r.timestamp), { addSuffix: true }),
                                sortValue: (r) => r.timestamp,
                                exportValue: (r) => r.timestamp,
                            },
                            {
                                id: 'route',
                                header: 'Page',
                                accessor: (r) => r.route,
                                sortValue: (r) => r.route,
                                exportValue: (r) => r.route,
                            },
                            {
                                id: 'endpoint',
                                header: 'Endpoint',
                                accessor: (r) => (
                                    <span className="font-mono text-xs">{r.endpoint}</span>
                                ),
                                sortValue: (r) => r.endpoint,
                                exportValue: (r) => r.endpoint,
                            },
                            {
                                id: 'status',
                                header: 'Status',
                                accessor: (r) => (
                                    <StatusBadge variant={r.status >= 500 ? 'critical' : 'warning'}>
                                        {r.status}
                                    </StatusBadge>
                                ),
                                sortValue: (r) => r.status,
                                exportValue: (r) => String(r.status),
                            },
                            {
                                id: 'message',
                                header: 'Message',
                                accessor: (r) => (
                                    <span className="text-xs text-muted-foreground line-clamp-2">{r.message}</span>
                                ),
                                sortValue: (r) => r.message,
                                exportValue: (r) => r.message,
                            },
                        ]}
                        emptyTitle="No client failures"
                    />
                </Section>
            )}
        </PageContainer>
    );
}
