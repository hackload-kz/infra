import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { MessageList } from '@/components/message-list'

export const dynamic = 'force-dynamic'

export default async function SpaceMessagesPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  // Check if user is an organizer
  const userIsOrganizer = isOrganizer(session.user.email)

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

  // Get the current hackathon (assuming hackload-2025 for now)
  const hackathon = await db.hackathon.findFirst({
    where: { slug: 'hackload-2025' }
  })

  if (!hackathon) {
    redirect('/login')
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            <span className="text-amber-400">Сообщения</span>
          </h1>
          <p className="text-slate-400">
            Ваши сообщения от организаторов и участников команды
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <MessageList hackathonId={hackathon.id} />
        </div>
      </div>
    </PersonalCabinetLayout>
  )
}