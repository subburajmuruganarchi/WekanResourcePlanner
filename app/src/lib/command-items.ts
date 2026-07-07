import type { CommandItem } from '@/components/layout/command-palette';
import { getNavGroupsForRole } from '@/lib/navigation-config';
import { getHomeRoute } from '@/lib/home-route';
import { normalizeRoleName } from '@/lib/role-utils';

const RECENT_KEY = 'r360_command_recent';
const MAX_RECENT = 8;

export function getCommandItemsForRole(role: string | undefined): CommandItem[] {
    const canonical = normalizeRoleName(role);
    const groups = getNavGroupsForRole(canonical);
    const items: CommandItem[] = [];

    for (const group of groups) {
        for (const item of group.items) {
            items.push({
                id: item.path.replace(/\//g, '-'),
                label: item.label,
                group: group.title,
                path: item.path,
                keywords: `${item.label} ${group.title}`,
            });
        }
    }

    // Common actions
    const home = getHomeRoute(role);
    if (!items.some((i) => i.path === home)) {
        items.unshift({
            id: 'home',
            label: 'Go to Home',
            group: 'Quick',
            path: home,
        });
    }

    return items;
}

export function getRecentCommandItems(allItems: CommandItem[]): CommandItem[] {
    try {
        const raw = localStorage.getItem(RECENT_KEY);
        if (!raw) return [];
        const paths = JSON.parse(raw) as string[];
        return paths
            .map((p) => allItems.find((i) => i.path === p))
            .filter((i): i is CommandItem => !!i)
            .slice(0, MAX_RECENT);
    } catch {
        return [];
    }
}

export function recordCommandVisit(path: string) {
    try {
        const raw = localStorage.getItem(RECENT_KEY);
        const paths = raw ? (JSON.parse(raw) as string[]) : [];
        const next = [path, ...paths.filter((p) => p !== path)].slice(0, MAX_RECENT);
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
        /* ignore */
    }
}
