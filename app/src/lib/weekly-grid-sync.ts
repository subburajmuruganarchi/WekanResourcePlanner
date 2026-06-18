/** Notifies other views (Resource Allocation, Weekly Planner) to refetch after grid saves. */

type Listener = () => void;

const listeners = new Set<Listener>();

export function notifyWeeklyGridUpdated(): void {
    for (const listener of listeners) {
        listener();
    }
}

export function subscribeWeeklyGridUpdated(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
