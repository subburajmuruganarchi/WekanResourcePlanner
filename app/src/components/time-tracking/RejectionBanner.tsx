import { XCircle } from 'lucide-react';

export interface RejectionNotice {
    projectCode: string;
    date: string;
    hours: number;
    rejectionComment?: string;
    rejectedAt?: string;
}

interface RejectionBannerProps {
    notices: RejectionNotice[];
}

function formatRejectedAt(iso?: string): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function RejectionBanner({ notices }: RejectionBannerProps) {
    if (notices.length === 0) return null;

    return (
        <div
            className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 flex gap-3"
            role="alert"
        >
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-red-900">
                    {notices.length === 1
                        ? '1 entry was rejected by your manager'
                        : `${notices.length} entries were rejected by your manager`}
                </p>
                <p className="text-xs text-red-800 mt-0.5">
                    Update the entries below and resubmit your timesheet.
                </p>
                <ul className="mt-2 space-y-2">
                    {notices.map((n) => (
                        <li
                            key={`${n.projectCode}-${n.date}`}
                            className="text-xs text-red-900 bg-white/70 rounded-lg px-3 py-2 border border-red-100"
                        >
                            <span className="font-medium">
                                {n.projectCode} · {n.date} · {n.hours}h
                            </span>
                            {n.rejectionComment ? (
                                <p className="mt-1 text-red-800">
                                    <span className="font-medium">Reason:</span> {n.rejectionComment}
                                </p>
                            ) : (
                                <p className="mt-1 text-red-700 italic">No reason provided.</p>
                            )}
                            {formatRejectedAt(n.rejectedAt) && (
                                <p className="mt-0.5 text-red-600">Rejected {formatRejectedAt(n.rejectedAt)}</p>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
