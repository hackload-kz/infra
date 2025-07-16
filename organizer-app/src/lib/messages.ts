import { db } from '@/lib/db';
import { emailService } from '@/lib/email';
import { logger, LogAction } from '@/lib/logger';
import { markdownToEmailHtml } from '@/lib/markdown-server';
import { trackMessageReceived } from '@/lib/journal';
import { urlBuilder } from '@/lib/urls';

export interface CreateMessageInput {
  subject: string;
  body: string; // Markdown content
  senderId?: string;
  recipientId?: string;
  teamId?: string;
  hackathonId: string;
  parentMessageId?: string;
}

export interface MessageWithRelations {
  id: string;
  subject: string;
  body: string; // Markdown content
  status: 'UNREAD' | 'READ';
  createdAt: Date;
  updatedAt: Date;
  senderId: string | null;
  recipientId: string;
  parentMessageId: string | null;
  teamId: string | null;
  hackathonId: string;
  sender: {
    id: string;
    name: string;
    email: string;
  } | null;
  recipient: {
    id: string;
    name: string;
    email: string;
  };
  team: {
    id: string;
    name: string;
  } | null;
  replies: {
    id: string;
    subject: string;
    body: string; // Markdown content
    status: 'UNREAD' | 'READ';
    createdAt: Date;
    updatedAt: Date;
    senderId: string | null;
    recipientId: string;
    parentMessageId: string | null;
    teamId: string | null;
    hackathonId: string;
    sender: {
      id: string;
      name: string;
      email: string;
    } | null;
    recipient: {
      id: string;
      name: string;
      email: string;
    };
    team: {
      id: string;
      name: string;
    } | null;
  }[];
  parentMessage: {
    id: string;
    subject: string;
  } | null;
}

class MessageService {
  async createMessage(input: CreateMessageInput): Promise<MessageWithRelations> {
    const { recipientId, teamId, hackathonId, senderId, subject, body, parentMessageId } = input;

    try {
      // If it's a team message, create individual messages for each team member
      if (teamId && !recipientId) {
        const team = await db.team.findUnique({
          where: { id: teamId },
          include: { members: true }
        });

        if (!team) {
          throw new Error('Team not found');
        }

        // Log team message creation
        const senderEmail = senderId ? (await db.participant.findUnique({
          where: { id: senderId },
          select: { email: true }
        }))?.email : 'system';

        await logger.logCreate(
          'Message',
          'team-message',
          senderEmail || 'system',
          `Team message created for team "${team.name}" with ${team.members.length} members`,
          {
            teamId,
            teamName: team.name,
            memberCount: team.members.length,
            subject,
            hackathonId
          }
        );

        // Create messages for each team member
        const messages = await Promise.all(
          team.members.map(member => 
            this.createMessage({
              ...input,
              recipientId: member.id,
              teamId: teamId
            })
          )
        );

        return messages[0]; // Return the first message for consistency
      }

      if (!recipientId) {
        throw new Error('Recipient ID is required');
      }

      // Create the message
      const message = await db.message.create({
        data: {
          subject,
          body,
          senderId,
          recipientId,
          hackathonId,
          teamId,
          parentMessageId,
          status: 'UNREAD'
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          recipient: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          team: {
            select: {
              id: true,
              name: true
            }
          },
          replies: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              recipient: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              team: {
                select: {
                  id: true,
                  name: true
                }
              },
              replies: true,
              parentMessage: {
                select: {
                  id: true,
                  subject: true
                }
              }
            }
          },
          parentMessage: {
            select: {
              id: true,
              subject: true
            }
          }
        }
      });

      // Log message creation
      await logger.logCreate(
        'Message',
        message.id,
        message.sender?.email || 'system',
        `Message created: "${subject}" to ${message.recipient.name}`,
        {
          recipientId,
          recipientEmail: message.recipient.email,
          subject,
          isReply: !!parentMessageId,
          parentMessageId,
          teamId,
          hackathonId
        }
      );

      // Track message received in journal
      await trackMessageReceived(recipientId, message.id, message.sender?.name);

      // Send email notification
      await this.sendEmailNotification(message);

