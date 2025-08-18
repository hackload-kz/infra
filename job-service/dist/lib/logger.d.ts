export interface Logger {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export declare class ConsoleLogger implements Logger {
    private logLevel;
    private serviceName;
    constructor(logLevel?: LogLevel, serviceName?: string);
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    private shouldLog;
    private formatMessage;
}
export declare let logger: Logger;
export declare function setLogger(newLogger: Logger): void;
export declare function createLogger(logLevel: LogLevel, serviceName: string): Logger;
//# sourceMappingURL=logger.d.ts.map