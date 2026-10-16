'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { hasPasswordAuthentication, hasPermittedOnlineAuthentication, includesRecoveryMethod } from '@/lib/auth/session'

export type AuthState = {
  error?: string
  message?: string
  email?: string
  step?: 'signup-verify' | 'verify' | 'recovery-code' | 'set-password'
  factorId?: string
  qrCode?: string
  secret?: string
}

export type AuthAction = (
  previousState: AuthState,
  formData: FormData,
) => Promise<AuthState | never>

export type StoreSetupState = { error?: string; message?: string }
export type RecoveryState = { error?: string; message?: string; email?: string; step?: 'recovery-code' | 'set-password' }

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const otpPattern = /^\d{6}$/

function readEmail(formData: FormData) {
  return String(formData.get('email') ?? '').trim().toLowerCase()
}

function validEmail(email: string) {
  return emailPattern.test(email)
}

export async function signIn(_previousState: AuthState, formData: FormData): Promise<AuthState> {
  const email = readEmail(formData)
  const password = String(formData.get('password') ?? '')

  if (!validEmail(email)) return { email, error: 'Enter a valid email address.' }
  if (!password) return { email, error: 'Enter your password.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { email, error: error.message }

  redirect('/mfa/choose')
}

export async function signUp(_previousState: AuthState, formData: FormData): Promise<AuthState> {
  const email = readEmail(formData)
  const step = String(formData.get('step') ?? '')
  const supabase = await createClient()

  if (step === 'signup-verify') {
    const token = String(formData.get('otp') ?? '').trim()
    if (!validEmail(email)) return { email, step: 'signup-verify', error: 'Enter a valid email address.' }
    if (!otpPattern.test(token)) return { email, step: 'signup-verify', error: 'Enter the 6-digit code from your email.' }

    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })
    if (error) return { email, step: 'signup-verify', error: error.message }

    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login?confirmed=1')
  }

  const password = String(formData.get('password') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')
  if (!validEmail(email)) return { email, error: 'Enter a valid email address.' }
  if (password.length < 8) return { email, error: 'Use a password with at least 8 characters.' }
  if (password !== confirmPassword) return { email, error: 'Passwords do not match.' }

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { email, error: error.message }

  if (data.session) {
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login?confirmed=1')
  }

  return {
    email,
    step: 'signup-verify',
    message: 'We sent a confirmation code to your email. Enter it below to finish creating your account.',
  }
}

export async function resendSignupCode(_previousState: AuthState, formData: FormData): Promise<AuthState> {
  const email = readEmail(formData)
  if (!validEmail(email)) return { email, step: 'signup-verify', error: 'Enter a valid email address.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resend({ type: 'signup', email })
  if (error) return { email, step: 'signup-verify', error: error.message }
  return { email, step: 'signup-verify', message: 'A new confirmation code has been sent.' }
}

async function requirePasswordSession() {
  const supabase = await createClient()
  const [{ data: userData, error: userError }, { data: claimsData, error: claimsError }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getClaims(),
  ])

  if (userError || claimsError || !userData.user || !hasPasswordAuthentication(claimsData?.claims?.amr)) {
    redirect('/login?error=session')
  }

  return { supabase, user: userData.user }
}

export async function sendEmailSecondFactor(): Promise<never> {
  const { supabase, user } = await requirePasswordSession()
  if (!user.email) redirect('/mfa/choose?error=email')

  // Supabase Auth sends this through the hosted Magic Link template; {{ .Token }} makes it a numeric OTP.
  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false },
  })
  if (error) redirect(`/mfa/choose?error=${encodeURIComponent(error.message)}`)
  redirect('/mfa/email')
}

export async function startTotpSecondFactor(): Promise<never> {
  const { supabase } = await requirePasswordSession()
  const { data, error } = await supabase.auth.mfa.listFactors()
  const factor = data?.totp.find((item) => item.status === 'verified')
  if (error || !factor) redirect('/mfa/choose?error=totp-unavailable')
  redirect('/mfa/verify')
}

async function finishOnlineAuthentication(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.auth.getClaims()
  if (error || !hasPermittedOnlineAuthentication(data?.claims)) {
    return { error: 'Verification did not complete. Choose a sign-in method and try again.' }
  }

  const { data: membership, error: membershipError } = await supabase
    .from('user_store_members')
    .select('store_id')
    .limit(1)
    .maybeSingle()

  if (membershipError) redirect('/setup/store?error=membership')

  revalidatePath('/', 'layout')
  redirect(membership ? '/pos' : '/setup/store')
}

export async function createStore(_previousState: StoreSetupState, formData: FormData): Promise<StoreSetupState> {
  const storeName = String(formData.get('storeName') ?? '').trim()
  if (storeName.length < 2 || storeName.length > 120) return { error: 'Enter a store name between 2 and 120 characters.' }

  const supabase = await createClient()
  const [{ data: { user }, error: userError }, { data: claims, error: claimsError }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getClaims(),
  ])
  if (userError || claimsError || !user || !hasPermittedOnlineAuthentication(claims?.claims)) {
    redirect('/login')
  }

  const { data: existingMembership, error: lookupError } = await supabase
    .from('user_store_members')
    .select('store_id')
    .limit(1)
    .maybeSingle()
  if (lookupError) return { error: 'Could not confirm store membership. Refresh and try again.' }
  if (existingMembership) redirect('/pos')

  const { error } = await supabase.rpc('create_store_for_current_user', {
    p_name: storeName,
  })
  if (error) return { error: error.message }

  const { data: membership, error: membershipError } = await supabase
    .from('user_store_members')
    .select('store_id, role')
    .limit(1)
    .maybeSingle()
  if (membershipError || !membership || membership.role !== 'owner') {
    return { error: 'Store setup completed, but the owner membership could not be confirmed. Contact an administrator before retrying.' }
  }

  revalidatePath('/', 'layout')
  redirect('/pos')
}

