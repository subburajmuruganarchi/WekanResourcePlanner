import { useCallback, useEffect, useState } from 'react';
import { Briefcase, Loader2, Plus, Save } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useProjects } from '@/lib/use-projects';
import { useEmployees } from '@/lib/use-employees';

interface Portfolio {
    id: string;
    name: string;
    description: string;
    projectIds: string[];
    managerIds: string[];
}

export default function PortfoliosPage() {
    const { projects } = useProjects();
    const { employees } = useEmployees();
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState({
        name: '',
        description: '',
        projectIds: [] as string[],
        managerIds: [] as string[],
    });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/delivery-portfolios');
            const data = (res as { data?: { data?: Portfolio[] } }).data?.data ?? [];
            setPortfolios(data);
        } catch (err) {
            console.error('Failed to load portfolios', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const deliveryManagers = employees.filter((e) => {
        const accessRole = (e as unknown as { role?: string }).role;
        return accessRole === 'Delivery Manager';
    });

    const handleCreate = async () => {
        if (!draft.name.trim()) return;
        setSaving(true);
        try {
            await api.post('/delivery-portfolios', {
                name: draft.name.trim(),
                description: draft.description.trim() || undefined,
                projectIds: draft.projectIds,
                managerIds: draft.managerIds,
            });
            setDraft({ name: '', description: '', projectIds: [], managerIds: [] });
            await load();
        } catch (err) {
            console.error('Failed to create portfolio', err);
        } finally {
            setSaving(false);
        }
    };

    const toggleDraftProject = (projectId: string) => {
        setDraft((prev) => ({
            ...prev,
            projectIds: prev.projectIds.includes(projectId)
                ? prev.projectIds.filter((id) => id !== projectId)
                : [...prev.projectIds, projectId],
        }));
    };

    const toggleDraftManager = (managerId: string) => {
        setDraft((prev) => ({
            ...prev,
            managerIds: prev.managerIds.includes(managerId)
                ? prev.managerIds.filter((id) => id !== managerId)
                : [...prev.managerIds, managerId],
        }));
    };

    return (
        <PageContainer className="space-y-8">
            <header>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-2">
                    Admin
                </p>
                <h1 className="text-2xl font-bold text-slate-900">Delivery Portfolios</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Assign projects and Delivery Managers to portfolio units for scoped operational access.
                </p>
            </header>

            <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create portfolio
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                    <input
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        placeholder="Portfolio name"
                        value={draft.name}
                        onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                    />
                    <input
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        placeholder="Description (optional)"
                        value={draft.description}
                        onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                    />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <p className="text-xs font-medium text-slate-500 mb-2">Projects</p>
                        <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-lg p-2 space-y-1">
                            {projects.map((p) => (
                                <label key={p.id} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={draft.projectIds.includes(p.id)}
                                        onChange={() => toggleDraftProject(p.id)}
                                    />
                                    <span>{p.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 mb-2">Delivery Managers</p>
                        <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-lg p-2 space-y-1">
                            {deliveryManagers.length === 0 ? (
                                <p className="text-xs text-slate-400">Assign the Delivery Manager role in User Management first.</p>
                            ) : (
                                deliveryManagers.map((m) => (
                                    <label key={m.id} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={draft.managerIds.includes(m.id)}
                                            onChange={() => toggleDraftManager(m.id)}
                                        />
                                        <span>{m.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                </div>
                <Button onClick={handleCreate} disabled={saving || !draft.name.trim()} className="gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save portfolio
                </Button>
            </section>

            <section className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-800">Active portfolios</h2>
                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading…
                    </div>
                ) : portfolios.length === 0 ? (
                    <p className="text-sm text-slate-500">No portfolios yet.</p>
                ) : (
                    portfolios.map((p) => (
                        <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start gap-3">
                                <Briefcase className="w-5 h-5 text-indigo-600 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-slate-900">{p.name}</p>
                                    {p.description && (
                                        <p className="text-sm text-slate-500 mt-0.5">{p.description}</p>
                                    )}
                                    <p className="text-xs text-slate-500 mt-2">
                                        {p.projectIds.length} project(s) · {p.managerIds.length} manager(s)
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </section>
        </PageContainer>
    );
}
