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
    PROPOSAL = 'Proposal',
    /** @deprecated Use PROPOSAL — kept for legacy Mongo values */
    PLANNING = 'Planning',
    ACTIVE = 'Active',
    COMPLETED = 'Completed',
    PROPOSAL_LOST = 'ProposalLost',
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
    QA_LEAD = 'QA Lead',
    DBA = 'DBA',
    HR_MANAGER = 'HR Manager',
    HR_EXECUTIVE = 'HR Executive',
    PRODUCT_MANAGER = 'Product Manager',
    PRODUCT_OWNER = 'Product Owner',
    UX_DESIGNER = 'UX Designer',
    UI_DESIGNER = 'UI Designer',
    DEVOPS_ENGINEER = 'DevOps Engineer',
    SITE_RELIABILITY_ENGINEER = 'Site Reliability Engineer',
    DATA_ANALYST = 'Data Analyst',
    DATA_ENGINEER = 'Data Engineer',
    SALES_EXECUTIVE = 'Sales Executive',
    ACCOUNT_MANAGER = 'Account Manager',
    MARKETING_MANAGER = 'Marketing Manager',
    MARKETING_SPECIALIST = 'Marketing Specialist',
    CUSTOMER_SUPPORT_SPECIALIST = 'Customer Support Specialist',
    SUPPORT_LEAD = 'Support Lead',
    FINANCE_ANALYST = 'Finance Analyst',
    ACCOUNTANT = 'Accountant',
    OPERATIONS_MANAGER = 'Operations Manager',
    OPERATIONS_COORDINATOR = 'Operations Coordinator',
    OFFICE_ADMINISTRATOR = 'Office Administrator',
    EXECUTIVE_ASSISTANT = 'Executive Assistant',
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

/** How a weekly_allocation_entries row was created or last influenced. */
export enum WeeklyAllocationSource {
    PLANNED = 'Planned',
    ACTUAL = 'Actual',
    FORECAST = 'Forecast',
    LEGACY_SYNC = 'LegacySync',
    MANUAL = 'Manual',
}

/** Lifecycle of a weekly planning cell. */
export enum WeeklyAllocationStatus {
    DRAFT = 'Draft',
    PUBLISHED = 'Published',
    LOCKED = 'Locked',
    ARCHIVED = 'Archived',
}

export enum WeeklyUtilizationSnapshotType {
    PLANNED = 'Planned',
    ACTUAL = 'Actual',
    VARIANCE = 'Variance',
    FORECAST = 'Forecast',
}

