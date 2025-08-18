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
exports.HealthServer = void 0;
const http = __importStar(require("http"));
const metrics_1 = require("../lib/metrics");
const logger_1 = require("../lib/logger");
class HealthServer {
    healthServer;
    metricsServer;
    scheduler;
    config;
    constructor(config) {
        this.config = config;
    }
    setScheduler(scheduler) {
        this.scheduler = scheduler;
    }
    async start() {
        await Promise.all([
            this.startHealthServer(),
            this.startMetricsServer()
        ]);
        logger_1.logger.info(`Health server started on port ${this.config.healthPort}`);
        logger_1.logger.info(`Metrics server started on port ${this.config.metricsPort}`);
    }
    async stop() {
        const promises = [];
        if (this.healthServer) {
            promises.push(new Promise((resolve) => {
                this.healthServer?.close(() => resolve());
            }));
        }
        if (this.metricsServer) {
            promises.push(new Promise((resolve) => {
                this.metricsServer?.close(() => resolve());
            }));
        }
        await Promise.all(promises);
        logger_1.logger.info('Health and metrics servers stopped');
    }
    async startHealthServer() {
        return new Promise((resolve, reject) => {
            this.healthServer = http.createServer(async (req, res) => {
                try {
                    await this.handleHealthRequest(req, res);
                }
                catch (error) {
                    logger_1.logger.error('Error handling health request:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
            this.healthServer.listen(this.config.healthPort, () => {
                resolve();
            });
            this.healthServer.on('error', (error) => {
                reject(error);
            });
        });
    }
    async startMetricsServer() {
        return new Promise((resolve, reject) => {
            this.metricsServer = http.createServer(async (req, res) => {
                try {
                    await this.handleMetricsRequest(req, res);
                }
                catch (error) {
                    logger_1.logger.error('Error handling metrics request:', error);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('# Error generating metrics\n');
                }
            });
            this.metricsServer.listen(this.config.metricsPort, () => {
                resolve();
            });
            this.metricsServer.on('error', (error) => {
                reject(error);
            });
        });
    }
    async handleHealthRequest(req, res) {
        if (req.method !== 'GET') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
        }
        const url = req.url || '';
        if (url === '/health' || url === '/') {
            const health = this.getHealthStatus();
            const statusCode = health.status === 'healthy' ? 200 :
                health.status === 'degraded' ? 200 : 503;
            res.writeHead(statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(health, null, 2));
            return;
        }
        if (url === '/health/ready') {
            const health = this.getHealthStatus();
            const isReady = health.status !== 'unhealthy';
            const statusCode = isReady ? 200 : 503;
            res.writeHead(statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                ready: isReady,
                status: health.status,
                timestamp: health.timestamp
            }));
            return;
        }
        if (url === '/health/live') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                alive: true,
                timestamp: new Date().toISOString()
            }));
            return;
        }
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
    async handleMetricsRequest(req, res) {
        if (req.method !== 'GET') {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method not allowed\n');
            return;
        }
        const url = req.url || '';
        if (url === '/metrics' || url === '/') {
            const prometheusMetrics = metrics_1.metricsCollector.getPrometheusMetrics();
            res.writeHead(200, {
                'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
            });
            res.end(prometheusMetrics);
            return;
        }
        if (url === '/metrics/json') {
            const metrics = metrics_1.metricsCollector.getMetrics();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(metrics, null, 2));
            return;
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found\n');
    }
    getHealthStatus() {
        const services = this.scheduler?.getStatus() || [];
        const timestamp = new Date().toISOString();
        services.forEach(service => {
            metrics_1.metricsCollector.updateServiceHealth(service.serviceName, service);
        });
        metrics_1.metricsCollector.updateSystemMetrics(services.length);
        const summary = {
            totalServices: services.length,
            healthyServices: services.filter(s => s.status === 'healthy').length,
            degradedServices: services.filter(s => s.status === 'degraded').length,
            unhealthyServices: services.filter(s => s.status === 'unhealthy').length
        };
        let overallStatus = 'healthy';
        if (summary.unhealthyServices > 0) {
            overallStatus = 'unhealthy';
        }
        else if (summary.degradedServices > 0) {
            overallStatus = 'degraded';
        }
        if (summary.totalServices === 0) {
            overallStatus = 'unhealthy';
        }
        const systemMetrics = metrics_1.metricsCollector.getMetrics().systemMetrics;
        return {
            status: overallStatus,
            timestamp,
            uptime: systemMetrics.uptime,
            services: services.map(service => ({
                name: service.serviceName,
                status: service.status,
                lastRunTime: service.lastRunTime?.toISOString(),
                lastSuccessTime: service.lastSuccessTime?.toISOString(),
                errorRate: service.errorRate,
                consecutiveFailures: service.consecutiveFailures
            })),
            summary
        };
    }
}
exports.HealthServer = HealthServer;
//# sourceMappingURL=server.js.map