// Frontend API Type Definitions
// Aligned with resource-360 database structure (snake_case in DB, camelCase in API response)

export type RoleType = 'Admin' | 'ProjectManager' | 'Employee' | 'Leadership';

export type EmployeeStatus = 'Active' | 'Inactive' | 'On Probation' | 'On Notice Period' | 'Terminated';

export type EmployeeRole =
    | 'Architect'
    | 'Mobile Architect'
    | 'Associate Architect'
    | 'SDE III (Full Stack)'
    | 'SDE (Full Stack)'
    | 'SDE II (Full Stack)'
    | 'SDE (Backend)'
    | 'SDE II (Backend)'
    | 'SDE II (Frontend)'
    | 'SDE III (Mobile)'
    | 'SDE II (Mobile)'
    | 'QA Engineer'
    | 'DBA';

export type EmployeeDepartment =
    | 'Engineering'
    | 'Human Resources'
    | 'Product Management'
    | 'Quality Assurance'
    | 'Design'
    | 'DevOps / Infrastructure'
    | 'Data & Analytics'
    | 'Sales'
    | 'Marketing'
    | 'Customer Support'
    | 'Finance'
    | 'Operations'
    | 'Administration';

export type ProjectStatus = 'Planning' | 'Active' | 'Completed' | 'OnHold';
export type ProjectPriority = 'High' | 'Medium' | 'Low';
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Expert';
export type BillingType = 'Billable' | 'Non-billable';
export type DeliveryModel = 'Fixed' | 'T&M';
export type StaffingStrategy = 'BestFit' | 'FastFill' | 'CostAware';

// Sub-interfaces
export interface SkillRequirement {
    skillId: string;
    skillName?: string;
    minSkillLevel?: SkillLevel;
    originalHeadcount: number;
    remainingHeadcount?: number;
    fulfilledPercent?: number;
    requiredDays?: number;
    startDate: string;
    endDate: string;
    roleId?: string;
    roleName?: string;
}

export interface RoleEffort {
    roleId: string;
    roleName?: string;
    originalHeadcount: number;
    remainingHeadcount?: number;
    fulfilledPercent?: number;
    requiredDays?: number;
    startDate: string;
    endDate: string;
    hoursPerDay: number;
}

export interface EmployeeSkill {
    name: string;
    skillLevel: string;
    yearsOfExperience: number;
    isPrimary: boolean;
}

export interface Employee {
    id: string;
    employeeCode?: string;
    name: string;
    email: string;
    status: EmployeeStatus;
    role?: EmployeeRole;
    roleId?: string;
    department?: EmployeeDepartment;
    position?: string;
    skills: EmployeeSkill[];
    availability: number;
    maxAllocationPercent: number;
    profileImage?: string;
    joinDate?: string;
}

export interface Project {
    id: string;
    code: string;
    name: string;
    owner: string;
    ownerId?: string;
    managerId: string;
    managerName: string;
    startDate: string;
    endDate?: string;
    status: ProjectStatus;
    priority: ProjectPriority;
    billingType?: string;
    deliveryModel?: string;
    projectLogo?: string;
    clientName?: string;
    projectedTotalHours?: number;
    businessGoal?: string;
    staffingStrategy?: StaffingStrategy;
    teamSize?: number;
    skillRequirements?: SkillRequirement[];
    roleEfforts?: RoleEffort[];
}

export interface TimeEntry {
    id: string;
    date: string;
    projectId: string;
    projectCode: string;
    hours: number;
    comments?: string;
    role?: string;
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

export interface CreateProjectRequest {
    name: string;
    code: string;
    ownerId: string;
    managerId: string;
    startDate: string;
    endDate?: string;
    status: ProjectStatus;
    priority: ProjectPriority;
    billingType?: string;
    deliveryModel?: string;
    businessGoal?: string;
    staffingStrategy?: StaffingStrategy;
    skillRequirements: SkillRequirement[];
    roleEfforts: RoleEffort[];
}

export interface CreateEmployeeRequest {
    firstName: string;
    lastName: string;
    email: string;
    employeeCode: string;
    status: EmployeeStatus;
    roleId: string;
    department?: EmployeeDepartment;
    designation?: EmployeeRole;
    maxAllocationPercent: number;
    joiningDate?: string;
    skills: {
        skillId: string;
        skillType: 'Primary' | 'Secondary';
        level: SkillLevel;
        experienceYears: number;
    }[];
}
