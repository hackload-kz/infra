import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { isOrganizer } from '@/lib/admin'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { TeamResultsTable } from '@/components/team-results-table'
import { CriteriaTestPanel } from '@/components/criteria-test-panel'
import { getTeamResults, getTeamResultsCount } from '@/lib/team-results'
import { BarChart3, Users, Trophy, TrendingUp } from 'lucide-react'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function ResultsPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  // Check if user is an organizer - only organizers can access results
  const userIsOrganizer = isOrganizer(session.user.email)
  
  if (!userIsOrganizer) {
    redirect('/space')
  }

  // Create user object for layout
  const user = {
    name: session.user.name || 'Организатор',
    email: session.user.email,
    image: session.user?.image || undefined
  }

  // Fetch team results data
  const teamResults = await getTeamResults()
  const stats = await getTeamResultsCount()
  
  // Get approved teams for test panel
  const approvedTeams = await db.team.findMany({
    where: { status: 'APPROVED' },
    select: { id: true, name: true, nickname: true },
    orderBy: { name: 'asc' }
  })

  return (
    <PersonalCabinetLayout user={user} hasTeam={false} isAdmin={true}>
      {/* Page Title */}
      <div className="text-center mb-12">
        <h1 className="text-4xl lg:text-5xl font-extrabold mb-4">
          <span className="text-amber-400">Результаты</span> команд
        </h1>
        <div className="w-24 h-1 bg-amber-400 mx-auto rounded-full"></div>
        <p className="text-slate-300 mt-4 max-w-2xl mx-auto">
          Панель мониторинга критериев оценки для всех утвержденных команд
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
          <div className="flex items-center space-x-3">
            <div className="bg-amber-400/20 p-3 rounded-lg">
              <Users className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Всего команд</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-400/20 p-3 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">С данными</p>
              <p className="text-2xl font-bold text-white">{stats.withData}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
          <div className="flex items-center space-x-3">
            <div className="bg-green-400/20 p-3 rounded-lg">
              <Trophy className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Средний балл</p>
              <p className="text-2xl font-bold text-white">{stats.averageScore.toFixed(1)}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-400/20 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Среднее прохождение</p>
              <p className="text-2xl font-bold text-white">{stats.averagePassed.toFixed(1)}/8</p>
            </div>
          </div>
        </div>
      </div>

      {/* Test Panel for Admins */}
      <CriteriaTestPanel teams={approvedTeams} />

      {/* Results Table */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Таблица результатов</h2>
          <div className="text-sm text-slate-400">
            Данные обновляются в реальном времени через API
          </div>
        </div>
        
        <TeamResultsTable teams={teamResults} />
      </div>
    </PersonalCabinetLayout>
  )
}