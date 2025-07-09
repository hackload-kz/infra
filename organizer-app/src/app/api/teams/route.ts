import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const hackathonId = searchParams.get('hackathonId');

        const whereClause = hackathonId ? { hackathonId } : {};

        const teams = await db.team.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                nickname: true,
                hackathonId: true,
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

        return NextResponse.json({ teams });
    } catch (error) {
        console.error('Error fetching teams:', error);
        return NextResponse.json(
            { error: 'Ошибка при загрузке команд' },
            { status: 500 }
        );
    }
}
