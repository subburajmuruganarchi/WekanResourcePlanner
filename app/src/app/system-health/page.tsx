import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import {
    clearApiFailures,
    getRecentApiFailures,
    type ApiFailureRecord,
} from '@/lib/error-tracker';
import { Activity, Loader2, ShieldAlert, RefreshCcw } from 'lucide-react';
interface HealthSummary {
    timeEntryStatusCounts: Record<string, number>;
    submittedWithoutPM: number;
    legacyRoles: number;
    employeeCounts: {
        byIsActive: number;
        byStatusActive: number;
        combinedActive: number;
    };
    notifications: {
        total: number;
        unread: number;
        failureTrackingAvailable: boolean;
    };
    overallStatus: 'healthy' | 'warning' | 'critical';
    warnings: string[];
}

interface VerifyResult {
    status: 'PASS' | 'WARN' | 'FAIL';
    issues: string[];
}

function StatusBadge({ level }: { level: 'healthy' | 'warning' | 'critical' | 'PASS' | 'WARN' | 'FAIL' }) {
    const map = {
        healthy: { label: 'Healthy', className: 'bg-green-50 text-green-800 border-green-200' },
        warning: { label: 'Warning', className: 'bg-amber-50 text-amber-800 border-amber-200' },
        critical: { label: 'Critical', className: 'bg-red-50 text-red-800 border-red-200' },
        PASS: { label: 'PASS', className: 'bg-green-50 text-green-800 border-green-200' },
        WARN: { label: 'WARN', className: 'bg-amber-50 text-amber-800 border-amber-200' },
        FAIL: { label: 'FAIL', className: 'bg-red-50 text-red-800 border-red-200' },
    } as const;
    const item = map[level];
    return (
        <Badge variant="outline" className={item.className}>
            {item.label}
        </Badge>
    );
}

