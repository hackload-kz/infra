import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Global flag to ensure background jobs are only initialized once
let backgroundJobsInitialized = false

export async function middleware(request: NextRequest) {
  // Initialize background jobs on first request in production (server-side only)
  if (!backgroundJobsInitialized && process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
    backgroundJobsInitialized = true
    console.info('🚀 Middleware: Initializing background jobs...')
    
    try {
      // Dynamic import to avoid bundling server-side code in client
      const { initializeBackgroundJobs } = await import('./lib/app-startup')
      initializeBackgroundJobs()
      console.info('✅ Middleware: Background jobs initialized successfully')
    } catch (error) {
      console.error('❌ Middleware: Failed to initialize background jobs:', error)
      // Reset flag so it can retry on next request
      backgroundJobsInitialized = false
    }
  }
  
  return NextResponse.next()
}

export const config = {
  // Запускать middleware для всех путей API и dashboard
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
  // Use Node.js runtime instead of Edge Runtime for Node.js API compatibility
  runtime: 'nodejs',
}