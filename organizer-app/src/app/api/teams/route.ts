import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        const { searchParams } = new URL(request.url);
        const hackathonId = searchParams.get('hackathonId');

        await logger.logApiCall('GET', '/api/teams', session?.user?.email || undefined);

        const whereClause = hackathonId ? { hackathonId } : {};

        const teams = await db.team.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                nickname: true,
                hackathonId: true,
                status: true,
                level: true,
                members: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                name: 'asc',
            },
        });

        await logger.logRead('Team', 'multiple', session?.user?.email || 'anonymous', `Fetched ${teams.length} teams`);
        return NextResponse.json({ teams });
    } catch (error) {
        console.error('Error fetching teams:', error);
        const session = await auth();
        await logger.logApiError('GET', '/api/teams', error as Error, session?.user?.email || undefined);
        return NextResponse.json(
            { error: 'Ошибка при загрузке команд' },
            { status: 500 }
        );
    }
}
