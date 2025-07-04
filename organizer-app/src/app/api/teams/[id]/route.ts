import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const team = await db.team.findUnique({
            where: {
                id: id,
            },
            include: {
                leader: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                members: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        members: true,
                    },
                },
            },
        });

        if (!team) {
            return NextResponse.json(
                { error: 'Команда не найдена' },
                { status: 404 }
            );
        }

        return NextResponse.json(team);
    } catch (error) {
        console.error('Error fetching team:', error);
        return NextResponse.json(
            { error: 'Ошибка при загрузке команды' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, nickname } = body;

        const team = await db.team.update({
            where: {
                id: id,
            },
            data: {
                name,
                nickname,
            },
        });

        return NextResponse.json(team);
    } catch (error) {
        console.error('Error updating team:', error);
        return NextResponse.json(
            { error: 'Ошибка при обновлении команды' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // First, remove all team members by setting their teamId and ledTeamId to null
        await db.participant.updateMany({
            where: {
                OR: [
                    { teamId: id },
                    { ledTeamId: id }
                ]
            },
            data: {
                teamId: null,
                ledTeamId: null,
            },
        });

        // Then delete the team
        await db.team.delete({
            where: {
                id: id,
            },
        });

        return NextResponse.json({ message: 'Команда удалена' });
    } catch (error) {
        console.error('Error deleting team:', error);
        return NextResponse.json(
            { error: 'Ошибка при удалении команды' },
            { status: 500 }
        );
    }
}
