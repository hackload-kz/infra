import { db } from '@/lib/db'
import { logger, LogAction } from '@/lib/logger'

export interface ServiceApiKeyUsageLog {
  keyId: string
  endpoint: string
  method: string
  userAgent?: string
  ipAddress?: string
  teamId?: string
  success: boolean
}

// Utility functions for API key management
export async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export function generateApiKey(): string {
  // Generate cryptographically secure random key
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return 'sk_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function getKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 11) // 'sk_' + first 8 chars
}

export function getClientIP(headers: Headers): string | null {
  // Try various headers that might contain the client IP
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  const realIP = headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  const cfConnectingIP = headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  return null
}

// Authenticate service account using API key
export async function authenticateServiceAccount(
  apiKey: string | null
): Promise<{ keyId: string; permissions: string[] } | null> {
  if (!apiKey) return null
  
  try {
    // Hash the provided key for comparison
    const keyHash = await hashApiKey(apiKey)
    
    // Find active API key in database
    const serviceKey = await db.serviceApiKey.findUnique({
      where: { 
        keyHash,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    })
    
    if (serviceKey) {
      // Update last used timestamp
      await db.serviceApiKey.update({
        where: { id: serviceKey.id },
        data: { lastUsedAt: new Date() }
      })
      
      return {
        keyId: serviceKey.id,
        permissions: serviceKey.permissions
      }
    }
    
    return null
  } catch (error) {
    await logger.error(LogAction.READ, 'ServiceApiKey', 
      `Error authenticating service account: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        metadata: { keyPrefix: apiKey?.substring(0, 11) || 'unknown' }
      })
    return null
  }
}

// Log API key usage
export async function logApiKeyUsage(usage: ServiceApiKeyUsageLog): Promise<void> {
  try {
    await db.serviceApiKeyUsage.create({
      data: {
        keyId: usage.keyId,
        endpoint: usage.endpoint,
        method: usage.method,
        userAgent: usage.userAgent,
        ipAddress: usage.ipAddress,
        teamId: usage.teamId,
        success: usage.success
      }
    })
    
    // Log for security monitoring
    await logger.info(LogAction.READ, 'ServiceApiKeyUsage', 
      `Service API key used`, {
        metadata: {
          keyId: usage.keyId,
          endpoint: usage.endpoint,
          method: usage.method,
          success: usage.success
        }
      })
  } catch (error) {
    await logger.error(LogAction.CREATE, 'ServiceApiKeyUsage', 
      `Error logging API key usage: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        metadata: { usage, error: error instanceof Error ? error.stack : error }
      })
  }
}

// Mask sensitive values for non-organizers
export function maskSensitiveValue(value: string, isSecure: boolean, isOrganizer: boolean): string {
  if (!isSecure || isOrganizer) return value
  if (value.length <= 8) return '***'
  return value.substring(0, 4) + '***' + value.substring(value.length - 4)
}

// Check if user has permission
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('*')
}