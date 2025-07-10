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
            telegram,
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

                // Get current hackathon
                const { getCurrentHackathon } = await import('@/lib/hackathon')
                const hackathon = await getCurrentHackathon()
                if (!hackathon) {
                    throw new Error('No active hackathon found')
                }

                const newTeam = await tx.team.create({
                    data: {
                        name: newTeamName,
                        nickname: newTeamNickname,
                        hackathonId: hackathon.id,
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
                    telegram: telegram || null,
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
            telegram,
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

        if (!user) {
            return NextResponse.json(
                { error: 'Пользователь не найден' },
                { status: 404 }
            );
        }

        let updatedParticipant;
        let isNewParticipant = false;

        if (!user.participant) {
            // Create new participant profile (first-time users)
            isNewParticipant = true;
            
            // Get current hackathon for new participants
            const { getCurrentHackathon } = await import('@/lib/hackathon')
            const hackathon = await getCurrentHackathon()
            if (!hackathon) {
                return NextResponse.json(
                    { error: 'No active hackathon found' },
                    { status: 400 }
                );
            }

            const result = await db.$transaction(async (tx) => {
                // Create participant
                const participant = await tx.participant.create({
                    data: {
                        name,
                        email: session.user.email!,
                        city: city || null,
                        company: company || null,
                        telegram: telegram || null,
                        userId: user.id,
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

                // Create hackathon participation
                await tx.hackathonParticipation.create({
                    data: {
                        participantId: participant.id,
                        hackathonId: hackathon.id,
                    },
                });

                return participant;
            });

            updatedParticipant = result;
        } else {
            // Update existing participant profile
            updatedParticipant = await db.participant.update({
                where: { id: user.participant.id },
                data: {
                    name,
                    city: city || null,
                    company: company || null,
                    telegram: telegram || null,
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
        }

        // Fetch updated participant with relations
        const participantWithRelations = await db.participant.findUnique({
            where: { id: updatedParticipant.id },
            include: {
                team: true,
                ledTeam: true,
            },
        });

        return NextResponse.json({
            message: isNewParticipant ? 'Профиль создан успешно' : 'Профиль обновлен успешно',
            participant: {
                id: updatedParticipant.id,
                name: updatedParticipant.name,
                email: updatedParticipant.email,
                city: updatedParticipant.city,
                company: updatedParticipant.company,
            },
            team: participantWithRelations?.team ? {
                id: participantWithRelations.team.id,
                name: participantWithRelations.team.name,
                nickname: participantWithRelations.team.nickname,
                isLeader: !!participantWithRelations.ledTeam,
            } : null,
            isNewParticipant,
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
