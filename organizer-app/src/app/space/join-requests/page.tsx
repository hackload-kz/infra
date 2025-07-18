import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { JoinRequestsPageClient } from '@/components/join-requests-page-client'

export const dynamic = 'force-dynamic'

export default async function JoinRequestsPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  const participant = await db.participant.findFirst({
    where: { 
      user: { email: session.user.email } 
    },
    include: {
      joinRequests: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              nickname: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  })

  if (!participant) {
    redirect('/login')
  }

  const user = {
    name: participant.name,
    email: participant.email,
    image: session.user?.image || undefined
  }

  return (
    <PersonalCabinetLayout user={user}>
      <JoinRequestsPageClient initialRequests={participant.joinRequests} />
    </PersonalCabinetLayout>
  )
}