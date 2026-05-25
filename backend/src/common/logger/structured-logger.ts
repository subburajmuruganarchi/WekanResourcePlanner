import winston from 'winston';
import { env } from '../../config/env';
import { LogContext, LogSeverity } from './types';

const { combine, timestamp, printf, colorize, json } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}] : ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});

const winstonLogger = winston.createLogger({
    level: env.LOG_LEVEL,
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        env.NODE_ENV === 'production' ? json() : combine(colorize(), logFormat)
    ),
    transports: [new winston.transports.Console()],
});

function toMeta(context?: LogContext): Record<string, unknown> {
    if (!context) return {};
    const { severity, ...rest } = context;
    return { severity, ...rest };
}

function log(level: 'info' | 'warn' | 'error', message: string, context?: LogContext): void {
    const severity: LogSeverity =
        context?.severity ?? (level === 'error' ? 'ERROR' : level === 'warn' ? 'WARN' : 'INFO');
    winstonLogger[level](message, { ...toMeta(context), severity });
}

export const structuredLogger = {
    info: (message: string, context?: LogContext) => log('info', message, { ...context, severity: 'INFO' }),
    warn: (message: string, context?: LogContext) => log('warn', message, { ...context, severity: 'WARN' }),
    error: (message: string, context?: LogContext) => log('error', message, { ...context, severity: 'ERROR' }),
};

/** @deprecated Use structuredLogger — re-exported for existing imports */
export const logger = winstonLogger;
