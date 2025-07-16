import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { isOrganizer } from '@/lib/admin'
import CalendarManagementClient from '@/components/calendar-management-client'

export default async function CalendarDashboard() {
  const session = await auth()
  
  if (!session?.user?.email) {
    redirect('/login')
  }

  const isAdmin = await isOrganizer(session.user.email)
  if (!isAdmin) {
    redirect('/space')
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Управление календарём</h1>
        <p className="mt-2 text-gray-600">
          Создание и управление событиями календаря для участников хакатона
        </p>
      </div>
      
      <CalendarManagementClient />
    </div>
  )
}