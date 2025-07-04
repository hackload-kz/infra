'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function createTeam(formData: FormData) {
    const name = formData.get('name') as string
    const nickname = formData.get('nickname') as string

    if (!name || !nickname) {
        throw new Error('Name and nickname are required')
    }

    try {
        await db.team.create({
            data: {
                name,
                nickname,
            },
        })

        revalidatePath('/dashboard/teams')
    } catch (error) {
        console.error('Error creating team:', error)
        throw new Error('Failed to create team')
    }
}

export async function updateTeam(formData: FormData) {
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const nickname = formData.get('nickname') as string

    if (!id || !name || !nickname) {
        throw new Error('ID, name and nickname are required')
    }

    try {
        await db.team.update({
            where: { id },
            data: {
                name,
                nickname,
            },
        })

        revalidatePath('/dashboard/teams')
    } catch (error) {
        console.error('Error updating team:', error)
        throw new Error('Failed to update team')
    }
}

export async function deleteTeam(formData: FormData) {
    const id = formData.get('id') as string

    if (!id) {
        throw new Error('ID is required')
    }

    try {
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
            where: { id },
        });

        revalidatePath('/dashboard/teams');
    } catch (error) {
        console.error('Error deleting team:', error)
        throw new Error('Failed to delete team')
    }
}

export async function leaveTeam(participantId: string, newLeaderId?: string | null) {
    if (!participantId) {
        throw new Error('Participant ID is required')
    }

    try {
        await db.$transaction(async (tx) => {
            const participant = await tx.participant.findUnique({
                where: { id: participantId },
                include: {
                    team: {
                        include: {
                            members: true,
                        },
                    },
                    ledTeam: true,
                },
            });

            if (!participant || !participant.team) {
                throw new Error('Участник не найден или не состоит в команде');
            }

            const currentTeam = participant.team;
            const isCurrentLeader = !!participant.ledTeam;
            const remainingMembers = currentTeam.members.filter(m => m.id !== participantId);

            if (isCurrentLeader) {
                if (remainingMembers.length === 0) {
                    // Delete empty team
                    await tx.team.delete({
                        where: { id: currentTeam.id },
                    });
                } else {
                    // Transfer leadership
                    if (!newLeaderId) {
                        throw new Error('Вы должны выбрать нового лидера команды');
                    }
                    
                    const newLeader = remainingMembers.find(m => m.id === newLeaderId);
                    if (!newLeader) {
                        throw new Error('Выбранный лидер не является участником команды');
                    }

                    // First, remove current leader's ledTeamId
                    await tx.participant.update({
                        where: { id: participantId },
                        data: { ledTeamId: null },
                    });

                    // Then assign new leader's ledTeamId
                    await tx.participant.update({
                        where: { id: newLeaderId },
                        data: { ledTeamId: currentTeam.id },
                    });

                    // Finally, update team leader
                    await tx.team.update({
                        where: { id: currentTeam.id },
                        data: { leaderId: newLeaderId },
                    });
                }
            }

            // Remove participant from team
            await tx.participant.update({
                where: { id: participantId },
                data: {
                    teamId: null,
                    ledTeamId: null,
                },
            });
        });

        revalidatePath('/profile');
        revalidatePath('/dashboard/teams');
    } catch (error) {
        console.error('Error leaving team:', error);
        throw error;
    }
}

