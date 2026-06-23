import { Users, Clock, AlertCircle } from 'lucide-react';

interface ManagerOverviewProps {
    teamSize: number;
    pendingApprovals: number;
    missingSubmissions: number;
}

export function ManagerOverview({
    teamSize,
    pendingApprovals,
    missingSubmissions,
}: ManagerOverviewProps) {
    const items = [
        {
            icon: Users,
            label: 'Team Timesheets',
            value: `${teamSize} resources`,
            hint: 'Allocated to your projects',
        },
        {
            icon: Clock,
            label: 'Pending Approvals',
            value: String(pendingApprovals),
            hint: 'Awaiting your review',
            warn: pendingApprovals > 0,
        },
        {
            icon: AlertCircle,
            label: 'Missing Submissions',
            value: String(missingSubmissions),
            hint: 'Incomplete this week',
            warn: missingSubmissions > 0,
        },
    ];

    return (
        <div className="dashboard-card p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Team Overview</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={item.label}
                            className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-3"
                        >
                            <div className="flex items-center gap-2">
                                <Icon
                                    className={`w-4 h-4 ${item.warn ? 'text-amber-500' : 'text-brand-500'}`}
                                />
                                <span className="text-[10px] font-semibold uppercase text-slate-500">
                                    {item.label}
                                </span>
                            </div>
                            <p
                                className={`text-lg font-semibold mt-1 ${item.warn ? 'text-amber-700' : 'text-slate-900'}`}
                            >
                                {item.value}
                            </p>
                            <p className="text-[10px] text-slate-400">{item.hint}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
