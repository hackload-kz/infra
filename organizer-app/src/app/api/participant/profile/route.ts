import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Не авторизован' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            name,
            email,
            city,
            company,
            teamOption,
            selectedTeam,
            newTeamName,
            newTeamNickname,
            // Experience fields
            experienceLevel,
            technologies,
            cloudServices,
            cloudProviders,
            otherTechnologies,
            otherCloudServices,
            otherCloudProviders,
        } = body;

        // Validate required fields
        if (!name || !email) {
            return NextResponse.json(
                { error: 'Имя и email обязательны' },
                { status: 400 }
            );
        }

        // Check if user exists
        const user = await db.user.findUnique({
            where: { email: session.user.email },
            include: { participant: true },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Пользователь не найден' },
                { status: 404 }
            );
        }

        if (user.participant) {
            return NextResponse.json(
                { error: 'Профиль участника уже создан' },
                { status: 400 }
            );
        }

        // Check if participant email already exists
        const existingParticipant = await db.participant.findUnique({
            where: { email },
        });

        if (existingParticipant) {
            return NextResponse.json(
                { error: 'Участник с таким email уже зарегистрирован' },
                { status: 400 }
            );
        }

        // Start transaction
        const result = await db.$transaction(async (tx) => {
            let teamId: string | null = null;
            let isLeader = false;

            // Handle team selection
            if (teamOption === 'existing' && selectedTeam) {
                // Join existing team
                const team = await tx.team.findUnique({
                    where: { id: selectedTeam },
                });

                if (!team) {
                    throw new Error('Выбранная команда не найдена');
                }

                teamId = selectedTeam;
            } else if (teamOption === 'new' && newTeamName && newTeamNickname) {
                // Create new team
                const existingTeam = await tx.team.findUnique({
                    where: { nickname: newTeamNickname },
                });

                if (existingTeam) {
                    throw new Error('Команда с таким nickname уже существует');
                }

                const newTeam = await tx.team.create({
                    data: {
                        name: newTeamName,
                        nickname: newTeamNickname,
                    },
                });

                teamId = newTeam.id;
                isLeader = true;
            }

            // Create participant
            const participant = await tx.participant.create({
                data: {
                    name,
                    email,
                    city: city || null,
                    company: company || null,
                    userId: user.id,
                    teamId,
                    ledTeamId: isLeader ? teamId : null,
                    // Experience fields
                    experienceLevel: experienceLevel || null,
                    technologies: technologies ? JSON.stringify(technologies) : null,
                    cloudServices: cloudServices ? JSON.stringify(cloudServices) : null,
                    cloudProviders: cloudProviders ? JSON.stringify(cloudProviders) : null,
                    otherTechnologies: otherTechnologies || null,
                    otherCloudServices: otherCloudServices || null,
                    otherCloudProviders: otherCloudProviders || null,
                },
            });

            // If creating a new team and being a leader, update team's leaderId
            if (isLeader && teamId) {
                await tx.team.update({
                    where: { id: teamId },
                    data: { leaderId: participant.id },
                });
            }

            return {
                participant,
                team: teamId ? await tx.team.findUnique({ where: { id: teamId } }) : null,
                isLeader,
            };
        });

        return NextResponse.json({
            message: 'Профиль создан успешно',
            participant: {
                id: result.participant.id,
                name: result.participant.name,
                email: result.participant.email,
                city: result.participant.city,
                company: result.participant.company,
            },
            team: result.team ? {
                id: result.team.id,
                name: result.team.name,
                nickname: result.team.nickname,
                isLeader: result.isLeader,
            } : null,
        });

    } catch (error) {
        console.error('Profile creation error:', error);

        if (error instanceof Error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Не авторизован' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            name,
            city,
            company,
            // Experience fields
            experienceLevel,
            technologies,
            cloudServices,
            cloudProviders,
            otherTechnologies,
            otherCloudServices,
            otherCloudProviders,
            // Team fields
            teamOption,
            selectedTeam,
            newTeamName,
            newTeamNickname,
        } = body;

        // Validate required fields
        if (!name) {
            return NextResponse.json(
                { error: 'Имя обязательно' },
                { status: 400 }
            );
        }

        // Check if user exists and has participant profile
        const user = await db.user.findUnique({
            where: { email: session.user.email },
            include: {
                participant: {
                    include: {
                        team: true,
                        ledTeam: true,
                    }
                }
            },
        });

        if (!user || !user.participant) {
            return NextResponse.json(
                { error: 'Профиль участника не найден' },
                { status: 404 }
            );
        }

        // Start transaction for updating profile and team
        const result = await db.$transaction(async (tx) => {
            let teamId: string | null = null;
            let ledTeamId: string | null = null;
            let oldTeamDeleted = false; // Track if old team was deleted

            // Handle team changes
            if (teamOption === 'existing' && selectedTeam) {
                // Join existing team
                const team = await tx.team.findUnique({
                    where: { id: selectedTeam },
                });

                if (!team) {
                    throw new Error('Выбранная команда не найдена');
                }

                teamId = selectedTeam;
            } else if (teamOption === 'new' && newTeamName && newTeamNickname) {
                // Create new team
                const existingTeam = await tx.team.findUnique({
                    where: { nickname: newTeamNickname },
                });

                if (existingTeam) {
                    throw new Error('Команда с таким nickname уже существует');
                }

                const newTeam = await tx.team.create({
                    data: {
                        name: newTeamName,
                        nickname: newTeamNickname,
                    },
                });

                teamId = newTeam.id;
                ledTeamId = newTeam.id; // User becomes leader of new team
            }
            // If teamOption === 'none', teamId stays null

            // Handle leadership transfer if user was a leader and is leaving/changing team
            if (user.participant!.ledTeam &&
                (teamOption === 'none' || (teamOption !== 'none' && user.participant!.ledTeam.id !== (teamOption === 'new' ? null : selectedTeam)))) {

                // Check if there are other members in the led team
                const teamMembers = await tx.participant.findMany({
                    where: {
                        teamId: user.participant!.ledTeam.id,
                        id: { not: user.participant!.id } // Exclude current user
                    },
                });

                if (teamMembers.length > 0) {
                    // Transfer leadership to first member
                    const newLeader = teamMembers[0];
                    await tx.participant.update({
                        where: { id: newLeader.id },
                        data: { ledTeamId: user.participant!.ledTeam.id },
                    });

                    await tx.team.update({
                        where: { id: user.participant!.ledTeam.id },
                        data: { leaderId: newLeader.id },
                    });
                } else {
                    // No other members, delete the team completely
                    await tx.team.delete({
                        where: { id: user.participant!.ledTeam.id },
                    });
                    oldTeamDeleted = true; // Mark that old team was deleted
                }
            }

            // Update participant profile
            const updatedParticipant = await tx.participant.update({
                where: { id: user.participant!.id },
                data: {
                    name,
                    city: city || null,
                    company: company || null,
                    teamId,
                    ledTeamId,
                    // Experience fields
                    experienceLevel: experienceLevel || null,
                    technologies: technologies ? JSON.stringify(technologies) : null,
                    cloudServices: cloudServices ? JSON.stringify(cloudServices) : null,
                    cloudProviders: cloudProviders ? JSON.stringify(cloudProviders) : null,
                    otherTechnologies: otherTechnologies || null,
                    otherCloudServices: otherCloudServices || null,
                    otherCloudProviders: otherCloudProviders || null,
                },
            });

            // Check if user is leaving a team (not creating new or staying in same)
            // Only check if the team wasn't already deleted above
            if (user.participant!.teamId &&
                !oldTeamDeleted &&
                user.participant!.teamId !== user.participant!.ledTeamId && // Only if it's not the same team as led team
                (teamOption === 'none' || (teamOption === 'existing' && selectedTeam !== user.participant!.teamId))) {

                // Check if there are any remaining members in the old team
                const remainingMembers = await tx.participant.findMany({
                    where: {
                        teamId: user.participant!.teamId,
                        id: { not: user.participant!.id } // Exclude current user
                    },
                });

                // If no members left, delete the team completely
                if (remainingMembers.length === 0) {
                    await tx.team.delete({
                        where: { id: user.participant!.teamId },
                    });
                }
            }

            // If creating a new team and being a leader, update team's leaderId
            if (teamOption === 'new' && ledTeamId && teamId) {
                await tx.team.update({
                    where: { id: teamId },
                    data: { leaderId: updatedParticipant.id },
                });
            }

            return updatedParticipant;
        });

        // Fetch updated participant with relations
        const participantWithRelations = await db.participant.findUnique({
            where: { id: result.id },
            include: {
                team: true,
                ledTeam: true,
            },
        });

        return NextResponse.json({
            message: 'Профиль обновлен успешно',
            participant: {
                id: result.id,
                name: result.name,
                email: result.email,
                city: result.city,
                company: result.company,
            },
            team: participantWithRelations?.team ? {
                id: participantWithRelations.team.id,
                name: participantWithRelations.team.name,
                nickname: participantWithRelations.team.nickname,
                isLeader: !!participantWithRelations.ledTeam,
            } : null,
        });

    } catch (error) {
        console.error('Profile update error:', error);

        if (error instanceof Error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        );
    }
}
