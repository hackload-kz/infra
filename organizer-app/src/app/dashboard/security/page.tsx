import { auth } from '@/auth'
import { isOrganizer } from '@/lib/admin'
import { redirect } from 'next/navigation'
import { ServiceKeyManagement } from '@/components/admin/service-key-management'

export default async function SecurityPage() {
  const session = await auth()
  
  if (!session?.user?.email) {
    redirect('/login')
  }

  const isOrganizerUser = await isOrganizer(session.user.email)
  if (!isOrganizerUser) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Безопасность</h1>
        <p className="mt-2 text-sm text-gray-600">
          Управление API ключами и мониторинг безопасности системы
        </p>
      </div>

      <ServiceKeyManagement />
    </div>
  )
}