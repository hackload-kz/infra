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

  // Mock users and participants data
  const mockUsers = [
    { email: 'alex.petrov@example.com', name: 'Александр Петров', company: 'Яндекс', city: 'Москва', telegram: '@alex_petrov', githubUrl: 'https://github.com/alex-petrov', linkedinUrl: 'https://linkedin.com/in/alex-petrov', experienceLevel: 'Продвинутый', technologies: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'], cloudServices: ['AWS EC2', 'S3', 'Lambda'], cloudProviders: ['AWS', 'Azure'] },
    { email: 'maria.ivanova@example.com', name: 'Мария Иванова', company: 'Сбербанк', city: 'Санкт-Петербург', telegram: '@maria_dev', experienceLevel: 'Средний', technologies: ['Python', 'Django', 'Docker', 'Redis'], cloudServices: ['AWS RDS', 'CloudWatch'] },
    { email: 'dmitry.volkov@example.com', name: 'Дмитрий Волков', company: 'Mail.ru', city: 'Москва', telegram: '@dmitry_code', experienceLevel: 'Начинающий', technologies: ['Vue.js', 'TypeScript', 'Express'], cloudServices: ['Heroku', 'Netlify'] },
    { email: 'elena.smirnova@example.com', name: 'Елена Смирнова', company: 'Kaspersky', city: 'Москва', telegram: '@elena_security', experienceLevel: 'Продвинутый', technologies: ['Go', 'Kubernetes', 'Prometheus', 'Grafana'], cloudServices: ['Google Cloud', 'GKE'] },
    { email: 'ivan.kolesnikov@example.com', name: 'Иван Колесников', company: 'Тинькофф', city: 'Москва', telegram: '@ivan_fintech', experienceLevel: 'Средний', technologies: ['Java', 'Spring', 'MySQL', 'Kafka'], cloudServices: ['AWS ECS', 'RDS'] },
    { email: 'anna.fedorova@example.com', name: 'Анна Федорова', company: 'Ozon', city: 'Санкт-Петербург', telegram: '@anna_frontend', experienceLevel: 'Средний', technologies: ['React', 'Redux', 'Webpack', 'SASS'], cloudServices: ['AWS CloudFront', 'S3'] },
    { email: 'sergey.mikhailov@example.com', name: 'Сергей Михайлов', company: 'Wildberries', city: 'Москва', telegram: '@sergey_backend', experienceLevel: 'Продвинутый', technologies: ['C#', '.NET Core', 'SQL Server', 'RabbitMQ'], cloudServices: ['Azure', 'Azure SQL'] },
    { email: 'olga.romanova@example.com', name: 'Ольга Романова', company: 'Avito', city: 'Москва', telegram: '@olga_mobile', experienceLevel: 'Средний', technologies: ['Swift', 'iOS', 'Core Data', 'Firebase'], cloudServices: ['Firebase', 'TestFlight'] },
    { email: 'pavel.novikov@example.com', name: 'Павел Новиков', company: 'Стартап', city: 'Екатеринбург', telegram: '@pavel_startup', experienceLevel: 'Начинающий', technologies: ['PHP', 'Laravel', 'MySQL', 'Vue.js'], cloudServices: ['DigitalOcean', 'Cloudflare'] },
    { email: 'natasha.kozlova@example.com', name: 'Наталья Козлова', company: 'Freelancer', city: 'Новосибирск', telegram: '@natasha_design', experienceLevel: 'Средний', technologies: ['React', 'Figma', 'CSS', 'JavaScript'], cloudServices: ['Vercel', 'Netlify'] },
    { email: 'alexey.belov@example.com', name: 'Алексей Белов', company: 'Ростелеком', city: 'Москва', telegram: '@alexey_telco', experienceLevel: 'Продвинутый', technologies: ['Python', 'FastAPI', 'PostgreSQL', 'Redis'], cloudServices: ['AWS Lambda', 'API Gateway'] },
    { email: 'victoria.popova@example.com', name: 'Виктория Попова', company: 'МТС', city: 'Москва', telegram: '@victoria_data', experienceLevel: 'Средний', technologies: ['Python', 'pandas', 'Machine Learning', 'Jupyter'], cloudServices: ['AWS SageMaker', 'S3'] },
    { email: 'roman.stepanov@example.com', name: 'Роман Степанов', company: 'Мегафон', city: 'Санкт-Петербург', telegram: '@roman_mobile', experienceLevel: 'Продвинутый', technologies: ['Kotlin', 'Android', 'Room', 'Retrofit'], cloudServices: ['Google Play Console', 'Firebase'] },
    { email: 'yulia.karpova@example.com', name: 'Юлия Карпова', company: 'ВКонтакте', city: 'Санкт-Петербург', telegram: '@yulia_social', experienceLevel: 'Средний', technologies: ['JavaScript', 'Node.js', 'MongoDB', 'Express'], cloudServices: ['AWS EC2', 'MongoDB Atlas'] },
    { email: 'andrey.volkov@example.com', name: 'Андрей Волков', company: 'Технопарк', city: 'Москва', telegram: '@andrey_tech', experienceLevel: 'Начинающий', technologies: ['HTML', 'CSS', 'JavaScript', 'Git'], cloudServices: ['GitHub Pages', 'Netlify'] },
    { email: 'svetlana.morozova@example.com', name: 'Светлана Морозова', company: 'Альфа-Банк', city: 'Москва', telegram: '@svetlana_bank', experienceLevel: 'Продвинутый', technologies: ['Java', 'Spring Boot', 'Oracle', 'Apache Kafka'], cloudServices: ['AWS EKS', 'RDS'] },
    { email: 'mikhail.petrov@example.com', name: 'Михаил Петров', company: 'Лаборатория Касперского', city: 'Москва', telegram: '@mikhail_security', experienceLevel: 'Продвинутый', technologies: ['C++', 'Assembly', 'Reverse Engineering', 'Linux'], cloudServices: ['AWS Security Hub', 'CloudTrail'] },
    { email: 'daria.sidorova@example.com', name: 'Дарья Сидорова', company: 'Яндекс.Такси', city: 'Москва', telegram: '@daria_geo', experienceLevel: 'Средний', technologies: ['Python', 'GIS', 'PostGIS', 'Flask'], cloudServices: ['Yandex Cloud', 'Maps API'] },
    { email: 'vladimir.kuznetsov@example.com', name: 'Владимир Кузнецов', company: 'Сбер', city: 'Москва', telegram: '@vladimir_ai', experienceLevel: 'Продвинутый', technologies: ['Python', 'TensorFlow', 'Docker', 'MLflow'], cloudServices: ['Sber Cloud', 'Kubernetes'] },
    { email: 'ekaterina.orlova@example.com', name: 'Екатерина Орлова', company: 'Стартап', city: 'Казань', telegram: '@ekaterina_startup', experienceLevel: 'Начинающий', technologies: ['React', 'Firebase', 'Tailwind CSS'], cloudServices: ['Firebase', 'Vercel'] },
    { email: 'nikolai.petrov@example.com', name: 'Николай Петров', company: 'Газпром Нефть', city: 'Санкт-Петербург', telegram: '@nikolai_oil', experienceLevel: 'Средний', technologies: ['C#', 'WPF', 'SQL Server', 'Azure DevOps'], cloudServices: ['Azure', 'Power BI'] },
    { email: 'alina.volkova@example.com', name: 'Алина Волкова', company: 'Skyeng', city: 'Москва', telegram: '@alina_edu', experienceLevel: 'Средний', technologies: ['Vue.js', 'Nuxt.js', 'Node.js', 'MongoDB'], cloudServices: ['Heroku', 'MongoDB Atlas'] },
    { email: 'denis.smirnov@example.com', name: 'Денис Смирнов', company: 'Delivery Club', city: 'Москва', telegram: '@denis_delivery', experienceLevel: 'Продвинутый', technologies: ['Go', 'PostgreSQL', 'Redis', 'gRPC'], cloudServices: ['AWS ECS', 'ElastiCache'] },
    { email: 'anastasia.ivanova@example.com', name: 'Анастасия Иванова', company: 'Lamoda', city: 'Москва', telegram: '@anastasia_fashion', experienceLevel: 'Средний', technologies: ['PHP', 'Symfony', 'MySQL', 'RabbitMQ'], cloudServices: ['AWS EC2', 'RDS'] },
    { email: 'igor.fedorov@example.com', name: 'Игорь Федоров', company: 'EPAM', city: 'Санкт-Петербург', telegram: '@igor_epam', experienceLevel: 'Продвинутый', technologies: ['Java', 'Spring', 'Microservices', 'Docker'], cloudServices: ['AWS', 'Kubernetes'] },
    { email: 'ksenia.romanova@example.com', name: 'Ксения Романова', company: 'Freelancer', city: 'Нижний Новгород', telegram: '@ksenia_free', experienceLevel: 'Начинающий', technologies: ['HTML', 'CSS', 'Bootstrap', 'jQuery'], cloudServices: ['GitHub Pages'] },
    { email: 'artem.novikov@example.com', name: 'Артём Новиков', company: 'Ivi', city: 'Москва', telegram: '@artem_video', experienceLevel: 'Средний', technologies: ['React', 'Redux', 'WebRTC', 'FFmpeg'], cloudServices: ['AWS MediaConvert', 'CloudFront'] },
    { email: 'polina.kozlova@example.com', name: 'Полина Козлова', company: 'Wildberries', city: 'Москва', telegram: '@polina_retail', experienceLevel: 'Средний', technologies: ['Vue.js', 'Vuex', 'Sass', 'Webpack'], cloudServices: ['AWS S3', 'CloudFront'] },
    { email: 'konstantin.belov@example.com', name: 'Константин Белов', company: 'Озон', city: 'Санкт-Петербург', telegram: '@konstantin_ecom', experienceLevel: 'Продвинутый', technologies: ['Java', 'Spring Boot', 'Apache Kafka', 'Elasticsearch'], cloudServices: ['AWS EKS', 'OpenSearch'] },
    { email: 'margarita.popova@example.com', name: 'Маргарита Попова', company: 'Rutube', city: 'Москва', telegram: '@margarita_media', experienceLevel: 'Средний', technologies: ['Python', 'Django', 'Celery', 'Redis'], cloudServices: ['AWS EC2', 'ElastiCache'] },
    { email: 'maxim.stepanov@example.com', name: 'Максим Степанов', company: 'Авито', city: 'Москва', telegram: '@maxim_classifieds', experienceLevel: 'Продвинутый', technologies: ['Go', 'PostgreSQL', 'ClickHouse', 'Kafka'], cloudServices: ['Yandex Cloud', 'Object Storage'] },
    { email: 'vera.karpova@example.com', name: 'Вера Карпова', company: 'Delivery Club', city: 'Санкт-Петербург', telegram: '@vera_logistics', experienceLevel: 'Начинающий', technologies: ['React', 'TypeScript', 'Node.js'], cloudServices: ['Heroku', 'AWS S3'] },
    { email: 'oleg.volkov@example.com', name: 'Олег Волков', company: 'Тинькофф', city: 'Москва', telegram: '@oleg_fintech', experienceLevel: 'Продвинутый', technologies: ['Scala', 'Akka', 'Cassandra', 'Apache Spark'], cloudServices: ['AWS EMR', 'Cassandra Cloud'] },
    { email: 'sofia.morozova@example.com', name: 'София Морозова', company: 'Стартап', city: 'Москва', telegram: '@sofia_startup', experienceLevel: 'Средний', technologies: ['React Native', 'Firebase', 'Redux'], cloudServices: ['Firebase', 'App Store Connect'] },
    { email: 'kirill.petrov@example.com', name: 'Кирилл Петров', company: 'Мегафон', city: 'Москва', telegram: '@kirill_telco', experienceLevel: 'Средний', technologies: ['C++', 'Qt', 'Linux', 'OpenCV'], cloudServices: ['AWS EC2', 'Lambda'] },
    { email: 'alexandra.sidorova@example.com', name: 'Александра Сидорова', company: 'Яндекс.Маркет', city: 'Москва', telegram: '@alexandra_market', experienceLevel: 'Продвинутый', technologies: ['Java', 'Spring', 'Apache Lucene', 'Elasticsearch'], cloudServices: ['Yandex Cloud', 'Managed Service'] },
    { email: 'timur.kuznetsov@example.com', name: 'Тимур Кузнецов', company: 'VK', city: 'Санкт-Петербург', telegram: '@timur_social', experienceLevel: 'Средний', technologies: ['PHP', 'MySQL', 'Redis', 'Memcached'], cloudServices: ['VK Cloud', 'CDN'] },
    { email: 'elizaveta.orlova@example.com', name: 'Елизавета Орлова', company: 'Сбер', city: 'Москва', telegram: '@elizaveta_bank', experienceLevel: 'Начинающий', technologies: ['JavaScript', 'Angular', 'TypeScript'], cloudServices: ['Azure', 'Office 365'] },
    { email: 'ruslan.petrov@example.com', name: 'Руслан Петров', company: 'Ростелеком', city: 'Санкт-Петербург', telegram: '@ruslan_network', experienceLevel: 'Продвинутый', technologies: ['Python', 'Network Programming', 'Linux', 'Docker'], cloudServices: ['AWS VPC', 'Route 53'] },
    { email: 'lilia.volkova@example.com', name: 'Лилия Волкова', company: 'Freelancer', city: 'Краснодар', telegram: '@lilia_design', experienceLevel: 'Средний', technologies: ['Adobe Creative Suite', 'Figma', 'HTML', 'CSS'], cloudServices: ['Adobe Creative Cloud'] },
    { email: 'nikita.smirnov@example.com', name: 'Никита Смирнов', company: 'Лаборатория Касперского', city: 'Москва', telegram: '@nikita_cyber', experienceLevel: 'Продвинутый', technologies: ['Python', 'Cybersecurity', 'Machine Learning', 'TensorFlow'], cloudServices: ['AWS Security', 'GuardDuty'] },
    { email: 'diana.ivanova@example.com', name: 'Диана Иванова', company: 'Skyeng', city: 'Москва', telegram: '@diana_edtech', experienceLevel: 'Средний', technologies: ['React', 'Node.js', 'MongoDB', 'GraphQL'], cloudServices: ['Heroku', 'MongoDB Atlas'] },
    { email: 'arseniy.fedorov@example.com', name: 'Арсений Федоров', company: 'Mail.ru', city: 'Москва', telegram: '@arseniy_games', experienceLevel: 'Средний', technologies: ['Unity', 'C#', 'Blender', 'Photoshop'], cloudServices: ['Unity Cloud', 'AWS GameLift'] },
    { email: 'valeria.romanova@example.com', name: 'Валерия Романова', company: 'Авито', city: 'Санкт-Петербург', telegram: '@valeria_product', experienceLevel: 'Начинающий', technologies: ['Product Management', 'Analytics', 'SQL', 'Python'], cloudServices: ['Google Analytics', 'BigQuery'] },
    { email: 'gleb.novikov@example.com', name: 'Глеб Новиков', company: 'Wildberries', city: 'Москва', telegram: '@gleb_logistics', experienceLevel: 'Продвинутый', technologies: ['Java', 'Spring Boot', 'Apache Kafka', 'PostgreSQL'], cloudServices: ['AWS EKS', 'RDS'] },
    { email: 'kristina.kozlova@example.com', name: 'Кристина Козлова', company: 'Ozon', city: 'Москва', telegram: '@kristina_mobile', experienceLevel: 'Средний', technologies: ['Flutter', 'Dart', 'Firebase', 'SQLite'], cloudServices: ['Firebase', 'Google Play Console'] },
    { email: 'evgeny.belov@example.com', name: 'Евгений Белов', company: 'Тинькофф', city: 'Москва', telegram: '@evgeny_blockchain', experienceLevel: 'Продвинутый', technologies: ['Blockchain', 'Solidity', 'Web3.js', 'Ethereum'], cloudServices: ['AWS Managed Blockchain'] },
    { email: 'milana.popova@example.com', name: 'Милана Попова', company: 'Стартап', city: 'Санкт-Петербург', telegram: '@milana_ai', experienceLevel: 'Средний', technologies: ['Python', 'Machine Learning', 'scikit-learn', 'Pandas'], cloudServices: ['Google Colab', 'AWS SageMaker'] },
    { email: 'mark.stepanov@example.com', name: 'Марк Степанов', company: 'Яндекс', city: 'Москва', telegram: '@mark_search', experienceLevel: 'Продвинутый', technologies: ['C++', 'Algorithms', 'Data Structures', 'Distributed Systems'], cloudServices: ['Yandex Cloud', 'Object Storage'] },
    { email: 'karina.karpova@example.com', name: 'Карина Карпова', company: 'Сбер', city: 'Москва', telegram: '@karina_devops', experienceLevel: 'Средний', technologies: ['DevOps', 'Docker', 'Kubernetes', 'Terraform'], cloudServices: ['AWS', 'Terraform Cloud'] },
    { email: 'stanislav.volkov@example.com', name: 'Станислав Волков', company: 'Mail.ru', city: 'Москва', telegram: '@stanislav_data', experienceLevel: 'Продвинутый', technologies: ['Python', 'Apache Spark', 'Hadoop', 'Kafka'], cloudServices: ['AWS EMR', 'Redshift'] }
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
        experienceLevel: mockUser.experienceLevel,
        technologies: JSON.stringify(mockUser.technologies),
        cloudServices: JSON.stringify(mockUser.cloudServices),
        cloudProviders: JSON.stringify(['AWS', 'Google Cloud', 'Azure'].slice(0, Math.floor(Math.random() * 3) + 1)),
        otherTechnologies: Math.random() > 0.7 ? JSON.stringify(['Docker', 'Git', 'Linux']) : null,
        otherCloudServices: Math.random() > 0.8 ? JSON.stringify(['Monitoring', 'Logging']) : null,
        otherCloudProviders: Math.random() > 0.9 ? JSON.stringify(['DigitalOcean']) : null
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

  // Create mock teams (some participants will be in teams, others won't)
  const teamTemplates = [
    { name: 'DevOps Masters', nickname: 'devops-masters', comment: 'Команда специалистов по DevOps и инфраструктуре' },
    { name: 'Frontend Wizards', nickname: 'frontend-wizards', comment: 'Мастера пользовательского интерфейса' },
    { name: 'Backend Heroes', nickname: 'backend-heroes', comment: 'Серверная разработка на высшем уровне' },
    { name: 'Data Scientists', nickname: 'data-scientists', comment: 'Аналитики данных и машинное обучение' },
    { name: 'Mobile Developers', nickname: 'mobile-developers', comment: 'Разработчики мобильных приложений' },
    { name: 'Security Experts', nickname: 'security-experts', comment: 'Специалисты по информационной безопасности' },
    { name: 'Full Stack Team', nickname: 'full-stack-team', comment: 'Универсальные разработчики' },
    { name: 'AI Innovators', nickname: 'ai-innovators', comment: 'Команда искусственного интеллекта' },
    { name: 'Cloud Architects', nickname: 'cloud-architects', comment: 'Архитекторы облачных решений' },
    { name: 'Game Developers', nickname: 'game-developers', comment: 'Разработчики игр и интерактивных приложений' },
    { name: 'Blockchain Builders', nickname: 'blockchain-builders', comment: 'Разработчики блокчейн решений' },
    { name: 'UX/UI Masters', nickname: 'ux-ui-masters', comment: 'Дизайнеры пользовательского опыта' },
    { name: 'QA Guardians', nickname: 'qa-guardians', comment: 'Команда тестирования и качества' },
    { name: 'Product Visionaries', nickname: 'product-visionaries', comment: 'Продуктовые менеджеры и аналитики' },
    { name: 'Startup Rebels', nickname: 'startup-rebels', comment: 'Команда стартапа с дерзкими идеями' }
  ]

  const statuses: ('NEW' | 'INCOMPLETED' | 'FINISHED' | 'IN_REVIEW' | 'APPROVED')[] = ['NEW', 'INCOMPLETED', 'FINISHED', 'IN_REVIEW', 'APPROVED']
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

    // Assign 2-4 participants to each team (leaving some participants without teams)
    const teamSize = Math.floor(Math.random() * 3) + 2 // 2-4 members
    const teamMembers = shuffledParticipants.slice(participantIndex, participantIndex + teamSize)
    
    if (teamMembers.length > 0) {
      // First member becomes the leader
      const leader = teamMembers[0]
      
      // Update team with leader
      await prisma.team.update({
        where: { id: team.id },
        data: { leaderId: leader.id }
      })

      // Assign all members to the team
      for (const member of teamMembers) {
        await prisma.participant.update({
          where: { id: member.id },
          data: { teamId: team.id }
        })
      }

      participantIndex += teamSize
      createdTeams.push({ ...team, memberCount: teamMembers.length })
    }

    // Stop if we've assigned most participants (leave some without teams)
    if (participantIndex >= shuffledParticipants.length - 10) {
      break
    }
  }

  console.log(`✅ Created ${createdTeams.length} mock teams`)
  console.log(`✅ Participants in teams: ${participantIndex}`)
  console.log(`✅ Participants without teams: ${shuffledParticipants.length - participantIndex}`)

  // Create some mock join requests
  const unassignedParticipants = shuffledParticipants.slice(participantIndex)
  const messages = [
    'Хочу присоединиться к вашей команде!',
    'Имею опыт в разработке, буду рад помочь',
    'Интересный проект, можно к вам?',
    'Ищу команду для участия в хакатоне',
    'Готов внести свой вклад в проект',
    null
  ]

  for (let i = 0; i < Math.min(10, unassignedParticipants.length); i++) {
    const participant = unassignedParticipants[i]
    const randomTeam = createdTeams[Math.floor(Math.random() * createdTeams.length)]
    const message = messages[Math.floor(Math.random() * messages.length)]

    await prisma.joinRequest.create({
      data: {
        participantId: participant.id,
        teamId: randomTeam.id,
        hackathonId: defaultHackathon.id,
        message: message,
        status: Math.random() > 0.7 ? 'APPROVED' : 'PENDING'
      }
    })
  }

  console.log(`✅ Created mock join requests`)
  console.log('🎉 Test data creation completed successfully!')
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