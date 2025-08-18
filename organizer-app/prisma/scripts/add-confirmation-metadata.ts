#!/usr/bin/env tsx

/**
 * Script to add confirmation metadata to existing team criteria
 * 
 * Usage:
 * npx tsx prisma/scripts/add-confirmation-metadata.ts
 * 
 * This script demonstrates how to add confirmation links to existing criteria.
 * Modify the examples below for your specific confirmation URLs and requirements.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addConfirmationMetadata() {
  console.log('🔄 Starting confirmation metadata migration...')

  try {
    // Example: Update all CODE_REPO criteria with GitHub confirmation links
    const codeRepoCriteria = await prisma.teamCriteria.findMany({
      where: {
        criteriaType: 'CODE_REPO',
        status: 'PASSED'
      },
      include: {
        team: true
      }
    })

    for (const criteria of codeRepoCriteria) {
      const currentMetrics = (criteria.metrics as Record<string, unknown>) || {}
      
      // Example: Add GitHub repository confirmation link
      const updatedMetrics = {
        ...currentMetrics,
        confirmationUrl: `https://github.com/${criteria.team.nickname}/hackload-solution`,
        confirmationTitle: 'Репозиторий',
        confirmationDescription: 'Исходный код решения'
      }

      await prisma.teamCriteria.update({
        where: { id: criteria.id },
        data: { metrics: updatedMetrics }
      })

      console.log(`✅ Updated CODE_REPO confirmation for team: ${criteria.team.name}`)
    }

    // Example: Update all DEPLOYED_SOLUTION criteria with deployment confirmation links
    const deploymentCriteria = await prisma.teamCriteria.findMany({
      where: {
        criteriaType: 'DEPLOYED_SOLUTION',
        status: 'PASSED'
      },
      include: {
        team: true
      }
    })

    for (const criteria of deploymentCriteria) {
      const currentMetrics = (criteria.metrics as Record<string, unknown>) || {}
      
      // Example: Add deployment confirmation link
      const updatedMetrics = {
        ...currentMetrics,
        confirmationUrl: `https://${criteria.team.nickname}.hackload.app`,
        confirmationTitle: 'Демо',
        confirmationDescription: 'Развернутое решение'
      }

      await prisma.teamCriteria.update({
        where: { id: criteria.id },
        data: { metrics: updatedMetrics }
      })

      console.log(`✅ Updated DEPLOYED_SOLUTION confirmation for team: ${criteria.team.name}`)
    }

    // Example: Update performance test criteria with results confirmation
    const performanceCriteria = await prisma.teamCriteria.findMany({
      where: {
        criteriaType: {
          in: ['EVENT_SEARCH', 'ARCHIVE_SEARCH', 'AUTH_PERFORMANCE']
        },
        status: 'PASSED'
      },
      include: {
        team: true
      }
    })

    for (const criteria of performanceCriteria) {
      const currentMetrics = (criteria.metrics as Record<string, unknown>) || {}
      
      // Example: Add performance test results confirmation
      const updatedMetrics = {
        ...currentMetrics,
        confirmationUrl: `https://grafana.hackload.kz/d/performance/${criteria.team.id}?var-team=${criteria.team.nickname}`,
        confirmationTitle: 'Результаты',
        confirmationDescription: 'Метрики производительности'
      }

      await prisma.teamCriteria.update({
        where: { id: criteria.id },
        data: { metrics: updatedMetrics }
      })

      console.log(`✅ Updated ${criteria.criteriaType} confirmation for team: ${criteria.team.name}`)
    }

    console.log('✅ Confirmation metadata migration completed successfully!')
    
    // Summary
    const updatedCriteria = await prisma.teamCriteria.findMany({
      where: {
        metrics: {
          path: ['confirmationUrl'],
          not: undefined
        }
      }
    })
    
    console.log(`📊 Summary: ${updatedCriteria.length} criteria now have confirmation metadata`)

  } catch (error) {
    console.error('❌ Error during confirmation metadata migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Execute the migration
addConfirmationMetadata()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })