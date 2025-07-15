import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { AdminBannerList } from '@/components/admin-banner-list'

export const dynamic = 'force-dynamic'

export default async function DashboardBannersPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  // Check if user is an organizer
  const isAdmin = isOrganizer(session.user.email)
  
  if (!isAdmin) {
    redirect('/space')
  }

  // Get the current hackathon
  const hackathon = await db.hackathon.findFirst({
    where: { slug: 'hackload-2025' }
  })

  if (!hackathon) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <AdminBannerList hackathonId={hackathon.id} />
    </div>
  )
}