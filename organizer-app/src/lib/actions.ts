'use server'

import { db } from '@/lib/db'
import { logger, LogAction } from '@/lib/logger'

type TeamMember = {
  id: string
  name: string
  email: string
}
import { revalidatePath } from 'next/cache'
import { TeamStatus, BannerType } from '@prisma/client'
import { getCurrentHackathon } from '@/lib/hackathon'
import { messageService } from '@/lib/messages'
import { generateJoinRequestNotificationMessage } from '@/lib/message-templates'
import { dismissBanner } from '@/lib/banners'
import { urlBuilder } from '@/lib/urls'
import { 
    trackTeamCreated, 
    trackTeamUpdated,
    trackJoinedTeam,
    trackJoinRequestCreated,
    trackJoinRequestApproved,
    trackJoinRequestRejected,
} from '@/lib/journal'


export async function createTeam(formData: FormData) {
    const name = formData.get('name') as string
    const nickname = formData.get('nickname') as string

    if (!name || !nickname) {
        throw new Error('Name and nickname are required')
    }

    try {
        const hackathon = await getCurrentHackathon()
        if (!hackathon) {
            throw new Error('No active hackathon found')
        }

        await db.team.create({
            data: {
                name,
                nickname,
                hackathonId: hackathon.id,
            },
        })

        revalidatePath('/dashboard/teams')
    } catch (error) {
        await logger.error(LogAction.CREATE, 'Team', `Error creating team: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } })
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
        await logger.error(LogAction.UPDATE, 'Team', `Error updating team: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } })
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
        await logger.error(LogAction.DELETE, 'Team', `Error deleting team: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } })
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
            const remainingMembers = currentTeam.members.filter((m: TeamMember) => m.id !== participantId);

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
                    
                    const newLeader = remainingMembers.find((m: TeamMember) => m.id === newLeaderId);
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
        await logger.error(LogAction.UPDATE, 'Team', `Error leaving team: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } });
        throw error;
    }
}

