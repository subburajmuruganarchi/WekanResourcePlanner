export type LogSeverity = 'INFO' | 'WARN' | 'ERROR';

export interface LogContext {
    requestId?: string;
    userId?: string;
    route?: string;
    role?: string;
    severity?: LogSeverity;
    module?: string;
    [key: string]: unknown;
}
