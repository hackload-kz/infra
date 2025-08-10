import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
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