export async function createAndJoinTeam(participantId: string, teamName: string, teamNickname: string, teamLevel?: string | null, newLeaderId?: string | null, acceptedLanguages?: string[], techStack?: string[], description?: string) {
    if (!participantId || !teamName || !teamNickname) {
        throw new Error('Все поля обязательны для заполнения')
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(teamNickname)) {
        throw new Error('Никнейм команды может содержать только буквы, цифры, дефисы и подчеркивания')
    }

    let createdTeam: { id: string; name: string } | null = null;

    try {
        // Get current hackathon first (outside transaction)
        const hackathon = await getCurrentHackathon()
        if (!hackathon) {
            throw new Error('No active hackathon found')
        }

        // Use a more focused transaction with timeout configuration
        const result = await db.$transaction(async (tx) => {
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
                const remainingMembers = currentTeam.members.filter((m: TeamMember) => m.id !== participantId);

                if (isCurrentLeader) {
                    if (remainingMembers.length === 0) {
                        // Delete empty team and remove leadership
                        await tx.participant.update({
                            where: { id: participantId },
                            data: { 
                                ledTeamId: null,
                                teamId: null,
                            },
                        });
                        
                        await tx.team.delete({
                            where: { id: currentTeam.id },
                        });
                    } else {
                        // Transfer leadership
                        if (!newLeaderId) {
                            throw new Error('Вы должны выбрать нового лидера для текущей команды');
                        }
                        
                        const newLeader = remainingMembers.find((m: TeamMember) => m.id === newLeaderId);
                        if (!newLeader) {
                            throw new Error('Выбранный лидер не является участником команды');
                        }

                        // First, remove current leader's ledTeamId
                        await tx.participant.update({
                            where: { id: participantId },
                            data: { 
                                ledTeamId: null,
                                teamId: null,
                            },
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
                    await tx.participant.update({
                        where: { id: participantId },
                        data: { teamId: null },
                    });
                }
            }

            // Create new team
            const newTeam = await tx.team.create({
                data: {
                    name: teamName,
                    nickname: teamNickname,
                    level: teamLevel && teamLevel !== '' ? (teamLevel as 'BEGINNER' | 'ADVANCED') : null,
                    leaderId: participantId,
                    hackathonId: hackathon.id,
                    acceptedLanguages: acceptedLanguages || [],
                    techStack: techStack || [],
                    description: description || null,
                },
            });

            // Update participant
            await tx.participant.update({
                where: { id: participantId },
                data: {
                    teamId: newTeam.id,
                    ledTeamId: newTeam.id,
                },
            });

            return newTeam;
        }, {
            timeout: 10000, // Increase timeout to 10 seconds
        });

        createdTeam = result;

        // Track team creation outside transaction to avoid timeout issues
        try {
            if (createdTeam) {
                await trackTeamCreated(participantId, createdTeam.id, createdTeam.name);
            }
        } catch (journalError) {
            await logger.error(LogAction.CREATE, 'Team', `Error tracking team creation in journal: ${journalError instanceof Error ? journalError.message : 'Unknown error'}`, { metadata: { error: journalError instanceof Error ? journalError.stack : journalError } });
            // Don't fail the main operation if journal tracking fails
        }

        revalidatePath('/profile');
        revalidatePath('/dashboard/teams');
    } catch (error) {
        await logger.error(LogAction.CREATE, 'Team', `Error creating team: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } });
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
                const remainingMembers = currentTeam.members.filter((m: TeamMember) => m.id !== participantId);

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
                        
                        const newLeader = remainingMembers.find((m: TeamMember) => m.id === newLeaderId);
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

        }, {
            timeout: 10000, // Increase timeout to 10 seconds
        });

        // Track joining team outside transaction to avoid timeout issues
        try {
            const targetTeam = await db.team.findUnique({ where: { id: teamId } });
            if (targetTeam) {
                await trackJoinedTeam(participantId, teamId, targetTeam.name);
            }
        } catch (journalError) {
            await logger.error(LogAction.UPDATE, 'Team', `Error tracking team join in journal: ${journalError instanceof Error ? journalError.message : 'Unknown error'}`, { metadata: { error: journalError instanceof Error ? journalError.stack : journalError } });
            // Don't fail the main operation if journal tracking fails
        }

        revalidatePath('/profile');
        revalidatePath('/dashboard/teams');
    } catch (error) {
        await logger.error(LogAction.UPDATE, 'Team', `Error joining team: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } });
        throw error;
    }
}

export async function updateTeamStatusById(teamId: string, status: TeamStatus) {
    if (!teamId || !status) {
        throw new Error('Team ID and status are required')
    }

    try {
        await db.team.update({
            where: { id: teamId },
            data: { status },
        })

        revalidatePath('/dashboard/teams')
    } catch (error) {
        await logger.error(LogAction.UPDATE, 'Team', `Error updating team status: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } })
        throw new Error('Failed to update team status')
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
                const remainingMembers = currentTeam.members.filter((m: TeamMember) => m.id !== participantId);
                
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
                        
                        const newLeader = remainingMembers.find((m: TeamMember) => m.id === newLeaderId);
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

                // Get current hackathon
                const hackathon = await getCurrentHackathon()
                if (!hackathon) {
                    throw new Error('No active hackathon found')
                }

                const createdTeam = await tx.team.create({
                    data: {
                        name: newTeamName!,
                        nickname: newTeamNickname!,
                        hackathonId: hackathon.id,
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
                currentTeam.members.filter((m: TeamMember) => m.id !== participantId).length > 0 && 
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
        await logger.error(LogAction.UPDATE, 'Team', `Error changing team: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } });
        throw error;
    }
}

