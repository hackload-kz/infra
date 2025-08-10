import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Global flag to ensure background jobs are only initialized once
let backgroundJobsInitialized = false

export async function middleware(request: NextRequest) {
  // Initialize background jobs on first request in production
  if (!backgroundJobsInitialized && process.env.NODE_ENV === 'production') {
    backgroundJobsInitialized = true
    console.info('🚀 Middleware: Initializing background jobs...')
    
    try {
      const { initializeBackgroundJobs } = await import('./lib/app-startup')
      initializeBackgroundJobs()
      console.info('✅ Middleware: Background jobs initialized successfully')
    } catch (error) {
      console.error('❌ Middleware: Failed to initialize background jobs:', error)
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
}