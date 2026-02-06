// Frontend API Type Definitions
// Aligned with backend response shapes

export type ProjectStatus = 'Planning' | 'Active' | 'OnHold' | 'Completed' | 'Cancelled';
export type ProjectPriority = 'High' | 'Medium' | 'Low';
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Expert';
export type Role = 'Admin' | 'ProjectManager' | 'Employee' | 'Leadership';

export interface Employee {
    id: string;
    name: string;              // Populated: firstName + lastName
    email: string;
    title: string;
    role: string;              // Populated: Primary role label
    primarySkill: string;      // Populated: Primary skill name
    skillLevel: SkillLevel;
    availability: number;      // Computed: 100 - sum(active allocations %)
    experienceYears: number;
    currentAllocations?: AllocationSummary[];
}

export interface Project {
    id: string;
    code: string;
    name: string;
    clientName: string;
    owner: string;             // Populated: manager name
    startDate: string;         // ISO date string
    endDate?: string;
    status: ProjectStatus;
    priority: ProjectPriority;
    teamSize?: number;         // Computed: count of active allocations
}

export interface TimeEntry {
    id: string;
    date: string;              // ISO date "YYYY-MM-DD"
    projectId: string;
    projectCode: string;       // Populated
    hours: number;
    comments?: string;
    role?: string;             // Derived from allocation
}

export interface AllocationSummary {
    projectCode: string;
    percentage: number;
}

export interface AllocatedProject {
    code: string;
    name: string;
    role: string;
}

export interface TimeCode {
    code: string;
    name: string;
}
