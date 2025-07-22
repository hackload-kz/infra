'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { isOrganizer } from '@/lib/admin'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function LoadTestingPage() {
  const { data: session, status } = useSession()
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (session?.user?.email) {
        const adminStatus = await isOrganizer(session.user.email)
        setIsAdmin(adminStatus)
      }
      setCheckingAdmin(false)
    }

    if (session) {
      checkAdminStatus()
    }
  }, [session])

  // Redirect non-admins
  useEffect(() => {
    if (!checkingAdmin && session && !isAdmin) {
      redirect('/dashboard')
    }
  }, [checkingAdmin, session, isAdmin])

  const handleStartTest = async () => {
    if (!url.trim()) {
      setMessage('Please enter a valid URL')
      setMessageType('error')
      return
    }

    // Basic URL validation
    try {
      new URL(url)
    } catch {
      setMessage('Please enter a valid URL (e.g., https://example.com)')
      setMessageType('error')
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/load-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(`Load test started successfully! Test ID: ${result.testId}`)
        setMessageType('success')
        setUrl('')
      } else {
        setMessage(result.error || 'Failed to start load test')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Failed to start load test. Please try again.')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading' || checkingAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) {
    redirect('/login')
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Access denied. Admin privileges required.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Load Testing</h1>
        <p className="mt-2 text-slate-300">
          Start load tests against target URLs using k6
        </p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-4">
          Start Load Test
        </h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-slate-300">
              Target URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="mt-1 block w-full bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              disabled={isLoading}
            />
            <p className="mt-2 text-sm text-slate-400">
              Enter the URL of the system you want to load test
            </p>
          </div>

          <div className="bg-slate-700/30 p-4 rounded-md">
            <h3 className="text-sm font-medium text-white mb-2">Test Configuration</h3>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• Virtual Users: 100</li>
              <li>• Duration: 5 minutes</li>
              <li>• Ramp-up: 30 seconds</li>
            </ul>
          </div>

          {message && (
            <div className={`p-4 rounded-md border ${
              messageType === 'success' 
                ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                : 'bg-red-500/20 text-red-300 border-red-500/30'
            }`}>
              {message}
            </div>
          )}

          <button
            onClick={handleStartTest}
            disabled={isLoading || !url.trim()}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-amber-400 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {isLoading ? 'Starting Test...' : 'Start Load Test'}
          </button>
        </div>
      </div>
    </div>
  )
}