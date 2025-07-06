'use client'

import { useState } from 'react'
import { TeamEditForm } from './team-edit-form'

interface TeamMember {
  id: string
  name: string
  email: string
  company?: string | null
  city?: string | null
}

interface Team {
  id: string
  name: string
  nickname: string
  status: string
  members: TeamMember[]
  leader?: {
    id: string
    name: string
  } | null
}

interface TeamEditWrapperProps {
  team: Team
  leaderId: string
}

export function TeamEditWrapper({ team, leaderId }: TeamEditWrapperProps) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <TeamEditForm
      team={team}
      leaderId={leaderId}
      isEditing={isEditing}
      onToggleEdit={() => setIsEditing(!isEditing)}
    />
  )
}