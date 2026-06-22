import type { WeeklyPlannerGridRow } from '@/types/weekly-allocation';
import type { AllocationGridRow, EmployeeOption, ProjectOption } from '../allocation-weekly-grid';
import { AllocationWeeklyGrid } from '../allocation-weekly-grid';

interface ResourceGridProps {
    rows: AllocationGridRow[];
    weeks: string[];
    employees: EmployeeOption[];
    projects: ProjectOption[];
    canEdit: boolean;
    dirtyKeys: Set<string>;
    loading?: boolean;
    onPlannedHoursChange: (row: WeeklyPlannerGridRow, weekStart: string, plannedHours: number) => void;
    onEmployeeChange: (row: AllocationGridRow, employeeId: string) => void;
    onProjectChange: (row: AllocationGridRow, projectId: string) => void;
}

export function ResourceGrid(props: ResourceGridProps) {
    return (
        <div className="dashboard-card overflow-hidden p-0">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900">Allocation Grid</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Enterprise data grid with sticky columns, inline editing, and weekly planned hours.
                    </p>
                </div>
                <span className="text-xs text-slate-400 hidden sm:inline">
                    {props.rows.length} rows · {props.weeks.length} weeks
                </span>
            </div>
            <AllocationWeeklyGrid {...props} />
        </div>
    );
}
