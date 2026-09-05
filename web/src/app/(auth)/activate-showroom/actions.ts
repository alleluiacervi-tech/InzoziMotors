'use server'

import { redirect } from 'next/navigation'
import { auth, ApiError } from '@/lib/api'
import { setSession } from '@/lib/session'

export type ActivateState = { error?: string } | null

export async function activateShowroom(_prev: ActivateState, formData: FormData): Promise<ActivateState> {
  const token = String(formData.get('token') || '')
  const password = String(formData.get('password') || '')
  const confirm = String(formData.get('confirm') || '')
  if (password.length < 8) return { error: 'Use at least 8 characters.' }
  if (password !== confirm) return { error: 'Both passwords must match.' }
  try {
    const result = await auth.acceptShowroomInvite(token, password)
    await setSession(result.token)
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Could not activate this account.' }
  }
  redirect('/dashboard/selling')
}
