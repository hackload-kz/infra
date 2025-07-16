'use client'

import dynamic from 'next/dynamic'

const CalendarManagement = dynamic(
  () => import('@/components/calendar-management').then((mod) => ({ default: mod.CalendarManagement })),
  { 
    ssr: false,
    loading: () => (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-40 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    )
  }
)

export default function CalendarManagementClient() {
  return <CalendarManagement />
}