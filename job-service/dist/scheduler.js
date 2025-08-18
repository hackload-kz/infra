"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobScheduler = void 0;
const cron = __importStar(require("node-cron"));
const metrics_1 = require("./lib/metrics");
class JobScheduler {
    services = new Map();
    tasks = new Map();
    serviceConfigs = new Map();
    isRunning = false;
    registerService(service, config) {
        this.services.set(service.serviceName, service);
        this.serviceConfigs.set(service.serviceName, config);
        this.log('info', `Registered service: ${service.serviceName}`);
    }
    async start() {
        if (this.isRunning) {
            this.log('warn', 'Scheduler is already running');
            return;
        }
        this.log('info', 'Starting job scheduler...');
        for (const [serviceName, service] of this.services) {
            const config = this.serviceConfigs.get(serviceName);
            if (!config?.enabled) {
                this.log('info', `Skipping disabled service: ${serviceName}`);
                continue;
            }
            try {
                const task = cron.schedule(config.interval, async () => {
                    await this.executeJob(service, config);
                }, {
                    scheduled: false,
                    name: serviceName
                });
                this.tasks.set(serviceName, task);
                task.start();
                this.log('info', `Scheduled ${serviceName}: ${config.interval}`);
            }
            catch (error) {
                this.log('error', `Failed to schedule ${serviceName}:`, error);
            }
        }
        this.isRunning = true;
        this.log('info', `Job scheduler started with ${this.tasks.size} active services`);
    }
    async stop() {
        if (!this.isRunning) {
            return;
        }
        this.log('info', 'Stopping job scheduler...');
        for (const [serviceName, task] of this.tasks) {
            try {
                task.stop();
                this.log('info', `Stopped scheduler for ${serviceName}`);
            }
            catch (error) {
                this.log('error', `Error stopping scheduler for ${serviceName}:`, error);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.tasks.clear();
        this.isRunning = false;
        this.log('info', 'Job scheduler stopped');
    }
    pause(serviceName) {
        const task = this.tasks.get(serviceName);
        if (!task) {
            this.log('warn', `Service ${serviceName} not found`);
            return;
        }
        task.stop();
        this.log('info', `Paused service: ${serviceName}`);
    }
    resume(serviceName) {
        const task = this.tasks.get(serviceName);
        if (!task) {
            this.log('warn', `Service ${serviceName} not found`);
            return;
        }
        task.start();
        this.log('info', `Resumed service: ${serviceName}`);
    }
    getStatus() {
        const status = [];
        for (const [, service] of this.services) {
            const health = service.getHealth();
            status.push({
                serviceName: health.serviceName,
                status: health.status,
                lastRunTime: health.lastRunTime,
                lastSuccessTime: health.lastSuccessTime,
                errorRate: health.errorRate,
                consecutiveFailures: health.consecutiveFailures
            });
        }
        return status;
    }
    async executeJob(service, config) {
        const startTime = Date.now();
        let attempt = 0;
        const maxRetries = config.retries ?? 3;
        let teamsProcessed = 0;
        while (attempt <= maxRetries) {
            try {
                this.log('info', `Starting job: ${service.serviceName} (attempt ${attempt + 1}/${maxRetries + 1})`);
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Job timeout')), config.timeout);
                });
                await Promise.race([
                    service.run(),
                    timeoutPromise
                ]);
                const duration = Date.now() - startTime;
                metrics_1.metricsCollector.recordJobExecution(service.serviceName, true, duration, teamsProcessed);
                this.log('info', `Completed job: ${service.serviceName} in ${duration}ms`);
                return;
            }
            catch (error) {
                attempt++;
                const duration = Date.now() - startTime;
                if (attempt > maxRetries) {
                    metrics_1.metricsCollector.recordJobExecution(service.serviceName, false, duration, teamsProcessed);
                    this.log('error', `Job failed after ${maxRetries + 1} attempts: ${service.serviceName} (${duration}ms)`, error);
                    return;
                }
                const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
                this.log('warn', `Job failed (attempt ${attempt}/${maxRetries + 1}): ${service.serviceName}, retrying in ${backoffMs}ms`, error);
                await new Promise(resolve => setTimeout(resolve, backoffMs));
            }
        }
    }
    log(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] [JobScheduler] ${message}`;
        switch (level) {
            case 'debug':
                console.debug(logMessage, ...args);
                break;
            case 'info':
                console.info(logMessage, ...args);
                break;
            case 'warn':
                console.warn(logMessage, ...args);
                break;
            case 'error':
                console.error(logMessage, ...args);
                break;
        }
    }
}
exports.JobScheduler = JobScheduler;
//# sourceMappingURL=scheduler.js.map