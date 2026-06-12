export interface ProjectImportRow {
    pid: string;
    name: string;
    type: string;
    statusRaw: string;
    confirmedStart: Date | null;
    estimatedStart: Date | null;
    durationWeeks: number;
    architect: string;
    beRequired: number;
    mobileRequired: number;
    feRequired: number;
    qaRequired: number;
    tech: string;
}
