import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { getDocsFileInfo, formatDateTime } from '@/lib/file-utils'
import { 
  Settings,
  AlertCircle,
  CreditCard,
  Ticket,
  CalendarDays,
  BookOpen,
  FileText,
  Clock,
  Scroll,
  ClipboardList,
  Zap,
  Play,
  Activity
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
      team: {
        include: {
          environmentData: true,
          testRuns: {
            where: {
              // Показывать только запуски, созданные участниками команды (не организаторами)
              createdBy: {
                not: null
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              scenario: true
            }
          }
        }
      },
      ledTeam: {
        include: {
          environmentData: true,
          testRuns: {
            where: {
              // Показывать только запуски, созданные участниками команды (не организаторами)
              createdBy: {
                not: null
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              scenario: true
            }
          }
        }
      },
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
  const currentTeam = participant?.team || participant?.ledTeam
  const environmentDataCount = currentTeam?.environmentData?.length || 0
  const recentTestRuns = currentTeam?.testRuns || []
  const totalTestRuns = currentTeam?.testRuns?.length || 0

  return (
    <PersonalCabinetLayout user={user} hasTeam={hasTeam} isAdmin={userIsOrganizer}>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          <span className="text-amber-400">Задание</span>
        </h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full"></div>
      </div>

      {/* Environment Data Quick Access */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/30 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-amber-400/20 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Окружение команды</h3>
              <p className="text-slate-400 text-sm">
                Данные для разработки и развертывания проекта
              </p>
            </div>
          </div>
          <div className="text-right">
            {hasTeam ? (
              <div className="space-y-2">
                <div className="text-sm text-slate-300">
                  Команда: <span className="font-medium text-white">{participant.team?.name}</span>
                </div>
                <div className="text-sm text-slate-300">
                  Параметров: <span className="text-amber-400 font-medium">{environmentDataCount}</span>
                </div>
                <Button asChild size="sm">
                  <Link href="/space/tasks/environment">
                    Перейти к данным
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Нет команды</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/space/teams">Найти</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/space/team">Создать</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Load Testing Section */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/30 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-400/20 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Нагрузочное тестирование</h3>
              <p className="text-slate-400 text-sm">
                Создание и управление тестами производительности
              </p>
            </div>
          </div>
          <div className="text-right">
            {hasTeam ? (
              <div className="space-y-2">
                <div className="text-sm text-slate-300">
                  Команда: <span className="font-medium text-white">{currentTeam?.name}</span>
                </div>
                <div className="text-sm text-slate-300">
                  Запусков тестов: <span className="text-blue-400 font-medium">{totalTestRuns}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/space/load-testing">
                      Все тесты
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/space/load-testing">
                      <Play className="w-4 h-4 mr-1" />
                      Новый тест
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Нет команды</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/space/teams">Найти</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/space/team">Создать</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Recent Test Runs */}
        {hasTeam && recentTestRuns.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-700/30">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-slate-400" />
              <h4 className="text-sm font-medium text-slate-300">Последние запуски</h4>
            </div>
            <div className="space-y-2">
              {recentTestRuns.slice(0, 3).map((testRun) => (
                <div key={testRun.id} className="flex items-center justify-between bg-slate-700/30 rounded p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      testRun.status === 'SUCCEEDED' ? 'bg-green-400' :
                      testRun.status === 'RUNNING' ? 'bg-blue-400' :
                      testRun.status === 'FAILED' ? 'bg-red-400' :
                      'bg-slate-400'
                    }`} />
                    <div>
                      <div className="text-sm font-medium text-white">{testRun.scenario.name}</div>
                      <div className="text-xs text-slate-400">#{testRun.runNumber}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">
                      {new Date(testRun.createdAt).toLocaleDateString('ru-RU')}
                    </div>
                    <div className={`text-xs font-medium ${
                      testRun.status === 'SUCCEEDED' ? 'text-green-400' :
                      testRun.status === 'RUNNING' ? 'text-blue-400' :
                      testRun.status === 'FAILED' ? 'text-red-400' :
                      'text-slate-400'
                    }`}>
                      {testRun.status === 'SUCCEEDED' ? 'Завершен' :
                       testRun.status === 'RUNNING' ? 'Выполняется' :
                       testRun.status === 'FAILED' ? 'Ошибка' :
                       testRun.status === 'PENDING' ? 'Ожидание' :
                       testRun.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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