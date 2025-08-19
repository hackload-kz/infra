import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { getDocsFileInfo, formatDateTime } from '@/lib/file-utils'
import { 
  CreditCard,
  Ticket,
  CalendarDays,
  BookOpen,
  FileText,
  Clock,
  Scroll,
  ClipboardList
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SpaceTasksPage() {
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
      ledTeam: true
    },
  })

  // If no participant found and user is not an organizer, redirect to login
  if (!participant && !userIsOrganizer) {
    redirect('/login')
  }

  // For organizers without participant data, create a fallback user object
  const user = participant ? {
    name: participant.name,
    email: participant.email,
    image: session.user?.image || undefined
  } : {
    name: session.user.name || 'Organizer',
    email: session.user.email || '',
    image: session.user?.image || undefined
  }

  // Get file information for documentation files
  const [paymentGatewayInfo, billetterApiInfo, eventProviderInfo, projectRequirementsInfo, eventLegendInfo] = await Promise.all([
    getDocsFileInfo('payment-gateway.md'),
    getDocsFileInfo('billetter-api.md'),
    getDocsFileInfo('event-provider.md'),
    getDocsFileInfo('project-requirements.md'),
    getDocsFileInfo('event-legend.md')
  ])
  
  const hasTeam = !!(participant?.team || participant?.ledTeam)

  return (
    <PersonalCabinetLayout user={user} hasTeam={hasTeam} isAdmin={userIsOrganizer}>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          <span className="text-amber-400">Задание</span>
        </h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full"></div>
      </div>


      {/* Requirements Section */}
      <div className="space-y-6 mb-12">
        <div className="flex items-center gap-3 mb-6">
          <ClipboardList className="w-6 h-6 text-amber-400" />
          <h2 className="text-2xl font-bold text-white">Требования</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project Requirements Documentation */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/30 p-6 hover:bg-slate-800/70 transition-colors">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-orange-400/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Требования к проекту</h3>
                <p className="text-slate-400 text-sm">Техническое задание</p>
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span className="text-slate-500 text-xs">
                    {formatDateTime(projectRequirementsInfo.commitDate || projectRequirementsInfo.lastModified)}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              Полное техническое задание, критерии оценки и требования к проектам участников.
            </p>
            <Button asChild size="sm" className="w-full">
              <Link href="/space/tasks/project-requirements">
                Открыть документацию
              </Link>
            </Button>
          </div>

          {/* Event Legend Documentation */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/30 p-6 hover:bg-slate-800/70 transition-colors">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-indigo-400/20 rounded-lg flex items-center justify-center">
                <Scroll className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Легенда мероприятия</h3>
                <p className="text-slate-400 text-sm">Сценарий хакатона</p>
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span className="text-slate-500 text-xs">
                    {formatDateTime(eventLegendInfo.commitDate || eventLegendInfo.lastModified)}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              Погрузитесь в атмосферу хакатона и узнайте контекст задач, которые предстоит решить.
            </p>
            <Button asChild size="sm" className="w-full">
              <Link href="/space/tasks/event-legend">
                Открыть документацию
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* API Documentation Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="w-6 h-6 text-amber-400" />
          <h2 className="text-2xl font-bold text-white">Документация API</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Payment Gateway Documentation */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/30 p-6 hover:bg-slate-800/70 transition-colors">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-green-400/20 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Payment Gateway</h3>
                <p className="text-slate-400 text-sm">Интеграция с платежным шлюзом</p>
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span className="text-slate-500 text-xs">
                    {formatDateTime(paymentGatewayInfo.commitDate || paymentGatewayInfo.lastModified)}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              Руководство по интеграции платежного шлюза, обработке платежей и управлению транзакциями.
            </p>
            <Button asChild size="sm" className="w-full">
              <Link href="/space/tasks/payment-gateway">
                Открыть документацию
              </Link>
            </Button>
          </div>

          {/* Billetter API Documentation */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/30 p-6 hover:bg-slate-800/70 transition-colors">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-blue-400/20 rounded-lg flex items-center justify-center">
                <Ticket className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Billetter API</h3>
                <p className="text-slate-400 text-sm">API управления билетами</p>
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span className="text-slate-500 text-xs">
                    {formatDateTime(billetterApiInfo.commitDate || billetterApiInfo.lastModified)}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              Документация API для управления билетами, регистрацией участников и валидацией QR-кодов.
            </p>
            <Button asChild size="sm" className="w-full">
              <Link href="/space/tasks/billetter-api">
                Открыть документацию
              </Link>
            </Button>
          </div>

          {/* Event Provider Documentation */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/30 p-6 hover:bg-slate-800/70 transition-colors">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-purple-400/20 rounded-lg flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Event Provider</h3>
                <p className="text-slate-400 text-sm">Провайдер управления событиями</p>
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span className="text-slate-500 text-xs">
                    {formatDateTime(eventProviderInfo.commitDate || eventProviderInfo.lastModified)}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              Руководство по интеграции с внешними платформами управления событиями и синхронизации данных.
            </p>
            <Button asChild size="sm" className="w-full">
              <Link href="/space/tasks/event-provider">
                Открыть документацию
              </Link>
            </Button>
          </div>
        </div>
      </div>

    </PersonalCabinetLayout>
  )
}