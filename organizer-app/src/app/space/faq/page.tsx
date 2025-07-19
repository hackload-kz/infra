import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { HelpCircle, ChevronDown } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SpaceFaqPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  // Check if user is an organizer
  const userIsOrganizer = isOrganizer(session.user.email)

  const participant = await db.participant.findFirst({
    where: { 
      user: { email: session.user.email } 
    },
    include: {
      user: true,
      team: true,
      ledTeam: true,
    },
  })

  // If no participant found and user is not an organizer, redirect to login
  if (!participant && !userIsOrganizer) {
    redirect('/login')
  }

  // For organizers without participant data, create a fallback user object
  const user = participant ? {
    name: participant.name,
    email: participant.email,
    image: session.user?.image || undefined
  } : {
    name: session.user.name || 'Organizer',
    email: session.user.email || '',
    image: session.user?.image || undefined
  }

  const faqs = [
    {
      id: 1,
      category: 'Регистрация и участие',
      questions: [
        {
          question: 'Как зарегистрироваться на HackLoad 2025?',
          answer: 'Регистрация происходит через OAuth-авторизацию с помощью Google или GitHub аккаунтов. После входа в систему вам необходимо заполнить профиль участника, указав ваше имя, контактные данные, навыки и опыт в области разработки. Система автоматически создаст участие в хакатоне "HackLoad 2025", который пройдет 15-17 января 2025 года. Регистрация открыта до 14 января 2025 года.'
        },
        {
          question: 'Могу ли я участвовать без команды?',
          answer: 'Да, вы можете зарегистрироваться как индивидуальный участник. В разделе "Команды" вы сможете просматривать существующие команды, подавать заявки на вступление или создать собственную команду и пригласить других участников. Система поддерживает поиск команд по названию и уровню сложности (начинающий или продвинутый), что поможет найти подходящих товарищей по команде.'
        },
        {
          question: 'Какой максимальный размер команды?',
          answer: 'Команда может состоять максимум из 4 участников и минимум из 3 участников. Это оптимальный размер для эффективной работы над проектом в рамках 3-дневного хакатона. Каждая команда имеет лидера (создателя команды), который может управлять составом команды, принимать или отклонять заявки на вступление.'
        },
        {
          question: 'Какая тема хакатона HackLoad 2025?',
          answer: 'Тема хакатона - "Построение системы продажи билетов". Участникам предстоит разработать инновационные решения для продажи билетов на различные мероприятия, используя современные технологии и подходы. Можно создавать как веб-приложения, так и мобильные решения, API-сервисы или комплексные платформы.'
        }
      ]
    },
    {
      id: 2,
      category: 'Команды и проекты',
      questions: [
        {
          question: 'Как создать команду?',
          answer: 'Для создания команды перейдите в раздел "Моя команда" и нажмите кнопку "Создать команду". Укажите название команды (это будет отображаться публично), уникальный никнейм для URL (используется в адресе страницы команды), выберите уровень сложности (начинающий или продвинутый) и добавьте описание проекта. После создания вы автоматически станете лидером команды и сможете приглашать других участников.'
        },
        {
          question: 'Как присоединиться к существующей команде?',
          answer: 'В разделе "Команды" вы можете просматривать все доступные команды хакатона. Используйте фильтры для поиска команд по уровню сложности или названию. Чтобы присоединиться, нажмите "Подать заявку" на странице команды. Лидер команды получит уведомление о вашей заявке и сможет принять или отклонить её. Вы также можете добавить сообщение с заявкой, рассказав о своих навыках и мотивации.'
        },
        {
          question: 'Можно ли поменять команду после регистрации?',
          answer: 'Да, до начала хакатона (25 июля 2025) вы можете свободно покидать команды и присоединяться к новым. Система позволяет отзывать поданные заявки и подавать новые. Если вы лидер команды, то при выходе лидерство автоматически передается другому участнику команды. После начала хакатона смена команд будет заблокирована для обеспечения честности соревнования.'
        },
        {
          question: 'Какие статусы команд существуют?',
          answer: 'В системе предусмотрены следующие статусы команд: НОВАЯ (только создана), НЕПОЛНАЯ (не все роли заполнены), ГОТОВА (команда сформирована), НА РАССМОТРЕНИИ (проект отправлен на оценку), ОДОБРЕНА (проект принят жюри), ОТМЕНЕНА (команда сняла проект) и ОТКЛОНЕНА (проект не прошел модерацию). Статус команды отображается на её странице и влияет на возможность присоединения новых участников.'
        },
        {
          question: 'Какие технологии можно использовать?',
          answer: 'Вы можете использовать любые технологии, языки программирования, фреймворки и инструменты разработки. Особенно приветствуются современные технологии: облачные решения (AWS, Azure, GCP), контейнеризация (Docker, Kubernetes), современные фронтенд-фреймворки (React, Vue, Angular), бэкенд-технологии (Node.js, Python, Go, Java), базы данных (PostgreSQL, MongoDB, Redis) и инструменты DevOps.'
        }
      ]
    },
    {
      id: 3,
      category: 'Система сообщений и уведомлений',
      questions: [
        {
          question: 'Как работает система сообщений?',
          answer: 'Платформа включает полнофункциональную систему сообщений для общения между участниками. Вы можете отправлять личные сообщения другим участникам, групповые сообщения всей команде, а также получать системные уведомления о заявках на вступление, изменениях в команде и важных объявлениях. Все сообщения дублируются на email для надежности доставки.'
        },
        {
          question: 'Как пригласить участника в команду?',
          answer: 'Как лидер команды, вы можете отправлять персональные приглашения участникам через систему сообщений. Найдите нужного участника в разделе "Участники", откройте его профиль и нажмите "Пригласить в команду". Система автоматически создаст красиво оформленное приглашение с информацией о вашей команде и проекте. Участник получит уведомление на email и в личном кабинете.'
        },
        {
          question: 'Как отслеживать заявки на вступление в команду?',
          answer: 'Все заявки на вступление в вашу команду отображаются в разделе "Моя команда" с возможностью просмотра профиля кандидата и его сообщения. При получении новой заявки лидер команды получает мгновенное уведомление по email и в личном кабинете. После рассмотрения заявки участник получает уведомление о принятом решении с возможностью ответа.'
        }
      ]
    },
    {
      id: 4,
      category: 'Техническая поддержка',
      questions: [
        {
          question: 'Не могу войти в аккаунт',
          answer: 'Система использует OAuth-авторизацию через Google и GitHub. Убедитесь, что используете тот же провайдер (Google или GitHub), через который изначально регистрировались. Если вы забыли, какой провайдер использовали, попробуйте оба варианта. При первом входе система автоматически создает профиль участника. Если проблемы persist, очистите cookies браузера и попробуйте снова.'
        },
        {
          question: 'Как изменить информацию в профиле?',
          answer: 'Перейдите в раздел "Мой профиль" через навигационное меню. Нажмите кнопку "Редактировать профиль" для изменения имени, контактных данных, описания навыков и опыта. Все изменения сохраняются автоматически после нажатия кнопки "Сохранить". Ваш email привязан к OAuth-провайдеру и не может быть изменен через профиль.'
        },
        {
          question: 'Не приходят email-уведомления',
          answer: 'Система автоматически отправляет email-уведомления о всех важных событиях: заявки на вступление в команду, приглашения, изменения статуса команды. Проверьте папку "Спам" в вашей почте. Убедитесь, что email-адрес в вашем OAuth-профиле актуален. В тестовой среде все уведомления перенаправляются на тестовый адрес для безопасности.'
        },
        {
          question: 'Проблемы с отображением сайта',
          answer: 'Платформа оптимизирована для современных браузеров и использует адаптивный дизайн. Рекомендуется использовать последние версии Chrome, Firefox, Safari или Edge. Убедитесь, что JavaScript включен в браузере. Если возникают проблемы с загрузкой, попробуйте обновить страницу или очистить кеш браузера (Ctrl+F5 или Cmd+Shift+R).'
        },
        {
          question: 'Как получить дополнительную помощь?',
          answer: 'Если у вас возникли вопросы, которые не освещены в FAQ, вы можете обратиться за помощью несколькими способами: присоединиться к Telegram-чату "Тимлид не кодит" по ссылке https://t.me/teamleads_kz, где вы найдете сообщество разработчиков и организаторов, готовых помочь с любыми вопросами. Также можете написать на email: event@hackload.kz для получения официальной поддержки от команды организаторов.'
        }
      ]
    }
  ]

  const hasTeam = !!(participant?.team || participant?.ledTeam)

  return (
    <PersonalCabinetLayout user={user} hasTeam={hasTeam}>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          <span className="text-amber-400">FAQ</span> - Часто задаваемые вопросы
        </h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full"></div>
      </div>

      {/* FAQ Categories */}
      <div className="space-y-8">
        {faqs.map((category) => (
          <div key={category.id} className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <HelpCircle className="w-6 h-6 text-amber-400 mr-3" />
              {category.category}
            </h2>
            
            <div className="space-y-4">
              {category.questions.map((faq, index) => (
                <details key={index} className="bg-slate-700/30 rounded-lg">
                  <summary className="p-4 cursor-pointer hover:bg-slate-700/50 transition-colors rounded-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-medium pr-4">{faq.question}</h3>
                      <ChevronDown className="w-4 h-4 text-slate-400 transform transition-transform details-open:rotate-180" />
                    </div>
                  </summary>
                  <div className="px-4 pb-4">
                    <p className="text-slate-300 leading-relaxed">{faq.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Contact Support */}
      <div className="mt-12 bg-gradient-to-r from-amber-400/20 to-amber-500/20 backdrop-blur-sm p-6 rounded-lg border border-amber-400/30">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-4">
            Не нашли ответ на свой вопрос?
          </h3>
          <p className="text-amber-200 mb-6">
            Свяжитесь с нашей командой поддержки, и мы поможем решить любую проблему
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a 
              href="mailto:event@hackload.kz" 
              className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-3 rounded-lg font-medium transition-colors duration-150 inline-block"
            >
              Связаться с поддержкой
            </a>
            <a 
              href="https://t.me/teamleads_kz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-150 inline-block"
            >
              Telegram чат
            </a>
          </div>
        </div>
      </div>
    </PersonalCabinetLayout>
  )
}