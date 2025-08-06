/**
 * Date formatting utilities with timezone support
 * Ensures consistent date/time display across the application
 */

// Default timezone for the application (Kazakhstan time zone)
const DEFAULT_TIMEZONE = 'Asia/Almaty'

/**
 * Format date with timezone information
 */
export function formatDateWithTimezone(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {},
  timezone: string = DEFAULT_TIMEZONE
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    timeZoneName: 'short',
    ...options
  }
  
  return new Intl.DateTimeFormat('ru-RU', defaultOptions).format(dateObj)
}

/**
 * Format date for display (with timezone)
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {},
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatDateWithTimezone(date, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZoneName: 'short',
    ...options
  }, timezone)
}

/**
 * Format time for display (with timezone)
 */
export function formatTime(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {},
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatDateWithTimezone(date, {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
    ...options
  }, timezone)
}

/**
 * Format date and time for display (with timezone)
 */
export function formatDateTime(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {},
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatDateWithTimezone(date, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
    ...options
  }, timezone)
}

/**
 * Format date for short display (e.g., "23.12.2025, GMT+6")
 */
export function formatDateShort(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatDateWithTimezone(date, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZoneName: 'short'
  }, timezone)
}

/**
 * Format time for short display (e.g., "14:30 GMT+6")
 */
export function formatTimeShort(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatDateWithTimezone(date, {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }, timezone)
}

/**
 * Format calendar event date (for calendar views)
 */
export function formatCalendarDate(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatDateWithTimezone(date, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZoneName: 'short'
  }, timezone)
}

/**
 * Format calendar event time (for calendar views)
 */
export function formatCalendarTime(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatDateWithTimezone(date, {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }, timezone)
}

/**
 * Format calendar event datetime (for calendar views)
 */
export function formatCalendarDateTime(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatDateWithTimezone(date, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }, timezone)
}

/**
 * Get timezone abbreviation
 */
export function getTimezoneAbbr(timezone: string = DEFAULT_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short'
  })
  
  const parts = formatter.formatToParts(new Date())
  const timeZonePart = parts.find(part => part.type === 'timeZoneName')
  return timeZonePart?.value || 'UTC'
}

/**
 * Format end date for calendar events (smart formatting)
 */
export function formatCalendarEndDate(
  startDate: Date | string,
  endDate: Date | string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  // Check if the end date is on the same day as start date
  const startDay = start.toLocaleDateString('ru-RU', { timeZone: timezone })
  const endDay = end.toLocaleDateString('ru-RU', { timeZone: timezone })
  
  const isSameDay = startDay === endDay
  
  if (isSameDay) {
    // Same day - show only time with timezone
    return formatCalendarTime(end, timezone)
  } else {
    // Different day - check if it's next day
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff === 1) {
      // Next day - show "завтра" + time with timezone
      return `завтра в ${formatCalendarTime(end, timezone)}`
    } else {
      // Multiple days - show full date and time with timezone
      return formatCalendarDateTime(end, timezone)
    }
  }
}