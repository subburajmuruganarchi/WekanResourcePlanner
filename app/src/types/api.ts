// Frontend API Type Definitions
// Aligned with backend response shapes

export type Role = 'Admin' | 'ProjectManager' | 'Employee' | 'Leadership';

// Enums
export type ProjectStatus = 'Planning' | 'Active' | 'Completed' | 'OnHold';
export type ProjectPriority = 'High' | 'Medium' | 'Low';
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Expert';
export type BillingType = 'Billable' | 'Non-billable';
export type DeliveryModel = 'Fixed' | 'T&M';

// Sub-interfaces
export interface SkillRequirement {
    skillId: string;
    skillName?: string;
    minSkillLevel: SkillLevel;
    requiredHeadcount: number;
    requiredDays: number;
    roleId?: string;
    roleName?: string;
}

export interface RoleEffort {
    roleId: string;
    roleName?: string;
    requiredHeadcount: number;
    requiredDays: number;
    hoursPerDay: number;
}

export interface Employee {
    id: string;
    employeeCode: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    status: 'Active' | 'Inactive';
    role: string;
    roleId: string;
    department?: string;
    designation?: string;
    skills: {
        skillId: string;
        name?: string;
        skillType: 'Primary' | 'Secondary';
        level: SkillLevel;
        experienceYears: number;
    }[];
    availability: number;
    maxAllocationPercent: number;
    joiningDate?: string;
    exitDate?: string;
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
