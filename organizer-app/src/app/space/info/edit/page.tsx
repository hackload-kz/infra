import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { SpaceEditProfileForm } from '@/components/space-edit-profile-form'

export const dynamic = 'force-dynamic'

export default async function SpaceEditProfilePage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  const participant = await db.participant.findFirst({
    where: { 
      user: { email: session.user.email } 
    },
    include: {
      user: true,
      team: true,
      ledTeam: true,
    },
  })

  if (!participant) {
    redirect('/login')
  }

  const user = {
    name: participant.name,
    email: participant.email,
    image: session.user?.image
  }

  return (
    <PersonalCabinetLayout user={user}>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Редактирование <span className="text-amber-400">профиля</span>
        </h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full"></div>
      </div>

      <SpaceEditProfileForm participant={participant} userEmail={session.user.email} />
    </PersonalCabinetLayout>
  )
}