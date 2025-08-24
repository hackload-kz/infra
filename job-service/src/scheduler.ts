import * as cron from 'node-cron';
import { BaseJobService } from './services/base-service';
import { JobStatus, JobSchedulerInterface } from './types/services';
import { ServiceConfig } from './types/config';
import { metricsCollector } from './lib/metrics';

export class JobScheduler implements JobSchedulerInterface {
  private services: Map<string, BaseJobService> = new Map();
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private serviceConfigs: Map<string, ServiceConfig> = new Map();
  private isRunning: boolean = false;
  
  registerService(service: BaseJobService, config: ServiceConfig): void {
    this.services.set(service.serviceName, service);
    this.serviceConfigs.set(service.serviceName, config);
    this.log('info', `Registered service: ${service.serviceName}`);
  }
  
  async start(): Promise<void> {
    if (this.isRunning) {
      this.log('warn', 'Scheduler is already running');
      return;
    }
    
    this.log('info', 'Starting job scheduler...');
    
    // Collect K6 services for staggered execution in a predictable order
    const k6ServiceOrder = [
      'K6LoadTestingService',
      'K6ArchiveTestingService', 
      'K6AuthorizationTestingService',
      'K6BookingTestingService'
    ];
    
    const k6Services: Array<{name: string, service: BaseJobService, config: ServiceConfig}> = [];
    const otherServices: Array<{name: string, service: BaseJobService, config: ServiceConfig}> = [];
    
    // First, collect K6 services in the specified order
    for (const serviceName of k6ServiceOrder) {
      const service = this.services.get(serviceName);
      const config = this.serviceConfigs.get(serviceName);
      
      if (service && config?.enabled) {
        k6Services.push({name: serviceName, service, config});
      } else if (service && !config?.enabled) {
        this.log('info', `Skipping disabled K6 service: ${serviceName}`);
      }
    }
    
    // Then collect other services
    for (const [serviceName, service] of this.services) {
      const config = this.serviceConfigs.get(serviceName);
      if (!config?.enabled) {
        this.log('info', `Skipping disabled service: ${serviceName}`);
        continue;
      }
      
      if (!serviceName.startsWith('K6')) {
        otherServices.push({name: serviceName, service, config});
      }
    }
    
    // Schedule non-K6 services normally
    for (const {name, service, config} of otherServices) {
      try {
        const task = cron.schedule(config.interval, async () => {
          await this.executeJob(service, config);
        }, { 
          scheduled: false,
          name: name 
        });
        
        this.tasks.set(name, task);
        task.start();
        
        this.log('info', `Scheduled ${name}: ${config.interval}`);
      } catch (error) {
        this.log('error', `Failed to schedule ${name}:`, error);
      }
    }
    
    // Schedule K6 services with staggered cron schedules (1 minute apart)
    k6Services.forEach((serviceData, index) => {
      const {name, service, config} = serviceData;
      const delayMinutes = index; // 0, 1, 2, 3 minutes delay
      
      try {
        // Create a staggered cron schedule by modifying the original interval
        const staggeredInterval = this.createStaggeredCronSchedule(config.interval, delayMinutes);
        
        const task = cron.schedule(staggeredInterval, async () => {
          await this.executeJob(service, config);
        }, { 
          scheduled: false,
          name: name 
        });
        
        this.tasks.set(name, task);
        task.start();
        
        this.log('info', `Scheduled ${name}: ${staggeredInterval} (offset by ${delayMinutes} minute(s) from base schedule)`);
      } catch (error) {
        this.log('error', `Failed to schedule ${name}:`, error);
      }
    });
    
    this.isRunning = true;
    this.log('info', `Job scheduler started with ${this.tasks.size} active services (${k6Services.length} K6 services with staggered execution)`);
  }
  
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    this.log('info', 'Stopping job scheduler...');
    
    // Stop all scheduled tasks
    for (const [serviceName, task] of this.tasks) {
      try {
        task.stop();
        this.log('info', `Stopped scheduler for ${serviceName}`);
      } catch (error) {
        this.log('error', `Error stopping scheduler for ${serviceName}:`, error);
      }
    }
    
