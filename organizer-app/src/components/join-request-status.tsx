import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface JoinRequest {
  id: string
  status: 'PENDING' | 'APPROVED' | 'DECLINED'
  message: string | null
  createdAt: Date
  team: {
    id: string
    name: string
    nickname: string
  }
}

interface JoinRequestStatusProps {
  request: JoinRequest
  showTeamLink?: boolean
  showActions?: boolean
  onWithdraw?: (requestId: string) => void
}

export function JoinRequestStatus({ 
  request, 
  showTeamLink = true, 
  showActions = false,
  onWithdraw 
}: JoinRequestStatusProps) {
  const statusConfig = {
    PENDING: {
      icon: Clock,
      label: 'На рассмотрении',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30'
    },
    APPROVED: {
      icon: CheckCircle,
      label: 'Одобрена',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30'
    },
    DECLINED: {
      icon: XCircle,
      label: 'Отклонена',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30'
    }
  }

  const config = statusConfig[request.status]
  const Icon = config.icon

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <Icon className={`w-5 h-5 ${config.color} mt-0.5`} />
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className={`${config.color} font-medium`}>{config.label}</span>
              <span className="text-slate-400 text-sm">
                {new Date(request.createdAt).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            {showTeamLink && (
              <Link 
                href={`/space/teams/${request.team.id}`}
                className="text-white hover:text-amber-400 font-medium transition-colors"
              >
                {request.team.name}
              </Link>
            )}
            {!showTeamLink && (
              <span className="text-white font-medium">{request.team.name}</span>
            )}
            <p className="text-slate-400 text-sm">@{request.team.nickname}</p>
            
            {request.message && (
              <div className="mt-2 p-2 bg-slate-700/30 rounded text-sm text-slate-300">
                <strong>Ваше сообщение:</strong> {request.message}
              </div>
            )}
          </div>
        </div>
        
        {showActions && request.status === 'PENDING' && onWithdraw && (
          <button
            onClick={() => onWithdraw(request.id)}
            className="text-slate-400 hover:text-red-400 transition-colors text-sm"
          >
            Отозвать
          </button>
        )}
      </div>
    </div>
  )
}

interface JoinRequestListProps {
  requests: JoinRequest[]
  emptyMessage?: string
  showTeamLinks?: boolean
  showActions?: boolean
  onWithdraw?: (requestId: string) => void
}

export function JoinRequestList({ 
  requests, 
  emptyMessage = 'У вас пока нет заявок на вступление в команды',
  showTeamLinks = true,
  showActions = false,
  onWithdraw
}: JoinRequestListProps) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <p className="text-slate-400">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <JoinRequestStatus
          key={request.id}
          request={request}
          showTeamLink={showTeamLinks}
          showActions={showActions}
          onWithdraw={onWithdraw}
        />
      ))}
    </div>
  )
}

interface JoinRequestSummaryProps {
  requests: JoinRequest[]
}

export function JoinRequestSummary({ requests }: JoinRequestSummaryProps) {
  const counts = requests.reduce((acc, request) => {
    acc[request.status] = (acc[request.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-yellow-400" />
          <div>
            <p className="text-yellow-300 text-sm">На рассмотрении</p>
            <p className="text-white font-semibold">{counts.PENDING || 0}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <div>
            <p className="text-green-300 text-sm">Одобрено</p>
            <p className="text-white font-semibold">{counts.APPROVED || 0}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <XCircle className="w-5 h-5 text-red-400" />
          <div>
            <p className="text-red-300 text-sm">Отклонено</p>
            <p className="text-white font-semibold">{counts.DECLINED || 0}</p>
          </div>
        </div>
      </div>
    </div>
  )
}