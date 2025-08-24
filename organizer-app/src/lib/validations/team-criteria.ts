import { z } from 'zod'
import { CriteriaType, CriteriaStatus } from '@prisma/client'

export const criteriaUpdateSchema = z.object({
  teamSlug: z.string().min(1),
  hackathonId: z.string().min(1),
  criteriaType: z.nativeEnum(CriteriaType),
  status: z.nativeEnum(CriteriaStatus),
  score: z.number().min(0).optional(),
  metrics: z.record(z.any()).optional(),
  updatedBy: z.string().min(1)
})

export const bulkCriteriaUpdateSchema = z.object({
  updates: z.array(criteriaUpdateSchema)
})

export const singleCriteriaUpdateSchema = z.object({
  status: z.nativeEnum(CriteriaStatus),
  score: z.number().min(0).optional(),
  metrics: z.record(z.any()).optional(),
  updatedBy: z.string().min(1)
})

export type CriteriaUpdateInput = z.infer<typeof criteriaUpdateSchema>
export type BulkCriteriaUpdateInput = z.infer<typeof bulkCriteriaUpdateSchema>
export type SingleCriteriaUpdateInput = z.infer<typeof singleCriteriaUpdateSchema>