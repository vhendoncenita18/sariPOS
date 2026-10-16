import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { hasPasswordOnlySession, hasPermittedOnlineAuthentication } from '@/lib/auth/session'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname === '/login'
  const isRecoveryPage = pathname === '/forgot-password'
  const isMfaPage = pathname.startsWith('/mfa/')
  const isAuthCallback = pathname === '/auth/callback'

  function redirectTo(path: string) {
    const url = request.nextUrl.clone()
    const [pathname, search = ''] = path.split('?', 2)
    url.pathname = pathname
    url.search = search ? `?${search}` : ''
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
    return response
  }

  if (!user && !isAuthPage) {
    if (!isAuthCallback) return redirectTo('/login')
  }

  if (user && (isAuthPage || isRecoveryPage)) {
    return supabaseResponse
  }

  if (user && !isAuthCallback) {
    const { data, error } = await supabase.auth.getClaims()
    const claims = data?.claims

    if (isMfaPage) {
      if (error || hasPermittedOnlineAuthentication(claims)) return redirectTo('/pos')
      if (!hasPasswordOnlySession(claims)) return redirectTo('/login')
    } else if (!isAuthPage && (error || !hasPermittedOnlineAuthentication(claims))) {
      return redirectTo(hasPasswordOnlySession(claims) ? '/mfa/choose' : '/login')
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
