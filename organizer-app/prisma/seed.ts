import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding database...')

    // Create sample teams
    const teams = [
        {
            name: 'Team Alpha',
            nickname: 'team-alpha',
        },
        {
            name: 'Hack Squad',
            nickname: 'hack-squad',
        },
        {
            name: 'Code Warriors',
            nickname: 'code-warriors',
        },
        {
            name: 'Digital Innovators',
            nickname: 'digital-innovators',
        },
    ]

    for (const team of teams) {
        const existingTeam = await prisma.team.findUnique({
            where: { nickname: team.nickname },
        })

        if (!existingTeam) {
            await prisma.team.create({
                data: team,
            })
            console.log(`Created team: ${team.name}`)
        } else {
            console.log(`Team already exists: ${team.name}`)
        }
    }

    console.log('Seeding completed!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
