'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  ChevronUp, 
  ChevronDown, 
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

interface TestResult {
  userSize: number
  testPassed: boolean
  score: number
  successRate: number
  totalRequests: number
  errorCount: number
  peakRps: number
  p95Latency?: number
  grafanaDashboardUrl: string
  testId: string
  // Booking-specific metrics (optional)
  successfulBookings?: number
  failedBookings?: number
  conflictBookings?: number
  failedSeatRequests?: number
}

interface TeamCriteriaData {
  id: string
  criteriaType: string
  status: 'PASSED' | 'FAILED' | 'NO_DATA'
  score?: number
  lastUpdated: Date
  metrics?: {
    // Common fields
    p95?: number
    successRate?: number
    
    // Load testing specific
    testResults?: TestResult[]
    totalTests?: number
    passedTests?: number
    
    // CODE_REPO specific
    commitsCount?: number
    lastCommitTime?: string
    repositoryUrl?: string
    hasRecentActivity?: boolean
    
    // DEPLOYED_SOLUTION specific
    endpointUrl?: string
    responseTime?: number
    statusCode?: number
    isAccessible?: boolean
    
    // Performance test specific
    testDuration?: number
    userLoad?: number
    
    // TICKET_BOOKING specific
    bookedTickets?: number
    
    // BUDGET_TRACKING specific
    totalSpent?: number
    currency?: string
    breakdown?: Record<string, number>
    
    // Confirmation metadata
    confirmationUrl?: string
    confirmationTitle?: string
    confirmationDescription?: string
    
    [key: string]: unknown
  }
}

interface TeamData {
  id: string
  name: string
  nickname: string
  status: 'APPROVED' | 'IN_REVIEW' | 'FINISHED' | 'NEW' | 'INCOMPLETED' | 'CANCELED' | 'REJECTED'
  criteria: TeamCriteriaData[]
  lastCriteriaUpdate?: Date
  totalScore: number
  passedCriteria: number
}

interface TeamResultsTableProps {
  teams: TeamData[]
}

type SortField = 'name' | 'lastUpdate' | 'totalScore' | 'passedCriteria'
type SortDirection = 'asc' | 'desc'

const criteriaLabels: Record<string, string> = {
  CODE_REPO: 'Код в репозитории',
  DEPLOYED_SOLUTION: 'Развернутое решение',
  EVENT_SEARCH: 'Поиск событий',
  ARCHIVE_SEARCH: 'Архивные события',
  AUTH_PERFORMANCE: 'Аутентификация',
  TICKET_BOOKING: 'Бронирование билетов',
  BUDGET_TRACKING: 'Потраченные средства',
  JUDGE_SCORE: 'Баллы жюри'
}


const StatusDot: React.FC<{ status: 'PASSED' | 'FAILED' | 'NO_DATA' }> = ({ status }) => {
  const colorClass = {
    PASSED: 'bg-green-400',
    FAILED: 'bg-red-400',
    NO_DATA: 'bg-slate-400'
  }[status]

  return <div className={`w-3 h-3 rounded-full ${colorClass}`} />
}

