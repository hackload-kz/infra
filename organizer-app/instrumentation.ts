export async function register() {
  // Skip during Docker build to avoid "self is not defined" errors (but not in production runtime)
  if (process.env.SKIP_ENV_VALIDATION === '1' && process.env.NODE_ENV !== 'production') {
    console.info('🔧 Instrumentation: Skipping background jobs during Docker build')
    return
  }
  
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Инициализация фоновых джоб при запуске Node.js процесса
    console.info('🚀 Instrumentation: Starting background jobs initialization...')
    
    try {
      const { initializeBackgroundJobs } = await import('./src/lib/app-startup')
      initializeBackgroundJobs()
      console.info('✅ Instrumentation: Background jobs initialized successfully')
    } catch (error) {
      console.error('❌ Instrumentation: Failed to initialize background jobs:', error)
    }
  }
}