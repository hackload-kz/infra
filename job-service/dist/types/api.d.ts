import { CriteriaType, CriteriaStatus, CriteriaUpdate } from './criteria';
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface TeamResponse {
    id: string;
    nickname: string;
    hackathonId: string;
    name: string;
    status?: string;
    level?: string;
}
export interface TeamsListResponse extends ApiResponse<{
    teams: TeamResponse[];
    count: number;
    status: string;
}> {
}
export interface CriteriaResponse {
    id: string;
    teamId: string;
    hackathonId: string;
    criteriaType: CriteriaType;
    status: CriteriaStatus;
    score?: number;
    metrics?: Record<string, unknown>;
    updatedBy?: string;
    updatedAt: string;
    createdAt: string;
}
export interface CriteriaListResponse extends ApiResponse<CriteriaResponse[]> {
}
export interface BulkCriteriaUpdateRequest {
    updates: CriteriaUpdate[];
}
export interface BulkCriteriaUpdateResponse extends ApiResponse<{
    processed: number;
    failed: number;
    errors?: string[];
}> {
}
export interface SingleCriteriaUpdateRequest {
    status: CriteriaStatus;
    score?: number;
    metrics?: Record<string, unknown>;
    updatedBy: string;
}
export interface SingleCriteriaUpdateResponse extends ApiResponse<CriteriaResponse> {
}
export interface TeamEnvironmentData {
    id: string;
    teamId: string;
    hackathonId: string;
    key: string;
    value: string;
    isEditable: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface TeamEnvironmentResponse extends ApiResponse<TeamEnvironmentData[]> {
}
export interface ApiClientConfig {
    baseUrl: string;
    apiKey: string;
    timeout: number;
    retries: number;
}
export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
}
export interface HttpError extends Error {
    status: number;
    statusText: string;
    url: string;
    response?: unknown;
}
//# sourceMappingURL=api.d.ts.map