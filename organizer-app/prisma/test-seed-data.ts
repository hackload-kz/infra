import { PrismaClient } from '@prisma/client'

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

      // Assign other members to the team
      for (let i = 1; i < teamMembers.length; i++) {
        const member = teamMembers[i]
        await prisma.participant.update({
          where: { id: member.id },
          data: { teamId: team.id }
        })
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

  for (let i = 0; i < Math.min(8, unassignedParticipants.length); i++) {
    const participant = unassignedParticipants[i]
    const randomTeam = createdTeams[Math.floor(Math.random() * createdTeams.length)]
    const message = messages[Math.floor(Math.random() * messages.length)]

    await prisma.joinRequest.create({
      data: {
        participantId: participant.id,
        teamId: randomTeam.id,
        hackathonId: defaultHackathon.id,
        message: message,
        status: joinRequestStatuses[Math.floor(Math.random() * joinRequestStatuses.length)]
      }
    })
  }

  console.log(`✅ Created mock join requests`)

  // Create sample messages to test the messaging system
  console.log('📧 Creating sample messages...')
  
  const messageSubjects = [
    'Приглашение в команду',
    'Заявка на вступление в команду',
    'Обновление по проекту',
    'Вопрос по технологиям',
    'Планы на хакатон',
    'Обсуждение архитектуры'
  ]

  const messageTemplates = [
    'Добро пожаловать в нашу команду! Мы рады видеть вас среди участников.',
    'Ваша заявка на вступление в команду была одобрена. Добро пожаловать!',
    'Обновляю информацию по нашему проекту. Все идет по плану.',
    'Хотел бы обсудить выбор технологий для нашего проекта.',
    'Давайте обсудим наши планы на предстоящий хакатон.',
    'Предлагаю рассмотреть следующую архитектуру для решения.'
  ]

  // Create messages between team members and between different participants
  for (let i = 0; i < 20; i++) {
    const sender = createdParticipants[Math.floor(Math.random() * createdParticipants.length)]
    const recipient = createdParticipants[Math.floor(Math.random() * createdParticipants.length)]
    
    if (sender.id !== recipient.id) {
      const subject = messageSubjects[Math.floor(Math.random() * messageSubjects.length)]
      const body = messageTemplates[Math.floor(Math.random() * messageTemplates.length)]
      
      await prisma.message.create({
        data: {
          subject: subject,
          body: `<p>${body}</p>`,
          hackathonId: defaultHackathon.id,
          senderId: sender.id,
          recipientId: recipient.id,
          status: Math.random() > 0.3 ? 'UNREAD' : 'READ', // Most messages unread
          teamId: sender.teamId && recipient.teamId === sender.teamId ? sender.teamId : null
        }
      })
    }
  }

  console.log(`✅ Created sample messages for testing messaging system`)
  console.log('🎉 Enhanced test data creation completed successfully!')
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