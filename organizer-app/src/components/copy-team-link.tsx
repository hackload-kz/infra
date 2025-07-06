'use client'

import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'

interface CopyTeamLinkProps {
  teamNickname: string
  className?: string
}

export function CopyTeamLink({ teamNickname, className = '' }: CopyTeamLinkProps) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    try {
      const url = `${window.location.origin}/teams/${teamNickname}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center space-x-2 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${className}`}
      title="Скопировать ссылку на команду"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-400" />
          <span className="text-green-300">Скопировано!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span>Поделиться</span>
        </>
      )}
    </button>
  )
}