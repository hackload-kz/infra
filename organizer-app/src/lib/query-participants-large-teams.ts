import { db } from '@/lib/db';

/**
 * Query to get all participants from teams with 3+ members
 * Returns participants with their names, locations, metadata, and team information
 */
export async function getParticipantsFromLargeTeams(hackathonId: string) {
  // Get all teams with their members count
  const allTeams = await db.team.findMany({
    where: {
      hackathonId: hackathonId,
    },
    select: {
      id: true,
      _count: {
        select: {
          members: {
            where: {
              hackathonParticipations: {
                some: {
                  hackathonId: hackathonId,
                  isActive: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Filter teams with 3+ members
  const teamIds = allTeams
    .filter(team => team._count.members >= 3)
    .map(team => team.id);

  if (teamIds.length === 0) {
    return [];
  }

  // Get participants from those teams
  const participants = await db.participant.findMany({
    where: {
      teamId: {
        in: teamIds,
      },
      hackathonParticipations: {
        some: {
          hackathonId: hackathonId,
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      city: true, // Location
      company: true,
      telegram: true,
      githubUrl: true,
      linkedinUrl: true,
      programmingLanguages: true,
      databases: true,
      technologies: true,
      cloudProviders: true,
      cloudServices: true,
      experienceLevel: true,
      description: true,
      createdAt: true,
      // Team information
      team: {
        select: {
          id: true,
          name: true,
          nickname: true,
          level: true,
          status: true,
          techStack: true,
          acceptedLanguages: true,
          _count: {
            select: {
              members: true,
            },
          },
        },
      },
    },
    orderBy: [
      {
        team: {
          name: 'asc',
        },
      },
      {
        name: 'asc',
      },
    ],
  });

  return participants;
}

/**
 * Alternative query using raw SQL for better performance with large datasets
 */
export async function getParticipantsFromLargeTeamsRaw(hackathonId: string) {
  const participants = await db.$queryRaw`
    SELECT 
      p.id,
      p.name,
      p.email,
      p.city,
      p.company,
      p.telegram,
      p."githubUrl",
      p."linkedinUrl",
      p."programmingLanguages",
      p.databases,
      p.technologies,
      p."cloudProviders",
      p."cloudServices",
      p."experienceLevel",
      p.description,
      p."createdAt",
      t.id as "teamId",
      t.name as "teamName",
      t.nickname as "teamNickname",
      t.level as "teamLevel",
      t.status as "teamStatus",
      t.description as "teamDescription",
      t."techStack" as "teamTechStack",
      t."acceptedLanguages" as "teamAcceptedLanguages",
      team_counts.member_count as "teamMemberCount"
    FROM participants p
    INNER JOIN teams t ON p."teamId" = t.id
    INNER JOIN hackathon_participations hp ON p.id = hp."participantId"
    INNER JOIN (
      SELECT 
        t2.id,
        COUNT(p2.id) as member_count
      FROM teams t2
      INNER JOIN participants p2 ON t2.id = p2."teamId"
      INNER JOIN hackathon_participations hp2 ON p2.id = hp2."participantId"
      WHERE t2."hackathonId" = ${hackathonId}
        AND hp2."hackathonId" = ${hackathonId}
        AND hp2."isActive" = true
      GROUP BY t2.id
      HAVING COUNT(p2.id) >= 3
    ) team_counts ON t.id = team_counts.id
    WHERE hp."hackathonId" = ${hackathonId}
      AND hp."isActive" = true
    ORDER BY t.name ASC, p.name ASC;
  `;

  return participants;
}

/**
 * Usage examples:
 */

// Example 1: Get participants from large teams for active hackathon
export async function getParticipantsFromActiveHackathon() {
  const hackathon = await db.hackathon.findFirst({
    where: { isActive: true }
  });
  
  if (!hackathon) {
    throw new Error('No active hackathon found');
  }
  
  const participants = await getParticipantsFromLargeTeams(hackathon.id);
  console.log(`Found ${participants.length} participants in teams with 3+ members`);
  
  return participants;
}

// Example 2: Export to CSV format
export async function exportParticipantsToCSV(hackathonId: string) {
  const participants = await getParticipantsFromLargeTeams(hackathonId);
  
  const csvData = participants.map(p => ({
    Name: p.name,
    Email: p.email,
    Location: p.city || 'Not specified',
    Company: p.company || 'Not specified',
    TeamName: p.team?.name || 'No team',
    TeamMemberCount: p.team?._count?.members || 0,
    ExperienceLevel: p.experienceLevel || 'Not specified',
    Technologies: p.technologies || 'Not specified',
    ProgrammingLanguages: 'programmingLanguages' in p && Array.isArray(p.programmingLanguages) ? p.programmingLanguages.join(', ') : 'None',
    GitHub: p.githubUrl || 'Not provided',
    LinkedIn: p.linkedinUrl || 'Not provided',
    Telegram: p.telegram || 'Not provided'
  }));
  
  return csvData;
}

// Example 3: API route usage (place in pages/api/participants/large-teams.ts)
/*
import { NextRequest, NextResponse } from 'next/server';
import { getParticipantsFromLargeTeams } from '@/query-participants-large-teams';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hackathonId = searchParams.get('hackathonId');
  
  if (!hackathonId) {
    return NextResponse.json({ error: 'hackathonId is required' }, { status: 400 });
  }
  
  try {
    const participants = await getParticipantsFromLargeTeams(hackathonId);
    return NextResponse.json({ participants, count: participants.length });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 });
  }
}
*/