import { db } from '@/lib/db';
import { emailService } from '@/lib/email';
import { logger } from '@/lib/logger';
import { MessageStatus } from '@prisma/client';

export interface CreateMessageInput {
  subject: string;
  body: string;
  senderId?: string;
  recipientId?: string;
  teamId?: string;
  hackathonId: string;
  parentMessageId?: string;
}

export interface MessageWithRelations {
  id: string;
  subject: string;
  body: string;
  status: MessageStatus;
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
    body: string;
    status: MessageStatus;
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
          status: MessageStatus.UNREAD
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
        data: { status: MessageStatus.READ }
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
        data: { status: MessageStatus.UNREAD }
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
        status: MessageStatus.UNREAD
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
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: { 
        members: true,
        hackathon: true
      }
    });

    if (!team) {
      throw new Error('Team not found');
    }

    const messages = await Promise.all(
      team.members.map(member => 
        this.createMessage({
          subject,
          body,
          senderId,
          recipientId: member.id,
          hackathonId: hackathonId || team.hackathonId,
          teamId
        })
      )
    );

    return messages;
  }

  private async sendEmailNotification(message: MessageWithRelations): Promise<void> {
    try {
      const subject = `New Message: ${message.subject}`;
      const emailBody = `
        <h2>You have received a new message</h2>
        <p><strong>From:</strong> ${message.sender?.name || 'System'}</p>
        <p><strong>Subject:</strong> ${message.subject}</p>
        <div style="border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px;">
          ${message.body}
        </div>
        <p>
          <a href="https://hub.hackload.kz/space/messages/${message.id}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Message
          </a>
        </p>
      `;

      await emailService.sendEmail(message.recipient.email, subject, emailBody);
    } catch (error) {
      console.error('Failed to send email notification:', error);
      // Don't throw error - message creation should succeed even if email fails
    }
  }
}

export const messageService = new MessageService();