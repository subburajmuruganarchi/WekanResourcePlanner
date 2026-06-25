import { useCallback, useEffect, useState } from 'react';
import { api } from './api-client';
import { getCurrentWeekStart, shiftWeekStart } from './time-entry-week';
import {
    buildEmployeeWeeklyHoursTrend,
    type EmployeeWeeklyHoursPoint,
    WEEKLY_CAPACITY_HOURS,
} from './utilization-trend';

interface TimeEntryHoursRow {
    hours?: number;
}

export function useEmployeeWeeklyHours(employeeId: string | undefined, weekCount = 8) {
    const [points, setPoints] = useState<EmployeeWeeklyHoursPoint[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchTrend = useCallback(async () => {
        if (!employeeId) {
            setPoints([]);
            return;
        }

        setLoading(true);
        const currentWeek = getCurrentWeekStart();
        const weekStarts: string[] = [];
        for (let i = weekCount - 1; i >= 0; i--) {
            weekStarts.push(shiftWeekStart(currentWeek, -i));
        }

        try {
            const results = await Promise.all(
                weekStarts.map(async (weekStart) => {
                    try {
                        const res = await api.get<
                            | { id: string; hours?: number }[]
                            | { data?: { hours?: number }[] }
                        >(`/time-entries?employeeId=${employeeId}&week=${weekStart}`);
                        const entries = Array.isArray(res)
                            ? res
                            : (res as { data?: TimeEntryHoursRow[] })?.data ?? [];
                        const hours = entries.reduce((s, e) => s + (e.hours ?? 0), 0);
                        return { weekStart, hours };
                    } catch {
                        return { weekStart, hours: 0 };
                    }
                })
            );
            setPoints(buildEmployeeWeeklyHoursTrend(results, currentWeek, WEEKLY_CAPACITY_HOURS));
        } catch {
            setPoints([]);
        } finally {
            setLoading(false);
        }
    }, [employeeId, weekCount]);

    useEffect(() => {
        void fetchTrend();
    }, [fetchTrend]);

    return { points, loading, refetch: fetchTrend };
}
