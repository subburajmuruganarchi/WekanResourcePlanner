export enum SkillType {
    PRIMARY = 'Primary',
    SECONDARY = 'Secondary',
}

export enum SkillLevel {
    BEGINNER = 'Beginner',
    INTERMEDIATE = 'Intermediate',
    EXPERT = 'Expert',
}

export enum ProjectStatus {
    PLANNING = 'Planning',
    ACTIVE = 'Active',
    COMPLETED = 'Completed',
    ON_HOLD = 'OnHold',
}

export enum ProjectPriority {
    HIGH = 'High',
    MEDIUM = 'Medium',
    LOW = 'Low',
}

export enum AllocationType {
    PERCENTAGE = 'Percentage',
}

export enum TimeEntryStatus {
    DRAFT = 'Draft',
    SUBMITTED = 'Submitted',
    PM_APPROVED = 'PM_Approved',
    PM_REJECTED = 'PM_Rejected',
}

export enum EmployeeStatus {
    ACTIVE = 'Active',
    INACTIVE = 'Inactive',
    ON_PROBATION = 'On Probation',
    ON_NOTICE_PERIOD = 'On Notice Period',
    TERMINATED = 'Terminated',
}

export enum EmployeeRole {
    ARCHITECT = 'Architect',
    MOBILE_ARCHITECT = 'Mobile Architect',
    ASSOCIATE_ARCHITECT = 'Associate Architect',
    SDE_III_FULL_STACK = 'SDE III (Full Stack)',
    SDE_FULL_STACK = 'SDE (Full Stack)',
    SDE_II_FULL_STACK = 'SDE II (Full Stack)',
    SDE_BACKEND = 'SDE (Backend)',
    SDE_II_BACKEND = 'SDE II (Backend)',
    SDE_II_FRONTEND = 'SDE II (Frontend)',
    SDE_III_MOBILE = 'SDE III (Mobile)',
    SDE_II_MOBILE = 'SDE II (Mobile)',
    QA_ENGINEER = 'QA Engineer',
    DBA = 'DBA',
}

export enum EmployeeDepartment {
    ENGINEERING = 'Engineering',
    HUMAN_RESOURCES = 'Human Resources',
    PRODUCT_MANAGEMENT = 'Product Management',
    QUALITY_ASSURANCE = 'Quality Assurance',
    DESIGN = 'Design',
    DEVOPS_INFRASTRUCTURE = 'DevOps / Infrastructure',
    DATA_ANALYTICS = 'Data & Analytics',
    SALES = 'Sales',
    MARKETING = 'Marketing',
    CUSTOMER_SUPPORT = 'Customer Support',
    FINANCE = 'Finance',
    OPERATIONS = 'Operations',
    ADMINISTRATION = 'Administration',
}

export enum BillingType {
    BILLABLE = 'Billable',
    NON_BILLABLE = 'Non-billable',
}

export enum DeliveryModel {
    FIXED = 'Fixed',
    TIME_AND_MATERIALS = 'T&M',
}

// MCP Explainability Enums
export enum StaffingStrategy {
    BEST_FIT = 'BestFit',
    FAST_FILL = 'FastFill',
    COST_AWARE = 'CostAware',
}

export enum CreatedByRole {
    SYSTEM = 'System',
    MANAGER = 'Manager',
    ADMIN = 'Admin',
}

