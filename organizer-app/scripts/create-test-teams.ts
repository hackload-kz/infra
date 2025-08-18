#!/usr/bin/env tsx

import { db } from '../src/lib/db'

async function createTestTeams() {
  try {
    console.log('👥 Creating test teams...')
    
    // Get the current hackathon
    const hackathon = await db.hackathon.findFirst({
      where: { slug: 'hackload-2025' }
    })
    
    if (!hackathon) {
      throw new Error('No hackathon found')
    }
    
    console.log(`Using hackathon: ${hackathon.name} (${hackathon.id})`)
    
    // Test teams data
    const testTeams = [
      {
        name: 'Alpha Developers',
        nickname: 'team-alpha',
        comment: 'Full-stack development team focusing on scalable solutions',
        status: 'APPROVED' as const,
        level: 'ADVANCED' as const
      },
      {
        name: 'Beta Innovators', 
        nickname: 'team-beta',
        comment: 'AI and machine learning specialists',
        status: 'APPROVED' as const,
        level: 'BEGINNER' as const
      },
      {
        name: 'Gamma Systems',
        nickname: 'team-gamma', 
        comment: 'Infrastructure and DevOps experts',
        status: 'APPROVED' as const,
        level: 'ADVANCED' as const
      }
    ]
    
    // Create teams
    for (const teamData of testTeams) {
      // Check if team already exists
      const existingTeam = await db.team.findUnique({
        where: { nickname: teamData.nickname }
      })
      
      if (existingTeam) {
        console.log(`⚠️ Team ${teamData.nickname} already exists, skipping...`)
        continue
      }
      
      const team = await db.team.create({
        data: {
          ...teamData,
          hackathonId: hackathon.id
        }
      })
      
      console.log(`✅ Created team: ${team.name} (@${team.nickname})`)
    }
    
    console.log('\n📊 Summary of created teams:')
    const teams = await db.team.findMany({
      where: { 
        hackathonId: hackathon.id,
        status: 'APPROVED'
      },
      select: {
        name: true,
        nickname: true,
        status: true,
        level: true
      },
      orderBy: { name: 'asc' }
    })
    
    teams.forEach(team => {
      console.log(`   - ${team.name} (@${team.nickname}) - ${team.level} - ${team.status}`)
    })
    
    console.log(`\n🎉 Test teams setup complete! Created ${teams.length} approved teams.`)
    
  } catch (error) {
    console.error('❌ Error creating test teams:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  createTestTeams()
}

export { createTestTeams }