export async function createJoinRequest(participantId: string, teamId: string, message?: string) {
    if (!participantId || !teamId) {
        throw new Error('Participant ID and Team ID are required')
    }

    try {
        // Get current hackathon
        const hackathon = await getCurrentHackathon()
        if (!hackathon) {
            throw new Error('No active hackathon found')
        }

        // Check if participant is already in a team
        const participant = await db.participant.findUnique({
            where: { id: participantId }
        })

        if (!participant) {
            throw new Error('Участник не найден')
        }

        if (participant.teamId) {
            throw new Error('Вы уже состоите в команде')
        }

        // Check if team exists and has space
        const team = await db.team.findUnique({
            where: { id: teamId },
            include: { 
                members: true,
                leader: true,
                joinRequests: {
                    where: { 
                        status: 'PENDING',
                        hackathonId: hackathon.id
                    }
                }
            }
        })

        if (!team) {
            throw new Error('Команда не найдена')
        }

        if (team.hackathonId !== hackathon.id) {
            throw new Error('Команда принадлежит другому хакатону')
        }

        if (team.members.length >= hackathon.maxTeamSize) {
            throw new Error('Команда переполнена')
        }

        // Check if team is in a joinable status
        if (!['NEW', 'INCOMPLETED'].includes(team.status)) {
            throw new Error('Команда не принимает новых участников')
        }

        // Check if participant already has a pending request for this team
        const existingRequest = await db.joinRequest.findUnique({
            where: {
                participantId_teamId_hackathonId: {
                    participantId: participantId,
                    teamId: teamId,
                    hackathonId: hackathon.id
                }
            }
        })

        if (existingRequest) {
            throw new Error('У вас уже есть заявка на вступление в эту команду')
        }

        // Create the join request
        const joinRequest = await db.joinRequest.create({
            data: {
                participantId: participantId,
                teamId: teamId,
                hackathonId: hackathon.id,
                message: message || null
            }
        })

        // Track join request creation (moved outside transaction to prevent timeout)
        try {
            await trackJoinRequestCreated(participantId, joinRequest.id, team.name);
        } catch (journalError) {
            await logger.error(LogAction.CREATE, 'JoinRequest', `Error tracking join request creation in journal: ${journalError instanceof Error ? journalError.message : 'Unknown error'}`, { metadata: { error: journalError instanceof Error ? journalError.stack : journalError } });
            // Don't fail the main operation if journal tracking fails
        }

        // Send notification to team leader
        if (team.leader) {
            try {
                // Generate notification message
                const messageTemplate = generateJoinRequestNotificationMessage({
                    participant,
                    team,
                    joinRequest,
                    joinRequestUrl: urlBuilder.space.team(), // URL to team management page
                    participantProfileUrl: urlBuilder.space.participants(participant.id) // URL to participant profile
                })

                // Send message to team leader
                await messageService.createMessage({
                    subject: `🔔 Новая заявка на вступление в команду "${team.name}"`,
                    body: messageTemplate.text,
                    recipientId: team.leader.id,
                    hackathonId: hackathon.id,
                    teamId: team.id
                })
            } catch (messageError) {
                // Log the error but don't fail the join request creation
                await logger.error(LogAction.CREATE, 'Message', `Error sending join request notification: ${messageError instanceof Error ? messageError.message : 'Unknown error'}`, { metadata: { error: messageError instanceof Error ? messageError.stack : messageError } })
            }
        }

        revalidatePath('/space/team')
    } catch (error) {
        await logger.error(LogAction.CREATE, 'JoinRequest', `Error creating join request: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } })
        throw error
    }
}

export async function respondToJoinRequest(joinRequestId: string, action: 'approve' | 'decline', teamLeaderId: string) {
    if (!joinRequestId || !action || !teamLeaderId) {
        throw new Error('All parameters are required')
    }

    try {
        const requestData = await db.$transaction(async (tx) => {
            // Get the join request
            const joinRequest = await tx.joinRequest.findUnique({
                where: { id: joinRequestId },
                include: {
                    participant: true,
                    team: {
                        include: {
                            members: true,
                            leader: true
                        }
                    }
                }
            })

            if (!joinRequest) {
                throw new Error('Заявка не найдена')
            }

            // Check if the current user is the team leader
            if (joinRequest.team.leaderId !== teamLeaderId) {
                throw new Error('Только лидер команды может управлять заявками')
            }

            // Check if request is still pending
            if (joinRequest.status !== 'PENDING') {
                throw new Error('Заявка уже обработана')
            }

            if (action === 'approve') {
                // Check if team has space
                if (joinRequest.team.members.length >= 4) {
                    throw new Error('Команда переполнена')
                }

                // Check if participant is still available (not in another team)
                const currentParticipant = await tx.participant.findUnique({
                    where: { id: joinRequest.participantId }
                })

                if (currentParticipant?.teamId) {
                    throw new Error('Участник уже вступил в другую команду')
                }

                // Approve the request and add participant to team
                await tx.joinRequest.update({
                    where: { id: joinRequestId },
                    data: { status: 'APPROVED' }
                })

                await tx.participant.update({
                    where: { id: joinRequest.participantId },
                    data: { teamId: joinRequest.teamId }
                })

                // Return data for journal tracking
                return {
                    action: 'approve',
                    participantId: joinRequest.participantId,
                    teamId: joinRequest.teamId,
                    teamName: joinRequest.team.name,
                    joinRequestId
                }
            } else {
                // Decline the request
                await tx.joinRequest.update({
                    where: { id: joinRequestId },
                    data: { status: 'DECLINED' }
                })

                // Return data for journal tracking
                return {
                    action: 'decline',
                    participantId: joinRequest.participantId,
                    teamId: joinRequest.teamId,
                    teamName: joinRequest.team.name,
                    joinRequestId
                }
            }
        }, {
            timeout: 10000, // Increase timeout to 10 seconds
        });

        // Track journal events outside transaction to avoid timeout issues
        try {
            if (requestData.action === 'approve') {
                await trackJoinRequestApproved(requestData.participantId, requestData.joinRequestId, requestData.teamName);
                await trackJoinedTeam(requestData.participantId, requestData.teamId, requestData.teamName);
            } else {
                await trackJoinRequestRejected(requestData.participantId, requestData.joinRequestId, requestData.teamName);
            }
        } catch (journalError) {
            await logger.error(LogAction.UPDATE, 'JoinRequest', `Error tracking join request response in journal: ${journalError instanceof Error ? journalError.message : 'Unknown error'}`, { metadata: { error: journalError instanceof Error ? journalError.stack : journalError } });
            // Don't fail the main operation if journal tracking fails
        }

        revalidatePath('/space/team')
        revalidatePath('/dashboard/teams')
    } catch (error) {
        await logger.error(LogAction.UPDATE, 'JoinRequest', `Error responding to join request: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } })
        throw error
    }
}

