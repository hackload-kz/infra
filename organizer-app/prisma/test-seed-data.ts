import { PrismaClient } from '@prisma/client'
import { 
  trackParticipantCreated, 
  trackTeamCreated, 
  trackJoinedTeam, 
  trackJoinRequestCreated,
  trackJoinRequestApproved,
  trackJoinRequestRejected,
  trackMessageReceived
} from '../src/lib/journal'

const prisma = new PrismaClient()

async function createTestData() {
  console.log('🌱 Creating test data with 50 participants and teams...')

  // Get the default hackathon
  const defaultHackathon = await prisma.hackathon.findUnique({
    where: { slug: 'hackload-2025' }
  })

  if (!defaultHackathon) {
    console.error('❌ Default hackathon not found. Please run the main seed first.')
    return
  }

  // Enhanced mock users and participants data with all required fields
  const mockUsers = [
    { 
      email: 'alex.petrov@example.com', 
      name: 'Александр Петров', 
      company: 'Яндекс', 
      city: 'Москва', 
      telegram: '@alex_petrov', 
      githubUrl: 'https://github.com/alex-petrov', 
      linkedinUrl: 'https://linkedin.com/in/alex-petrov', 
      experienceLevel: 'Продвинутый', 
      technologies: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'], 
      cloudServices: ['AWS EC2', 'S3', 'Lambda'], 
      cloudProviders: ['AWS', 'Azure'] 
    },
    { 
      email: 'maria.ivanova@example.com', 
      name: 'Мария Иванова', 
      company: 'Сбербанк', 
      city: 'Санкт-Петербург', 
      telegram: '@maria_dev', 
      githubUrl: 'https://github.com/maria-ivanova', 
      linkedinUrl: 'https://linkedin.com/in/maria-ivanova', 
      experienceLevel: 'Средний', 
      technologies: ['Python', 'Django', 'Docker', 'Redis'], 
      cloudServices: ['AWS RDS', 'CloudWatch'], 
      cloudProviders: ['AWS', 'Google Cloud'] 
    },
    { 
      email: 'dmitry.volkov@example.com', 
      name: 'Дмитрий Волков', 
      company: 'Mail.ru', 
      city: 'Москва', 
      telegram: '@dmitry_code', 
      githubUrl: 'https://github.com/dmitry-volkov', 
      linkedinUrl: 'https://linkedin.com/in/dmitry-volkov', 
      experienceLevel: 'Начинающий', 
      technologies: ['Vue.js', 'TypeScript', 'Express'], 
      cloudServices: ['Heroku', 'Netlify'], 
      cloudProviders: ['Heroku', 'Netlify'] 
    },
    { 
      email: 'elena.smirnova@example.com', 
      name: 'Елена Смирнова', 
      company: 'Kaspersky', 
      city: 'Москва', 
      telegram: '@elena_security', 
      githubUrl: 'https://github.com/elena-smirnova', 
      linkedinUrl: 'https://linkedin.com/in/elena-smirnova', 
      experienceLevel: 'Продвинутый', 
      technologies: ['Go', 'Kubernetes', 'Prometheus', 'Grafana'], 
      cloudServices: ['Google Cloud', 'GKE'], 
      cloudProviders: ['Google Cloud'] 
    },
    { 
      email: 'ivan.kolesnikov@example.com', 
      name: 'Иван Колесников', 
      company: 'Тинькофф', 
      city: 'Москва', 
      telegram: '@ivan_fintech', 
      githubUrl: 'https://github.com/ivan-kolesnikov', 
      linkedinUrl: 'https://linkedin.com/in/ivan-kolesnikov', 
      experienceLevel: 'Средний', 
      technologies: ['Java', 'Spring', 'MySQL', 'Kafka'], 
      cloudServices: ['AWS ECS', 'RDS'], 
      cloudProviders: ['AWS'] 
    },
    { 
      email: 'anna.fedorova@example.com', 
      name: 'Анна Федорова', 
      company: 'Ozon', 
      city: 'Санкт-Петербург', 
      telegram: '@anna_frontend', 
      githubUrl: 'https://github.com/anna-fedorova', 
      linkedinUrl: 'https://linkedin.com/in/anna-fedorova', 
      experienceLevel: 'Средний', 
      technologies: ['React', 'Redux', 'Webpack', 'SASS'], 
      cloudServices: ['AWS CloudFront', 'S3'], 
      cloudProviders: ['AWS'] 
    },
    { 
      email: 'sergey.mikhailov@example.com', 
      name: 'Сергей Михайлов', 
      company: 'Wildberries', 
      city: 'Москва', 
      telegram: '@sergey_backend', 
      githubUrl: 'https://github.com/sergey-mikhailov', 
      linkedinUrl: 'https://linkedin.com/in/sergey-mikhailov', 
      experienceLevel: 'Продвинутый', 
      technologies: ['C#', '.NET Core', 'SQL Server', 'RabbitMQ'], 
      cloudServices: ['Azure', 'Azure SQL'], 
      cloudProviders: ['Azure'] 
    },
    { 
      email: 'olga.romanova@example.com', 
      name: 'Ольга Романова', 
      company: 'Avito', 
      city: 'Москва', 
      telegram: '@olga_mobile', 
      githubUrl: 'https://github.com/olga-romanova', 
      linkedinUrl: 'https://linkedin.com/in/olga-romanova', 
      experienceLevel: 'Средний', 
      technologies: ['Swift', 'iOS', 'Core Data', 'Firebase'], 
      cloudServices: ['Firebase', 'TestFlight'], 
      cloudProviders: ['Firebase', 'Apple'] 
    },
    { 
      email: 'pavel.novikov@example.com', 
      name: 'Павел Новиков', 
      company: 'Стартап', 
      city: 'Екатеринбург', 
      telegram: '@pavel_startup', 
      githubUrl: 'https://github.com/pavel-novikov', 
      linkedinUrl: 'https://linkedin.com/in/pavel-novikov', 
      experienceLevel: 'Начинающий', 
      technologies: ['PHP', 'Laravel', 'MySQL', 'Vue.js'], 
      cloudServices: ['DigitalOcean', 'Cloudflare'], 
      cloudProviders: ['DigitalOcean'] 
    },
    { 
      email: 'natasha.kozlova@example.com', 
      name: 'Наталья Козлова', 
      company: 'Freelancer', 
      city: 'Новосибирск', 
      telegram: '@natasha_design', 
      githubUrl: 'https://github.com/natasha-kozlova', 
      linkedinUrl: 'https://linkedin.com/in/natasha-kozlova', 
      experienceLevel: 'Средний', 
      technologies: ['React', 'Figma', 'CSS', 'JavaScript'], 
      cloudServices: ['Vercel', 'Netlify'], 
      cloudProviders: ['Vercel', 'Netlify'] 
    },
    // Continue with more comprehensive user data...
    { 
      email: 'alexey.belov@example.com', 
      name: 'Алексей Белов', 
      company: 'Ростелеком', 
      city: 'Москва', 
      telegram: '@alexey_telco', 
      githubUrl: 'https://github.com/alexey-belov', 
      linkedinUrl: 'https://linkedin.com/in/alexey-belov', 
      experienceLevel: 'Продвинутый', 
      technologies: ['Python', 'FastAPI', 'PostgreSQL', 'Redis'], 
      cloudServices: ['AWS Lambda', 'API Gateway'], 
      cloudProviders: ['AWS'] 
    },
    { 
      email: 'victoria.popova@example.com', 
      name: 'Виктория Попова', 
      company: 'МТС', 
      city: 'Москва', 
      telegram: '@victoria_data', 
      githubUrl: 'https://github.com/victoria-popova', 
      linkedinUrl: 'https://linkedin.com/in/victoria-popova', 
      experienceLevel: 'Средний', 
      technologies: ['Python', 'pandas', 'Machine Learning', 'Jupyter'], 
      cloudServices: ['AWS SageMaker', 'S3'], 
      cloudProviders: ['AWS'] 
    },
    { 
      email: 'roman.stepanov@example.com', 
      name: 'Роман Степанов', 
      company: 'Мегафон', 
      city: 'Санкт-Петербург', 
      telegram: '@roman_mobile', 
      githubUrl: 'https://github.com/roman-stepanov', 
      linkedinUrl: 'https://linkedin.com/in/roman-stepanov', 
      experienceLevel: 'Продвинутый', 
      technologies: ['Kotlin', 'Android', 'Room', 'Retrofit'], 
      cloudServices: ['Google Play Console', 'Firebase'], 
      cloudProviders: ['Google Cloud', 'Firebase'] 
    },
    { 
      email: 'yulia.karpova@example.com', 
      name: 'Юлия Карпова', 
      company: 'ВКонтакте', 
      city: 'Санкт-Петербург', 
      telegram: '@yulia_social', 
      githubUrl: 'https://github.com/yulia-karpova', 
      linkedinUrl: 'https://linkedin.com/in/yulia-karpova', 
      experienceLevel: 'Средний', 
      technologies: ['JavaScript', 'Node.js', 'MongoDB', 'Express'], 
      cloudServices: ['AWS EC2', 'MongoDB Atlas'], 
      cloudProviders: ['AWS', 'MongoDB Atlas'] 
    },
    { 
      email: 'andrey.volkov@example.com', 
      name: 'Андрей Волков', 
      company: 'Технопарк', 
      city: 'Москва', 
      telegram: '@andrey_tech', 
      githubUrl: 'https://github.com/andrey-volkov', 
      linkedinUrl: 'https://linkedin.com/in/andrey-volkov', 
      experienceLevel: 'Начинающий', 
      technologies: ['HTML', 'CSS', 'JavaScript', 'Git'], 
      cloudServices: ['GitHub Pages', 'Netlify'], 
      cloudProviders: ['GitHub', 'Netlify'] 
    }
  ]

  // Create users and participants
  const createdParticipants = []
  for (const mockUser of mockUsers) {
    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: mockUser.email }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: mockUser.email
        }
      })
    }

    // Check if participant already exists
    let participant = await prisma.participant.findUnique({
      where: { email: mockUser.email }
    })

    if (!participant) {
      participant = await prisma.participant.create({
        data: {
          userId: user.id,
          name: mockUser.name,
          email: mockUser.email,
          company: mockUser.company,
          city: mockUser.city,
          telegram: mockUser.telegram,
          githubUrl: mockUser.githubUrl,
          linkedinUrl: mockUser.linkedinUrl,
          experienceLevel: mockUser.experienceLevel,
          technologies: JSON.stringify(mockUser.technologies),
          cloudServices: JSON.stringify(mockUser.cloudServices),
          cloudProviders: JSON.stringify(mockUser.cloudProviders),
          otherTechnologies: Math.random() > 0.7 ? 'Docker, Git, Linux' : null,
          otherCloudServices: Math.random() > 0.8 ? 'Monitoring, Logging' : null,
          otherCloudProviders: Math.random() > 0.9 ? 'DigitalOcean' : null
        }
      })
    }

    // Create hackathon participation if not exists
    const existingParticipation = await prisma.hackathonParticipation.findUnique({
      where: {
        hackathonId_participantId: {
          hackathonId: defaultHackathon.id,
          participantId: participant.id
        }
      }
    })

    if (!existingParticipation) {
      await prisma.hackathonParticipation.create({
        data: {
          hackathonId: defaultHackathon.id,
          participantId: participant.id,
          registeredAt: new Date(),
          isActive: true
        }
      })
      
      // Track participant creation in journal
      try {
        await trackParticipantCreated(participant.id)
      } catch (error) {
        console.log(`⚠️  Warning: Could not create journal entry for participant ${participant.name}`)
      }
    }

    createdParticipants.push(participant)
  }

  console.log(`✅ Created ${createdParticipants.length} mock participants`)

  // Create mock teams with proper status handling
  const teamTemplates = [
    { name: 'DevOps Masters', nickname: 'devops-masters', comment: 'Команда специалистов по DevOps и инфраструктуре' },
    { name: 'Frontend Wizards', nickname: 'frontend-wizards', comment: 'Мастера пользовательского интерфейса' },
    { name: 'Backend Heroes', nickname: 'backend-heroes', comment: 'Серверная разработка на высшем уровне' },
    { name: 'Data Scientists', nickname: 'data-scientists', comment: 'Аналитики данных и машинное обучение' },
    { name: 'Mobile Developers', nickname: 'mobile-developers', comment: 'Разработчики мобильных приложений' },
    { name: 'Security Experts', nickname: 'security-experts', comment: 'Специалисты по информационной безопасности' },
    { name: 'Full Stack Team', nickname: 'full-stack-team', comment: 'Универсальные разработчики' },
    { name: 'AI Innovators', nickname: 'ai-innovators', comment: 'Команда искусственного интеллекта' }
  ]

  // Updated enums to match schema
  const statuses: ('NEW' | 'INCOMPLETED' | 'FINISHED' | 'IN_REVIEW' | 'APPROVED' | 'CANCELED' | 'REJECTED')[] = 
    ['NEW', 'INCOMPLETED', 'FINISHED', 'IN_REVIEW', 'APPROVED', 'CANCELED', 'REJECTED']
  const levels: ('BEGINNER' | 'ADVANCED' | null)[] = ['BEGINNER', 'ADVANCED', null]

  // Shuffle participants for random team assignment
  const shuffledParticipants = [...createdParticipants].sort(() => Math.random() - 0.5)
  let participantIndex = 0

  const createdTeams = []
  for (const teamTemplate of teamTemplates) {
    const team = await prisma.team.create({
      data: {
        name: teamTemplate.name,
        nickname: teamTemplate.nickname,
        comment: teamTemplate.comment,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        level: levels[Math.floor(Math.random() * levels.length)],
        hackathonId: defaultHackathon.id
      }
    })

    // Assign 2-4 participants to each team
    const teamSize = Math.floor(Math.random() * 3) + 2 // 2-4 members
    const teamMembers = shuffledParticipants.slice(participantIndex, participantIndex + teamSize)
    
    if (teamMembers.length > 0) {
      // First member becomes the leader
      const leader = teamMembers[0]
      
      // Update team with leader and assign all members to the team
      await prisma.team.update({
        where: { id: team.id },
        data: { leaderId: leader.id }
      })

      // Update leader participant with ledTeamId
      await prisma.participant.update({
        where: { id: leader.id },
        data: { 
          teamId: team.id,
          ledTeamId: team.id
        }
      })

      // Track team creation in journal
      try {
        await trackTeamCreated(leader.id, team.id, team.name)
      } catch (error) {
        console.log(`⚠️  Warning: Could not create team creation journal entry for ${team.name}`)
      }

      // Assign other members to the team
      for (let i = 1; i < teamMembers.length; i++) {
        const member = teamMembers[i]
        await prisma.participant.update({
          where: { id: member.id },
          data: { teamId: team.id }
        })
        
        // Track team joining in journal
        try {
          await trackJoinedTeam(member.id, team.id, team.name)
        } catch (error) {
          console.log(`⚠️  Warning: Could not create team join journal entry for ${member.name}`)
        }
      }

      participantIndex += teamSize
      createdTeams.push({ ...team, memberCount: teamMembers.length })
    }

    // Stop if we've assigned most participants (leave some without teams)
    if (participantIndex >= shuffledParticipants.length - 5) {
      break
    }
  }

  console.log(`✅ Created ${createdTeams.length} mock teams`)
  console.log(`✅ Participants in teams: ${participantIndex}`)
  console.log(`✅ Participants without teams: ${shuffledParticipants.length - participantIndex}`)

  // Create some mock join requests with proper enum values
  const unassignedParticipants = shuffledParticipants.slice(participantIndex)
  const messages = [
    'Хочу присоединиться к вашей команде!',
    'Имею опыт в разработке, буду рад помочь',
    'Интересный проект, можно к вам?',
    'Ищу команду для участия в хакатоне',
    'Готов внести свой вклад в проект',
    null
  ]

  const joinRequestStatuses: ('PENDING' | 'APPROVED' | 'DECLINED')[] = ['PENDING', 'APPROVED', 'DECLINED']

  let createdJoinRequests = []
  for (let i = 0; i < Math.min(12, unassignedParticipants.length); i++) {
    const participant = unassignedParticipants[i]
    const randomTeam = createdTeams[Math.floor(Math.random() * createdTeams.length)]
    const message = messages[Math.floor(Math.random() * messages.length)]
    const status = joinRequestStatuses[Math.floor(Math.random() * joinRequestStatuses.length)]

    const joinRequest = await prisma.joinRequest.create({
      data: {
        participantId: participant.id,
        teamId: randomTeam.id,
        hackathonId: defaultHackathon.id,
        message: message,
        status: status
      }
    })

    createdJoinRequests.push({ joinRequest, participant, team: randomTeam, status })

    // Track join request creation in journal
    try {
      await trackJoinRequestCreated(participant.id, joinRequest.id, randomTeam.name)
      
      // Track status changes if not pending
      if (status === 'APPROVED') {
        await trackJoinRequestApproved(participant.id, joinRequest.id, randomTeam.name)
        // If approved, also add them to the team and track joining
        await prisma.participant.update({
          where: { id: participant.id },
          data: { teamId: randomTeam.id }
        })
        await trackJoinedTeam(participant.id, randomTeam.id, randomTeam.name)
      } else if (status === 'DECLINED') {
        await trackJoinRequestRejected(participant.id, joinRequest.id, randomTeam.name)
      }
    } catch (error) {
      console.log(`⚠️  Warning: Could not create join request journal entries for ${participant.name}`)
    }
  }

  console.log(`✅ Created ${createdJoinRequests.length} mock join requests with journal tracking`)

  // Create sample messages to test the messaging system
  console.log('📧 Creating enhanced sample messages...')
  
  const messageTypes = {
    teamInvitation: {
      subjects: [
        '🎯 Приглашение в команду ${teamName}',
        '🚀 Присоединяйтесь к нашей команде!',
        '💫 Вакансия в команде ${teamName}',
        '🔥 Ищем таланты для команды'
      ],
      templates: [
        'Привет! Мы заметили ваш профиль и считаем, что вы отлично подойдете для нашей команды <strong>${teamName}</strong>. Ваш опыт в ${skill} именно то, что нам нужно! Присоединяйтесь к нам для создания крутого проекта.',
        'Добро пожаловать! Команда <strong>${teamName}</strong> приглашает вас присоединиться к нашему проекту. Мы работаем с технологиями ${tech} и уверены, что вместе создадим что-то великолепное.',
        'Здравствуйте! Ваши навыки в ${skill} произвели на нас впечатление. Команда <strong>${teamName}</strong> будет рада видеть вас в наших рядах для участия в хакатоне.'
      ]
    },
    projectUpdate: {
      subjects: [
        '📊 Обновление по проекту',
        '⚡ Прогресс команды ${teamName}',
        '🎯 Статус разработки',
        '📈 Отчет о проделанной работе'
      ],
      templates: [
        'Команда! Хочу поделиться прогрессом по нашему проекту. Сегодня завершили модуль ${module}, осталось доработать ${remaining}. Все идет по плану!',
        'Обновляю статус: архитектура готова на 80%, backend реализован, frontend в процессе. Завтра планируем интеграцию компонентов.',
        'Отличные новости! Мы успешно реализовали ключевую функциональность. Сейчас занимаемся оптимизацией и подготовкой презентации.'
      ]
    },
    technical: {
      subjects: [
        '🔧 Вопрос по технологиям',
        '💻 Обсуждение архитектуры',
        '⚙️ Техническое решение',
        '🛠️ Выбор стека технологий'
      ],
      templates: [
        'Привет! Хотел бы обсудить выбор базы данных для нашего проекта. Что думаешь насчет PostgreSQL vs MongoDB? Учитывая специфику задачи, какой вариант предпочтительнее?',
        'Предлагаю использовать микросервисную архитектуру с Docker контейнерами. Это позволит нам лучше масштабироваться и разделить ответственность между компонентами.',
        'Коллеги, давайте определимся с API. REST или GraphQL? У каждого подхода есть свои преимущества для нашей задачи.'
      ]
    },
    collaboration: {
      subjects: [
        '🤝 Планы на хакатон',
        '📅 Организация работы',
        '🎯 Распределение задач',
        '⏰ Временные рамки'
      ],
      templates: [
        'Команда, давайте распределим задачи на завтра. Я беру на себя backend API, кто готов заняться фронтендом? Также нужен человек на DevOps.',
        'Предлагаю встретиться в зуме сегодня в 20:00 для синхронизации. Обсудим архитектуру и следующие шаги.',
        'Ребята, сделаем небольшой ретро: что получается хорошо, где есть блокеры? Давайте оптимизируем процесс работы.'
      ]
    },
    mentorship: {
      subjects: [
        '🎓 Помощь новичку',
        '📚 Обучение и развитие',
        '💡 Советы по проекту',
        '🌟 Менторство'
      ],
      templates: [
        'Привет! Вижу, что ты новичок в команде. Если нужна помощь с настройкой окружения или вопросы по коду - обращайся, всегда готов помочь!',
        'Отличная работа с компонентом! Небольшой совет: попробуй использовать React.memo для оптимизации рендеринга, это улучшит производительность.',
        'Заметил, что у тебя вопросы по Git. Могу провести краткий воркшоп по лучшим практикам работы с ветками, если интересно.'
      ]
    }
  }

  const skills = ['JavaScript', 'Python', 'React', 'DevOps', 'UI/UX', 'Machine Learning', 'Backend', 'Mobile']
  const technologies = ['React/Node.js', 'Python/Django', 'Kubernetes', 'AWS', 'Docker', 'TypeScript']
  const modules = ['аутентификации', 'API Gateway', 'dashboard', 'базы данных', 'файлового хранилища']
  const remaining = ['тестирование', 'документация', 'оптимизация', 'деплой', 'UI полировка']

  // Create diverse messages
  let messageCount = 0
  
  // Messages between team members (more frequent)
  for (const team of createdTeams) {
    const teamMembersData = await prisma.participant.findMany({
      where: { teamId: team.id }
    })
    
    if (teamMembersData.length > 1) {
      for (let i = 0; i < Math.min(3, teamMembersData.length); i++) {
        const sender = teamMembersData[i]
        const recipient = teamMembersData[(i + 1) % teamMembersData.length]
        
        const messageType = Object.keys(messageTypes)[Math.floor(Math.random() * Object.keys(messageTypes).length)]
        const typeData = messageTypes[messageType as keyof typeof messageTypes]
        
        const subject = typeData.subjects[Math.floor(Math.random() * typeData.subjects.length)]
          .replace('${teamName}', team.name)
        
        const body = typeData.templates[Math.floor(Math.random() * typeData.templates.length)]
          .replace('${teamName}', team.name)
          .replace('${skill}', skills[Math.floor(Math.random() * skills.length)])
          .replace('${tech}', technologies[Math.floor(Math.random() * technologies.length)])
          .replace('${module}', modules[Math.floor(Math.random() * modules.length)])
          .replace('${remaining}', remaining[Math.floor(Math.random() * remaining.length)])
        
        const message = await prisma.message.create({
          data: {
            subject: subject,
            body: `<p>${body}</p>`,
            hackathonId: defaultHackathon.id,
            senderId: sender.id,
            recipientId: recipient.id,
            status: Math.random() > 0.4 ? 'UNREAD' : 'READ',
            teamId: team.id
          }
        })
        
        // Track message received in journal
        try {
          await trackMessageReceived(recipient.id, message.id, sender.name)
        } catch (error) {
          console.log(`⚠️  Warning: Could not track message in journal`)
        }
        
        messageCount++
      }
    }
  }

  // Messages from organizers/system
  const organizers = createdParticipants.filter(p => p.email.includes('alex.petrov') || p.email.includes('elena.smirnova'))
  if (organizers.length > 0) {
    const organizer = organizers[0]
    const systemMessages = [
      {
        subject: '📢 Важное объявление для участников хакатона',
        body: '<p>Уважаемые участники! Напоминаем, что завтра в 10:00 начинается питч-сессия. Подготовьте презентации ваших проектов. Удачи!</p>'
      },
      {
        subject: '🏆 Критерии оценки проектов',
        body: '<p>Жюри будет оценивать проекты по следующим критериям: техническая реализация (40%), инновационность (30%), полезность (20%), презентация (10%).</p>'
      },
      {
        subject: '🍕 Обед и кофе-брейки',
        body: '<p>Обед сегодня с 13:00 до 14:00 в главном зале. Кофе и снеки доступны весь день на 2 этаже. Приятного аппетита!</p>'
      }
    ]
    
    // Send to random participants
    for (const sysMsg of systemMessages) {
      const recipients = createdParticipants.sort(() => Math.random() - 0.5).slice(0, 8)
      for (const recipient of recipients) {
        if (recipient.id !== organizer.id) {
          const message = await prisma.message.create({
            data: {
              subject: sysMsg.subject,
              body: sysMsg.body,
              hackathonId: defaultHackathon.id,
              senderId: organizer.id,
              recipientId: recipient.id,
              status: Math.random() > 0.2 ? 'UNREAD' : 'READ'
            }
          })
          
          try {
            await trackMessageReceived(recipient.id, message.id, 'Организатор')
          } catch (error) {
            console.log(`⚠️  Warning: Could not track system message in journal`)
          }
          
          messageCount++
        }
      }
    }
  }

  // Cross-team collaboration messages
  for (let i = 0; i < 15; i++) {
    const sender = createdParticipants[Math.floor(Math.random() * createdParticipants.length)]
    const recipient = createdParticipants[Math.floor(Math.random() * createdParticipants.length)]
    
    if (sender.id !== recipient.id && sender.teamId !== recipient.teamId) {
      const messageType = Math.random() > 0.5 ? 'technical' : 'mentorship'
      const typeData = messageTypes[messageType]
      
      const subject = typeData.subjects[Math.floor(Math.random() * typeData.subjects.length)]
      const body = typeData.templates[Math.floor(Math.random() * typeData.templates.length)]
        .replace('${skill}', skills[Math.floor(Math.random() * skills.length)])
        .replace('${tech}', technologies[Math.floor(Math.random() * technologies.length)])
      
      const message = await prisma.message.create({
        data: {
          subject: subject,
          body: `<p>${body}</p>`,
          hackathonId: defaultHackathon.id,
          senderId: sender.id,
          recipientId: recipient.id,
          status: Math.random() > 0.3 ? 'UNREAD' : 'READ'
        }
      })
      
      try {
        await trackMessageReceived(recipient.id, message.id, sender.name)
      } catch (error) {
        console.log(`⚠️  Warning: Could not track cross-team message in journal`)
      }
      
      messageCount++
    }
  }

  console.log(`✅ Created ${messageCount} enhanced messages with journal tracking`)
  console.log('🎉 Enhanced test data creation completed successfully!')
  console.log(`📊 Summary:`)
  console.log(`   • ${createdParticipants.length} participants with journal entries`)
  console.log(`   • ${createdTeams.length} teams with creation tracking`)
  console.log(`   • ${createdJoinRequests.length} join requests with status tracking`)
  console.log(`   • ${messageCount} messages with notification tracking`)
  console.log(`   • All activities logged in participant journals`)
}

async function main() {
  try {
    await createTestData()
  } catch (error) {
    console.error('❌ Error creating test data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch(async (e) => {
    console.error('❌ Error during test data creation:', e)
    await prisma.$disconnect()
    process.exit(1)
  })