'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createJoinRequest } from '@/lib/actions'
import { getTeamJoinError } from '@/lib/team-join-errors'
import { TeamJoinErrorDisplay } from '@/components/team-join-error'
import { UserPlus } from 'lucide-react'

interface JoinRequestFormProps {
  teamId: string
  participantId: string
}

export function JoinRequestForm({ teamId, participantId }: JoinRequestFormProps) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await createJoinRequest(participantId, teamId, message)
      router.push(`/space/teams/${teamId}`)
      router.refresh()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка при отправке заявки'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <TeamJoinErrorDisplay 
          error={getTeamJoinError(error)}
          onClose={() => setError(null)}
        />
      )}

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-3">
          Сообщение лидеру команды (необязательно)
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Расскажите о себе, своем опыте и почему хотите присоединиться к команде..."
          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 resize-none"
          maxLength={1000}
        />
        <p className="text-slate-500 text-xs mt-2">
          {message.length}/1000 символов
        </p>
      </div>

      <div className="bg-slate-700/30 rounded-lg p-4">
        <h4 className="text-white font-medium mb-2">Ваша информация будет передана лидеру:</h4>
        <ul className="text-slate-400 text-sm space-y-1">
          <li>• Имя и контактная информация</li>
          <li>• Опыт работы и технические навыки</li>
          <li>• Компания и город</li>
          <li>• Ваше сообщение (если добавлено)</li>
        </ul>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-amber-400 hover:bg-amber-500 disabled:bg-amber-400/50 text-slate-900 px-6 py-3 rounded-lg font-medium transition-colors duration-150 flex items-center justify-center space-x-2"
        >
          <UserPlus className="w-5 h-5" />
          <span>{loading ? 'Отправка...' : 'Подать заявку'}</span>
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-150"
        >
          Отмена
        </button>
      </div>
    </form>
  )
}