export async function updateTeamInfo(teamId: string, name: string, nickname: string, level: string | null, leaderId: string, acceptedLanguages?: string[], techStack?: string[], description?: string) {
    if (!teamId || !name || !nickname || !leaderId) {
        throw new Error('All parameters are required')
    }

    try {
        // Check if the leader is authorized to update this team
        const team = await db.team.findUnique({
            where: { id: teamId },
            include: { leader: true }
        })

        if (!team) {
            throw new Error('Команда не найдена')
        }

        if (team.leaderId !== leaderId) {
            throw new Error('Только лидер команды может редактировать информацию о команде')
        }

        // Check if team status allows editing
        const editableStatuses = ['NEW', 'INCOMPLETED', 'FINISHED', 'IN_REVIEW']
        if (!editableStatuses.includes(team.status)) {
            throw new Error('Команда в данном статусе не может быть отредактирована')
        }

        // If nickname is changing, check if it's available
        if (team.nickname !== nickname) {
            const existingTeam = await db.team.findUnique({
                where: { nickname: nickname }
            })

            if (existingTeam) {
                throw new Error('Команда с таким никнеймом уже существует')
            }
        }

        // Update team
        await db.team.update({
            where: { id: teamId },
            data: {
                name: name,
                nickname: nickname,
                level: level && level !== '' ? (level as 'BEGINNER' | 'ADVANCED') : null,
                acceptedLanguages: acceptedLanguages || [],
                techStack: techStack || [],
                description: description || null
            }
        })

        // Track team update
        try {
            await trackTeamUpdated(leaderId, teamId, name);
        } catch (journalError) {
            await logger.error(LogAction.UPDATE, 'Team', `Error tracking team update in journal: ${journalError instanceof Error ? journalError.message : 'Unknown error'}`, { metadata: { error: journalError instanceof Error ? journalError.stack : journalError } });
            // Don't fail the main operation if journal tracking fails
        }

        revalidatePath('/space/team')
        revalidatePath('/dashboard/teams')
    } catch (error) {
        await logger.error(LogAction.UPDATE, 'Team', `Error updating team info: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } })
        throw error
    }
}

export async function removeTeamMember(teamId: string, memberId: string, leaderId: string) {
    if (!teamId || !memberId || !leaderId) {
        throw new Error('All parameters are required')
    }

    try {
        // Check if the leader is authorized to remove members
        const team = await db.team.findUnique({
            where: { id: teamId },
            include: { 
                leader: true,
                members: true
            }
        })

        if (!team) {
            throw new Error('Команда не найдена')
        }

        if (team.leaderId !== leaderId) {
            throw new Error('Только лидер команды может удалять участников')
        }

        // Check if member exists in the team
        const member = team.members.find((m: TeamMember) => m.id === memberId)
        if (!member) {
            throw new Error('Участник не найден в команде')
        }

        // Can't remove the leader
        if (memberId === leaderId) {
            throw new Error('Лидер не может удалить себя из команды')
        }

        // Remove member from team
        await db.participant.update({
            where: { id: memberId },
            data: { teamId: null }
        })

        revalidatePath('/space/team')
        revalidatePath('/dashboard/teams')
    } catch (error) {
        await logger.error(LogAction.UPDATE, 'Team', `Error removing team member: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } })
        throw error
    }
}

