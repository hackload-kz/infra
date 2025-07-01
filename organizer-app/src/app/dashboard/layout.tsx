import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { isOrganizer } from '@/lib/admin'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session) {
        redirect('/login')
    }

    // Check if user is an organizer
    if (!isOrganizer(session.user?.email)) {
        redirect('/')
    }

    return (
        <div className="h-screen bg-gray-100 flex flex-col">
            <div className="flex flex-1 min-h-0">
                <Sidebar />
                <div className="flex-1 flex flex-col min-h-0">
                    <main className="flex-1 p-6 bg-white overflow-auto">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    )
}
