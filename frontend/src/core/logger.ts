
/**
 * Application Logger Service
 * consistent logging interface with log levels and environment control.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class LoggerService {
    private isDev: boolean;

    constructor() {
        this.isDev = process.env.NODE_ENV !== 'production';
    }

    private formatMessage(level: LogLevel, message: string, data?: unknown): void {
        if (!this.isDev && level === 'debug') return; // Silence debug in prod

        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

        if (data) {
            console[level](prefix, message, data);
        } else {
            console[level](prefix, message);
        }
    }

    public debug(message: string, data?: unknown): void {
        this.formatMessage('debug', message, data);
    }

    public info(message: string, data?: unknown): void {
        this.formatMessage('info', message, data);
    }

    public warn(message: string, data?: unknown): void {
        this.formatMessage('warn', message, data);
    }

    public error(message: string, error?: unknown): void {
        this.formatMessage('error', message, error);
        // TODO: Integrate with Sentry or other error reporting service here
    }
}

export const Logger = new LoggerService();
