export type ReportPreviewId =
    | 'resource-view'
    | 'project-view'
    | 'resource-analytics'
    | 'role-summary-hrs'
    | 'role-summary-perc'
    | 'bandwidth'
    | 'overallocated'
    | 'consolidated-history'

export interface ReportSheetCell {
    value: string | number | null
    bg?: string
    fg?: string
    bold?: boolean
    italic?: boolean
    percent?: boolean
}

export interface ReportMonthBand {
    label: string
    colStart: number
    colEnd: number
}

export interface ReportSheetPreview {
    name: string
    monthBands?: ReportMonthBand[]
    headers: string[]
    rows: ReportSheetCell[][]
}

export interface ReportPreviewPayload {
    id: ReportPreviewId
    title: string
    sheets: ReportSheetPreview[]
    weekLabels: string[]
    generatedAt: string
}

export interface AllReportsPreviewResponse {
    weeks: number
    generatedAt: string
    reports: ReportPreviewPayload[]
}
