import { BaseJobService } from './services/base-service';
import { JobStatus, JobSchedulerInterface } from './types/services';
import { ServiceConfig } from './types/config';
export declare class JobScheduler implements JobSchedulerInterface {
    private services;
    private tasks;
    private serviceConfigs;
    private isRunning;
    registerService(service: BaseJobService, config: ServiceConfig): void;
    start(): Promise<void>;
    stop(): Promise<void>;
    pause(serviceName: string): void;
    resume(serviceName: string): void;
    getStatus(): JobStatus[];
    private executeJob;
    private log;
}
//# sourceMappingURL=scheduler.d.ts.map