export function TeamResultsTable({ teams }: TeamResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('totalScore')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedTeams = [...teams].sort((a, b) => {
    let aValue: string | number
    let bValue: string | number

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'lastUpdate':
        aValue = a.lastCriteriaUpdate?.getTime() || 0
        bValue = b.lastCriteriaUpdate?.getTime() || 0
        break
      case 'totalScore':
        aValue = a.totalScore
        bValue = b.totalScore
        break
      case 'passedCriteria':
        aValue = a.passedCriteria
        bValue = b.passedCriteria
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return <ChevronUp className="w-4 h-4 text-slate-500" />
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-amber-400" /> : 
      <ChevronDown className="w-4 h-4 text-amber-400" />
  }

  if (teams.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-lg border border-slate-700/30 text-center">
        <div className="w-16 h-16 bg-slate-400/20 rounded-full mx-auto mb-4 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Нет данных</h3>
        <p className="text-slate-400">
          Утвержденные команды с данными критериев не найдены
        </p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/30 overflow-hidden mb-4">
      {/* Table Header */}
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center space-x-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  <span>Команда</span>
                  <SortIcon field="name" />
                </button>
              </th>
              
              {Object.entries(criteriaLabels).map(([key, label]) => (
                <th key={key} className="px-3 py-4 text-center">
                  <div className="text-xs font-medium text-slate-300 whitespace-nowrap">
                    {label}
                  </div>
                </th>
              ))}
              
              
              <th className="px-6 py-4 text-center">
                <button
                  onClick={() => handleSort('totalScore')}
                  className="flex items-center space-x-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  <span>Pts</span>
                  <SortIcon field="totalScore" />
                </button>
              </th>
              
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-700/30">
            {sortedTeams.map((team) => (
              <tr key={team.id} className="hover:bg-slate-700/20 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <Link 
                      href={`/space/teams/${team.id}`}
                      className="text-white font-medium hover:text-amber-400 transition-colors"
                    >
                      {team.name}
                    </Link>
                    <div className="text-sm text-slate-400">@{team.nickname}</div>
                  </div>
                </td>
                
                {Object.keys(criteriaLabels).map((criteriaType) => {
                  const criteria = team.criteria.find(c => c.criteriaType === criteriaType)
                  let status = criteria?.status || 'NO_DATA'
                  
                  // Special handling for AUTH_PERFORMANCE: show green if success rate >= 95%
                  if (criteriaType === 'AUTH_PERFORMANCE' && criteria?.metrics?.successRate !== undefined) {
                    const successRate = typeof criteria.metrics.successRate === 'number' ? criteria.metrics.successRate : 0
                    if (successRate >= 95) {
                      status = 'PASSED'
                    }
                  }
                  
                  // Special handling for BUDGET_TRACKING: always green when there's data
                  if (criteriaType === 'BUDGET_TRACKING' && criteria?.metrics?.hasSpendingData) {
                    status = 'PASSED'
                  }
                  
                  return (
                    <td key={criteriaType} className="px-3 py-4 text-center relative">
                      <div 
                        className="flex flex-col items-center space-y-1 relative group cursor-help"
                        title={`${criteriaLabels[criteriaType]}: ${status === 'PASSED' ? 'Пройдено' : status === 'FAILED' ? 'Не пройдено' : 'Нет данных'}${criteria?.score !== undefined ? ` (${criteria.score} pts)` : ''}`}
                      >
                        {criteriaType !== 'BUDGET_TRACKING' && <StatusDot status={status} />}
                        {criteria?.score !== undefined && (
                          <div className="text-xs text-slate-400">
                            {criteria.score} pts
                          </div>
                        )}
                        
                        {/* Hover tooltip */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-slate-900 border border-slate-700 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 min-w-max max-w-sm whitespace-normal">
                          <div className="font-semibold">{criteriaLabels[criteriaType]}</div>
                          <div className="text-slate-300">
                            Статус: {status === 'PASSED' ? '✅ Пройдено' : status === 'FAILED' ? '❌ Не пройдено' : '⚪ Нет данных'}
                          </div>
                          {criteria?.score !== undefined && (
                            <div className="text-slate-300">Баллы: {criteria.score} pts</div>
                          )}
                          {criteria?.lastUpdated && (
                            <div className="text-slate-400 text-xs">
                              Обновлено: {formatDistanceToNow(criteria.lastUpdated, { locale: ru, addSuffix: true })}
                            </div>
                          )}
                          {/* Show specific metrics in tooltip */}
                          {criteriaType === 'CODE_REPO' && criteria?.metrics && (
                            <div className="text-slate-300 mt-1">
                              {criteria.metrics.commitsCount ? `Коммитов: ${criteria.metrics.commitsCount}` : 'Коммитов: 0'}
                              {criteria.metrics.hasRecentActivity && <div>🔥 Недавняя активность</div>}
                            </div>
                          )}
                          {criteriaType === 'DEPLOYED_SOLUTION' && criteria?.metrics && (
                            <div className="text-slate-300 mt-1">
                              {criteria.metrics.workingEndpoints !== undefined && criteria.metrics.totalEndpoints !== undefined && (
                                <div>API эндпойнты: {criteria.metrics.workingEndpoints}/{criteria.metrics.totalEndpoints} работают</div>
                              )}
                              {criteria.metrics.successRate !== undefined && (
                                <div>Покрытие API: {typeof criteria.metrics.successRate === 'number' ? criteria.metrics.successRate.toFixed(1) : criteria.metrics.successRate}%</div>
                              )}
                              {criteria.metrics.criticalSuccessRate !== undefined && typeof criteria.metrics.criticalSuccessRate === 'number' && (
                                <div>Критические API: {criteria.metrics.criticalSuccessRate.toFixed(1)}%</div>
                              )}
                              {criteria.metrics.responseTime && (
                                <div>Среднее время ответа: {criteria.metrics.responseTime}ms</div>
                              )}
                              {criteria.metrics.statusCode && (
                                <div>Статус: {criteria.metrics.statusCode} {criteria.metrics.isAccessible ? '✅' : '❌'}</div>
                              )}
                              {criteria.metrics.endpointResults && Array.isArray(criteria.metrics.endpointResults) && criteria.metrics.endpointResults.length > 0 && (
                                <div className="mt-1">
                                  <div className="font-medium text-amber-300">Детали API тестирования:</div>
                                  <div className="max-h-32 overflow-y-auto">
                                    {(criteria.metrics.endpointResults as any[])
                                      .filter((endpoint: any) => endpoint.critical)
                                      .map((endpoint: any, idx: number) => (
                                        <div key={idx} className="text-xs">
                                          {endpoint.working ? '✅' : '❌'} {endpoint.method} {endpoint.endpoint}
                                          <span className="text-slate-400"> | {endpoint.statusCode} | {endpoint.responseTime}ms</span>
                                          {endpoint.error && <span className="text-red-400"> | {endpoint.error}</span>}
                                        </div>
                                      ))}
                                    {(criteria.metrics.endpointResults as any[]).filter((endpoint: any) => endpoint.critical).length < (criteria.metrics.endpointResults as any[]).length && (
                                      <div className="text-xs text-slate-400 mt-1">
                                        ... и еще {(criteria.metrics.endpointResults as any[]).length - (criteria.metrics.endpointResults as any[]).filter((endpoint: any) => endpoint.critical).length} некритических эндпойнтов
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {(criteriaType === 'EVENT_SEARCH' || criteriaType === 'ARCHIVE_SEARCH') && criteria?.metrics && (
                            <div className="text-slate-300 mt-1">
                              {criteria.metrics.p95 && <div>P95 латентность: {typeof criteria.metrics.p95 === 'number' ? `${criteria.metrics.p95.toFixed(1)}ms` : `${criteria.metrics.p95}s`}</div>}
                              {criteria.metrics.successRate && <div>Успешность: {criteria.metrics.successRate}%</div>}
                              {criteria.metrics.testResults && Array.isArray(criteria.metrics.testResults) && (
                                <div className="mt-1">
                                  <div className="font-medium text-amber-300">
                                    {criteriaType === 'EVENT_SEARCH' ? 'Результаты тестов событий:' : 'Результаты архивных тестов:'}
                                  </div>
                                  {criteria.metrics.testResults
                                    .filter((test): test is TestResult => typeof test === 'object' && test !== null && 'testPassed' in test && 'userSize' in test)
                                    .map((test, idx) => (
                                      test.testPassed && (
                                        <div key={idx} className="text-xs">
                                          ✅ {test.userSize.toLocaleString()} пользователей ({test.score} pts)
                                          {test.p95Latency && <span className="text-slate-400"> | P95: {test.p95Latency}ms</span>}
                                        </div>
                                      )
                                    ))}
                                  {(() => {
                                    const testResults = criteria.metrics.testResults as TestResult[]
                                    const passedTests = testResults.filter(t => t.testPassed)
                                    const highestUserSize = passedTests.length > 0 ? Math.max(...passedTests.map(t => t.userSize)) : 0
                                    return highestUserSize > 0 ? (
                                      <div className="text-amber-300 text-xs font-medium mt-1">
                                        Максимальная нагрузка: {highestUserSize.toLocaleString()} пользователей
                                      </div>
                                    ) : null
                                  })()}
                                </div>
                              )}
                            </div>
                          )}
                          {criteriaType === 'AUTH_PERFORMANCE' && criteria?.metrics && (
                            <div className="text-slate-300 mt-1">
                              <div className="font-medium text-amber-300">Двухчастное скоринг (макс. 30 баллов):</div>
                              <div className="text-xs text-slate-400 mb-1">15 баллов за ≥42 запросов + 15 баллов за % успеха</div>
                              <div className="text-xs text-green-300 mb-1">🟢 Критерий прохождения ≥95%</div>
                              {criteria.metrics.totalRequests !== undefined && criteria.metrics.expectedRequests && (
                                <div>HTTP запросы: {criteria.metrics.totalRequests}/{criteria.metrics.expectedRequests} {criteria.metrics.totalRequests >= criteria.metrics.expectedRequests ? '✅ +15 баллов' : '❌ +0 баллов'}</div>
                              )}
                              {criteria.metrics.successRate !== undefined && (
                                <div>
                                  Успешность: {typeof criteria.metrics.successRate === 'number' ? criteria.metrics.successRate.toFixed(1) : criteria.metrics.successRate}% 
                                  <span className="text-amber-300"> | +{typeof criteria.metrics.successRate === 'number' ? Math.round((criteria.metrics.successRate / 100) * 15) : 0} баллов</span>
                                </div>
                              )}
                              {criteria.metrics.checksRequired && (
                                <div>K6 Проверки: {criteria.metrics.checksRequired}% требуется</div>
                              )}
                              {criteria.metrics.thresholdsMet !== undefined && (
                                <div>K6 Пороги: {criteria.metrics.thresholdsMet ? '✅ Все пороги пройдены' : '❌ Пороги не пройдены'}</div>
                              )}
                              {criteria.metrics.p95 !== undefined && (
                                <div>P95 латентность: {typeof criteria.metrics.p95 === 'number' ? `${criteria.metrics.p95.toFixed(1)}ms` : `${criteria.metrics.p95}s`}</div>
                              )}
                              {criteria.metrics.testResults && Array.isArray(criteria.metrics.testResults) && criteria.metrics.testResults.length > 0 && (
                                <div className="mt-1">
                                  <div className="font-medium text-amber-300">Последнее выполнение теста:</div>
                                  {criteria.metrics.testResults
                                    .filter((test): test is TestResult => typeof test === 'object' && test !== null && 'testPassed' in test)
                                    .map((test, idx) => (
                                      <div key={idx} className="text-xs">
                                        <div>{test.testPassed ? '✅' : '❌'} K6 Пороги: {test.testPassed ? 'Пройдены' : 'Не пройдены'}</div>
                                        <div className="text-amber-300">Итого баллов: {test.score}/30</div>
                                        {test.p95Latency && <div className="text-slate-400">P95: {test.p95Latency}ms</div>}
                                        {test.totalRequests && <div className="text-slate-400">HTTP запросов: {test.totalRequests}</div>}
                                        {test.successRate !== undefined && <div className="text-slate-400">Успешность: {test.successRate.toFixed(1)}%</div>}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}
                          {criteriaType === 'TICKET_BOOKING' && criteria?.metrics && (
                            <div className="text-slate-300 mt-1">
                              <div className="font-medium text-amber-300">Бронирование билетов (макс. 30 баллов):</div>
                              <div className="text-xs text-slate-400 mb-1">Требуется ≥95% успешности для прохождения</div>
                              {criteria.metrics.bookedTickets !== undefined && (
                                <div>Успешно забронировано: {criteria.metrics.bookedTickets} билетов</div>
                              )}
                              {criteria.metrics.successRate !== undefined && (
                                <div>
                                  Успешность бронирования: {typeof criteria.metrics.successRate === 'number' ? criteria.metrics.successRate.toFixed(1) : criteria.metrics.successRate}%
                                  <span className={`ml-2 ${typeof criteria.metrics.successRate === 'number' && criteria.metrics.successRate >= 95 ? 'text-green-400' : 'text-red-400'}`}>
                                    {typeof criteria.metrics.successRate === 'number' && criteria.metrics.successRate >= 95 ? '✅ Пройдено' : '❌ Не пройдено'}
                                  </span>
                                </div>
                              )}
                              {criteria.metrics.p95 !== undefined && (
                                <div>P95 латентность: {typeof criteria.metrics.p95 === 'number' ? `${criteria.metrics.p95.toFixed(1)}ms` : `${criteria.metrics.p95}s`}</div>
                              )}
                              {criteria.metrics.testResults && Array.isArray(criteria.metrics.testResults) && criteria.metrics.testResults.length > 0 && (
                                <div className="mt-1">
                                  <div className="font-medium text-amber-300">Последнее выполнение теста:</div>
                                  {criteria.metrics.testResults
                                    .filter((test): test is TestResult => typeof test === 'object' && test !== null && 'testPassed' in test)
                                    .map((test, idx) => (
                                      <div key={idx} className="text-xs">
                                        <div>{test.testPassed ? '✅' : '❌'} Тест: {test.testPassed ? 'Пройден' : 'Не пройден'}</div>
                                        <div className="text-amber-300">Итого баллов: {test.score}/30</div>
                                        <div className="text-slate-400">Успешность: {test.successRate.toFixed(1)}%</div>
                                        {test.successfulBookings !== undefined && (
                                          <div className="text-slate-400">Успешных бронирований: {test.successfulBookings}</div>
                                        )}
                                        {test.failedBookings !== undefined && (
                                          <div className="text-slate-400">Неудачных бронирований: {test.failedBookings}</div>
                                        )}
                                        {test.conflictBookings !== undefined && (
                                          <div className="text-slate-400">Конфликтов мест: {test.conflictBookings}</div>
                                        )}
                                        {test.failedSeatRequests !== undefined && (
                                          <div className="text-slate-400">Ошибки получения мест: {test.failedSeatRequests}</div>
                                        )}
                                        {test.p95Latency && <div className="text-slate-400">P95: {test.p95Latency}ms</div>}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}
                          {criteriaType === 'BUDGET_TRACKING' && criteria?.metrics && (
                            <div className="text-slate-300 mt-1">
                              <div className="font-medium text-amber-300">Потраченные средства (макс. 30 баллов):</div>
                              <div className="text-xs text-green-300 mb-1">🟢 Всегда зеленая при наличии данных</div>
                              <div>Потрачено: {criteria.metrics.totalSpent || 0} KZT</div>
                              <div className="text-xs text-slate-400">Скоринг: меньше потратил = больше баллов</div>
                              <div className="text-xs text-slate-400">Минимум трат = 30 баллов, максимум = 5 баллов</div>
                            </div>
                          )}
                          {criteriaType === 'JUDGE_SCORE' && criteria?.metrics && (
                            <div className="text-slate-300 mt-1">
                              <div className="font-medium text-amber-300">Баллы жюри (макс. 10 баллов):</div>
                              {criteria.metrics.hasJudgeScore ? (
                                <div>Оценка жюри: {criteria.metrics.judgeScore}/10 баллов</div>
                              ) : (
                                <div className="text-slate-400">0</div>
                              )}
                            </div>
                          )}
                          {/* Arrow pointing up */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-slate-900"></div>
                        </div>
                        {/* Show specific metrics based on criteria type */}
                        {criteriaType === 'CODE_REPO' && criteria?.metrics && (
                          <div className="text-xs text-slate-400">
                            {criteria.metrics.commitsCount ? `${criteria.metrics.commitsCount} коммитов` : 'Нет коммитов'}
                          </div>
                        )}
                        {criteriaType === 'DEPLOYED_SOLUTION' && criteria?.metrics && (
                          <div className="text-xs text-slate-400">
                            {typeof criteria.metrics.successRate === 'number' ? 
                              `${criteria.metrics.successRate.toFixed(0)}% API` : 
                              (typeof criteria.metrics.responseTime === 'number' ? `${criteria.metrics.responseTime}ms` : 'Нет ответа')
                            }
                          </div>
                        )}
                        {criteriaType === 'EVENT_SEARCH' && criteria?.metrics && (
                          <div className="text-xs text-slate-400">
                            {criteria.metrics.p95 ? `P95: ${typeof criteria.metrics.p95 === 'number' ? `${criteria.metrics.p95.toFixed(1)}ms` : `${criteria.metrics.p95}s`}` : 'P95: N/A'}
                          </div>
                        )}
                        {criteriaType === 'ARCHIVE_SEARCH' && criteria?.metrics && (
                          <div className="text-xs text-slate-400">
                            {criteria.metrics.p95 ? `P95: ${typeof criteria.metrics.p95 === 'number' ? `${criteria.metrics.p95.toFixed(1)}ms` : `${criteria.metrics.p95}s`}` : 'P95: N/A'}
                          </div>
                        )}
                        {criteriaType === 'AUTH_PERFORMANCE' && criteria?.metrics && (
                          <div className="text-xs text-slate-400">
                            {criteria.metrics.thresholdsMet !== undefined ? 
                              (criteria.metrics.thresholdsMet ? '✅ Пороги' : '❌ Пороги') : 
                              (criteria.metrics.successRate !== undefined ? 
                                `${typeof criteria.metrics.successRate === 'number' ? criteria.metrics.successRate.toFixed(1) : criteria.metrics.successRate}% провер.` : 
                                (criteria.metrics.p95 ? `P95: ${typeof criteria.metrics.p95 === 'number' ? `${criteria.metrics.p95.toFixed(1)}ms` : `${criteria.metrics.p95}s`}` : 'P95: N/A')
                              )
                            }
                          </div>
                        )}
                        {criteriaType === 'TICKET_BOOKING' && criteria?.metrics && (
                          <div className="text-xs text-slate-400">
                            {criteria.metrics.successRate !== undefined ? 
                              `${typeof criteria.metrics.successRate === 'number' ? criteria.metrics.successRate.toFixed(1) : criteria.metrics.successRate}% успех` : 
                              `${criteria.metrics.bookedTickets || 0} билетов`
                            }
                          </div>
                        )}
                        {criteriaType === 'BUDGET_TRACKING' && criteria?.metrics && (
                          <div className="text-xs text-slate-400">
                            {criteria.metrics.totalSpent || 0} KZT
                          </div>
                        )}
                        {criteriaType === 'JUDGE_SCORE' && criteria?.metrics?.hasJudgeScore && (
                          <div className="text-xs text-slate-400">
                            {criteria.metrics.judgeScore}/10
                          </div>
                        )}
                        {criteria?.lastUpdated && criteria.lastUpdated.getTime() > 0 && (
                          <div className="text-xs text-slate-500">
                            {formatDistanceToNow(criteria.lastUpdated, { locale: ru, addSuffix: true })}
                          </div>
                        )}
                        {/* Confirmation link */}
                        {criteria?.metrics?.confirmationUrl && (
                          <div className="mt-1">
                            <a
                              href={criteria.metrics.confirmationUrl as string}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                              title={(criteria.metrics.confirmationTitle as string) || 'Ссылка подтверждения'}
                            >
                              <ExternalLink size={10} />
                              {(criteria.metrics.confirmationTitle as string) || 'Подтвердить'}
                            </a>
                            {criteria.metrics.confirmationDescription && (
                              <div className="text-xs text-slate-500 mt-0.5 max-w-20 truncate" title={criteria.metrics.confirmationDescription as string}>
                                {criteria.metrics.confirmationDescription as string}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  )
                })}
                
                
                <td className="px-6 py-4 text-center">
                  <div className="text-white font-medium">
                    {team.totalScore}
                  </div>
                </td>
                
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Table Footer */}
      <div className="px-6 py-4 bg-slate-700/30 border-t border-slate-700/30">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <div>
            Показано команд: {teams.length}
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <StatusDot status="PASSED" />
              <span>Пройдено</span>
            </div>
            <div className="flex items-center space-x-2">
              <StatusDot status="FAILED" />
              <span>Не пройдено</span>
            </div>
            <div className="flex items-center space-x-2">
              <StatusDot status="NO_DATA" />
              <span>Нет данных</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}