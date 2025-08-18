/**
 * Утилиты для работы с Grafana
 */

export interface GrafanaLinkParams {
  testId: string
  startedAt: string | null
  completedAt: string | null
}

/**
 * Генерирует ссылку на Grafana для просмотра результатов K6 теста
 */
export function generateGrafanaLink({ testId, startedAt, completedAt }: GrafanaLinkParams): string {
  const baseUrl = 'https://hub.hackload.kz/grafana/d/a3b2aaa8-bb66-4008-a1d8-16c49afedbf0/k6-prometheus-native-histograms'
  
  // Параметры запроса
  const params = new URLSearchParams({
    orgId: '1',
    'var-DS_PROMETHEUS': 'Prometheus',
    'var-testid': testId,
    'var-quantile': '0.99'
  })

  // Вычисляем временные рамки
  let from: string
  let to: string

  if (startedAt) {
    // Начало минус 1 минута (60 секунд = 60000 мс)
    const startTime = new Date(startedAt).getTime() - 60000
    from = startTime.toString()
  } else {
    // Если нет времени начала, используем текущее время минус 10 минут
    from = (Date.now() - 600000).toString()
  }

  if (completedAt) {
    // Завершение плюс 1 минута
    const endTime = new Date(completedAt).getTime() + 60000
    to = endTime.toString()
  } else {
    // Если тест еще не завершен, используем "now"
    to = 'now'
  }

  params.append('from', from)
  params.append('to', to)

  return `${baseUrl}?${params.toString()}`
}

/**
 * Проверяет, доступна ли ссылка на Grafana для данного шага
 */
export function isGrafanaLinkAvailable(k6TestName: string | null, status: string): boolean {
  // Ссылка доступна если есть k6TestName и тест был запущен
  return !!(k6TestName && ['RUNNING', 'SUCCEEDED', 'FAILED'].includes(status))
}