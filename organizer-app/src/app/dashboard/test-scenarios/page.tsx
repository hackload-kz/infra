import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { isOrganizer } from '@/lib/admin'
import TestScenariosClient from '@/components/test-scenarios-client'

export const dynamic = 'force-dynamic'

export default async function TestScenariosPage() {
  const session = await auth()
  
  if (!session?.user?.email) {
    redirect('/login')
  }

  const organizer = await isOrganizer(session.user.email)
  if (!organizer) {
    redirect('/')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Сценарии тестирования</h1>
        <p className="text-slate-400 mt-2">
          Управление тестовыми сценариями и их шагами
        </p>
      </div>
      
      <TestScenariosClient />
    </div>
  )
}