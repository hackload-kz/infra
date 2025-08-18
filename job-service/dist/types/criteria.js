"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CriteriaStatus = exports.CriteriaType = void 0;
var CriteriaType;
(function (CriteriaType) {
    CriteriaType["CODE_REPO"] = "CODE_REPO";
    CriteriaType["DEPLOYED_SOLUTION"] = "DEPLOYED_SOLUTION";
    CriteriaType["EVENT_SEARCH"] = "EVENT_SEARCH";
    CriteriaType["ARCHIVE_SEARCH"] = "ARCHIVE_SEARCH";
    CriteriaType["AUTH_PERFORMANCE"] = "AUTH_PERFORMANCE";
    CriteriaType["TICKET_BOOKING"] = "TICKET_BOOKING";
    CriteriaType["BUDGET_TRACKING"] = "BUDGET_TRACKING";
})(CriteriaType || (exports.CriteriaType = CriteriaType = {}));
var CriteriaStatus;
(function (CriteriaStatus) {
    CriteriaStatus["PASSED"] = "PASSED";
    CriteriaStatus["FAILED"] = "FAILED";
    CriteriaStatus["NO_DATA"] = "NO_DATA";
})(CriteriaStatus || (exports.CriteriaStatus = CriteriaStatus = {}));
//# sourceMappingURL=criteria.js.map