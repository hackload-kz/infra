import { getActiveHackathons } from '@/lib/hackathon'
import { 
  Calendar,
  Users,
  Settings,
  Plus,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HackathonsPage() {
  const hackathons = await getActiveHackathons()

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Управление хакатонами</h1>
            <p className="text-gray-600">Создавайте и управляйте хакатонами</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Создать хакатон</span>
          </button>
        </div>

        {/* Hackathons List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Активные хакатоны</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {hackathons.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Нет активных хакатонов</p>
                <p className="text-gray-400 text-sm">Создайте первый хакатон для начала работы</p>
              </div>
            ) : (
              hackathons.map((hackathon) => (
                <div key={hackathon.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">{hackathon.name}</h3>
                        <div className="flex items-center space-x-1">
                          {hackathon.isActive ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-400" />
                          )}
                          <span className={`text-xs font-medium ${
                            hackathon.isActive ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {hackathon.isActive ? 'Активен' : 'Неактивен'}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mt-1">{hackathon.description}</p>
                      
                      {hackathon.theme && (
                        <p className="text-sm text-blue-600 mt-1">
                          <strong>Тема:</strong> {hackathon.theme}
                        </p>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <div>
                              <p className="text-xs text-gray-600">Даты проведения</p>
                              <p className="text-sm font-medium">
                                {hackathon.startDate.toLocaleDateString('ru-RU')} - {hackathon.endDate.toLocaleDateString('ru-RU')}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-orange-600" />
                            <div>
                              <p className="text-xs text-gray-600">Регистрация</p>
                              <p className="text-sm font-medium">
                                до {hackathon.registrationEnd.toLocaleDateString('ru-RU')}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-green-600" />
                            <div>
                              <p className="text-xs text-gray-600">Размер команд</p>
                              <p className="text-sm font-medium">
                                {hackathon.minTeamSize} - {hackathon.maxTeamSize} участников
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-6">
                      <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-2">
                        <Settings className="w-4 h-4" />
                        <span>Настройки</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Всего хакатонов</p>
                <p className="text-2xl font-bold text-gray-900">{hackathons.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Активных</p>
                <p className="text-2xl font-bold text-gray-900">
                  {hackathons.filter(h => h.isActive).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Публичных</p>
                <p className="text-2xl font-bold text-gray-900">
                  {hackathons.filter(h => h.isPublic).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
  )
}