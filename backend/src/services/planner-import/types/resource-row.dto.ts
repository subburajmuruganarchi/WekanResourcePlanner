export interface ResourceImportRow {
    employeeCode: string;
    name: string;
    jobRole: string;
    resourceType: string;
    availability: string;
    email: string;
    location: string;
    skills: string[];
}

export interface R360AccessImportRow {
    email: string;
    roles: string[];
}