      return message;
    } catch (error) {
      // Log error
      const senderEmail = senderId ? (await db.participant.findUnique({
        where: { id: senderId },
        select: { email: true }
      }))?.email : 'system';

      await logger.logError('Message', error as Error, senderEmail || 'system');
      throw error;
    }
  }

  async getMessagesByRecipient(recipientId: string, hackathonId: string): Promise<MessageWithRelations[]> {
    return await db.message.findMany({
      where: {
        recipientId,
        hackathonId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        replies: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            recipient: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        parentMessage: {
          select: {
            id: true,
            subject: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getAllMessages(hackathonId: string): Promise<MessageWithRelations[]> {
    return await db.message.findMany({
      where: {
        hackathonId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        replies: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            recipient: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        parentMessage: {
          select: {
            id: true,
            subject: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getMessageById(messageId: string): Promise<MessageWithRelations | null> {
    return await db.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        replies: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            recipient: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        parentMessage: {
          select: {
            id: true,
            subject: true
          }
        }
      }
    });
  }

  async markAsRead(messageId: string, userEmail?: string): Promise<void> {
    try {
      const message = await db.message.findUnique({
        where: { id: messageId },
        include: {
          recipient: { select: { email: true, name: true } }
        }
      });

      if (!message) {
        throw new Error('Message not found');
      }

      await db.message.update({
        where: { id: messageId },
        data: { status: 'READ' }
      });

      // Log status change
      await logger.logStatusChange(
        'Message',
        messageId,
        userEmail || message.recipient.email,
        'UNREAD',
        'READ'
      );
    } catch (error) {
      await logger.logError('Message', error as Error, userEmail);
      throw error;
    }
  }

  async markAsUnread(messageId: string, userEmail?: string): Promise<void> {
    try {
      const message = await db.message.findUnique({
        where: { id: messageId },
        include: {
          recipient: { select: { email: true, name: true } }
        }
      });

      if (!message) {
        throw new Error('Message not found');
      }

      await db.message.update({
        where: { id: messageId },
        data: { status: 'UNREAD' }
      });

      // Log status change
      await logger.logStatusChange(
        'Message',
        messageId,
        userEmail || message.recipient.email,
        'READ',
        'UNREAD'
      );
    } catch (error) {
      await logger.logError('Message', error as Error, userEmail);
      throw error;
    }
  }

  async replyToMessage(messageId: string, senderId: string | null, body: string): Promise<MessageWithRelations> {
    const originalMessage = await db.message.findUnique({
      where: { id: messageId },
      include: {
        sender: true,
        recipient: true
      }
    });

    if (!originalMessage) {
      throw new Error('Original message not found');
    }

    // Create reply with "Re: " prefix if not already present
    const replySubject = originalMessage.subject.startsWith('Re: ') 
      ? originalMessage.subject 
      : `Re: ${originalMessage.subject}`;

    return await this.createMessage({
      subject: replySubject,
      body,
      senderId: senderId || undefined,
      recipientId: originalMessage.senderId || originalMessage.recipientId,
      hackathonId: originalMessage.hackathonId,
      parentMessageId: messageId,
      teamId: originalMessage.teamId || undefined
    });
  }

  async getUnreadCount(recipientId: string, hackathonId: string): Promise<number> {
    return await db.message.count({
      where: {
        recipientId,
        hackathonId,
        status: 'UNREAD'
      }
    });
  }

  async editMessage(messageId: string, updates: { subject?: string; body?: string }, userEmail: string): Promise<MessageWithRelations> {
    try {
      const originalMessage = await db.message.findUnique({
        where: { id: messageId },
        include: {
          recipient: { select: { name: true, email: true } },
          sender: { select: { name: true, email: true } }
        }
      });

      if (!originalMessage) {
        throw new Error('Message not found');
      }

      // Log the changes
      const changes: Record<string, { from: string; to: string }> = {};
      if (updates.subject && updates.subject !== originalMessage.subject) {
        changes.subject = { from: originalMessage.subject, to: updates.subject };
      }
      if (updates.body && updates.body !== originalMessage.body) {
        changes.body = { from: originalMessage.body, to: updates.body };
      }

      const updatedMessage = await db.message.update({
        where: { id: messageId },
        data: {
          subject: updates.subject || originalMessage.subject,
          body: updates.body || originalMessage.body,
          updatedAt: new Date()
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          recipient: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          team: {
            select: {
              id: true,
              name: true
            }
          },
          replies: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              recipient: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              team: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          parentMessage: {
            select: {
              id: true,
              subject: true
            }
          }
        }
      });

      // Log the edit
      await logger.logUpdate(
        'Message',
        messageId,
        userEmail,
        `Message edited by admin`,
        changes
      );

      return updatedMessage;
    } catch (error) {
      await logger.logError('Message', error as Error, userEmail);
      throw error;
    }
  }

  async deleteMessage(messageId: string, userEmail: string): Promise<void> {
    try {
      const message = await db.message.findUnique({
        where: { id: messageId },
        include: {
          recipient: { select: { name: true, email: true } },
          sender: { select: { name: true, email: true } }
        }
      });

      if (!message) {
        throw new Error('Message not found');
      }

      await db.message.delete({
        where: { id: messageId }
      });

      await logger.logDelete(
        'Message',
        messageId,
        userEmail,
        `Message deleted: "${message.subject}" to ${message.recipient.name}`
      );
    } catch (error) {
      await logger.logError('Message', error as Error, userEmail);
      throw error;
    }
  }

  async getConversationThread(messageId: string): Promise<MessageWithRelations[]> {
    const message = await db.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        recipient: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
        parentMessage: { select: { id: true, subject: true } }
      }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Get the root message (traverse up the chain)
    let rootMessageId = messageId;
    let currentMessage = message;

    while (currentMessage.parentMessageId) {
      const parentMessage = await db.message.findUnique({
        where: { id: currentMessage.parentMessageId },
        include: {
          sender: { select: { id: true, name: true, email: true } },
          recipient: { select: { id: true, name: true, email: true } },
          team: { select: { id: true, name: true } },
          parentMessage: { select: { id: true, subject: true } }
        }
      });

      if (!parentMessage) break;
      rootMessageId = parentMessage.id;
      currentMessage = parentMessage;
    }

    // Get all messages in the conversation thread
    const allMessages = await db.message.findMany({
      where: {
        OR: [
          { id: rootMessageId },
          { parentMessageId: rootMessageId }
        ]
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        recipient: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
        replies: {
          include: {
            sender: { select: { id: true, name: true, email: true } },
            recipient: { select: { id: true, name: true, email: true } },
            team: { select: { id: true, name: true } }
          }
        },
        parentMessage: { select: { id: true, subject: true } }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return allMessages;
  }

  async sendToTeam(teamId: string, subject: string, body: string, senderId?: string, hackathonId?: string): Promise<MessageWithRelations[]> {
    await logger.logApiCall('sendToTeam', 'MessageService', senderId, undefined);

    const team = await db.team.findUnique({
      where: { id: teamId },
      include: { 
        members: true,
        leader: true,
        hackathon: true
      }
    });

    if (!team) {
      await logger.error(LogAction.READ, 'Team', `Team not found: ${teamId}`, { entityId: teamId });
      throw new Error('Team not found');
    }

    await logger.info(LogAction.READ, 'Team', `Team found: ${team.name}`, { entityId: team.id, metadata: { membersCount: team.members.length, leaderId: team.leader?.id } });

    const finalHackathonId = hackathonId || team.hackathonId;
    await logger.debug(LogAction.READ, 'Hackathon', `Using hackathon ID: ${finalHackathonId}`, { entityId: finalHackathonId });

    // Build recipient list: include leader and all members (avoid duplicates)
    const recipients: Array<{ id: string; name: string; email: string }> = [];
    
    // Add leader if exists
    if (team.leader) {
      recipients.push({
        id: team.leader.id,
        name: team.leader.name,
        email: team.leader.email
      });
    }
    
    // Add members (excluding leader if they're also a member)
    team.members.forEach(member => {
      if (!recipients.find(r => r.id === member.id)) {
        recipients.push({
          id: member.id,
          name: member.name,
          email: member.email
        });
      }
    });

    await logger.debug(LogAction.READ, 'Message', `Final recipients count: ${recipients.length}`, { metadata: { recipients: recipients.map(r => r.email) } });

    if (recipients.length === 0) {
      await logger.warn(LogAction.READ, 'Team', `No recipients found for team: ${teamId}`, { entityId: teamId });
      return [];
    }

    const messages = await Promise.all(
      recipients.map(async (recipient, index) => {
        await logger.debug(LogAction.CREATE, 'Message', `Creating message ${index + 1}/${recipients.length} for recipient: ${recipient.name}`, { entityId: recipient.id, metadata: { email: recipient.email } });
        
        try {
          const message = await this.createMessage({
            subject,
            body,
            senderId,
            recipientId: recipient.id,
            hackathonId: finalHackathonId,
            teamId,
          });
          
          await logger.logCreate('Message', message.id, senderId || 'system', `Message created successfully for ${recipient.name}`);
          return message;
        } catch (error) {
          await logger.error(LogAction.CREATE, 'Message', `Failed to create message for ${recipient.name}: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } });
          throw error;
        }
      })
    );

    await logger.info(LogAction.CREATE, 'Message', `All team messages created successfully: ${messages.length}`, { metadata: { teamId, messagesCount: messages.length } });
    return messages;
  }

  private async sendEmailNotification(message: MessageWithRelations): Promise<void> {
    try {
      const subject = `Новое сообщение: ${message.subject}`;
      
      // Convert markdown content to HTML for email
      const htmlContent = markdownToEmailHtml(message.body);
      
      const emailBody = `
        <h2>📩 Вы получили новое сообщение</h2>
        <p><strong>От:</strong> ${message.sender?.name || 'Система'}</p>
        <p><strong>Тема:</strong> ${message.subject}</p>
        <div style="border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px; background-color: #f9f9f9;">
          ${htmlContent}
        </div>
        <p style="text-align: center; margin-top: 25px;">
          <a href="${urlBuilder.space.messages(message.id)}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            📱 Открыть в панели управления
          </a>
        </p>
        <p style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
          💡 Это уведомление отправлено системой Hackload. Для ответа перейдите в панель управления.
        </p>
      `;

      await emailService.sendHtmlEmail(message.recipient.email, subject, emailBody);
    } catch (error) {
      await logger.error(LogAction.UPDATE, 'Email', `Failed to send email notification: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } });
      // Don't throw error - message creation should succeed even if email fails
    }
  }
}

export const messageService = new MessageService();