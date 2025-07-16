'use client'

import { useState } from 'react'
import { Plus, Calendar } from 'lucide-react'
import { CalendarEventForm } from './calendar-event-form'

interface TeamEventCreatorProps {
  teamId: string
  teamName: string
  teamNickname: string
  canCreate: boolean
}

export function TeamEventCreator({ teamId, teamName, teamNickname, canCreate }: TeamEventCreatorProps) {
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreateEvent = async (eventData: Record<string, unknown>) => {
    try {
      setIsSubmitting(true)
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...eventData,
          teamId: teamId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create event')
      }

      setShowForm(false)
      // Optionally refresh the page or show success message
      window.location.reload()
    } catch (err) {
      console.error('Error creating event:', err)
      alert('Ошибка при создании события')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canCreate) {
    return null
  }

  if (showForm) {
    return (
      <div className="bg-white rounded-lg border">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Создать событие для команды {teamName}
          </h3>
          <CalendarEventForm
            teams={[{ id: teamId, name: teamName, nickname: teamNickname }]}
            onSave={handleCreateEvent}
            onCancel={() => setShowForm(false)}
            isSubmitting={isSubmitting}
            teamId={teamId}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              События команды
            </h3>
            <p className="text-gray-600 text-sm">
              Создайте событие для участников вашей команды
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Создать событие
          </button>
        </div>
        
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">
              События будут видны всем участникам вашей команды
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}