export async function createAndJoinTeam(participantId: string, teamName: string, teamNickname: string, newLeaderId?: string | null) {
    if (!participantId || !teamName || !teamNickname) {
        throw new Error('Все поля обязательны для заполнения')
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(teamNickname)) {
        throw new Error('Никнейм команды может содержать только буквы, цифры, дефисы и подчеркивания')
    }

    try {
        await db.$transaction(async (tx) => {
            const participant = await tx.participant.findUnique({
                where: { id: participantId },
                include: {
                    team: {
                        include: {
                            members: true,
                        },
                    },
                    ledTeam: true,
                },
            });

            if (!participant) {
                throw new Error('Участник не найден');
            }

            // Check if nickname already exists
            const existingTeam = await tx.team.findUnique({
                where: { nickname: teamNickname },
            });

            if (existingTeam) {
                throw new Error('Команда с таким никнеймом уже существует');
            }

            // Handle leaving current team if exists
            const currentTeam = participant.team;
            if (currentTeam) {
                const isCurrentLeader = !!participant.ledTeam;
                const remainingMembers = currentTeam.members.filter(m => m.id !== participantId);

                if (isCurrentLeader && remainingMembers.length > 0) {
                    if (!newLeaderId) {
                        throw new Error('Вы должны выбрать нового лидера для текущей команды');
                    }
                    
                    const newLeader = remainingMembers.find(m => m.id === newLeaderId);
                    if (!newLeader) {
                        throw new Error('Выбранный лидер не является участником команды');
                    }

                    // First, remove current leader's ledTeamId
                    await tx.participant.update({
                        where: { id: participantId },
                        data: { ledTeamId: null },
                    });

                    // Then assign new leader's ledTeamId
                    await tx.participant.update({
                        where: { id: newLeaderId },
                        data: { ledTeamId: currentTeam.id },
                    });

                    // Finally, update team leader
                    await tx.team.update({
                        where: { id: currentTeam.id },
                        data: { leaderId: newLeaderId },
                    });
                }
            }

            // Create new team
            const createdTeam = await tx.team.create({
                data: {
                    name: teamName,
                    nickname: teamNickname,
                    leaderId: participantId,
                },
            });

            // Update participant
            await tx.participant.update({
                where: { id: participantId },
                data: {
                    teamId: createdTeam.id,
                    ledTeamId: createdTeam.id,
                },
            });
        });

        revalidatePath('/profile');
        revalidatePath('/dashboard/teams');
    } catch (error) {
        console.error('Error creating team:', error);
        throw error;
    }
}

export async function joinTeam(participantId: string, teamId: string, newLeaderId?: string | null) {
    if (!participantId || !teamId) {
        throw new Error('Participant ID and Team ID are required')
    }

    try {
        await db.$transaction(async (tx) => {
            const participant = await tx.participant.findUnique({
                where: { id: participantId },
                include: {
                    team: {
                        include: {
                            members: true,
                        },
                    },
                    ledTeam: true,
                },
            });

            if (!participant) {
                throw new Error('Участник не найден');
            }

            // Check if target team exists
            const targetTeam = await tx.team.findUnique({
                where: { id: teamId },
            });

            if (!targetTeam) {
                throw new Error('Команда не найдена');
            }

            // Handle leaving current team if exists
            const currentTeam = participant.team;
            if (currentTeam) {
                const isCurrentLeader = !!participant.ledTeam;
                const remainingMembers = currentTeam.members.filter(m => m.id !== participantId);

                if (isCurrentLeader) {
                    if (remainingMembers.length === 0) {
                        // Delete empty team
                        await tx.team.delete({
                            where: { id: currentTeam.id },
                        });
                    } else {
                        // Transfer leadership
                        if (!newLeaderId) {
                            throw new Error('Вы должны выбрать нового лидера для текущей команды');
                        }
                        
                        const newLeader = remainingMembers.find(m => m.id === newLeaderId);
                        if (!newLeader) {
                            throw new Error('Выбранный лидер не является участником команды');
                        }

                        // First, remove current leader's ledTeamId
                        await tx.participant.update({
                            where: { id: participantId },
                            data: { ledTeamId: null },
                        });

                        // Then assign new leader's ledTeamId
                        await tx.participant.update({
                            where: { id: newLeaderId },
                            data: { ledTeamId: currentTeam.id },
                        });

                        // Finally, update team leader
                        await tx.team.update({
                            where: { id: currentTeam.id },
                            data: { leaderId: newLeaderId },
                        });
                    }
                }
            }

            // Join new team
            await tx.participant.update({
                where: { id: participantId },
                data: {
                    teamId: teamId,
                    ledTeamId: null, // Regular member
                },
            });
        });

        revalidatePath('/profile');
        revalidatePath('/dashboard/teams');
    } catch (error) {
        console.error('Error joining team:', error);
        throw error;
    }
}

