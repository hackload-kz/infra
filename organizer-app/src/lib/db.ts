import { PrismaClient } from '@prisma/client'

// Production safety check
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL?.includes('connection_limit')) {
    console.warn('⚠️  WARNING: DATABASE_URL in production should include connection_limit parameter')
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

export const db =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query'] : [],
        datasources: {
            db: {
                url: process.env.DATABASE_URL + "?connection_limit=10&pool_timeout=20&socket_timeout=20"
            }
        }
    })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
