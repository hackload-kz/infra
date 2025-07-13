-- Populate historical journal data for existing participants and teams

-- Insert PARTICIPANT_CREATED entries for all existing participants
INSERT INTO "journal_entries" (
    "id",
    "eventType", 
    "title",
    "description",
    "entityId",
    "entityType",
    "isRead",
    "participantId",
    "hackathonId",
    "createdAt",
    "updatedAt"
)
SELECT 

    CONCAT('participant_created_', p.id) as id,
    'PARTICIPANT_CREATED'::"JournalEventType" as "eventType",
    'Добро пожаловать в хакатон!' as title,
    'Ваш профиль участника был создан.' as description,
    p.id as "entityId",
    'participant' as "entityType",
    true as "isRead", -- Mark as read since these are historical
    p.id as "participantId",
    hp."hackathonId" as "hackathonId",
    p."createdAt" as "createdAt",
    p."createdAt" as "updatedAt"
FROM participants p
JOIN hackathon_participations hp ON hp."participantId" = p.id
WHERE hp."isActive" = true;

-- Insert TEAM_CREATED entries for team leaders based on team creation time
INSERT INTO "journal_entries" (
    "id",
    "eventType",
    "title", 
    "description",
    "entityId",
    "entityType",
    "isRead",
    "participantId",
    "hackathonId",
    "createdAt",
    "updatedAt"
)
SELECT 
    CONCAT('team_created_', t.id) as id,
    'TEAM_CREATED'::"JournalEventType" as "eventType",
    'Команда создана' as title,
    CONCAT('Вы создали команду "', t.name, '"') as description,
    t.id as "entityId",
    'team' as "entityType",
    true as "isRead", -- Mark as read since these are historical
    t."leaderId" as "participantId",
    t."hackathonId" as "hackathonId",
    t."createdAt" as "createdAt",
    t."createdAt" as "updatedAt"
FROM teams t
WHERE t."leaderId" IS NOT NULL;

-- Insert JOINED_TEAM entries for team members (excluding leaders who already have TEAM_CREATED)
-- Since we don't have join timestamps, use current time as a fact
INSERT INTO "journal_entries" (
    "id",
    "eventType",
    "title",
    "description", 
    "entityId",
    "entityType",
    "isRead",
    "participantId",
    "hackathonId",
    "createdAt",
    "updatedAt"
)
SELECT 
    CONCAT('joined_team_', p.id, '_', p."teamId") as id,
    'JOINED_TEAM'::"JournalEventType" as "eventType",
    'Вступление в команду' as title,
    CONCAT('Вы вступили в команду "', t.name, '"') as description,
    t.id as "entityId",
    'team' as "entityType",
    true as "isRead", -- Mark as read since these are historical
    p.id as "participantId",
    t."hackathonId" as "hackathonId",
    CURRENT_TIMESTAMP as "createdAt", -- Use current time since we don't have join timestamps
    CURRENT_TIMESTAMP as "updatedAt"
FROM participants p
JOIN teams t ON t.id = p."teamId"
WHERE p."teamId" IS NOT NULL 
  AND p."teamId" != p."ledTeamId" -- Exclude team leaders (they already have TEAM_CREATED entry)
  AND p."ledTeamId" IS NULL;

-- Handle the case where we have timestamp information from join_requests that were approved
-- Insert JOINED_TEAM entries based on approved join requests with their actual timestamps
INSERT INTO "journal_entries" (
    "id",
    "eventType",
    "title",
    "description",
    "entityId", 
    "entityType",
    "isRead",
    "participantId",
    "hackathonId",
    "createdAt",
    "updatedAt"
)
SELECT DISTINCT
    CONCAT('joined_team_from_request_', jr."participantId", '_', jr."teamId") as id,
    'JOINED_TEAM'::"JournalEventType" as "eventType",
    'Вступление в команду' as title,
    CONCAT('Вы вступили в команду "', t.name, '"') as description,
    t.id as "entityId",
    'team' as "entityType",
    true as "isRead", -- Mark as read since these are historical
    jr."participantId" as "participantId",
    jr."hackathonId" as "hackathonId",
    jr."updatedAt" as "createdAt", -- Use the time when request was updated (approved)
    jr."updatedAt" as "updatedAt"
