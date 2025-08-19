import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { isOrganizer } from '@/lib/admin'
import { getCurrentHackathon, isHackathonStarted } from '@/lib/hackathon'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { TeamResultsTable } from '@/components/team-results-table'
import { CriteriaTestPanel } from '@/components/criteria-test-panel'
import { getTeamResults, getTeamResultsCount } from '@/lib/team-results'
import { BarChart3, Users, Trophy, TrendingUp, ChevronDown, ChevronUp, GitBranch, Globe, Zap } from 'lucide-react'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ResultsPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  // Get current hackathon to check if it has started
  const hackathon = await getCurrentHackathon()
  if (!hackathon) {
    redirect('/space')
  }

  // Check access permissions: allow organizers always, or registered users after hackathon starts
  const userIsOrganizer = isOrganizer(session.user.email)
  const hackathonStarted = isHackathonStarted(hackathon)
  
  if (!userIsOrganizer && !hackathonStarted) {
    redirect('/space')
  }

  // Get user participant data to determine team status
  const participant = await db.participant.findFirst({
    where: { 
      user: { email: session.user.email } 
    },
    include: {
      team: true,
      ledTeam: true
    }
  })

  // Create user object for layout
  const user = participant ? {
    name: participant.name,
    email: participant.email,
    image: session.user?.image || undefined
  } : {
    name: session.user.name || 'Организатор',
    email: session.user.email,
    image: session.user?.image || undefined
  }

  // Determine if user has team
  const hasTeam = !!(participant?.team || participant?.ledTeam)

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
    <PersonalCabinetLayout user={user} hasTeam={hasTeam} isAdmin={true}>
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

      {/* Scoring Criteria Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Repository Scoring Criteria */}
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-400/20 p-3 rounded-lg">
                  <GitBranch className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Критерии оценки репозитория</h3>
                  <p className="text-slate-400 text-sm">Как рассчитываются баллы за код</p>
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-slate-400 group-open:hidden" />
              <ChevronUp className="w-5 h-5 text-slate-400 hidden group-open:block" />
            </summary>
            
            <div className="mt-4 pt-4 border-t border-slate-700/30 space-y-4">
              <div className="space-y-3">
                <h4 className="text-amber-400 font-medium">Статусы оценки:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-400">✓ PASSED (100 баллов)</span>
                    <span className="text-slate-400">≥2 коммитов + активность за 1 день</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-400">✗ FAILED (10-99 баллов)</span>
                    <span className="text-slate-400">Частичные баллы за активность</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">- NO_DATA (0 баллов)</span>
                    <span className="text-slate-400">Репозиторий не найден</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-amber-400 font-medium">Расчет баллов для FAILED:</h4>
                <div className="text-sm text-slate-300 space-y-1">
                  <div>• <strong>Базовые 10 баллов</strong> за наличие репозитория</div>
                  <div>• <strong>До 70 баллов</strong> за количество коммитов (линейная шкала до 5 коммитов)</div>
                  <div>• <strong>+10 баллов</strong> бонус за активность в последний день</div>
                  <div>• <strong>Максимум 99 баллов</strong> (отличие от полного прохождения)</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-amber-400 font-medium">Проверяемые метрики:</h4>
                <div className="text-sm text-slate-300 space-y-1">
                  <div>• Количество коммитов с 15 августа 2025</div>
                  <div>• Время последнего коммита</div>
                  <div>• Активность в последний день</div>
                  <div>• Доступность репозитория для проверки</div>
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Deployment Scoring Criteria */}
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <div className="flex items-center space-x-3">
                <div className="bg-green-400/20 p-3 rounded-lg">
                  <Globe className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Критерии оценки деплоя</h3>
                  <p className="text-slate-400 text-sm">Как рассчитываются баллы за развертывание</p>
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-slate-400 group-open:hidden" />
              <ChevronUp className="w-5 h-5 text-slate-400 hidden group-open:block" />
            </summary>
            
            <div className="mt-4 pt-4 border-t border-slate-700/30 space-y-4">
              <div className="space-y-3">
                <h4 className="text-amber-400 font-medium">Статусы оценки:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-400">✓ PASSED (90-110 баллов)</span>
                    <span className="text-slate-400">HTTP/HTTPS отвечают статусом 200</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-400">✓ PARTIAL (90 баллов)</span>
                    <span className="text-slate-400">Только HTTP работает (-10 штраф)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-400">✗ FAILED (0-80 баллов)</span>
                    <span className="text-slate-400">Частичные баллы за попытку деплоя</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">- NO_DATA (0 баллов)</span>
                    <span className="text-slate-400">Endpoint не указан или DNS не найден</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-amber-400 font-medium">Логика тестирования протоколов:</h4>
                <div className="text-sm text-slate-300 space-y-1">
                  <div>• <strong>Проверяются оба протокола:</strong> HTTP и HTTPS автоматически</div>
                  <div>• <strong>Если HTTP и HTTPS работают:</strong> 110 баллов (предпочтение HTTPS + бонус)</div>
                  <div>• <strong>Если только HTTP работает:</strong> 90 баллов (тест проходит, но штраф -10 за отсутствие HTTPS)</div>
                  <div>• <strong>Если только HTTPS работает:</strong> 110 баллов (идеальный результат + бонус)</div>
                  <div>• <strong>Если ни один не работает:</strong> проверяется HTTPS для остальной логики</div>
                  <div>• <strong>Статус в результатах:</strong> отображает какие протоколы доступны</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-amber-400 font-medium">Частичные баллы для FAILED:</h4>
                <div className="text-sm text-slate-300 space-y-1">
                  <div>• <strong>+30 баллов</strong> за указанный endpoint</div>
                  <div>• <strong>+20 баллов</strong> за получение ответа (любого статуса)</div>
                  <div>• <strong>+10 баллов</strong> за время ответа &lt;10 секунд</div>
                  <div>• <strong>+20 баллов</strong> за HTTP ошибки 4xx/5xx (признак деплоя)</div>
                  <div>• <strong>Максимум 80 баллов</strong> (отличие от полного прохождения)</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-amber-400 font-medium">Проверяемый endpoint:</h4>
                <div className="text-sm text-slate-300 space-y-1">
                  <div>• <strong>/api/events?page=1&pageSize=20</strong></div>
                  <div>• Проверка DNS разрешения домена</div>
                  <div>• Время ответа и статус код</div>
                  <div>• Валидность JSON ответа</div>
                  <div>• Структура данных ответа</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-amber-400 font-medium">Отображение статуса протокола:</h4>
                <div className="text-sm text-slate-300 space-y-1">
                  <div>• <strong>&ldquo;Оба HTTP и HTTPS работают (предпочтение HTTPS)&rdquo;</strong> - идеальное состояние</div>
                  <div>• <strong>&ldquo;Только HTTP работает (нет HTTPS)&rdquo;</strong> - работает, но есть штраф</div>
                  <div>• <strong>&ldquo;Только HTTPS работает&rdquo;</strong> - рекомендуемое состояние</div>
                  <div>• <strong>&ldquo;Не доступен&rdquo;</strong> - ни один протокол не работает</div>
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Load Testing Scoring Criteria */}
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <div className="flex items-center space-x-3">
                <div className="bg-amber-400/20 p-3 rounded-lg">
                  <Zap className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Критерии нагрузочного тестирования</h3>
                  <p className="text-slate-400 text-sm">Оценка производительности &ldquo;Get Events&rdquo;</p>
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-slate-400 group-open:hidden" />
              <ChevronUp className="w-5 h-5 text-slate-400 hidden group-open:block" />
            </summary>
            
            <div className="mt-4 pt-4 border-t border-slate-700/30 space-y-4">
              <div className="space-y-3">
                <h4 className="text-amber-400 font-medium">Статусы оценки:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-400">✓ PASSED</span>
                    <span className="text-slate-400">≥95% успешных запросов</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-400">✗ FAILED</span>
                    <span className="text-slate-400">&lt;95% успешных запросов</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">- NO_DATA</span>
                    <span className="text-slate-400">Тесты не найдены</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-amber-400 font-medium">Уровни нагрузки и баллы:</h4>
                <div className="text-sm text-slate-300 space-y-1">
                  <div>• <strong>1,000 пользователей</strong> = 10 баллов при прохождении</div>
                  <div>• <strong>5,000 пользователей</strong> = 20 баллов при прохождении</div>
                  <div>• <strong>25,000 пользователей</strong> = 30 баллов при прохождении</div>
                  <div>• <strong>50,000 пользователей</strong> = 40 баллов при прохождении</div>
                  <div>• <strong>100,000 пользователей</strong> = 50 баллов при прохождении</div>
                  <div className="mt-2 pt-2 border-t border-slate-600/30">
                    <strong>Максимум: 150 баллов</strong> (все тесты пройдены)
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-amber-400 font-medium">Формат тестов:</h4>
                <div className="text-sm text-slate-300 space-y-1">
                  <div>• <strong>Test ID:</strong> {`<teamSlug>-events-<userSize>-events-<testid>`}</div>
                  <div>• <strong>Endpoint:</strong> /api/events</div>
                  <div>• <strong>Критерий прохождения:</strong> 95% успешных запросов</div>
                  <div>• <strong>Мониторинг:</strong> <a href="https://hub.hackload.kz/grafana/d/a3b2aaa8-bb66-4008-a1d8-16c49afedbf0/k6-prometheus-native-histograms" target="_blank" className="text-amber-400 hover:text-amber-300 underline">Grafana Dashboard</a></div>
                  <div>• <strong>Период данных:</strong> с 15 августа 2025 (начало хакатона) по настоящее время</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-amber-400 font-medium">Prometheus метрики:</h4>
                <div className="text-sm text-slate-300 space-y-1">
                  <div>• <strong>Всего запросов:</strong> sum(k6_http_reqs_total{`{testid=~"$testid"}`})</div>
                  <div>• <strong>Неудачные запросы:</strong> sum(k6_http_reqs_total{`{testid=~"$testid", expected_response="false"}`})</div>
                  <div>• <strong>Пиковый RPS:</strong> max(sum(irate(k6_http_reqs_total{`{testid=~"$testid"}`}[1m])))</div>
                  <div>• <strong>Успешность:</strong> (всего - неудачные) / всего * 100%</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-amber-400 font-medium">Примеры Test ID:</h4>
                <div className="text-sm text-slate-300 space-y-1">
                  <div>• rorobotics-events-5000-events-62</div>
                  <div>• drim-dev-events-1000-events-25 (если 1000 пользователей)</div>
                  <div>• metaload-akbori-events-10000-events-45 (если 10000 пользователей)</div>
                  <div>• {`<teamSlug>-events-<userSize>-events-<testid>`} - общий формат</div>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* Test Panel for Admins (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <CriteriaTestPanel teams={approvedTeams} />
      )}

      {/* Results Table */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Таблица результатов</h2>
          <div className="text-sm text-slate-400">
            Данные обновляются каждый час
          </div>
        </div>
        
        <TeamResultsTable teams={teamResults} />
      </div>
    </PersonalCabinetLayout>
  )
}