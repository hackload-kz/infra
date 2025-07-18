import { TeamJoinError } from '@/lib/team-join-errors'
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

interface TeamJoinErrorProps {
  error: TeamJoinError
  onClose?: () => void
  showSuggestion?: boolean
}

export function TeamJoinErrorDisplay({ error, onClose, showSuggestion = true }: TeamJoinErrorProps) {
  const icons = {
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  }

  const colors = {
    error: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/30',
      text: 'text-red-300',
      icon: 'text-red-400'
    },
    warning: {
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/30',
      text: 'text-yellow-300',
      icon: 'text-yellow-400'
    },
    info: {
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/30',
      text: 'text-blue-300',
      icon: 'text-blue-400'
    }
  }

  const Icon = icons[error.severity]
  const colorScheme = colors[error.severity]

  return (
    <div className={`${colorScheme.bg} ${colorScheme.border} border rounded-lg p-4 mb-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <Icon className={`w-5 h-5 ${colorScheme.icon} mt-0.5 flex-shrink-0`} />
          <div className="flex-1">
            <h4 className={`${colorScheme.text} font-medium mb-1`}>
              {error.message}
            </h4>
            <p className={`${colorScheme.text} text-sm opacity-90 mb-2`}>
              {error.description}
            </p>
            {showSuggestion && error.suggestion && (
              <div className={`${colorScheme.text} text-sm`}>
                <strong>Рекомендация:</strong> {error.suggestion}
              </div>
            )}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`${colorScheme.text} hover:opacity-70 transition-opacity ml-2`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

interface TeamJoinErrorBannerProps {
  error: TeamJoinError
  actionButton?: React.ReactNode
}

export function TeamJoinErrorBanner({ error, actionButton }: TeamJoinErrorBannerProps) {
  const colorScheme = {
    error: 'from-red-500/20 to-red-600/20 border-red-500/30',
    warning: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
    info: 'from-blue-500/20 to-blue-600/20 border-blue-500/30'
  }

  return (
    <div className={`bg-gradient-to-r ${colorScheme[error.severity]} border rounded-lg p-6 text-center`}>
      <div className="max-w-md mx-auto">
        <h2 className="text-white text-xl font-semibold mb-2">
          {error.message}
        </h2>
        <p className="text-slate-300 mb-4">
          {error.description}
        </p>
        {error.suggestion && (
          <p className="text-slate-400 text-sm mb-4">
            <strong>Рекомендация:</strong> {error.suggestion}
          </p>
        )}
        {actionButton && (
          <div className="mt-4">
            {actionButton}
          </div>
        )}
      </div>
    </div>
  )
}