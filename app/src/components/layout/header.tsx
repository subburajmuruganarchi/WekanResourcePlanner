import { Bell, CheckCircle2, AlertCircle, Info, Check, HelpCircle, Search, Menu, Moon, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { useNotifications } from '@/lib/use-notifications';
import { useAuth } from '@/lib/auth-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { GlobalSearch } from './global-search';
import { CommandPalette } from './command-palette';
import { ROUTE_TITLES } from '@/lib/navigation-config';
import { AICopilotPanel } from '@/components/workspaces/ai/AICopilotPanel';
import { useTheme } from '@/lib/theme-context';
import { Breadcrumbs } from '@/components/patterns/breadcrumbs';
import { ProfileMenu } from './profile-menu';
import { getCommandItemsForRole } from '@/lib/command-items';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const { user } = useAuth();
    const { resolvedTheme, toggleTheme } = useTheme();
    const location = useLocation();

    const commandItems = useMemo(() => getCommandItemsForRole(user?.role), [user?.role]);

    const meta = ROUTE_TITLES[location.pathname] ??
        ROUTE_TITLES[location.pathname.split('/').slice(0, 2).join('/')] ?? {
        title: 'R360',
        breadcrumb: ['Workspace'],
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
            <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    {onMenuClick && (
                        <button
                            type="button"
                            onClick={onMenuClick}
                            className="lg:hidden p-2 -ml-1 rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="Open navigation menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    )}
                    <div className="min-w-0">
                    <Breadcrumbs crumbs={meta.breadcrumb} className="mb-0.5" />
                    <h1 className="text-base font-semibold text-card-foreground truncate">{meta.title}</h1>
                    </div>
                </div>

                <div className="hidden lg:block w-full max-w-sm">
                    <GlobalSearch />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted text-xs text-muted-foreground hover:bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => {
                            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
                        }}
                    >
                        <Search className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Search</span>
                        <kbd className="hidden md:inline text-[10px] bg-white px-1 rounded border border-slate-200">⌘K</kbd>
                    </button>

                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="p-2 text-muted-foreground hover:text-card-foreground rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>

                    <Button variant="ghost" size="sm" className="hidden md:flex text-muted-foreground" aria-label="Help">
                        <HelpCircle className="w-4 h-4" />
                    </Button>

                    <AICopilotPanel />

                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="relative p-2 text-muted-foreground hover:text-card-foreground rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/80">
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
                                    <div className="p-6 text-center text-muted-foreground text-sm">No notifications</div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {notifications.map((notif: { id: string; read: boolean; type: string; title: string; message: string; createdAt: string }) => (
                                            <div
                                                key={notif.id}
                                                role="button"
                                                tabIndex={0}
                                                className={`p-4 flex gap-3 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${notif.read ? 'bg-card' : 'bg-brand-50/40'}`}
                                                onClick={() => !notif.read && markAsRead(notif.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        if (!notif.read) markAsRead(notif.id);
                                                    }
                                                }}
                                            >
                                                <div className="shrink-0 mt-0.5">{getIcon(notif.type, notif.read)}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm ${notif.read ? 'text-muted-foreground font-medium' : 'text-card-foreground font-semibold'}`}>
                                                        {notif.title}
                                                    </p>
                                                    <p className="text-xs mt-1 text-muted-foreground leading-snug">{notif.message}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wider">
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

                    <div className="h-8 w-px bg-border hidden sm:block" aria-hidden />

                    <ProfileMenu />
                </div>
            </header>
        </>
    );
}
