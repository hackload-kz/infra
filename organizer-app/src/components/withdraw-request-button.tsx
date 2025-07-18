'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

interface WithdrawRequestButtonProps {
  requestId: string
}

export default function WithdrawRequestButton({ requestId }: WithdrawRequestButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleWithdraw = async () => {
    if (!confirm('Вы уверены, что хотите отозвать заявку?')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/teams/join-request/${requestId}/withdraw`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Refresh the page to update the pending requests list
        router.refresh()
      } else {
        const error = await response.json()
        alert(`Ошибка: ${error.error || 'Не удалось отозвать заявку'}`)
      }
    } catch (error) {
      console.error('Error withdrawing request:', error)
      alert('Произошла ошибка при отзыве заявки')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleWithdraw}
      disabled={isLoading}
      className="flex items-center justify-center w-8 h-8 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-full transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Отозвать заявку"
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <X className="w-4 h-4" />
      )}
    </button>
  )
}