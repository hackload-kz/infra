
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create default hackathon
  const defaultHackathon = await prisma.hackathon.upsert({
    where: { slug: 'hackload-2025' },
    update: {},
    create: {
      name: 'HackLoad 2025',
      slug: 'hackload-2025',
      description: 'Присоединяйтесь к нам, создавайте команды и участвуйте в увлекательном хакатоне.',
      theme: 'Сервис продажи билетов',
      startDate: new Date('2025-08-15T09:00:00Z'),
      endDate: new Date('2025-08-17T18:00:00Z'),
      registrationStart: new Date('2025-07-01T00:00:00Z'),
      registrationEnd: new Date('2025-07-25T23:59:59Z'),
      maxTeamSize: 4,
      minTeamSize: 3,
      allowTeamChanges: true,
      isActive: true,
      isPublic: true,
      primaryColor: '#f59e0b', // amber-500
      secondaryColor: '#1e293b', // slate-800
    }
  })

  console.log(`✅ Created default hackathon: ${defaultHackathon.name}`)

  // Update existing teams to belong to the default hackathon
  const teamsWithoutHackathon = await prisma.team.findMany({
    where: {
      hackathonId: undefined
    }
  })

  if (teamsWithoutHackathon.length > 0) {
    await prisma.team.updateMany({
      where: {
        hackathonId: undefined
      },
      data: {
        hackathonId: defaultHackathon.id
      }
    })
    console.log(`✅ Updated ${teamsWithoutHackathon.length} existing teams to belong to default hackathon`)
  } else {
    console.log('ℹ️  No teams found without hackathon assignment')
  }

  // Create hackathon participations for existing participants
  const existingParticipants = await prisma.participant.findMany({
    where: {
      hackathonParticipations: {
        none: {}
      }
    }
  })

  if (existingParticipants.length > 0) {
    for (const participant of existingParticipants) {
      await prisma.hackathonParticipation.create({
        data: {
          hackathonId: defaultHackathon.id,
          participantId: participant.id,
          registeredAt: participant.createdAt,
          isActive: true
        }
      })
    }
    console.log(`✅ Created hackathon participations for ${existingParticipants.length} existing participants`)
  } else {
    console.log('ℹ️  No existing participants found or all already have hackathon participations')
  }

  console.log('🎉 Database seed completed successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error during seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