// Legacy function - keeping for backward compatibility
export async function changeTeam(formData: FormData) {
    const participantId = formData.get('participantId') as string
    const newTeamId = formData.get('newTeamId') as string
    const newLeaderId = formData.get('newLeaderId') as string | null
    const newTeamName = formData.get('newTeamName') as string | null
    const newTeamNickname = formData.get('newTeamNickname') as string | null

    if (!participantId) {
        throw new Error('Participant ID is required')
    }

    // Validate new team creation
    if (newTeamId === 'new') {
        if (!newTeamName || !newTeamNickname) {
            throw new Error('Название и никнейм команды обязательны')
        }
        
        // Check if nickname is valid
        if (!/^[a-zA-Z0-9_-]+$/.test(newTeamNickname)) {
            throw new Error('Никнейм команды может содержать только буквы, цифры, дефисы и подчеркивания')
        }
    }

    try {
        await db.$transaction(async (tx) => {
            // Get current participant with team info
            const participant = await tx.participant.findUnique({
                where: { id: participantId },
                include: {
                    team: {
                        include: {
                            members: true,
                            leader: true,
                        },
                    },
                    ledTeam: {
                        include: {
                            members: true,
                        },
                    },
                },
            });

            if (!participant) {
                throw new Error('Participant not found');
            }

            const currentTeam = participant.team;
            const isCurrentLeader = !!participant.ledTeam;

            // Handle leaving current team
            if (currentTeam) {
                const remainingMembers = currentTeam.members.filter(m => m.id !== participantId);
                
                if (isCurrentLeader) {
                    // Leader is leaving
                    if (remainingMembers.length === 0) {
                        // No one left, delete the team
                        await tx.team.delete({
                            where: { id: currentTeam.id },
                        });
                    } else {
                        // Transfer leadership
                        if (!newLeaderId) {
                            throw new Error('Вы должны выбрать нового лидера команды');
                        }
                        
                        const newLeader = remainingMembers.find(m => m.id === newLeaderId);
                        if (!newLeader) {
                            throw new Error('Выбранный лидер не является участником команды');
                        }

                        // First, remove current leader's ledTeamId
                        await tx.participant.update({
                            where: { id: participantId },
                            data: { ledTeamId: null },
                        });

                        // Then assign new leader's ledTeamId
                        await tx.participant.update({
                            where: { id: newLeaderId },
                            data: { ledTeamId: currentTeam.id },
                        });

                        // Finally, update team leader
                        await tx.team.update({
                            where: { id: currentTeam.id },
                            data: { leaderId: newLeaderId },
                        });
                    }
                } else {
                    // Regular member leaving
                    if (remainingMembers.length === 0) {
                        // Team becomes empty, delete it
                        await tx.team.delete({
                            where: { id: currentTeam.id },
                        });
                    }
                }
            }

            let finalTeamId: string | null = null;
            let isNewLeader = false;

            // Handle team assignment
            if (newTeamId === 'new') {
                // Create new team
                const existingTeam = await tx.team.findUnique({
                    where: { nickname: newTeamNickname! },
                });

                if (existingTeam) {
                    throw new Error('Команда с таким никнеймом уже существует');
                }

                const createdTeam = await tx.team.create({
                    data: {
                        name: newTeamName!,
                        nickname: newTeamNickname!,
                    },
                });

                finalTeamId = createdTeam.id;
                isNewLeader = true;
            } else if (newTeamId === 'null') {
                finalTeamId = null;
            } else if (newTeamId) {
                // Join existing team
                const existingTeam = await tx.team.findUnique({
                    where: { id: newTeamId },
                });

                if (!existingTeam) {
                    throw new Error('Новая команда не найдена');
                }

                finalTeamId = newTeamId;
            }

            // Update participant (only if leadership wasn't already transferred)
            const wasLeadershipTransferred = isCurrentLeader && currentTeam && 
                currentTeam.members.filter(m => m.id !== participantId).length > 0 && 
                finalTeamId !== currentTeam.id;
            if (!wasLeadershipTransferred) {
                await tx.participant.update({
                    where: { id: participantId },
                    data: {
                        teamId: finalTeamId,
                        ledTeamId: isNewLeader ? finalTeamId : null,
                    },
                });
            } else {
                // Only update teamId if leadership was already transferred
                await tx.participant.update({
                    where: { id: participantId },
                    data: {
                        teamId: finalTeamId,
                    },
                });
            }

            // If participant became leader of new team, update team's leaderId
            if (isNewLeader && finalTeamId) {
                await tx.team.update({
                    where: { id: finalTeamId },
                    data: { leaderId: participantId },
                });
            }
        });

        revalidatePath('/profile');
        revalidatePath('/dashboard/teams');
    } catch (error) {
        console.error('Error changing team:', error);
        throw error;
    }
}