export async function dismissBannerAction(
    participantId: string,
    hackathonId: string,
    bannerType: BannerType
) {
    if (!participantId || !hackathonId || !bannerType) {
        throw new Error('All parameters are required')
    }

    try {
        await dismissBanner(participantId, hackathonId, bannerType)
        revalidatePath('/space')
    } catch (error) {
        await logger.error(LogAction.UPDATE, 'Banner', `Error dismissing banner: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } })
        throw error
    }
}

export async function dismissCustomBannerAction(
    participantId: string,
    hackathonId: string,
    customBannerId: string
) {
    if (!participantId || !hackathonId || !customBannerId) {
        throw new Error('All parameters are required')
    }

    try {
        // Check if banner exists and is dismissible
        const banner = await db.customBanner.findUnique({
            where: { id: customBannerId }
        })

        if (!banner) {
            throw new Error('Banner not found')
        }

        if (!banner.allowDismiss) {
            throw new Error('Banner cannot be dismissed')
        }

        // Create or update dismissal record
        await db.customBannerDismissal.upsert({
            where: {
                customBannerId_participantId_hackathonId: {
                    customBannerId,
                    participantId,
                    hackathonId
                }
            },
            update: {
                dismissedAt: new Date()
            },
            create: {
                customBannerId,
                participantId,
                hackathonId
            }
        })

        revalidatePath('/space')
    } catch (error) {
        await logger.error(LogAction.UPDATE, 'Banner', `Error dismissing custom banner: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } })
        throw error
    }
}
