import { ApiClientConfig, CriteriaListResponse, BulkCriteriaUpdateResponse, SingleCriteriaUpdateRequest, SingleCriteriaUpdateResponse } from '../types/api';
import { CriteriaType, CriteriaUpdate, Team } from '../types/criteria';
export declare class HubApiClient {
    private readonly config;
    constructor(config: ApiClientConfig);
    getTeams(): Promise<Team[]>;
    getCriteria(params?: {
        teamSlug?: string;
        criteriaType?: CriteriaType;
    }): Promise<CriteriaListResponse>;
    updateIndividualCriteria(update: CriteriaUpdate): Promise<any>;
    bulkUpdateCriteria(updates: CriteriaUpdate[]): Promise<BulkCriteriaUpdateResponse>;
    updateSingleCriteria(teamSlug: string, criteriaType: CriteriaType, update: SingleCriteriaUpdateRequest): Promise<SingleCriteriaUpdateResponse>;
    getTeamEnvironmentData(): Promise<Record<string, string>>;
    getTeamEnvironmentDataByNickname(teamNickname: string): Promise<Record<string, string>>;
    private request;
    private fetchWithTimeout;
    private createHttpError;
    private isRetryableError;
    private log;
}
//# sourceMappingURL=api-client.d.ts.map