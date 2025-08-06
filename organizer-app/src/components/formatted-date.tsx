/**
 * Formatted date component with timezone support
 * Use this component consistently across the app for date displays
 */

import { formatDate, formatTime, formatDateTime, formatDateShort, formatTimeShort } from '@/lib/date-utils'

interface FormattedDateProps {
  date: Date | string
  format?: 'date' | 'time' | 'datetime' | 'short' | 'time-short'
  timezone?: string
  className?: string
}

export function FormattedDate({ 
  date, 
  format = 'date', 
  timezone, 
  className = '' 
}: FormattedDateProps) {
  let formattedDate: string

  switch (format) {
    case 'time':
      formattedDate = formatTime(date, {}, timezone)
      break
    case 'datetime':
      formattedDate = formatDateTime(date, {}, timezone)
      break
    case 'short':
      formattedDate = formatDateShort(date, timezone)
      break
    case 'time-short':
      formattedDate = formatTimeShort(date, timezone)
      break
    case 'date':
    default:
      formattedDate = formatDate(date, {}, timezone)
  }

  return (
    <span className={className} title={formatDateTime(date, {}, timezone)}>
      {formattedDate}
    </span>
  )
}

/**
 * Legacy support - Individual date formatters
 */
export function DateWithTimezone({ date, className = '' }: { date: Date | string, className?: string }) {
  return <FormattedDate date={date} format="date" className={className} />
}

export function TimeWithTimezone({ date, className = '' }: { date: Date | string, className?: string }) {
  return <FormattedDate date={date} format="time" className={className} />
}

export function DateTimeWithTimezone({ date, className = '' }: { date: Date | string, className?: string }) {
  return <FormattedDate date={date} format="datetime" className={className} />
}

export function DateShortWithTimezone({ date, className = '' }: { date: Date | string, className?: string }) {
  return <FormattedDate date={date} format="short" className={className} />
}