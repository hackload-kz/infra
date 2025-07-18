'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JoinRequestList, JoinRequestSummary } from '@/components/join-request-status'
import { withdrawJoinRequest } from '@/lib/actions'
import { History } from 'lucide-react'

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

interface JoinRequestsPageClientProps {
  initialRequests: JoinRequest[]
}

export function JoinRequestsPageClient({ initialRequests }: JoinRequestsPageClientProps) {
  const [requests, setRequests] = useState(initialRequests)
  const [withdrawingRequestId, setWithdrawingRequestId] = useState<string | null>(null)
  const router = useRouter()

  const handleWithdraw = async (requestId: string) => {
    if (!confirm('Вы уверены, что хотите отозвать заявку? Это действие нельзя отменить.')) {
      return
    }

    setWithdrawingRequestId(requestId)
    
    try {
      await withdrawJoinRequest(requestId)
      
      // Remove the request from the list
      setRequests(prev => prev.filter(req => req.id !== requestId))
      
      // Show success message
      router.refresh()
    } catch (error) {
      console.error('Error withdrawing join request:', error)
      alert(error instanceof Error ? error.message : 'Произошла ошибка при отзыве заявки')
    } finally {
      setWithdrawingRequestId(null)
    }
  }

  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <History className="w-8 h-8 text-amber-400" />
          <h1 className="text-3xl font-bold text-white">
            История <span className="text-amber-400">заявок</span>
          </h1>
        </div>
        <p className="text-slate-400">
          Все ваши заявки на вступление в команды
        </p>
        <div className="w-16 h-1 bg-amber-400 rounded-full mt-2"></div>
      </div>

      {/* Summary Cards */}
      {requests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Сводка</h2>
          <JoinRequestSummary requests={requests} />
        </div>
      )}

      {/* Join Requests List */}
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
        <h2 className="text-xl font-semibold text-white mb-6">Все заявки</h2>
        <JoinRequestList 
          requests={requests}
          emptyMessage="У вас пока нет заявок на вступление в команды. Найдите интересную команду и подайте заявку!"
          showTeamLinks={true}
          showActions={true}
          onWithdraw={handleWithdraw}
        />
        
        {withdrawingRequestId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400"></div>
                <p className="text-white">Отзыв заявки...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}