type AuthenticationMethod = string | { method: string }

type SessionClaims = {
  aal?: unknown
  amr?: unknown
}

function includesMethod(methods: unknown, expected: string): boolean {
  if (!Array.isArray(methods)) return false

  return (methods as AuthenticationMethod[]).some((entry) =>
    typeof entry === 'string'
      ? entry === expected
      : entry !== null && typeof entry === 'object' && entry.method === expected,
  )
}

export function hasPasswordAuthentication(methods: unknown): boolean {
  return includesMethod(methods, 'password')
}

export function includesRecoveryMethod(methods: unknown): boolean {
  return includesMethod(methods, 'recovery')
}

export function hasEmailOtpAuthentication(methods: unknown): boolean {
  return includesMethod(methods, 'otp')
}

export function hasPermittedOnlineAuthentication(claims: unknown): boolean {
  if (!claims || typeof claims !== 'object') return false
  const typedClaims = claims as SessionClaims
  return typedClaims.aal === 'aal2' || hasEmailOtpAuthentication(typedClaims.amr)
}

export function hasPasswordOnlySession(claims: unknown): boolean {
  if (!claims || typeof claims !== 'object') return false
  const typedClaims = claims as SessionClaims
  return typedClaims.aal === 'aal1' && hasPasswordAuthentication(typedClaims.amr)
}
