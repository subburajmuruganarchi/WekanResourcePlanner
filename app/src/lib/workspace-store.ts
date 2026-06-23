/** Lightweight client-side workspace entities until backend modules exist */

export type RaidType = 'Risk' | 'Assumption' | 'Issue' | 'Dependency';
export type Priority = 'Low' | 'Medium' | 'High';
export type ItemStatus = 'Open' | 'In Progress' | 'Closed';

export interface RaidItem {
    id: string;
    type: RaidType;
    title: string;
    description?: string;
    owner: string;
    priority: Priority;
    dueDate: string;
    status: ItemStatus;
    impact: string;
    projectId?: string;
    createdAt: string;
}

export interface MilestoneItem {
    id: string;
    projectId: string;
    projectName: string;
    phase: string;
    progress: number;
    owner: string;
    dueDate: string;
    riskStatus: 'On Track' | 'At Risk' | 'Blocked';
}

export interface DecisionItem {
    id: string;
    projectId?: string;
    decision: string;
    description: string;
    owner: string;
    approval: string;
    date: string;
}

export type CommCategory = 'Update' | 'Risk' | 'Decision' | 'Action' | 'Announcement';

export interface CommunicationItem {
    id: string;
    category: CommCategory;
    title: string;
    author: string;
    role: string;
    priority: Priority;
    owner: string;
    dueDate: string;
    status: ItemStatus;
    projectId?: string;
    createdAt: string;
}

function storageKey(scope: string) {
    return `r360.workspace.${scope}`;
}

function read<T>(scope: string, fallback: T[]): T[] {
    try {
        const raw = localStorage.getItem(storageKey(scope));
        return raw ? (JSON.parse(raw) as T[]) : fallback;
    } catch {
        return fallback;
    }
}

function write<T>(scope: string, data: T[]) {
    localStorage.setItem(storageKey(scope), JSON.stringify(data));
}

const DEFAULT_RAID: RaidItem[] = [
    {
        id: 'raid-1',
        type: 'Risk',
        title: 'QA capacity shortage',
        description: 'Insufficient QA bandwidth for release window',
        owner: 'QA Lead',
        priority: 'High',
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        status: 'Open',
        impact: 'Release delay',
        createdAt: new Date().toISOString(),
    },
];

const DEFAULT_MILESTONES: MilestoneItem[] = [
    {
        id: 'ms-1',
        projectId: '',
        projectName: 'Portfolio',
        phase: 'Testing',
        progress: 65,
        owner: 'Delivery Lead',
        dueDate: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
        riskStatus: 'At Risk',
    },
];

export const workspaceStore = {
    getRaid: (userId: string) => read<RaidItem>(`raid.${userId}`, DEFAULT_RAID),
    saveRaid: (userId: string, items: RaidItem[]) => write(`raid.${userId}`, items),
    getMilestones: (userId: string) => read<MilestoneItem>(`milestones.${userId}`, DEFAULT_MILESTONES),
    saveMilestones: (userId: string, items: MilestoneItem[]) => write(`milestones.${userId}`, items),
    getDecisions: (userId: string) => read<DecisionItem>(`decisions.${userId}`, []),
    saveDecisions: (userId: string, items: DecisionItem[]) => write(`decisions.${userId}`, items),
    getCommunications: (userId: string) => read<CommunicationItem>(`comms.${userId}`, []),
    saveCommunications: (userId: string, items: CommunicationItem[]) => write(`comms.${userId}`, items),
};
