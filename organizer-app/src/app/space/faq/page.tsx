import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { HelpCircle, ChevronDown } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SpaceFaqPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

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

  if (!participant) {
    redirect('/login')
  }

  const user = {
    name: participant.name,
    email: participant.email,
    image: session.user?.image
  }

  const faqs = [
    {
      id: 1,
      category: 'Регистрация и участие',
      questions: [
        {
          question: 'Как зарегистрироваться на HackLoad 2025?',
          answer: 'Для регистрации войдите через Google или GitHub аккаунт, затем заполните профиль участника с указанием ваших навыков и опыта.'
        },
        {
          question: 'Могу ли я участвовать без команды?',
          answer: 'Да, вы можете зарегистрироваться индивидуально. Мы поможем найти команду или вы сможете создать свою собственную.'
        },
        {
          question: 'Какой максимальный размер команды?',
          answer: 'Команда может состоять максимум из 4 участников. Это оптимальный размер для эффективной работы над проектом.'
        }
      ]
    },
    {
      id: 2,
      category: 'Команды и проекты',
      questions: [
        {
          question: 'Как создать команду?',
          answer: 'Перейдите в раздел "Моя команда" и нажмите "Создать команду". Укажите название и пригласите участников по email или поделитесь ссылкой-приглашением.'
        },
        {
          question: 'Можно ли поменять команду после регистрации?',
          answer: 'Да, вы можете покинуть текущую команду и присоединиться к другой до начала хакатона. После начала события смена команд не допускается.'
        },
        {
          question: 'Какие технологии можно использовать?',
          answer: 'Вы можете использовать любые технологии и языки программирования. Особенно приветствуются облачные решения и современные инструменты разработки.'
        }
      ]
    },
    {
      id: 3,
      category: 'Техническая поддержка',
      questions: [
        {
          question: 'Не могу войти в аккаунт',
          answer: 'Убедитесь, что используете тот же провайдер OAuth (Google/GitHub), через который регистрировались. Если проблема persist, обратитесь в поддержку.'
        },
        {
          question: 'Как изменить информацию в профиле?',
          answer: 'Перейдите в раздел "Мой профиль" и нажмите "Редактировать профиль". Все изменения сохраняются автоматически.'
        },
        {
          question: 'Не приходят уведомления',
          answer: 'Проверьте настройки уведомлений в разделе настроек и убедитесь, что указан правильный email адрес.'
        }
      ]
    }
  ]

  return (
    <PersonalCabinetLayout user={user}>
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
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <HelpCircle className="w-5 h-5 text-amber-400 mr-2" />
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
            <button className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-3 rounded-lg font-medium transition-colors duration-150">
              Связаться с поддержкой
            </button>
            <button className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-150">
              Telegram канал
            </button>
          </div>
        </div>
      </div>
    </PersonalCabinetLayout>
  )
}