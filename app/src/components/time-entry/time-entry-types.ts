export interface DailyForecastDay {
    date: string
    dayName: string
    isWeekday: boolean
    totalForecast: number
    byProject: { projectId: string; projectName: string; percentage: number; forecastHours: number }[]
}

export interface DayEntry {
    tempId: string
    serverEntryId?: string
    projectCode: string
    hours: number
    comments: string
    status?: string
    isDirty?: boolean
    isEditing?: boolean
}

export interface DayData {
    day: string
    date: string
    fullDate: string
    isWeekday: boolean
    entries: DayEntry[]
}

export interface ProjectOption {
    code: string
    name: string
    id: string
    isAllocated?: boolean
}

export interface DailyForecastDay {
    date: string
    dayName: string
    isWeekday: boolean
    totalForecast: number
    byProject: { projectId: string; projectName: string; percentage: number; forecastHours: number }[]
}
