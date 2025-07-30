import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import { isOrganizer } from '@/lib/admin';
import { getParticipantsFromLargeTeams, getParticipantsFromLargeTeamsRaw } from '@/lib/query-participants-large-teams';

type ParticipantExportData = {
  id: string;
  name: string;
  email: string;
  city: string | null;
  company: string | null;
  experienceLevel: string | null;
  technologies: string | null;
  programmingLanguages: string[];
  databases: string[];
  githubUrl: string | null;
  linkedinUrl: string | null;
  telegram: string | null;
  createdAt: Date;
  team?: {
    name: string;
    _count?: {
      members: number;
    };
  } | null;
};

type CsvRow = {
  Name: string;
  Email: string;
  Location: string;
  Company: string;
  TeamName: string;
  TeamMemberCount: number;
  ExperienceLevel: string;
  Technologies: string;
  ProgrammingLanguages: string;
  Databases: string;
  GitHub: string;
  LinkedIn: string;
  Telegram: string;
  CreatedAt: string;
};

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin privileges
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isOrganizer(session.user.email!);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // json or csv
    const useRawQuery = searchParams.get('raw') === 'true';
    
    // Get active hackathon
    const hackathon = await db.hackathon.findFirst({
      where: { isActive: true },
      select: { id: true, name: true }
    });

    if (!hackathon) {
      return NextResponse.json({ error: 'No active hackathon found' }, { status: 404 });
    }

    // Get participants data
    const participants = useRawQuery 
      ? await getParticipantsFromLargeTeamsRaw(hackathon.id) as unknown as ParticipantExportData[]
      : await getParticipantsFromLargeTeams(hackathon.id) as unknown as ParticipantExportData[];

    if (format === 'csv') {
      // Convert to CSV format
      const csvData: CsvRow[] = participants.map((p: ParticipantExportData) => ({
        Name: p.name,
        Email: p.email,
        Location: p.city || 'Not specified',
        Company: p.company || 'Not specified',
        TeamName: 'teamName' in p ? (p as unknown as {teamName: string}).teamName : (p.team?.name || 'No team'),
        TeamMemberCount: 'teamMemberCount' in p ? (p as unknown as {teamMemberCount: number}).teamMemberCount : (p.team?._count?.members || 0),
        ExperienceLevel: p.experienceLevel || 'Not specified',
        Technologies: p.technologies || 'Not specified',
        ProgrammingLanguages: Array.isArray(p.programmingLanguages) 
          ? p.programmingLanguages.join(', ') 
          : 'None',
        Databases: Array.isArray(p.databases) 
          ? p.databases.join(', ') 
          : 'None',
        GitHub: p.githubUrl || 'Not provided',
        LinkedIn: p.linkedinUrl || 'Not provided',
        Telegram: p.telegram || 'Not provided',
        CreatedAt: new Date(p.createdAt).toISOString()
      }));

      // Convert to CSV string
      if (csvData.length === 0) {
        return new NextResponse('No data found', {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="participants-large-teams-${hackathon.name.replace(/\s+/g, '-')}.csv"`
          }
        });
      }

      const headers = Object.keys(csvData[0]).join(',');
      const rows = csvData.map((row: CsvRow) => 
        Object.values(row).map((value: string | number) => 
          typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value
        ).join(',')
      );
      const csvContent = [headers, ...rows].join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="participants-large-teams-${hackathon.name.replace(/\s+/g, '-')}.csv"`
        }
      });
    }

    // Return JSON format
    return NextResponse.json({
      hackathon: {
        id: hackathon.id,
        name: hackathon.name
      },
      participants,
      count: participants.length,
      exportedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Export participants error:', error);
    return NextResponse.json(
      { error: 'Failed to export participants data' }, 
      { status: 500 }
    );
  }
}