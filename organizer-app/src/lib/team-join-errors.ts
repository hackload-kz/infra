export interface TeamJoinError {
  code: string
  message: string
  description: string
  suggestion?: string
  severity: 'error' | 'warning' | 'info'
}

export enum JoinErrorCode {
  PARTICIPANT_NOT_FOUND = 'PARTICIPANT_NOT_FOUND',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  ALREADY_IN_TEAM = 'ALREADY_IN_TEAM',
  TEAM_NOT_FOUND = 'TEAM_NOT_FOUND',
  TEAM_FULL = 'TEAM_FULL',
  TEAM_NOT_ACCEPTING = 'TEAM_NOT_ACCEPTING',
  EXISTING_REQUEST = 'EXISTING_REQUEST',
  NO_ACTIVE_HACKATHON = 'NO_ACTIVE_HACKATHON',
  WRONG_HACKATHON = 'WRONG_HACKATHON',
  UNAUTHORIZED = 'UNAUTHORIZED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export const teamJoinErrors: Record<JoinErrorCode, TeamJoinError> = {
  [JoinErrorCode.PARTICIPANT_NOT_FOUND]: {
    code: 'PARTICIPANT_NOT_FOUND',
    message: 'Профиль участника не найден',
    description: 'Ваш профиль участника не создан или не найден в системе',
    suggestion: 'Попробуйте создать профиль участника в разделе "Мой профиль"',
    severity: 'error'
  },
  [JoinErrorCode.ACCOUNT_INACTIVE]: {
    code: 'ACCOUNT_INACTIVE',
    message: 'Аккаунт деактивирован',
    description: 'Ваш аккаунт неактивен и не может подавать заявки на вступление в команды',
    suggestion: 'Обратитесь к администратору для активации аккаунта',
    severity: 'error'
  },
  [JoinErrorCode.ALREADY_IN_TEAM]: {
    code: 'ALREADY_IN_TEAM',
    message: 'Вы уже состоите в команде',
    description: 'Участник может состоять только в одной команде одновременно',
    suggestion: 'Покиньте текущую команду, чтобы подать заявку в новую',
    severity: 'warning'
  },
  [JoinErrorCode.TEAM_NOT_FOUND]: {
    code: 'TEAM_NOT_FOUND',
    message: 'Команда не найдена',
    description: 'Указанная команда не существует или была удалена',
    suggestion: 'Проверьте правильность ссылки или найдите команду в списке',
    severity: 'error'
  },
  [JoinErrorCode.TEAM_FULL]: {
    code: 'TEAM_FULL',
    message: 'Команда переполнена',
    description: 'В команде максимальное количество участников (4 человека)',
    suggestion: 'Попробуйте найти другую команду с свободными местами',
    severity: 'warning'
  },
  [JoinErrorCode.TEAM_NOT_ACCEPTING]: {
    code: 'TEAM_NOT_ACCEPTING',
    message: 'Команда не принимает новых участников',
    description: 'Команда завершила формирование или имеет статус, не позволяющий принимать новых участников',
    suggestion: 'Найдите команду со статусом "Новая" или "Не завершена"',
    severity: 'warning'
  },
  [JoinErrorCode.EXISTING_REQUEST]: {
    code: 'EXISTING_REQUEST',
    message: 'У вас уже есть заявка на вступление в эту команду',
    description: 'Вы уже подали заявку на вступление в эту команду и она находится на рассмотрении',
    suggestion: 'Дождитесь ответа от лидера команды или отмените предыдущую заявку',
    severity: 'info'
  },
  [JoinErrorCode.NO_ACTIVE_HACKATHON]: {
    code: 'NO_ACTIVE_HACKATHON',
    message: 'Нет активного хакатона',
    description: 'В системе не найден активный хакатон для подачи заявок',
    suggestion: 'Обратитесь к администратору или дождитесь начала нового хакатона',
    severity: 'error'
  },
  [JoinErrorCode.WRONG_HACKATHON]: {
    code: 'WRONG_HACKATHON',
    message: 'Команда принадлежит другому хакатону',
    description: 'Указанная команда участвует в другом хакатоне',
    suggestion: 'Найдите команду в рамках текущего хакатона',
    severity: 'error'
  },
  [JoinErrorCode.UNAUTHORIZED]: {
    code: 'UNAUTHORIZED',
    message: 'Необходима авторизация',
    description: 'Для подачи заявки на вступление в команду необходимо войти в систему',
    suggestion: 'Войдите в систему или зарегистрируйтесь',
    severity: 'error'
  },
  [JoinErrorCode.VALIDATION_ERROR]: {
    code: 'VALIDATION_ERROR',
    message: 'Ошибка валидации данных',
    description: 'Переданные данные не соответствуют требованиям',
    suggestion: 'Проверьте правильность заполнения формы',
    severity: 'error'
  },
  [JoinErrorCode.UNKNOWN_ERROR]: {
    code: 'UNKNOWN_ERROR',
    message: 'Неизвестная ошибка',
    description: 'Произошла непредвиденная ошибка при обработке заявки',
    suggestion: 'Попробуйте позже или обратитесь к администратору',
    severity: 'error'
  }
}