FROM join_requests jr
JOIN teams t ON t.id = jr."teamId"
JOIN participants p ON p.id = jr."participantId"
WHERE jr.status = 'APPROVED'
  AND p."teamId" = jr."teamId" -- Confirm they are actually in the team
  AND p."ledTeamId" IS NULL -- Exclude team leaders
  -- Avoid duplicates with previous insert
  AND NOT EXISTS (
    SELECT 1 FROM "journal_entries" je 
    WHERE je."participantId" = jr."participantId" 
      AND je."entityId" = jr."teamId" 
      AND je."eventType" = 'JOINED_TEAM'
  );

-- Insert JOIN_REQUEST_CREATED entries for existing join requests
INSERT INTO "journal_entries" (
    "id",
    "eventType",
    "title",
    "description",
    "entityId",
    "entityType", 
    "isRead",
    "participantId",
    "hackathonId",
    "createdAt",
    "updatedAt"
)
SELECT 
    CONCAT('join_request_created_', jr.id) as id,
    'JOIN_REQUEST_CREATED'::"JournalEventType" as "eventType",
    'Заявка на вступление отправлена' as title,
    CONCAT('Вы отправили заявку на вступление в команду "', t.name, '"') as description,
    jr.id as "entityId",
    'join_request' as "entityType",
    true as "isRead", -- Mark as read since these are historical
    jr."participantId" as "participantId",
    jr."hackathonId" as "hackathonId",
    jr."createdAt" as "createdAt",
    jr."createdAt" as "updatedAt"
FROM join_requests jr
JOIN teams t ON t.id = jr."teamId";

-- Insert JOIN_REQUEST_APPROVED entries for approved join requests
INSERT INTO "journal_entries" (
    "id", 
    "eventType",
    "title",
    "description",
    "entityId",
    "entityType",
    "isRead",
    "participantId", 
    "hackathonId",
    "createdAt",
    "updatedAt"
)
SELECT 
    CONCAT('join_request_approved_', jr.id) as id,
    'JOIN_REQUEST_APPROVED'::"JournalEventType" as "eventType",
    'Заявка на вступление одобрена' as title,
    CONCAT('Ваша заявка на вступление в команду "', t.name, '" была одобрена') as description,
    jr.id as "entityId",
    'join_request' as "entityType",
    true as "isRead", -- Mark as read since these are historical
    jr."participantId" as "participantId",
    jr."hackathonId" as "hackathonId",
    jr."updatedAt" as "createdAt",
    jr."updatedAt" as "updatedAt"
FROM join_requests jr
JOIN teams t ON t.id = jr."teamId"
WHERE jr.status = 'APPROVED';

-- Insert JOIN_REQUEST_REJECTED entries for declined join requests  
INSERT INTO "journal_entries" (
    "id",
    "eventType", 
    "title",
    "description",
    "entityId",
    "entityType",
    "isRead",
    "participantId",
    "hackathonId", 
    "createdAt",
    "updatedAt"
)
SELECT 
    CONCAT('join_request_rejected_', jr.id) as id,
    'JOIN_REQUEST_REJECTED'::"JournalEventType" as "eventType",
    'Заявка на вступление отклонена' as title,
    CONCAT('Ваша заявка на вступление в команду "', t.name, '" была отклонена') as description,
    jr.id as "entityId",
    'join_request' as "entityType",
    true as "isRead", -- Mark as read since these are historical
    jr."participantId" as "participantId",
    jr."hackathonId" as "hackathonId",
    jr."updatedAt" as "createdAt",
    jr."updatedAt" as "updatedAt"
FROM join_requests jr
JOIN teams t ON t.id = jr."teamId"
WHERE jr.status = 'DECLINED';