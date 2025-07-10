import { Participant, Team, JoinRequest } from '@prisma/client';

export interface JoinRequestNotificationData {
  participant: Participant;
  team: Team & { leader?: Participant | null };
  joinRequest: JoinRequest;
  joinRequestUrl: string;
  participantProfileUrl: string;
}

export interface JoinRequestResponseData {
  participant: Participant;
  team: Team & { leader?: Participant | null };
  joinRequest: JoinRequest;
  joinRequestUrl: string;
  decision: 'approved' | 'declined';
}

export interface TeamInvitationData {
  team: Team & { leader?: Participant | null };
  teamLeader: Participant;
  targetParticipant: Participant;
  teamUrl: string;
  customMessage?: string;
}

export interface MessageTemplate {
  text: string;
  html: string;
}

export function generateJoinRequestNotificationMessage(data: JoinRequestNotificationData): MessageTemplate {
  const { participant, team, joinRequest, joinRequestUrl, participantProfileUrl } = data;
  
  const telegramLink = participant.telegram 
    ? `\n📱 Telegram: ${participant.telegram.startsWith('@') ? participant.telegram : `@${participant.telegram}`}`
    : '';

  const telegramLinkHtml = participant.telegram 
    ? `<br>📱 <strong>Telegram:</strong> ${participant.telegram.startsWith('@') ? participant.telegram : `@${participant.telegram}`}`
    : '';

  const originalMessage = joinRequest.message 
    ? `\n\n💬 Сообщение от участника:\n"${joinRequest.message}"`
    : '';

  const originalMessageHtml = joinRequest.message 
    ? `<div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #007bff; border-radius: 5px;">
         <h4 style="color: #007bff; margin: 0 0 10px 0;">💬 Сообщение от участника:</h4>
         <p style="margin: 0; font-style: italic;">"${joinRequest.message}"</p>
       </div>`
    : '';

  const text = `🔔 Новая заявка на вступление в команду "${team.name}"

👤 Участник: ${participant.name}
📧 Email: ${participant.email}
🏢 Компания: ${participant.company || 'Не указана'}
🌍 Город: ${participant.city || 'Не указан'}${telegramLink}

🔗 Профиль участника: ${participantProfileUrl}
📋 Управление заявками: ${joinRequestUrl}${originalMessage}

📋 Что делать дальше:
• Ознакомьтесь с профилем участника
• Свяжитесь с участником для обсуждения
• Перейдите на страницу "Моя команда" для управления заявками
• Вы можете связаться с участником через Telegram или email

⚠️ Не забудьте ответить на заявку в системе!`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb; margin-bottom: 20px;">🔔 Новая заявка на вступление в команду "${team.name}"</h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #495057; margin-top: 0;">👤 Информация об участнике</h3>
        <p style="margin: 5px 0;"><strong>Имя:</strong> ${participant.name}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${participant.email}</p>
        <p style="margin: 5px 0;"><strong>Компания:</strong> ${participant.company || 'Не указана'}</p>
        <p style="margin: 5px 0;"><strong>Город:</strong> ${participant.city || 'Не указан'}${telegramLinkHtml}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <a href="${participantProfileUrl}" style="display: inline-block; background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">
          🔗 Профиль участника
        </a>
        <a href="${joinRequestUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          📋 Управление заявками
        </a>
      </div>

      ${originalMessageHtml}

      <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin-top: 20px;">
        <h4 style="color: #1976d2; margin-top: 0;">📋 Что делать дальше:</h4>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li style="margin: 5px 0;">Ознакомьтесь с профилем участника</li>
          <li style="margin: 5px 0;">Свяжитесь с участником для обсуждения</li>
          <li style="margin: 5px 0;">Перейдите на страницу "Моя команда" для управления заявками</li>
          <li style="margin: 5px 0;">Вы можете связаться с участником через Telegram или email</li>
        </ul>
        <p style="margin: 10px 0; font-weight: bold; color: #f57c00;">⚠️ Не забудьте ответить на заявку в системе!</p>
      </div>
    </div>
  `;

  return { text, html };
}

export function generateJoinRequestResponseMessage(data: JoinRequestResponseData): MessageTemplate {
  const { team, joinRequestUrl, decision } = data;
  
  const teamLeader = team.leader;
  const leaderTelegramLink = teamLeader?.telegram 
    ? `\n📱 Telegram лидера: ${teamLeader.telegram.startsWith('@') ? teamLeader.telegram : `@${teamLeader.telegram}`}`
    : '';

  const leaderTelegramLinkHtml = teamLeader?.telegram 
    ? `<br>📱 <strong>Telegram лидера:</strong> ${teamLeader.telegram.startsWith('@') ? teamLeader.telegram : `@${teamLeader.telegram}`}`
    : '';

  if (decision === 'approved') {
    const text = `🎉 Ваша заявка на вступление в команду одобрена!

✅ Команда: "${team.name}"
👨‍💼 Лидер команды: ${teamLeader?.name || 'Не назначен'}
📧 Email лидера: ${teamLeader?.email || 'Не указан'}${leaderTelegramLink}

🔗 Просмотр команд: ${joinRequestUrl}

🎯 Поздравляем! Добро пожаловать в команду!

📋 Что делать дальше:
• Свяжитесь с лидером команды для координации
• Присоединитесь к командным каналам связи
• Перейдите на страницу "Моя команда" для просмотра деталей
• Начните работу над проектом

Удачи в хакатоне! 🚀`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #28a745; margin-bottom: 20px;">🎉 Ваша заявка на вступление в команду одобрена!</h2>
        
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #c3e6cb;">
          <h3 style="color: #155724; margin-top: 0;">✅ Информация о команде</h3>
          <p style="margin: 5px 0;"><strong>Команда:</strong> "${team.name}"</p>
          <p style="margin: 5px 0;"><strong>Лидер команды:</strong> ${teamLeader?.name || 'Не назначен'}</p>
          <p style="margin: 5px 0;"><strong>Email лидера:</strong> ${teamLeader?.email || 'Не указан'}${leaderTelegramLinkHtml}</p>
        </div>

        <div style="text-align: center; margin-bottom: 20px;">
          <a href="${joinRequestUrl}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            🔗 Просмотр команд
          </a>
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ffeaa7;">
          <h3 style="color: #856404; margin-top: 0;">🎯 Поздравляем! Добро пожаловать в команду!</h3>
        </div>

        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px;">
          <h4 style="color: #1976d2; margin-top: 0;">📋 Что делать дальше:</h4>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li style="margin: 5px 0;">Свяжитесь с лидером команды для координации</li>
            <li style="margin: 5px 0;">Присоединитесь к командным каналам связи</li>
            <li style="margin: 5px 0;">Перейдите на страницу "Моя команда" для просмотра деталей</li>
            <li style="margin: 5px 0;">Начните работу над проектом</li>
          </ul>
          <p style="margin: 10px 0; font-weight: bold; color: #1976d2;">Удачи в хакатоне! 🚀</p>
        </div>
      </div>
    `;

    return { text, html };
  } else {
    const text = `❌ Ваша заявка на вступление в команду отклонена

🔴 Команда: "${team.name}"
👨‍💼 Лидер команды: ${teamLeader?.name || 'Не назначен'}
📧 Email лидера: ${teamLeader?.email || 'Не указан'}${leaderTelegramLink}

🔗 Просмотр команд: ${joinRequestUrl}

😔 К сожалению, ваша заявка была отклонена.

📋 Что делать дальше:
• Рассмотрите возможность подачи заявки в другие команды
• Свяжитесь с лидером команды для получения обратной связи
• Создайте собственную команду
• Перейдите на страницу "Команды" для поиска новых возможностей

Не расстраивайтесь, найдите команду своей мечты! 💪`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc3545; margin-bottom: 20px;">❌ Ваша заявка на вступление в команду отклонена</h2>
        
        <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #f5c6cb;">
          <h3 style="color: #721c24; margin-top: 0;">🔴 Информация о команде</h3>
          <p style="margin: 5px 0;"><strong>Команда:</strong> "${team.name}"</p>
          <p style="margin: 5px 0;"><strong>Лидер команды:</strong> ${teamLeader?.name || 'Не назначен'}</p>
          <p style="margin: 5px 0;"><strong>Email лидера:</strong> ${teamLeader?.email || 'Не указан'}${leaderTelegramLinkHtml}</p>
        </div>

        <div style="text-align: center; margin-bottom: 20px;">
          <a href="${joinRequestUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            🔗 Просмотр команд
          </a>
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ffeaa7;">
          <p style="color: #856404; margin: 0;">😔 К сожалению, ваша заявка была отклонена.</p>
        </div>

        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px;">
          <h4 style="color: #1976d2; margin-top: 0;">📋 Что делать дальше:</h4>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li style="margin: 5px 0;">Рассмотрите возможность подачи заявки в другие команды</li>
            <li style="margin: 5px 0;">Свяжитесь с лидером команды для получения обратной связи</li>
            <li style="margin: 5px 0;">Создайте собственную команду</li>
            <li style="margin: 5px 0;">Перейдите на страницу "Команды" для поиска новых возможностей</li>
          </ul>
          <p style="margin: 10px 0; font-weight: bold; color: #1976d2;">Не расстраивайтесь, найдите команду своей мечты! 💪</p>
        </div>
      </div>
    `;

    return { text, html };
  }
}

export function generateTeamInvitationMessage(data: TeamInvitationData): MessageTemplate {
  const { team, teamLeader, teamUrl, customMessage } = data;
  
  const leaderTelegramLink = teamLeader.telegram 
    ? `\n📱 Telegram: ${teamLeader.telegram.startsWith('@') ? teamLeader.telegram : `@${teamLeader.telegram}`}`
    : '';

  const leaderTelegramLinkHtml = teamLeader.telegram 
    ? `<br>📱 <strong>Telegram:</strong> ${teamLeader.telegram.startsWith('@') ? teamLeader.telegram : `@${teamLeader.telegram}`}`
    : '';

  const personalMessage = customMessage 
    ? `\n\n💬 Сообщение от лидера команды:\n"${customMessage}"`
    : '';

  const personalMessageHtml = customMessage 
    ? `<div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #28a745; border-radius: 5px;">
         <h4 style="color: #28a745; margin: 0 0 10px 0;">💬 Сообщение от лидера команды:</h4>
         <p style="margin: 0; font-style: italic;">"${customMessage}"</p>
       </div>`
    : '';

  const text = `🎯 Приглашение в команду "${team.name}"

👨‍💼 Лидер команды: ${teamLeader.name}
📧 Email: ${teamLeader.email}${leaderTelegramLink}

🔗 Страница команды: ${teamUrl}${personalMessage}

🌟 Мы хотели бы пригласить вас присоединиться к нашей команде для участия в хакатоне!

📋 Что делать дальше:
• Ознакомьтесь со страницей нашей команды
• Свяжитесь с лидером команды для обсуждения деталей
• Если вас заинтересовало предложение, подайте заявку на вступление
• Можете связаться с нами через Telegram или email для дополнительных вопросов

🚀 Мы будем рады видеть вас в нашей команде!`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb; margin-bottom: 20px;">🎯 Приглашение в команду "${team.name}"</h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #495057; margin-top: 0;">👨‍💼 Информация о лидере команды</h3>
        <p style="margin: 5px 0;"><strong>Имя:</strong> ${teamLeader.name}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${teamLeader.email}${leaderTelegramLinkHtml}</p>
      </div>

      <div style="text-align: center; margin-bottom: 20px;">
        <a href="${teamUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          🔗 Страница команды
        </a>
      </div>

      ${personalMessageHtml}

      <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ffeaa7;">
        <h3 style="color: #856404; margin-top: 0;">🌟 Мы хотели бы пригласить вас присоединиться к нашей команде для участия в хакатоне!</h3>
      </div>

      <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px;">
        <h4 style="color: #1976d2; margin-top: 0;">📋 Что делать дальше:</h4>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li style="margin: 5px 0;">Ознакомьтесь со страницей нашей команды</li>
          <li style="margin: 5px 0;">Свяжитесь с лидером команды для обсуждения деталей</li>
          <li style="margin: 5px 0;">Если вас заинтересовало предложение, подайте заявку на вступление</li>
          <li style="margin: 5px 0;">Можете связаться с нами через Telegram или email для дополнительных вопросов</li>
        </ul>
        <p style="margin: 10px 0; font-weight: bold; color: #1976d2;">🚀 Мы будем рады видеть вас в нашей команде!</p>
      </div>
    </div>
  `;

  return { text, html };
}