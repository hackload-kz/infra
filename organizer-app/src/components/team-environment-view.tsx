'use client'

import Link from 'next/link'
import { 
  Users, 
  Eye, 
  EyeOff, 
  Copy, 
  FileText, 
  Database, 
  Github, 
  Cloud, 
  Key,
  Settings
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface TeamEnvironmentData {
  id: string
  key: string
  value: string
  description: string | null
  category: string | null
  isSecure: boolean
  createdAt: Date
  updatedAt: Date
}

interface Team {
  id: string
  name: string
  nickname: string
  environmentData: TeamEnvironmentData[]
}

interface Participant {
  id: string
  name: string
  team?: Team | null
}

interface TeamEnvironmentViewProps {
  participant: Participant
  isOrganizer: boolean
}

const getCategoryIcon = (category?: string) => {
  switch (category?.toLowerCase()) {
    case 'git':
      return <Github className="w-4 h-4" />
    case 'database':
      return <Database className="w-4 h-4" />
    case 'infrastructure':
    case 'cloud':
      return <Cloud className="w-4 h-4" />
    case 'credentials':
    case 'security':
      return <Key className="w-4 h-4" />
    default:
      return <Settings className="w-4 h-4" />
  }
}

const getCategoryColor = (category?: string) => {
  switch (category?.toLowerCase()) {
    case 'git':
      return 'bg-orange-100 text-orange-800'
    case 'database':
      return 'bg-purple-100 text-purple-800'
    case 'infrastructure':
    case 'cloud':
      return 'bg-blue-100 text-blue-800'
    case 'credentials':
    case 'security':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function TeamEnvironmentView({ participant, isOrganizer }: TeamEnvironmentViewProps) {
  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set())

  if (!participant?.team) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-lg border border-slate-700/30 text-center">
        <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">
          Вы не состоите в команде
        </h3>
        <p className="text-slate-400 mb-4">
          Чтобы получить доступ к данным окружения, вам необходимо вступить в команду или создать свою.
        </p>
        <div className="flex gap-2 justify-center">
          <Link href="/space/teams" className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-150">
            Найти команду
          </Link>
          <Link href="/space/team" className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors duration-150">
            Создать команду
          </Link>
        </div>
      </div>
    )
  }

  const { team } = participant
  const environmentData = team.environmentData || []

  // Group data by category
  const groupedData = environmentData.reduce((acc, item) => {
    const category = item.category || 'Общие'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, TeamEnvironmentData[]>)

  const toggleValueVisibility = (entryId: string) => {
    const newVisible = new Set(visibleValues)
    if (newVisible.has(entryId)) {
      newVisible.delete(entryId)
    } else {
      newVisible.add(entryId)
    }
    setVisibleValues(newVisible)
  }

  const copyToClipboard = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`Значение "${key}" скопировано в буфер обмена`)
    } catch {
      toast.error('Не удалось скопировать значение')
    }
  }

  const maskValue = (value: string, isSecure: boolean, isVisible: boolean) => {
    if (!isSecure || (isOrganizer && isVisible)) {
      return value
    }
    if (isSecure && !isVisible) {
      return '***'
    }
    if (value.length <= 8) return '***'
    return value.substring(0, 4) + '***' + value.substring(value.length - 4)
  }

  if (environmentData.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-lg border border-slate-700/30 text-center">
        <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">
          Нет данных окружения
        </h3>
        <p className="text-slate-400 mb-4">
          Организаторы еще не добавили данные окружения для команды &quot;{team.name}&quot;.
          Данные будут появляться здесь по мере их добавления.
        </p>
        {isOrganizer && (
          <Link href="/dashboard/teams" className="inline-block bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-3 rounded-lg font-medium transition-colors duration-150">
            Управление командами
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Team Info */}
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
        <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          Команда: {team.name}
        </h2>
        <p className="text-slate-400">
          Slug: <code className="bg-slate-700/50 px-2 py-1 rounded text-amber-400">{team.nickname}</code>
        </p>
      </div>

      {/* Environment Data by Category */}
      {Object.entries(groupedData).map(([category, items]) => (
        <div key={category} className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/30">
          <div className="p-6 border-b border-slate-700/30">
            <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
              {getCategoryIcon(category)}
              {category}
            </h3>
            <p className="text-slate-400">
              {items.length} {items.length === 1 ? 'параметр' : 'параметра'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-600/30 bg-slate-700/30">
                  <th className="text-left p-3 font-medium text-white">Ключ</th>
                  <th className="text-left p-3 font-medium text-white">Значение</th>
                  <th className="text-left p-3 font-medium text-white">Описание</th>
                  <th className="text-left p-3 font-medium text-white">Обновлено</th>
                  <th className="text-right p-3 font-medium text-white">Действия</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isVisible = visibleValues.has(item.id)
                  const displayValue = maskValue(item.value, item.isSecure, isVisible)
                  
                  return (
                    <tr key={item.id} className="border-b border-slate-600/30 hover:bg-slate-700/20">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{item.key}</span>
                          {item.category && (
                            <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(item.category)}`}>
                              {item.category}
                            </span>
                          )}
                          {item.isSecure && (
                            <span className="px-2 py-1 rounded text-xs bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              <Key className="w-3 h-3 mr-1 inline" />
                              Secure
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="bg-slate-900/50 rounded p-2 max-w-xs">
                          <code className="text-sm break-all text-slate-200">{displayValue}</code>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-slate-400">{item.description || '-'}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-slate-500">
                          {item.updatedAt.toLocaleDateString('ru-RU')}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 justify-end">
                          {item.isSecure && (
                            <button
                              className="p-2 hover:bg-slate-600/50 rounded transition-colors"
                              onClick={() => toggleValueVisibility(item.id)}
                            >
                              {isVisible ? (
                                <EyeOff className="w-4 h-4 text-slate-400" />
                              ) : (
                                <Eye className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          )}
                          <button
                            className="p-2 hover:bg-slate-600/50 rounded transition-colors"
                            onClick={() => copyToClipboard(item.value, item.key)}
                          >
                            <Copy className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Help Section */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/30 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Как использовать данные окружения</h3>
        <div className="text-slate-300">
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Используйте эти данные для настройки вашего проекта</li>
            <li>Конфиденциальные данные отображаются в замаскированном виде</li>
            <li>Нажмите на иконку глаза для просмотра полного значения</li>
            <li>Используйте кнопку копирования для быстрого копирования значений</li>
            <li>Данные автоматически обновляются организаторами</li>
          </ul>
        </div>
      </div>
    </div>
  )
}