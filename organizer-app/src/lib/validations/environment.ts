import { z } from 'zod'

export const environmentDataSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Key must contain only letters, numbers, underscores, and hyphens'),
  value: z.string().min(1).max(2000),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  isSecure: z.boolean().optional()
})

export const serviceKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).default(['environment:write']),
  expiresAt: z.string().datetime().optional()
})

export const serviceKeyUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable()
})

export const bulkEnvironmentUpdateSchema = z.object({
  teamSlug: z.string().min(1),
  updates: z.array(environmentDataSchema)
})

export type EnvironmentDataInput = z.infer<typeof environmentDataSchema>
export type ServiceKeyInput = z.infer<typeof serviceKeySchema>
export type ServiceKeyUpdateInput = z.infer<typeof serviceKeyUpdateSchema>
export type BulkEnvironmentUpdateInput = z.infer<typeof bulkEnvironmentUpdateSchema>