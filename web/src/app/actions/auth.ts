'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { auth as authApi, ApiError } from '@/lib/api'
import { clearSession, setSession } from '@/lib/session'

// ─────────────────────────────────────────────────────────────────────────────
// Auth via Server Actions.
//
// Credentials are POSTed to the Next server, which calls the existing backend
// and stores the returned JWT in an httpOnly cookie. The browser never holds
// the token, so an XSS on any page cannot exfiltrate a session — the reason the
// web deliberately differs from the app's SecureStore approach.
//
// The backend is untouched: same /auth/login and /auth/register it already
// serves the mobile app.
// ─────────────────────────────────────────────────────────────────────────────

export type AuthState = { error?: string; fieldErrors?: Record<string, string> } | null

/** Only allow same-origin paths, so `?next=` can't be used as an open redirect. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : ''
  if (next.startsWith('/') && !next.startsWith('//')) return next
  return '/dashboard'
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')
  const next = safeNext(formData.get('next'))

  const fieldErrors: Record<string, string> = {}
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fieldErrors.email = 'Enter a valid email address.'
  if (password.length < 6) fieldErrors.password = 'Your password is at least 6 characters.'
  if (Object.keys(fieldErrors).length) return { fieldErrors }

  try {
    const { token } = await authApi.login(email, password)
    await setSession(token)
  } catch (err) {
    if (err instanceof ApiError) {
      // 401 is deliberately vague — never confirm which half was wrong.
      if (err.status === 401) return { error: 'That email and password do not match.' }
      if (err.isNetworkError) return { error: 'We could not reach Sawa Cars. Please try again.' }
      return { error: err.message }
    }
    return { error: 'Something went wrong. Please try again.' }
  }

  revalidatePath('/', 'layout')
  redirect(next)
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get('name') || '').trim()
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')
  const countryCode = String(formData.get('countryCode') || '+250').trim()
  const rawPhone = String(formData.get('phone') || '').trim().replace(/[\s-]/g, '')
  const role = formData.get('role') === 'seller' ? 'seller' : 'buyer'
  const next = safeNext(formData.get('next'))

  // Construct standard E.164 phone
  const cleanPhone = rawPhone.startsWith('+') ? rawPhone : `${countryCode}${rawPhone.replace(/^0+/, '')}`

  const fieldErrors: Record<string, string> = {}
  if (name.length < 2) fieldErrors.name = 'Tell us your full name.'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fieldErrors.email = 'Enter a valid email address.'
  if (!rawPhone || !/^\+[1-9]\d{7,14}$/.test(cleanPhone)) {
    fieldErrors.phone = 'Enter a valid phone number.'
  }
  if (password.length < 6) fieldErrors.password = 'Use at least 6 characters.'
  if (Object.keys(fieldErrors).length) return { fieldErrors }

  try {
    const { token } = await authApi.register(name, email, password, role, cleanPhone)
    await setSession(token)
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 409) {
        return { fieldErrors: { email: 'That email already has an account. Sign in instead.' } }
      }
      if (err.isNetworkError) return { error: 'We could not reach Sawa Cars. Please try again.' }
      return { error: err.message }
    }
    return { error: 'Something went wrong. Please try again.' }
  }

  revalidatePath('/', 'layout')
  redirect(next)
}

export async function signOutAction(): Promise<void> {
  await clearSession()
  revalidatePath('/', 'layout')
  redirect('/')
}

export type ResetState =
  | { stage: 'request'; error?: string }
  | { stage: 'code'; email: string; devCode?: string; error?: string }
  | { stage: 'done' }

export async function requestResetAction(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { stage: 'request', error: 'Enter the email address on your account.' }
  }
  try {
    // Always 200 — the backend refuses to reveal whether the account exists,
    // so the UI must move to step 2 regardless.
    const res = await authApi.forgotPassword(email)
    return { stage: 'code', email, devCode: res.dev_code }
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Please try again.'
    return { stage: 'request', error: message }
  }
}

export async function confirmResetAction(prev: ResetState, formData: FormData): Promise<ResetState> {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const code = String(formData.get('code') || '').trim()
  const password = String(formData.get('password') || '')
  const confirm = String(formData.get('confirm') || '')

  const back = (error: string): ResetState => ({
    stage: 'code',
    email,
    devCode: prev.stage === 'code' ? prev.devCode : undefined,
    error,
  })

  if (code.length !== 6) return back('Enter the 6-digit code we sent you.')
  if (password.length < 6) return back('Your new password needs at least 6 characters.')
  if (password !== confirm) return back('Both passwords need to match.')

  try {
    await authApi.resetPassword(email, code, password)
    return { stage: 'done' }
  } catch (err) {
    return back(err instanceof ApiError ? err.message : 'That code is invalid or has expired.')
  }
}
