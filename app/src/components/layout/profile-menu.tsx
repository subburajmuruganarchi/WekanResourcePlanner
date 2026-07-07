import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun, User, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { ROLES } from '@/lib/roles';
import { normalizeRoleName, getRoleDisplayLabel } from '@/lib/role-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export function ProfileMenu() {
    const { user, logout } = useAuth();
    const { resolvedTheme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const initials = user?.name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const roleLabel = getRoleDisplayLabel(user?.role, {
        jobRole: user?.jobRole,
        position: user?.position,
    });

    const handleSignOut = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold hover:ring-2 hover:ring-brand-200 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Profile menu"
                >
                    {initials ?? '?'}
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-0">
                <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-card-foreground truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{roleLabel}</p>
                </div>
                <div className="p-1">
                    <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted text-card-foreground"
                        onClick={toggleTheme}
                    >
                        {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>
                    {normalizeRoleName(user?.role) === ROLES.ADMIN && (
                        <button
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted text-card-foreground"
                            onClick={() => navigate('/system-health')}
                        >
                            <Settings className="w-4 h-4" />
                            System settings
                        </button>
                    )}
                    <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted text-card-foreground"
                        disabled
                        title="Coming soon"
                    >
                        <User className="w-4 h-4" />
                        Profile
                    </button>
                </div>
                <div className="p-1 border-t border-border">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 text-critical hover:text-critical hover:bg-critical-bg"
                        onClick={handleSignOut}
                    >
                        <LogOut className="w-4 h-4" />
                        Sign out
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
