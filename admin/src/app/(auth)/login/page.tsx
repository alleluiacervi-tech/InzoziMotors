'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adoptToken, signIn } from '@/lib/api'
import { LogoMark } from '@/components/Logo'

// No storeSession() here any more. It used to write the admin JWT into
// localStorage AND a JavaScript-readable cookie with no Secure or SameSite
// flags. Both are gone: /api/session sets an httpOnly cookie server-side and
// the token never enters the browser.

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  // Hand-off from the public website: an admin signed in through the normal
  // navbar arrives here with the JWT in the URL fragment (never sent to any
  // server). Validate it against the API before trusting it, then sign in.
  useEffect(() => {
    const match = window.location.hash.match(/token=([^&]+)/)
    if (!match) return
    const token = decodeURIComponent(match[1])
    // Strip it from history immediately — a fragment is never sent to a server,
    // but it would otherwise sit in the address bar and the back stack.
    history.replaceState(null, '', window.location.pathname)
    setLoading(true)
    // The route handler proves the token is an admin's before issuing a cookie,
    // so the role check happens server-side rather than on a payload the
    // browser decoded for itself.
    adoptToken(token)
      .then(() => router.replace('/dashboard'))
      .catch((err: Error) => {
        setError(err.message || 'Sign-in link expired — please sign in below.')
        setLoading(false)
      })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Role enforcement lives in /api/session; a non-admin gets a 403 there
      // and no cookie is ever written.
      await signIn(email, password)
      router.replace('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-page flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface border border-line mb-5">
            <LogoMark size={40} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-content">Sawa Cars</h1>
          <p className="text-content-muted text-base mt-2">Operations console</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-line p-6 shadow-card sm:p-9">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in</h2>

          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input id="login-email"
                type="email"
                name="email"
                autoComplete="username"
                spellCheck={false}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full bg-surface px-4 border border-line rounded-xl text-base text-content transition-colors hover:border-content-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                placeholder="admin@sawacars.com"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input id="login-password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full bg-surface px-4 border border-line rounded-xl text-base text-content transition-colors hover:border-content-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-7 h-12 w-full bg-brand text-brand-on font-semibold rounded-xl hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
