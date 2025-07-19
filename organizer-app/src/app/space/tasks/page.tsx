import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { 
  CheckSquare, 
  Square, 
  Flag,
  Circle,
  Settings,
  AlertCircle
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
          environmentData: true
        }
      },
      ledTeam: true,
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

  // Mock tasks data
  const tasks = [
    {
      id: 1,
      title: 'Завершить регистрацию команды',
      description: 'Убедиться, что все участники команды зарегистрированы',
      status: 'completed',
      priority: 'high',
      dueDate: '2025-02-01',
      assignee: 'Вы'
    },
    {
      id: 2,
      title: 'Подготовить техническое задание',
      description: 'Создать подробный план проекта для хакатона',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2025-02-10',
      assignee: participant?.ledTeam ? 'Вы' : 'Лидер команды'
    },
    {
      id: 3,
      title: 'Изучить API документацию',
      description: 'Ознакомиться с доступными API для проекта',
      status: 'todo',
      priority: 'medium',
      dueDate: '2025-02-15',
      assignee: 'Команда'
    },
    {
      id: 4,
      title: 'Настроить среду разработки',
      description: 'Подготовить все необходимые инструменты',
      status: 'todo',
      priority: 'low',
      dueDate: '2025-03-01',
      assignee: 'Каждый участник'
    }
  ]

  const statusLabels = {
    todo: 'К выполнению',
    in_progress: 'В работе',
    completed: 'Завершено'
  }

  const priorityColors = {
    high: 'text-red-400',
    medium: 'text-yellow-400',
    low: 'text-green-400'
  }

  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const totalTasks = tasks.length
  
  const hasTeam = !!(participant?.team || participant?.ledTeam)
  const environmentDataCount = participant?.team?.environmentData?.length || 0

  return (
    <PersonalCabinetLayout user={user} hasTeam={hasTeam}>
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

    </PersonalCabinetLayout>
  )
}