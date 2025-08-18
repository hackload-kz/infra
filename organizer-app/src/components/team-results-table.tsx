'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  ChevronUp, 
  ChevronDown, 
  Clock, 
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

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
    
    // TICKET_BOOKING/CANCELLATION specific
    bookedTickets?: number
    cancelledTickets?: number
    
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
  TICKET_CANCELLATION: 'Отмена билетов',
  BUDGET_TRACKING: 'Потраченные средства'
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
  const [sortField, setSortField] = useState<SortField>('lastUpdate')
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
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/30 overflow-hidden">
      {/* Table Header */}
      <div className="overflow-x-auto">
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
                  onClick={() => handleSort('passedCriteria')}
                  className="flex items-center space-x-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  <span>Пройдено</span>
                  <SortIcon field="passedCriteria" />
                </button>
              </th>
              
              <th className="px-6 py-4 text-center">
                <button
                  onClick={() => handleSort('totalScore')}
                  className="flex items-center space-x-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  <span>Баллы</span>
                  <SortIcon field="totalScore" />
                </button>
              </th>
              
              <th className="px-6 py-4 text-center">
                <button
                  onClick={() => handleSort('lastUpdate')}
                  className="flex items-center space-x-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  <span>Обновлено</span>
                  <SortIcon field="lastUpdate" />
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
                  const status = criteria?.status || 'NO_DATA'
                  
                  return (
                    <td key={criteriaType} className="px-3 py-4 text-center">
                      <div className="flex flex-col items-center space-y-1">
                        <StatusDot status={status} />
                        {criteria?.score !== undefined && (
                          <div className="text-xs text-slate-400">
                            {criteria.score} балл{criteria.score === 1 ? '' : 'а'}
                          </div>
                        )}
                        {/* Show specific metrics based on criteria type */}
                        {criteriaType === 'CODE_REPO' && criteria?.metrics && (
                          <div className="text-xs text-slate-400">
                            {criteria.metrics.commitsCount ? `${criteria.metrics.commitsCount} коммитов` : 'Нет коммитов'}
                          </div>
                        )}
                        {criteriaType === 'DEPLOYED_SOLUTION' && criteria?.metrics && (
                          <div className="text-xs text-slate-400">
                            {criteria.metrics.responseTime ? `${criteria.metrics.responseTime}ms` : 'Нет ответа'}
                          </div>
                        )}
                        {criteriaType === 'EVENT_SEARCH' && criteria?.metrics && (
                          <div className="text-xs text-slate-400">
                            P95: {criteria.metrics.p95 || 'N/A'}s
                          </div>
                        )}
                        {criteriaType === 'ARCHIVE_SEARCH' && criteria?.metrics && (
                          <div className="text-xs text-slate-400">
                            P95: {criteria.metrics.p95 || 'N/A'}s
                          </div>
                        )}
                        {criteriaType === 'AUTH_PERFORMANCE' && criteria?.metrics && (
                          <div className="text-xs text-slate-400">
                            P95: {criteria.metrics.p95 || 'N/A'}s
                          </div>
                        )}
                        {criteriaType === 'TICKET_BOOKING' && criteria?.metrics && (
                          <div className="text-xs text-slate-400">
                            {criteria.metrics.bookedTickets || 0} билетов
                          </div>
                        )}
                        {criteriaType === 'TICKET_CANCELLATION' && criteria?.metrics && (
                          <div className="text-xs text-slate-400">
                            {criteria.metrics.cancelledTickets || 0} отменено
                          </div>
                        )}
                        {criteriaType === 'BUDGET_TRACKING' && criteria?.metrics && (
                          <div className="text-xs text-slate-400">
                            ${criteria.metrics.totalSpent || 0}
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
                    {team.passedCriteria}/{Object.keys(criteriaLabels).length}
                  </div>
                </td>
                
                <td className="px-6 py-4 text-center">
                  <div className="text-white font-medium">
                    {team.totalScore}
                  </div>
                </td>
                
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-300">
                      {team.lastCriteriaUpdate 
                        ? formatDistanceToNow(team.lastCriteriaUpdate, { locale: ru, addSuffix: true })
                        : 'Нет данных'
                      }
                    </span>
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