export async function register() {
  console.info('🔧 Instrumentation: register() called');
  console.info('🔧 Environment check - NODE_ENV:', process.env.NODE_ENV);
  console.info('🔧 Environment check - SKIP_ENV_VALIDATION:', process.env.SKIP_ENV_VALIDATION);
  console.info('🔧 Environment check - typeof window:', typeof window);
  
  // Only skip during actual Docker build, not production runtime
  if (process.env.SKIP_ENV_VALIDATION === '1' && process.env.NODE_ENV !== 'production') {
    console.info('🔧 Instrumentation: Skipping background jobs during Docker build')
    return
  }
  
  // Always initialize in production, or in development if not building
  console.info('🚀 Instrumentation: Starting background jobs initialization...')
  
  try {
    const { initializeBackgroundJobs } = await import('./src/lib/app-startup')
    initializeBackgroundJobs()
    console.info('✅ Instrumentation: Background jobs initialized successfully')
  } catch (error) {
    console.error('❌ Instrumentation: Failed to initialize background jobs:', error)
  }
}