import { Bell, CheckCircle2, AlertCircle, Info, Check, LogOut, HelpCircle, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications } from '@/lib/use-notifications';
import { useAuth } from '@/lib/auth-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { GlobalSearch } from './global-search';
import { CommandPalette, type CommandItem } from './command-palette';
import { ROUTE_TITLES } from '@/lib/navigation-config';
import { AICopilotPanel } from '@/components/workspaces/ai/AICopilotPanel';

const commandItems: CommandItem[] = [
    { id: 'dash', label: 'Dashboard', group: 'Workspace', path: '/dashboard' },
    { id: 'alloc', label: 'Resource Allocation', group: 'Workspace', path: '/allocation' },
    { id: 'proj', label: 'Projects', group: 'Workspace', path: '/projects' },
    { id: 'plan', label: 'Weekly Planner', group: 'Workspace', path: '/weekly-planner' },
    { id: 'time', label: 'Time Entry', group: 'Operations', path: '/time-entry' },
    { id: 'appr', label: 'PM Approvals', group: 'Operations', path: '/pm-approvals' },
    { id: 'rep', label: 'Reports', group: 'Operations', path: '/reports' },
    { id: 'ins', label: 'Insights Center', group: 'Intelligence', path: '/insights' },
];

export function Header() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const meta = ROUTE_TITLES[location.pathname] ??
        ROUTE_TITLES[location.pathname.split('/').slice(0, 2).join('/')] ?? {
        title: 'R360',
        breadcrumb: ['Workspace'],
    };

    const handleSignOut = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const getIcon = (type: string, read: boolean) => {
        const props = { className: `w-5 h-5 ${read ? 'text-gray-400' : ''}` };
        switch (type) {
            case 'SUCCESS':
                return <CheckCircle2 {...props} className={read ? props.className : 'w-5 h-5 text-green-500'} />;
            case 'ERROR':
                return <AlertCircle {...props} className={read ? props.className : 'w-5 h-5 text-red-500'} />;
            case 'WARNING':
                return <AlertCircle {...props} className={read ? props.className : 'w-5 h-5 text-amber-500'} />;
            default:
                return <Info {...props} className={read ? props.className : 'w-5 h-5 text-blue-500'} />;
        }
    };

    return (
        <>
            <CommandPalette items={commandItems} />
            <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-10 shrink-0">
                <div className="min-w-0 flex-1">
                    <nav className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-0.5" aria-label="Breadcrumb">
                        {meta.breadcrumb.map((crumb, i) => (
                            <span key={crumb} className="flex items-center gap-1.5">
                                {i > 0 && <span>/</span>}
                                <span className={i === meta.breadcrumb.length - 1 ? 'text-brand-600 font-medium' : ''}>
                                    {crumb}
                                </span>
                            </span>
                        ))}
                    </nav>
                    <h1 className="text-base font-semibold text-slate-900 truncate">{meta.title}</h1>
                </div>

                <div className="hidden lg:block w-full max-w-sm">
                    <GlobalSearch />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-500 hover:bg-white transition-colors"
                        onClick={() => {
                            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
                        }}
                    >
                        <Search className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Search</span>
                        <kbd className="hidden md:inline text-[10px] bg-white px-1 rounded border border-slate-200">⌘K</kbd>
                    </button>

                    <Button variant="ghost" size="sm" className="hidden md:flex text-slate-500" aria-label="Help">
                        <HelpCircle className="w-4 h-4" />
                    </Button>

                    <AICopilotPanel />

                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="relative p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
                                aria-label="Notifications"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-4 h-4 bg-brand-600 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0 mr-4" align="end">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                                <h3 className="font-semibold text-sm">Notifications</h3>
                                {unreadCount > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-auto p-0 text-xs text-brand-600 hover:text-brand-700 hover:bg-transparent"
                                        onClick={() => markAllAsRead()}
                                    >
                                        <Check className="w-3 h-3 mr-1" />
                                        Mark all read
                                    </Button>
                                )}
                            </div>
                            <div className="max-h-[400px] overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-6 text-center text-slate-500 text-sm">No notifications</div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {notifications.map((notif: { id: string; read: boolean; type: string; title: string; message: string; createdAt: string }) => (
                                            <div
                                                key={notif.id}
                                                className={`p-4 flex gap-3 transition-colors cursor-pointer ${notif.read ? 'bg-white' : 'bg-brand-50/40'}`}
                                                onClick={() => !notif.read && markAsRead(notif.id)}
                                            >
                                                <div className="shrink-0 mt-0.5">{getIcon(notif.type, notif.read)}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm ${notif.read ? 'text-slate-600 font-medium' : 'text-slate-900 font-semibold'}`}>
                                                        {notif.title}
                                                    </p>
                                                    <p className="text-xs mt-1 text-slate-500 leading-snug">{notif.message}</p>
                                                    <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-wider">
                                                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <div className="h-8 w-px bg-slate-200 hidden sm:block" aria-hidden />

                    <button
                        type="button"
                        onClick={handleSignOut}
                        aria-label="Sign out"
                        title={user?.name ? `Sign out (${user.name})` : 'Sign out'}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </header>
        </>
    );
}
