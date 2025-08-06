'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Download,
  FileText,
  Database,
  Filter,
  Search,
  Users,
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDateShort } from '@/lib/date-utils'

interface Team {
  id: string
  name: string
  nickname: string
  status: string
  environmentData: Array<{
    category: string | null
  }>
}

interface ExportFilters {
  teamIds: string[]
  categories: string[]
  includeValues: boolean
  format: 'json' | 'csv'
}

interface ParticipantExportFilters {
  exportType: 'large-teams' | 'all'
  useRawQuery: boolean
  format: 'json' | 'csv'
}

interface ExportStats {
  totalTeams: number
  totalEnvironmentVariables: number
  exportDate: string
}

interface ParticipantExportStats {
  totalParticipants: number
  exportType: string
  exportDate: string
}

export default function ExportPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [filters, setFilters] = useState<ExportFilters>({
    teamIds: [],
    categories: [],
    includeValues: false,
    format: 'json'
  })
  const [participantFilters, setParticipantFilters] = useState<ParticipantExportFilters>({
    exportType: 'large-teams',
    useRawQuery: false,
    format: 'json'
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportingParticipants, setExportingParticipants] = useState(false)
  const [lastExport, setLastExport] = useState<ExportStats | null>(null)
  const [lastParticipantExport, setLastParticipantExport] = useState<ParticipantExportStats | null>(null)

  useEffect(() => {
    fetchTeamsAndCategories()
  }, [])

  const fetchTeamsAndCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/teams')
      if (!response.ok) throw new Error('Failed to fetch teams')
      
      const teamsData = await response.json()
      setTeams(teamsData)

      // Extract unique categories
      const uniqueCategories = new Set<string>()
      teamsData.forEach((team: Team) => {
        team.environmentData?.forEach(env => {
          if (env.category) {
            uniqueCategories.add(env.category)
          }
        })
      })
      setCategories(Array.from(uniqueCategories).sort())

    } catch (error) {
      console.error('Error fetching teams:', error)
      toast.error('Не удалось загрузить команды и категории')
    } finally {
      setLoading(false)
    }
  }

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.nickname.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleTeamSelection = (teamId: string) => {
    setFilters(prev => ({
      ...prev,
      teamIds: prev.teamIds.includes(teamId)
        ? prev.teamIds.filter(id => id !== teamId)
        : [...prev.teamIds, teamId]
    }))
  }

  const toggleCategorySelection = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(cat => cat !== category)
        : [...prev.categories, category]
    }))
  }

  const selectAllTeams = () => {
    setFilters(prev => ({
      ...prev,
      teamIds: filteredTeams.map(team => team.id)
    }))
  }

  const clearTeamSelection = () => {
    setFilters(prev => ({
      ...prev,
      teamIds: []
    }))
  }

  const selectAllCategories = () => {
    setFilters(prev => ({
      ...prev,
      categories: [...categories]
    }))
  }

  const clearCategorySelection = () => {
    setFilters(prev => ({
      ...prev,
      categories: []
    }))
  }

  const handleExport = async () => {
    try {
      setExporting(true)

      const params = new URLSearchParams({
        format: filters.format,
        includeValues: filters.includeValues.toString(),
      })

      if (filters.teamIds.length > 0) {
        params.append('teamIds', filters.teamIds.join(','))
      }

      if (filters.categories.length > 0) {
        params.append('categories', filters.categories.join(','))
      }

      const response = await fetch(`/api/dashboard/export/teams-environment?${params}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      if (filters.format === 'csv') {
        // Handle CSV download
        const csvData = await response.text()
        const blob = new Blob([csvData], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `teams-environment-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        toast.success('CSV файл успешно скачан')
      } else {
        // Handle JSON response
        const data = await response.json()
        
        // Download JSON file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `teams-environment-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        setLastExport({
          totalTeams: data.totalTeams,
          totalEnvironmentVariables: data.totalEnvironmentVariables,
          exportDate: data.exportDate
        })
        
        toast.success(`JSON файл скачан - ${data.totalTeams} команд, ${data.totalEnvironmentVariables} переменных окружения`)
      }

    } catch (error) {
      console.error('Export error:', error)
      toast.error(error instanceof Error ? error.message : 'Ошибка экспорта')
    } finally {
      setExporting(false)
    }
  }

  const handleParticipantsExport = async () => {
    try {
      setExportingParticipants(true)

      const params = new URLSearchParams({
        format: participantFilters.format,
        type: participantFilters.exportType,
        raw: participantFilters.useRawQuery.toString()
      })

      const response = await fetch(`/api/dashboard/export/participants?${params}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      if (participantFilters.format === 'csv') {
        // Handle CSV download
        const csvData = await response.text()
        const blob = new Blob([csvData], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `participants-${participantFilters.exportType}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        toast.success('CSV файл участников успешно скачан')
      } else {
        // Handle JSON response
        const data = await response.json()
        
        // Download JSON file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `participants-${participantFilters.exportType}-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        setLastParticipantExport({
          totalParticipants: data.totalParticipants,
          exportType: data.exportType,
          exportDate: data.exportDate
        })
        
        toast.success(`JSON файл скачан - ${data.totalParticipants} участников`)
      }

    } catch (error) {
      console.error('Participants export error:', error)
      toast.error(error instanceof Error ? error.message : 'Ошибка экспорта участников')
    } finally {
      setExportingParticipants(false)
    }
  }

  const getTeamStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'APPROVED': return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'FINISHED': return 'bg-green-500/20 text-green-300 border-green-500/30'  
      case 'IN_REVIEW': return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      case 'INCOMPLETED': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'NEW': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-600">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Загрузка данных экспорта...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Центр экспорта данных</h1>
        <p className="text-gray-700">
          Экспорт данных команд, переменных окружения и информации об участниках
        </p>
      </div>

      {/* Export Sections */}
      <div className="space-y-8">
        
        {/* Teams Environment Export Section */}
        <Card className="bg-white border-gray-300 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Экспорт переменных окружения команд
            </CardTitle>
            <CardDescription className="text-gray-600">
              Экспорт переменных окружения команд с фильтрацией и настройками конфиденциальности
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Team Selection */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <div className="mb-4">
                  <h4 className="text-gray-900 font-medium flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Выбор команд
                  </h4>
                  <p className="text-gray-600 text-sm mt-1">
                    Выберите команды для экспорта ({filters.teamIds.length} выбрано)
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Поиск команд..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={selectAllTeams} 
                      size="sm" 
                      variant="outline"
                      className="flex-1 text-xs"
                    >
                      Выбрать все
                    </Button>
                    <Button 
                      onClick={clearTeamSelection} 
                      size="sm" 
                      variant="outline"
                      className="flex-1 text-xs"
                    >
                      Очистить
                    </Button>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredTeams.map((team) => (
                      <div
                        key={team.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          filters.teamIds.includes(team.id)
                            ? 'bg-blue-50 border-blue-300 text-blue-900'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => toggleTeamSelection(team.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{team.name}</div>
                            <div className="text-xs text-gray-500">@{team.nickname}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${getTeamStatusColor(team.status)}`}>
                              {team.status}
                            </Badge>
                            {filters.teamIds.includes(team.id) && (
                              <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category Selection */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <div className="mb-4">
                  <h4 className="text-gray-900 font-medium flex items-center gap-2">
                    <Filter className="w-5 h-5 text-indigo-600" />
                    Фильтр по категориям
                  </h4>
                  <p className="text-gray-600 text-sm mt-1">
                    Фильтрация по категориям переменных окружения ({filters.categories.length} выбрано)
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button 
                      onClick={selectAllCategories} 
                      size="sm" 
                      variant="outline"
                      className="flex-1 text-xs"
                    >
                      Выбрать все
                    </Button>
                    <Button 
                      onClick={clearCategorySelection} 
                      size="sm" 
                      variant="outline"
                      className="flex-1 text-xs"
                    >
                      Очистить
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {categories.map((category) => (
                      <div
                        key={category}
                        className={`p-2 rounded border cursor-pointer transition-all ${
                          filters.categories.includes(category)
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => toggleCategorySelection(category)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{category}</span>
                          {filters.categories.includes(category) && (
                            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {categories.length === 0 && (
                      <div className="text-center text-gray-500 py-4">
                        <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Категории не найдены</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Export Options */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <div className="mb-4">
                  <h4 className="text-gray-900 font-medium flex items-center gap-2">
                    <Settings className="w-5 h-5 text-green-600" />
                    Параметры экспорта
                  </h4>
                  <p className="text-gray-600 text-sm mt-1">
                    Настройте формат экспорта и включение данных
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-700 font-medium">Формат экспорта</Label>
                    <Select 
                      value={filters.format} 
                      onValueChange={(value: 'json' | 'csv') => setFilters(prev => ({ ...prev, format: value }))}
                    >
                      <SelectTrigger className="mt-2 bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-300">
                        <SelectItem value="json" className="text-gray-900">
                          JSON (структурированные данные)
                        </SelectItem>
                        <SelectItem value="csv" className="text-gray-900">
                          CSV (формат для таблиц)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="includeValues"
                        checked={filters.includeValues}
                        onChange={(e) => setFilters(prev => ({ ...prev, includeValues: e.target.checked }))}
                        className="rounded"
                      />
                      <Label htmlFor="includeValues" className="text-gray-700 font-medium">
                        Включать значения переменных
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500 ml-6">
                      При отключении конфиденциальные переменные показываются как [SECURE], остальные как [HIDDEN]
                    </p>
                  </div>

                  {!filters.includeValues && (
                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Режим конфиденциальности</span>
                      </div>
                      <p className="text-xs text-yellow-700 mt-1">
                        Значения переменных будут скрыты для безопасности
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleExport}
                    disabled={exporting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    {exporting ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    {exporting ? 'Экспортируется...' : `Экспорт ${filters.format.toUpperCase()}`}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Participants Export Section */}
        <Card className="bg-white border-gray-300 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Экспорт данных участников
            </CardTitle>
            <CardDescription className="text-gray-600">
              Экспорт информации об участниках хакатона
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Export Type Selection */}
              <div>
                <Label className="text-gray-700 font-medium">Тип экспорта</Label>
                <Select 
                  value={participantFilters.exportType} 
                  onValueChange={(value: 'large-teams' | 'all') => setParticipantFilters(prev => ({ ...prev, exportType: value }))}
                >
                  <SelectTrigger className="mt-2 bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300">
                    <SelectItem value="large-teams" className="text-gray-900">
                      Команды с 3+ участниками
                    </SelectItem>
                    <SelectItem value="all" className="text-gray-900">
                      Все участники
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Format Selection */}
              <div>
                <Label className="text-gray-700 font-medium">Формат экспорта</Label>
                <Select 
                  value={participantFilters.format} 
                  onValueChange={(value: 'json' | 'csv') => setParticipantFilters(prev => ({ ...prev, format: value }))}
                >
                  <SelectTrigger className="mt-2 bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300">
                    <SelectItem value="json" className="text-gray-900">
                      JSON (структурированные данные)
                    </SelectItem>
                    <SelectItem value="csv" className="text-gray-900">
                      CSV (формат для таблиц)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useRawQuery"
                  checked={participantFilters.useRawQuery}
                  onChange={(e) => setParticipantFilters(prev => ({ ...prev, useRawQuery: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="useRawQuery" className="text-gray-700 font-medium">
                  Использовать сырой SQL-запрос
                </Label>
              </div>
              <p className="text-xs text-gray-500 ml-6">
                Более быстрый экспорт для больших объемов данных
              </p>
            </div>

            <Button
              onClick={handleParticipantsExport}
              disabled={exportingParticipants}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              {exportingParticipants ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {exportingParticipants ? 'Экспортируется...' : `Экспорт участников ${participantFilters.format.toUpperCase()}`}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Export Statistics */}
      {lastExport && (
        <Card className="bg-white border-gray-300 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Сводка последнего экспорта
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{lastExport.totalTeams}</div>
                <div className="text-sm text-gray-600">Команд экспортировано</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{lastExport.totalEnvironmentVariables}</div>
                <div className="text-sm text-gray-600">Переменных окружения</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-900">{formatDateShort(new Date(lastExport.exportDate))}</div>
                <div className="text-sm text-gray-600">Дата экспорта</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Participants Export Statistics */}
      {lastParticipantExport && (
        <Card className="bg-white border-gray-300 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Сводка экспорта участников
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{lastParticipantExport.totalParticipants}</div>
                <div className="text-sm text-gray-600">Участников экспортировано</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {lastParticipantExport.exportType === 'large-teams' ? 'Команды 3+' : 'Все участники'}
                </div>
                <div className="text-sm text-gray-600">Тип экспорта</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-900">{formatDateShort(new Date(lastParticipantExport.exportDate))}</div>
                <div className="text-sm text-gray-600">Дата экспорта</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="bg-white border-gray-300 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Руководство по экспорту</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Экспорт переменных окружения</h4>
              <ul className="text-sm space-y-1">
                <li>• Фильтрация по командам и категориям</li>
                <li>• Контроль конфиденциальности данных</li>
                <li>• Включает информацию о командах</li>
                <li>• Поддержка JSON и CSV форматов</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Экспорт участников</h4>
              <ul className="text-sm space-y-1">
                <li>• Все участники или команды с 3+ участниками</li>
                <li>• Подробная информация о профиле</li>
                <li>• Данные о командах и технологиях</li>
                <li>• Быстрый SQL-запрос для больших данных</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Формат JSON</h4>
              <ul className="text-sm space-y-1">
                <li>• Структурированные данные с вложенными объектами</li>
                <li>• Сохраняет связи между данными</li>
                <li>• Идеально для программной обработки</li>
                <li>• Полная информация о экспорте</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Формат CSV</h4>
              <ul className="text-sm space-y-1">
                <li>• Плоские данные для электронных таблиц</li>
                <li>• Легко импортируется в Excel/Google Sheets</li>
                <li>• Одна строка на запись</li>
                <li>• Идеально для анализа и отчетности</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-300 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800 mb-1">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Уведомление о безопасности</span>
            </div>
            <p className="text-sm text-blue-700">
              При экспорте с включенными значениями убедитесь, что экспортированные файлы 
              хранятся безопасно, так как они могут содержать конфиденциальные данные окружения.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}