export function getTeamJoinError(errorMessage: string): TeamJoinError {
  // Map common error messages to specific error codes
  const errorMappings: Record<string, JoinErrorCode> = {
    'Participant not found': JoinErrorCode.PARTICIPANT_NOT_FOUND,
    'Участник не найден': JoinErrorCode.PARTICIPANT_NOT_FOUND,
    'Your account is inactive': JoinErrorCode.ACCOUNT_INACTIVE,
    'You are already in a team': JoinErrorCode.ALREADY_IN_TEAM,
    'Вы уже состоите в команде': JoinErrorCode.ALREADY_IN_TEAM,
    'Team not found': JoinErrorCode.TEAM_NOT_FOUND,
    'Команда не найдена': JoinErrorCode.TEAM_NOT_FOUND,
    'Team is full': JoinErrorCode.TEAM_FULL,
    'Команда переполнена': JoinErrorCode.TEAM_FULL,
    'Team is not accepting new members': JoinErrorCode.TEAM_NOT_ACCEPTING,
    'Команда не принимает новых участников': JoinErrorCode.TEAM_NOT_ACCEPTING,
    'You already have a pending request': JoinErrorCode.EXISTING_REQUEST,
    'У вас уже есть заявка на вступление в эту команду': JoinErrorCode.EXISTING_REQUEST,
    'No active hackathon found': JoinErrorCode.NO_ACTIVE_HACKATHON,
    'Команда принадлежит другому хакатону': JoinErrorCode.WRONG_HACKATHON,
    'Unauthorized': JoinErrorCode.UNAUTHORIZED,
    'Invalid request data': JoinErrorCode.VALIDATION_ERROR
  }

  // Find matching error code
  const errorCode = Object.entries(errorMappings).find(([message]) => 
    errorMessage.includes(message)
  )?.[1] || JoinErrorCode.UNKNOWN_ERROR

  return teamJoinErrors[errorCode]
}

export function getJoinBlockReason(
  participant: { id?: string; isActive?: boolean; teamId?: string | null } | null,
  team: { id?: string; members?: unknown[]; status?: string; hackathonId?: string } | null,
  hackathon: { id?: string } | null,
  existingRequest?: { id?: string; status?: string } | null
): TeamJoinError | null {
  if (!participant) {
    return teamJoinErrors[JoinErrorCode.PARTICIPANT_NOT_FOUND]
  }

  if (!participant.isActive) {
    return teamJoinErrors[JoinErrorCode.ACCOUNT_INACTIVE]
  }

  if (participant.teamId) {
    return teamJoinErrors[JoinErrorCode.ALREADY_IN_TEAM]
  }

  if (!team) {
    return teamJoinErrors[JoinErrorCode.TEAM_NOT_FOUND]
  }

  if (team.members && team.members.length >= 4) {
    return teamJoinErrors[JoinErrorCode.TEAM_FULL]
  }

  if (!team.status || !['NEW', 'INCOMPLETED'].includes(team.status)) {
    return teamJoinErrors[JoinErrorCode.TEAM_NOT_ACCEPTING]
  }

  if (existingRequest) {
    return teamJoinErrors[JoinErrorCode.EXISTING_REQUEST]
  }

  if (!hackathon) {
    return teamJoinErrors[JoinErrorCode.NO_ACTIVE_HACKATHON]
  }

  if (team.hackathonId && hackathon.id && team.hackathonId !== hackathon.id) {
    return teamJoinErrors[JoinErrorCode.WRONG_HACKATHON]
  }

  return null
}