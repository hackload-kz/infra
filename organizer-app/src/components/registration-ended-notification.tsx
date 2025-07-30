import { AlertCircle, Calendar, Clock } from 'lucide-react'

interface RegistrationEndedNotificationProps {
  hackathonName: string
  registrationEndDate: Date
  className?: string
}

export function RegistrationEndedNotification({ 
  hackathonName, 
  registrationEndDate, 
  className = "" 
}: RegistrationEndedNotificationProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={`bg-amber-900/30 border border-amber-500/50 rounded-lg p-6 ${className}`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <AlertCircle className="w-6 h-6 text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-100 mb-2">
            Регистрация завершена
          </h3>
          <p className="text-amber-200 mb-4">
            Период регистрации команд для хакатона <strong>{hackathonName}</strong> завершился.
            Создание новых команд больше недоступно.
          </p>
          <div className="flex items-center space-x-2 text-amber-300 text-sm">
            <Calendar className="w-4 h-4" />
            <span>Регистрация закончилась:</span>
            <span className="font-medium">{formatDate(registrationEndDate)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface RegistrationStatusProps {
  hackathonName: string
  registrationStartDate: Date
  registrationEndDate: Date
  className?: string
}

export function RegistrationStatusNotification({ 
  hackathonName, 
  registrationStartDate,
  registrationEndDate, 
  className = "" 
}: RegistrationStatusProps) {
  const now = new Date()
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isBeforeStart = now < registrationStartDate
  const isEnded = now > registrationEndDate

  if (isBeforeStart) {
    return (
      <div className={`bg-blue-900/30 border border-blue-500/50 rounded-lg p-6 ${className}`}>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <Clock className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-100 mb-2">
              Регистрация скоро начнется
            </h3>
            <p className="text-blue-200 mb-4">
              Регистрация команд для хакатона <strong>{hackathonName}</strong> еще не началась.
            </p>
            <div className="flex items-center space-x-2 text-blue-300 text-sm">
              <Calendar className="w-4 h-4" />
              <span>Регистрация начнется:</span>
              <span className="font-medium">{formatDate(registrationStartDate)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isEnded) {
    return <RegistrationEndedNotification 
      hackathonName={hackathonName}
      registrationEndDate={registrationEndDate}
      className={className}
    />
  }

  // Registration is active - show remaining time
  const timeRemaining = registrationEndDate.getTime() - now.getTime()
  const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24))
  const hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  return (
    <div className={`bg-green-900/30 border border-green-500/50 rounded-lg p-6 ${className}`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <Clock className="w-6 h-6 text-green-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-green-100 mb-2">
            Регистрация активна
          </h3>
          <p className="text-green-200 mb-4">
            Вы можете создать команду для участия в хакатоне <strong>{hackathonName}</strong>.
          </p>
          <div className="space-y-2 text-green-300 text-sm">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Регистрация завершится:</span>
              <span className="font-medium">{formatDate(registrationEndDate)}</span>
            </div>
            {daysRemaining > 0 ? (
              <div className="text-green-400 font-medium">
                Осталось: {daysRemaining} дн. {hoursRemaining} ч.
              </div>
            ) : hoursRemaining > 0 ? (
              <div className="text-amber-400 font-medium">
                Осталось: {hoursRemaining} ч.
              </div>
            ) : (
              <div className="text-red-400 font-medium">
                Осталось менее часа!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}