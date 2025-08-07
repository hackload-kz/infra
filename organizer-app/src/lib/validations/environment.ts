import { z } from 'zod'

export const environmentDataSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Key must contain only letters, numbers, underscores, and hyphens'),
  value: z.string().min(1).max(2000),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  isSecure: z.boolean().optional(),
  isEditable: z.boolean().optional()
})

export const teamLeaderEnvironmentUpdateSchema = z.object({
  value: z.string().min(1).max(2000)
})

export const serviceKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).default(['environment:write']),
  expiresAt: z.string()
    .optional()
    .refine((value) => {
      if (!value) return true;
      // Allow datetime-local format (YYYY-MM-DDTHH:mm) or full ISO datetime
      return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?Z?)?$/.test(value) && !isNaN(Date.parse(value));
    }, "Invalid datetime format")
})

export const serviceKeyUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string()
    .optional()
    .nullable()
    .refine((value) => {
      if (!value) return true;
      // Allow datetime-local format (YYYY-MM-DDTHH:mm) or full ISO datetime
      return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?Z?)?$/.test(value) && !isNaN(Date.parse(value));
    }, "Invalid datetime format")
})

export const bulkEnvironmentUpdateSchema = z.object({
  teamSlug: z.string().min(1),
  updates: z.array(environmentDataSchema)
})

export type EnvironmentDataInput = z.infer<typeof environmentDataSchema>
export type TeamLeaderEnvironmentUpdateInput = z.infer<typeof teamLeaderEnvironmentUpdateSchema>
export type ServiceKeyInput = z.infer<typeof serviceKeySchema>
export type ServiceKeyUpdateInput = z.infer<typeof serviceKeyUpdateSchema>
export type BulkEnvironmentUpdateInput = z.infer<typeof bulkEnvironmentUpdateSchema>