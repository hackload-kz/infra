import { AppConfig } from '../types/config';
export declare class ConfigValidationError extends Error {
    constructor(message: string);
}
export declare function validateConfig(config: AppConfig): void;
export declare function getRequiredEnvVar(name: string): string;
export declare function getOptionalEnvVar(name: string, defaultValue?: string): string | undefined;
export declare function getBooleanEnvVar(name: string, defaultValue?: boolean): boolean;
export declare function getNumberEnvVar(name: string, defaultValue?: number): number;
//# sourceMappingURL=validation.d.ts.map