export default function SystemHealthPage() {
    const { user } = useAuth();
    const [health, setHealth] = useState<HealthSummary | null>(null);
    const [verify, setVerify] = useState<VerifyResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [apiFailures, setApiFailures] = useState<ApiFailureRecord[]>([]);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [summary, verification] = await Promise.all([
                api.get<HealthSummary>('/system/health-summary'),
                api.get<VerifyResult>('/system/verify'),
            ]);
            setHealth(summary);
            setVerify(verification);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load diagnostics');
            setHealth(null);
            setVerify(null);
        } finally {
            setApiFailures(getRecentApiFailures());
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'Admin') {
            load();
        }
    }, [user?.role]);

    if (user?.role !== 'Admin') {
        return (
            <PageContainer className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <ShieldAlert className="w-12 h-12 text-amber-500 mb-4" />
                <h1 className="text-xl font-bold text-gray-900">System Health</h1>
                <p className="text-gray-600 mt-2">Admin access only.</p>
            </PageContainer>
        );
    }

    const pmQueueStatus =
        health && health.submittedWithoutPM > 0 ? 'warning' : 'healthy';
    const roleStatus = health && health.legacyRoles > 0 ? 'warning' : 'healthy';
    const employeeDrift =
        health &&
        (health.employeeCounts.byIsActive !== health.employeeCounts.combinedActive ||
            health.employeeCounts.byStatusActive !== health.employeeCounts.combinedActive);

    return (
        <PageContainer className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-blue-600" />
                        System Health (UAT)
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Read-only production diagnostics. No data is modified.
                    </p>
                </div>
                <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {error && (
                <Card className="p-4 border-red-200 bg-red-50 text-red-800 text-sm">{error}</Card>
            )}

            {loading && (
                <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading diagnostics…
                </div>
            )}

            <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="font-semibold text-gray-900">Client API failures (local)</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            clearApiFailures();
                            setApiFailures([]);
                        }}
                    >
                        Clear
                    </Button>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                    Last {apiFailures.length} failure(s) from this browser session. Not sent to any external service.
                </p>
                {apiFailures.length === 0 ? (
                    <p className="text-sm text-gray-600">No recorded API failures.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead>
                                <tr className="text-gray-500 border-b">
                                    <th className="py-2 pr-2">Time</th>
                                    <th className="py-2 pr-2">Route</th>
                                    <th className="py-2 pr-2">Endpoint</th>
                                    <th className="py-2 pr-2">Status</th>
                                    <th className="py-2">Message</th>
                                </tr>
                            </thead>
                            <tbody>
                                {apiFailures.map((f, i) => (
                                    <tr key={`${f.timestamp}-${i}`} className="border-b border-gray-100">
                                        <td className="py-2 pr-2 whitespace-nowrap">{new Date(f.timestamp).toLocaleString()}</td>
                                        <td className="py-2 pr-2">{f.route}</td>
                                        <td className="py-2 pr-2 font-mono">{f.endpoint}</td>
                                        <td className="py-2 pr-2">{f.status}</td>
                                        <td className="py-2 text-red-700">{f.message}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {!loading && verify && (
                <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="font-semibold text-gray-900">Smoke verification</h2>
                        <StatusBadge level={verify.status} />
                    </div>
                    {verify.issues.length === 0 ? (
                        <p className="text-sm text-gray-600">All automated checks passed.</p>
                    ) : (
                        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                            {verify.issues.map((issue, i) => (
                                <li key={i}>{issue}</li>
                            ))}
                        </ul>
                    )}
                </Card>
            )}

            {!loading && health && (
                <>
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-gray-900">Overall</h2>
                            <StatusBadge level={health.overallStatus} />
                        </div>
                        {health.warnings.length > 0 && (
                            <ul className="mt-3 text-sm text-amber-800 list-disc pl-5 space-y-1">
                                {health.warnings.map((w, i) => (
                                    <li key={i}>{w}</li>
                                ))}
                            </ul>
                        )}
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-semibold text-gray-900">1. Time entry status counts</h2>
                            <StatusBadge level="healthy" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            {['Draft', 'Submitted', 'PM_Approved', 'PM_Rejected'].map((key) => (
                                <div key={key} className="rounded-lg border border-gray-200 p-3">
                                    <p className="text-gray-500 text-xs">{key}</p>
                                    <p className="text-lg font-semibold">
                                        {health.timeEntryStatusCounts[key] ?? 0}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="font-semibold text-gray-900">2. PM queue health</h2>
                            <StatusBadge level={pmQueueStatus} />
                        </div>
                        <p className="text-sm text-gray-700">
                            Submitted entries missing <code className="text-xs">projectManagerUserId</code>:{' '}
                            <strong>{health.submittedWithoutPM}</strong>
                        </p>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="font-semibold text-gray-900">3. Role migration health</h2>
                            <StatusBadge level={roleStatus} />
                        </div>
                        <p className="text-sm text-gray-700">
                            Roles still named <strong>ProjectManager</strong> (legacy):{' '}
                            <strong>{health.legacyRoles}</strong>
                        </p>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="font-semibold text-gray-900">4. Active employee counts</h2>
                            <StatusBadge level={employeeDrift ? 'warning' : 'healthy'} />
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                            <div className="rounded-lg border p-3">
                                <p className="text-gray-500 text-xs">is_active: true</p>
                                <p className="font-semibold">{health.employeeCounts.byIsActive}</p>
                            </div>
                            <div className="rounded-lg border p-3">
                                <p className="text-gray-500 text-xs">status: Active</p>
                                <p className="font-semibold">{health.employeeCounts.byStatusActive}</p>
                            </div>
                            <div className="rounded-lg border p-3">
                                <p className="text-gray-500 text-xs">Combined ($or)</p>
                                <p className="font-semibold">{health.employeeCounts.combinedActive}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="font-semibold text-gray-900">5. Notification health</h2>
                            <StatusBadge level="healthy" />
                        </div>
                        <p className="text-sm text-gray-700">
                            Total: {health.notifications.total} · Unread: {health.notifications.unread}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                            Delivery failure tracking:{' '}
                            {health.notifications.failureTrackingAvailable ? 'available' : 'not persisted (best-effort only)'}
                        </p>
                    </Card>
                </>
            )}
        </PageContainer>
    );
}
