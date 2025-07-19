import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { messageService } from '@/lib/messages'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { MessageDetail } from '@/components/message-detail'

export const dynamic = 'force-dynamic'

interface MessagePageProps {
  params: Promise<{ id: string }>
}

export default async function MessagePage({ params }: MessagePageProps) {
  const session = await auth()
  const { id: messageId } = await params

  if (!session?.user?.email) {
    redirect('/login')
  }

  // Check if user is an organizer
  const userIsOrganizer = await isOrganizer(session.user.email)

  const participant = await db.participant.findFirst({
    where: { 
      user: { email: session.user.email } 
    },
    include: {
      user: true,
      team: true,
      ledTeam: true,
      hackathonParticipations: {
        include: {
          hackathon: true
        }
      }
    },
  })

  // If no participant found and user is not an organizer, redirect to login
  if (!participant && !userIsOrganizer) {
    redirect('/login')
  }

  // Get the message
  const message = await messageService.getMessageById(messageId)

  if (!message) {
    redirect('/space/messages')
  }

  // Check access permissions
  if (!userIsOrganizer && participant && message.recipientId !== participant.id) {
    redirect('/space/messages')
  }

  // Auto-mark message as read if user is the recipient and not an admin
  if (!userIsOrganizer && participant && message.recipientId === participant.id && message.status === 'UNREAD') {
    await messageService.markAsRead(messageId, session.user.email)
    // Refresh the message data to get the updated status
    const updatedMessage = await messageService.getMessageById(messageId)
    if (updatedMessage) {
      // Update the message object with the new status
      message.status = updatedMessage.status
    }
  }

  // For organizers without participant data, create a fallback user object
  const user = participant ? {
    name: participant.name,
    email: participant.email,
    image: session.user?.image || undefined
  } : {
    name: session.user.name || 'Организатор',
    email: session.user.email,
    image: session.user?.image || undefined
  }

  const hasTeam = !!(participant?.team || participant?.ledTeam)

  return (
    <PersonalCabinetLayout user={user} hasTeam={hasTeam}>
      <div className="max-w-4xl mx-auto">
        <MessageDetail 
          message={message}
          isAdmin={userIsOrganizer}
        />
      </div>
    </PersonalCabinetLayout>
  )
}