export async function verifyTotp(_previousState: AuthState, formData: FormData): Promise<AuthState> {
  const code = String(formData.get('otp') ?? '').trim()
  if (!otpPattern.test(code)) return { error: 'Enter the 6-digit code from your authenticator app.' }

  const { supabase } = await requirePasswordSession()
  const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors()
  const factor = factors?.totp.find((item) => item.status === 'verified')
  if (factorError || !factor) return { error: 'No verified authenticator is available for this account.' }

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id })
  if (challengeError) return { error: challengeError.message }

  const { error } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.id,
    code,
  })
  if (error) return { error: error.message }

  return finishOnlineAuthentication(supabase)
}

export async function verifyEmailSecondFactor(_previousState: AuthState, formData: FormData): Promise<AuthState> {
  const code = String(formData.get('otp') ?? '').trim()
  if (!otpPattern.test(code)) return { error: 'Enter the 6-digit code from your email.' }

  const { supabase, user } = await requirePasswordSession()
  if (!user.email) return { error: 'This account has no email address for verification.' }

  const { data, error } = await supabase.auth.verifyOtp({ email: user.email, token: code, type: 'email' })
  if (error) return { error: error.message }
  if (data.user?.id !== user.id) {
    await supabase.auth.signOut()
    return { error: 'The code did not verify the account that entered the password. Sign in again.' }
  }

  return finishOnlineAuthentication(supabase)
}

export async function enrollTotp(): Promise<AuthState> {
  const { supabase } = await requirePasswordSession()
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
  if (factorsError) return { error: factorsError.message }

  const verified = factors.totp.find((factor) => factor.status === 'verified')
  if (verified) return { error: 'An authenticator is already enrolled. Return and choose Authenticator code.' }

  const unfinishedFactors = factors.all.filter((factor) =>
    factor.status === 'unverified' &&
    (factor.factor_type === 'totp' || factor.friendly_name === 'SariPOS authenticator')
  )
  for (const factor of unfinishedFactors) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
    if (error) return { error: 'Could not reset the unfinished authenticator setup. Try the email code or retry setup.' }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'SariPOS authenticator',
  })
  if (error) {
    if (error.message.toLowerCase().includes('friendly name') && error.message.toLowerCase().includes('already exists')) {
      return { error: 'This account already has a SariPOS authenticator. Sign out, make sure you are using the intended account, then try again.' }
    }
    return { error: error.message }
  }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    message: unfinishedFactors.length > 0
      ? 'We cleared an unfinished setup. Remove any older SariPOS entry from your authenticator app, scan this new QR code, then enter its current six-digit code.'
      : 'Scan this QR code with an authenticator app, then enter its current six-digit code to verify setup.',
  }
}

export async function verifyTotpEnrollment(_previousState: AuthState, formData: FormData): Promise<AuthState> {
  const code = String(formData.get('otp') ?? '').trim()
  const factorId = String(formData.get('factorId') ?? '')
  if (!otpPattern.test(code)) return { error: 'Enter the 6-digit code from your authenticator app.' }
  if (!factorId) return { error: 'Set up the authenticator again to continue.' }

  const { supabase } = await requirePasswordSession()
  const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors()
  const factor = factors?.all.find((item) => item.id === factorId && item.factor_type === 'totp')
  if (factorError || !factor) return { error: 'This authenticator setup is no longer available. Start again.' }

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
  if (challengeError) return { error: challengeError.message }

  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code })
  if (error) return { error: error.message }

  return finishOnlineAuthentication(supabase)
}

export async function resendEmailSecondFactor(): Promise<never> {
  const { supabase, user } = await requirePasswordSession()
  if (!user.email) redirect('/mfa/email?error=email')

  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false },
  })
  if (error) redirect(`/mfa/email?error=${encodeURIComponent(error.message)}`)
  redirect('/mfa/email?sent=1')
}

export async function requestPasswordRecovery(_previousState: RecoveryState, formData: FormData): Promise<RecoveryState> {
  const email = readEmail(formData)
  if (!validEmail(email)) return { email, error: 'Enter a valid email address.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) return { email, step: 'recovery-code', error: error.message }
  return {
    email,
    step: 'recovery-code',
    message: 'If an account exists for that email, a recovery code has been sent. Enter it below.',
  }
}

export async function verifyPasswordRecoveryCode(_previousState: RecoveryState, formData: FormData): Promise<RecoveryState> {
  const email = readEmail(formData)
  const token = String(formData.get('otp') ?? '').trim()
  if (!validEmail(email)) return { email, step: 'recovery-code', error: 'Enter a valid email address.' }
  if (!otpPattern.test(token)) return { email, step: 'recovery-code', error: 'Enter the 6-digit recovery code from your email.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' })
  if (error) return { email, step: 'recovery-code', error: error.message }
  redirect('/forgot-password?step=password')
}

export async function updateRecoveredPassword(_previousState: RecoveryState, formData: FormData): Promise<RecoveryState> {
  const password = String(formData.get('password') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')
  if (password.length < 8) return { step: 'set-password', error: 'Use a password with at least 8 characters.' }
  if (password !== confirmPassword) return { step: 'set-password', error: 'Passwords do not match.' }

  const supabase = await createClient()
  const [{ data: { user }, error: userError }, { data: claims, error: claimsError }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getClaims(),
  ])
  if (userError || claimsError || !user || !includesRecoveryMethod(claims?.claims?.amr)) {
    redirect('/forgot-password')
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { email: user.email, step: 'set-password', error: error.message }
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login?passwordUpdated=1')
}

export async function signOut(): Promise<never> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
