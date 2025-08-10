export async function register() {
  // Skip during Docker build to avoid "self is not defined" errors
  if (process.env.SKIP_ENV_VALIDATION === '1') {
    console.log('🔧 Instrumentation: Skipping background jobs during Docker build')
    return
  }
  
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Инициализация фоновых джоб при запуске Node.js процесса
    console.log('🚀 Instrumentation: Starting background jobs initialization...')
    
    try {
      const { initializeBackgroundJobs } = await import('./src/lib/app-startup')
      initializeBackgroundJobs()
      console.log('✅ Instrumentation: Background jobs initialized successfully')
    } catch (error) {
      console.error('❌ Instrumentation: Failed to initialize background jobs:', error)
    }
  }
}