    // Wait a moment for any running jobs to finish
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.tasks.clear();
    this.isRunning = false;
    this.log('info', 'Job scheduler stopped');
  }
  
  pause(serviceName: string): void {
    const task = this.tasks.get(serviceName);
    if (!task) {
      this.log('warn', `Service ${serviceName} not found`);
      return;
    }
    
    task.stop();
    this.log('info', `Paused service: ${serviceName}`);
  }
  
  resume(serviceName: string): void {
    const task = this.tasks.get(serviceName);
    if (!task) {
      this.log('warn', `Service ${serviceName} not found`);
      return;
    }
    
    task.start();
    this.log('info', `Resumed service: ${serviceName}`);
  }
  
  getStatus(): JobStatus[] {
    const status: JobStatus[] = [];
    
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
  
  private async executeJob(service: BaseJobService, config: ServiceConfig): Promise<void> {
    const startTime = Date.now();
    let attempt = 0;
    const maxRetries = config.retries ?? 3;
    let teamsProcessed = 0;
    while (attempt <= maxRetries) {
      try {
        this.log('info', `Starting job: ${service.serviceName} (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        // Set up timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Job timeout')), config.timeout);
        });
        
        await Promise.race([
          service.run(),
          timeoutPromise
        ]);
        
        const duration = Date.now() - startTime;
        
        // Record successful execution
        metricsCollector.recordJobExecution(service.serviceName, true, duration, teamsProcessed);
        
        this.log('info', `Completed job: ${service.serviceName} in ${duration}ms`);
        return; // Success - exit retry loop
        
      } catch (error) {
        attempt++;
        const duration = Date.now() - startTime;
        
        if (attempt > maxRetries) {
          // Record failed execution
          metricsCollector.recordJobExecution(service.serviceName, false, duration, teamsProcessed);
          
          this.log('error', `Job failed after ${maxRetries + 1} attempts: ${service.serviceName} (${duration}ms)`, error);
          return;
        }
        
        // Exponential backoff for retries
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        this.log('warn', `Job failed (attempt ${attempt}/${maxRetries + 1}): ${service.serviceName}, retrying in ${backoffMs}ms`, error);
        
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }
  
  /**
   * Create a staggered cron schedule by adding minutes to the base schedule
   */
  private createStaggeredCronSchedule(baseInterval: string, offsetMinutes: number): string {
    // Parse common cron formats and add offset
    // Most common format: "*/5 * * * *" (every 5 minutes)
    // We need to convert this to specific times with offset
    
    if (baseInterval.startsWith('*/')) {
      // Handle "*/X * * * *" format - every X minutes
      const firstPart = baseInterval.split(' ')[0];
      if (!firstPart) {
        this.log('warn', `Invalid cron schedule format: ${baseInterval}`);
        return baseInterval;
      }
      const minuteInterval = parseInt(firstPart.substring(2));
      
      if (offsetMinutes === 0) {
        return baseInterval; // No offset for first service
      }
      
      // Create a schedule that runs every X minutes starting at offsetMinutes
      // e.g., if base is "*/10 * * * *" and offset is 2, return "2,12,22,32,42,52 * * * *"
      const minutes = [];
      for (let minute = offsetMinutes; minute < 60; minute += minuteInterval) {
        minutes.push(minute.toString());
      }
      
      return `${minutes.join(',')} * * * *`;
    }
    
    // For other cron formats, try to parse and modify the minute field
    const cronParts = baseInterval.split(' ');
    if (cronParts.length >= 5) {
      const minutePart = cronParts[0];
      
      if (!minutePart) {
        this.log('warn', `Invalid cron schedule format: ${baseInterval}`);
        return baseInterval;
      }
      
      if (minutePart === '*') {
        // If it's "* * * * *" (every minute), change to specific minute with offset
        cronParts[0] = offsetMinutes.toString();
      } else if (minutePart.includes(',')) {
        // If it's comma-separated minutes, add offset to each
        const minutes = minutePart.split(',').map(m => {
          const num = parseInt(m);
          return ((num + offsetMinutes) % 60).toString();
        });
        cronParts[0] = minutes.join(',');
      } else if (!isNaN(parseInt(minutePart))) {
        // If it's a single number, add offset
        const originalMinute = parseInt(minutePart);
        cronParts[0] = ((originalMinute + offsetMinutes) % 60).toString();
      }
      
      return cronParts.join(' ');
    }
    
    // Fallback - return original schedule (shouldn't happen with valid cron)
    this.log('warn', `Could not parse cron schedule for staggering: ${baseInterval}, using original`);
    return baseInterval;
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: unknown[]): void {
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