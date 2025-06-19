import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            name,
            email,
            password,
            city,
            company,
            teamOption,
            selectedTeam,
            newTeamName,
            newTeamNickname,
        } = body;

        // Validate required fields
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'Имя, email и пароль обязательны' },
                { status: 400 }
            );
        }

        // Validate password length
        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Пароль должен содержать минимум 6 символов' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await db.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'Пользователь с таким email уже существует' },
                { status: 400 }
            );
        }

        // Check if participant already exists
        const existingParticipant = await db.participant.findUnique({
            where: { email },
        });

        if (existingParticipant) {
            return NextResponse.json(
                { error: 'Участник с таким email уже зарегистрирован' },
                { status: 400 }
            );
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Start transaction
        const result = await db.$transaction(async (tx) => {
            // Create user
            const user = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                },
            });

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
                user,
                participant,
                team: teamId ? await tx.team.findUnique({ where: { id: teamId } }) : null,
                isLeader,
            };
        });

        return NextResponse.json({
            message: 'Регистрация прошла успешно',
            user: {
                id: result.user.id,
                email: result.user.email,
            },
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
        console.error('Registration error:', error);

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
