"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.ConsoleLogger = void 0;
exports.setLogger = setLogger;
exports.createLogger = createLogger;
class ConsoleLogger {
    logLevel;
    serviceName;
    constructor(logLevel = 'info', serviceName = 'JobService') {
        this.logLevel = logLevel;
        this.serviceName = serviceName;
    }
    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.debug(this.formatMessage('DEBUG', message), ...args);
        }
    }
    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.info(this.formatMessage('INFO', message), ...args);
        }
    }
    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('WARN', message), ...args);
        }
    }
    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('ERROR', message), ...args);
        }
    }
    shouldLog(level) {
        const levels = ['error', 'warn', 'info', 'debug'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex <= currentLevelIndex;
    }
    formatMessage(level, message) {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level}] [${this.serviceName}] ${message}`;
    }
}
exports.ConsoleLogger = ConsoleLogger;
exports.logger = new ConsoleLogger();
function setLogger(newLogger) {
    exports.logger = newLogger;
}
function createLogger(logLevel, serviceName) {
    return new ConsoleLogger(logLevel, serviceName);
}
//# sourceMappingURL=logger.js.map