import { useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Check, X } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import {
    PageHeader,
    Section,
    MetricCard,
    MetricGrid,
    EnterpriseDataTable,
    PageSkeleton,
    StatusBadge,
    FormField,
    type DataTableColumn,
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useResourceRequests, type ResourceRequest } from '@/lib/use-resource-requests';
import { useProjects } from '@/lib/use-projects';
import { useEmployees } from '@/lib/use-employees';
import { useRoles } from '@/lib/use-roles';
import { useAuth } from '@/lib/auth-context';
import { ROLES } from '@/lib/roles';
import { normalizeRoleName } from '@/lib/role-utils';
import { CopilotSuggestedActions } from '@/components/workspaces/ai/CopilotSuggestedActions';
import { useToast } from '@/lib/toast-context';

const REVIEW_ROLES = [ROLES.ADMIN, ROLES.DELIVERY_MANAGER, ROLES.CEO];

function statusVariant(status: ResourceRequest['status']) {
    switch (status) {
        case 'Approved':
            return 'success' as const;
        case 'Rejected':
            return 'critical' as const;
        case 'Cancelled':
            return 'neutral' as const;
        default:
            return 'warning' as const;
    }
}

export default function ResourceRequestsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const role = normalizeRoleName(user?.role);
    const canReview = REVIEW_ROLES.includes(role as (typeof REVIEW_ROLES)[number]);
    const authEmployeeId = user?.id;

    const [statusFilter, setStatusFilter] = useState<'all' | ResourceRequest['status']>('Pending');
    const { requests, loading, error, createRequest, reviewRequest, cancelRequest } = useResourceRequests(
        statusFilter === 'all' ? undefined : statusFilter
    );
    const { projects } = useProjects();
    const { employees } = useEmployees({ activeOnly: true });
    const { roles } = useRoles();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({
        projectId: '',
        employeeId: authEmployeeId ?? '',
        roleId: '',
        allocationPercent: '50',
        startDate: '',
        endDate: '',
        justification: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const stats = useMemo(() => {
        const pending = requests.filter((r) => r.status === 'Pending').length;
        const approved = requests.filter((r) => r.status === 'Approved').length;
        return { pending, approved, total: requests.length };
    }, [requests]);

    const handleReview = useCallback(
        async (id: string, action: 'approve' | 'reject') => {
            try {
                await reviewRequest(id, action, undefined, action === 'approve');
                toast({
                    title: action === 'approve' ? 'Request approved' : 'Request rejected',
                    variant: action === 'approve' ? 'success' : 'default',
                });
            } catch (err) {
                toast({
                    title: 'Review failed',
                    description: err instanceof Error ? err.message : 'Try again',
                    variant: 'error',
                });
            }
        },
        [reviewRequest, toast]
    );

    const handleCancel = useCallback(
        async (id: string) => {
            try {
                await cancelRequest(id);
                toast({ title: 'Request cancelled', variant: 'default' });
            } catch (err) {
                toast({
                    title: 'Cancel failed',
                    description: err instanceof Error ? err.message : 'Try again',
                    variant: 'error',
                });
            }
        },
        [cancelRequest, toast]
    );

    const columns: DataTableColumn<ResourceRequest>[] = useMemo(
        () => [
            {
                id: 'project',
                header: 'Project',
                accessor: (r) => (
                    <div>
                        <p className="font-medium">{r.projectName ?? r.projectCode}</p>
                        <p className="text-xs text-muted-foreground">{r.employeeName}</p>
                    </div>
                ),
                sortValue: (r) => r.projectName ?? '',
                exportValue: (r) => `${r.projectName} / ${r.employeeName}`,
            },
            {
                id: 'allocation',
                header: 'Allocation',
                accessor: (r) => (
                    <span className="tabular-nums">
                        {r.allocationPercent}% · {r.startDate} → {r.endDate}
                    </span>
                ),
                sortValue: (r) => r.allocationPercent,
                exportValue: (r) => `${r.allocationPercent}%`,
            },
            {
                id: 'status',
                header: 'Status',
                accessor: (r) => <StatusBadge variant={statusVariant(r.status)}>{r.status}</StatusBadge>,
                sortValue: (r) => r.status,
                exportValue: (r) => r.status,
            },
            {
                id: 'requested',
                header: 'Requested',
                accessor: (r) => (
                    <span className="text-muted-foreground text-xs">
                        {r.requestedByName ?? '—'}
                        {r.createdAt && (
                            <> · {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</>
                        )}
                    </span>
                ),
                sortValue: (r) => r.createdAt ?? '',
                exportValue: (r) => r.requestedByName ?? '',
            },
            {
                id: 'actions',
                header: '',
                accessor: (r) => (
                    <div className="flex justify-end gap-1">
                        {canReview && r.status === 'Pending' && (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        void handleReview(r.id, 'approve');
                                    }}
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    Approve
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 gap-1 text-critical"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        void handleReview(r.id, 'reject');
                                    }}
                                >
                                    <X className="w-3.5 h-3.5" />
                                    Reject
                                </Button>
                            </>
                        )}
                        {r.status === 'Pending' &&
                            (r.requestedById === authEmployeeId || r.employeeId === authEmployeeId) && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        void handleCancel(r.id);
                                    }}
                                >
                                    Cancel
                                </Button>
                            )}
                        {r.allocationId && (
                            <Button size="sm" variant="link" className="h-8" asChild>
                                <Link to="/allocation" onClick={(e) => e.stopPropagation()}>
                                    View allocation
                                </Link>
                            </Button>
                        )}
                    </div>
                ),
            },
        ],
        [canReview, authEmployeeId, handleReview, handleCancel]
    );

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createRequest({
                projectId: form.projectId,
                employeeId: form.employeeId,
                roleId: form.roleId || undefined,
                allocationPercent: Number(form.allocationPercent),
                startDate: form.startDate,
                endDate: form.endDate,
                justification: form.justification,
            });
            setDialogOpen(false);
            setForm((f) => ({ ...f, justification: '' }));
            toast({ title: 'Resource request submitted', variant: 'success' });
        } catch (err) {
            toast({
                title: 'Could not submit request',
                description: err instanceof Error ? err.message : 'Check required fields',
                variant: 'error',
            });
        } finally {
            setSubmitting(false);
        }
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
                eyebrow="Resource Operations"
                title="Resource Requests"
                description="Request staffing for projects. Delivery Managers approve and optionally create allocations."
                action={
                    <Button onClick={() => setDialogOpen(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        New request
                    </Button>
                }
            />

            <CopilotSuggestedActions className="mb-6" />

            {error && (
                <div role="alert" className="mb-4 rounded-lg border border-critical-border bg-critical-bg px-4 py-3 text-sm text-critical">
                    {error}
                </div>
            )}

            <MetricGrid className="mb-6" columns={{ sm: 2, xl: 3 }}>
                <MetricCard label="Pending" value={String(stats.pending)} />
                <MetricCard label="Approved (visible)" value={String(stats.approved)} />
                <MetricCard label="In view" value={String(stats.total)} />
            </MetricGrid>

            <Section
                title="Request queue"
                action={
                    <div className="flex gap-2">
                        {(['all', 'Pending', 'Approved', 'Rejected', 'Cancelled'] as const).map((s) => (
                            <Button
                                key={s}
                                size="sm"
                                variant={statusFilter === s ? 'default' : 'outline'}
                                onClick={() => setStatusFilter(s)}
                            >
                                {s === 'all' ? 'All' : s}
                            </Button>
                        ))}
                    </div>
                }
            >
                <EnterpriseDataTable
                    columns={columns}
                    rows={requests}
                    rowKey={(r) => r.id}
                    exportFilename="resource-requests"
                    storageKey="r360-resource-requests-cols"
                    searchPlaceholder="Search requests…"
                    emptyTitle="No resource requests"
                    emptyDescription="Create a request when you need staffing on a project."
                    onRowClick={(r) => {
                        if (r.projectId) navigate(`/projects/${r.projectId}`);
                    }}
                    mobileCardRender={(r) => (
                        <div>
                            <p className="font-medium">{r.projectName}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {r.employeeName} · {r.allocationPercent}% · {r.status}
                            </p>
                        </div>
                    )}
                />
            </Section>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>New resource request</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
                        <FormField label="Project" htmlFor="rr-project" required>
                            <select
                                id="rr-project"
                                required
                                value={form.projectId}
                                onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">Select project…</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.code})
                                    </option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="Employee" htmlFor="rr-employee" required>
                            <select
                                id="rr-employee"
                                required
                                value={form.employeeId}
                                onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                                disabled={role === ROLES.EMPLOYEE || role === ROLES.USER}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                            >
                                <option value="">Select employee…</option>
                                {employees.map((e) => (
                                    <option key={e.id} value={e.id}>
                                        {e.name}
                                    </option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="Role" htmlFor="rr-role" hint="Required for auto-allocation on approve">
                            <select
                                id="rr-role"
                                value={form.roleId}
                                onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">Select role (optional)…</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                        </FormField>

                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Allocation %" htmlFor="rr-percent" required>
                                <Input
                                    id="rr-percent"
                                    type="number"
                                    min={1}
                                    max={100}
                                    required
                                    value={form.allocationPercent}
                                    onChange={(e) => setForm((f) => ({ ...f, allocationPercent: e.target.value }))}
                                />
                            </FormField>
                            <FormField label="Start date" htmlFor="rr-start" required>
                                <Input
                                    id="rr-start"
                                    type="date"
                                    required
                                    value={form.startDate}
                                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                                />
                            </FormField>
                        </div>

                        <FormField label="End date" htmlFor="rr-end" required>
                            <Input
                                id="rr-end"
                                type="date"
                                required
                                value={form.endDate}
                                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                            />
                        </FormField>

                        <FormField label="Justification" htmlFor="rr-justification" required hint="Min 10 characters">
                            <textarea
                                id="rr-justification"
                                required
                                minLength={10}
                                rows={3}
                                value={form.justification}
                                onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </FormField>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? 'Submitting…' : 'Submit request'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </PageContainer>
    );
}
