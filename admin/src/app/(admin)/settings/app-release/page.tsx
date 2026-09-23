'use client'

// ─────────────────────────────────────────────────────────────────────────────
// App release.
//
// Two different things share this page because they are the same conversation:
// "which build should people be on" and "should new JavaScript be going out at
// all right now".
//
// The riskiest control here is the minimum version. Everything about how it is
// presented — its own bordered block, its own warning, the plain sentence about
// what it does to somebody mid-conversation with a seller — exists because the
// mistake it enables cannot be undone from inside the app. The server refuses a
// minimum above the latest version, and both fields do nothing at all while the
// store link is empty, so the page can afford to explain rather than nag.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Card, ErrorState, Icon, LoadingState, PageHeader } from '@/components/ui'
import { useToast } from '@/components/feedback'

const KEY = 'app_release'

type Block = { latest_version: string; min_supported_version: string; url: string }
type Release = {
  ios: Block
  android: Block
  release_notes: string
  ota_paused: boolean
  ota_pause_reason: string
}

const PLATFORMS: { key: 'ios' | 'android'; label: string; hint: string }[] = [
  { key: 'ios', label: 'iPhone', hint: 'https://apps.apple.com/app/id6803097569' },
  { key: 'android', label: 'Android', hint: 'https://play.google.com/store/apps/details?id=com.sawacars.android' },
]

export default function AppReleasePage() {
  const toast = useToast()
  const [release, setRelease] = useState<Release | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [problems, setProblems] = useState<string[]>([])

  async function load() {
    setLoading(true); setError(null)
    try {
      const rows = await api.settings()
      const row = rows.find((entry: any) => entry.key === KEY)
      setRelease(row ? structuredClone(row.value) : null)
    } catch (e) { setError(e) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function save(next?: Release) {
    const value = next || release
    if (!value) return
    setSaving(true); setProblems([])
    try {
      await api.updateSetting(KEY, value)
      setRelease(structuredClone(value))
      toast('Saved. Apps see this within a minute.', 'success')
    } catch (e: any) {
      setProblems(Array.isArray(e?.problems) ? e.problems : [e?.message || 'Could not save.'])
      toast(e?.message || 'Could not save.', 'error')
    } finally { setSaving(false) }
  }

  const setBlock = (platform: 'ios' | 'android', field: keyof Block, value: string) => {
    if (!release) return
    setRelease({ ...release, [platform]: { ...release[platform], [field]: value } })
  }

  if (loading) return <LoadingState rows={6} />
  if (error) return <ErrorState error={error} title="Couldn’t load the release settings" onRetry={load} />
  if (!release) {
    return (
      <ErrorState
        error={new Error('The app_release setting is missing — migration 0034 has not been applied.')}
        title="No release settings"
        onRetry={load}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="App release"
        description="Which build people should be on, and whether new JavaScript is going out at all. Read by every app at launch."
      />
      <Link href="/settings" className="text-label font-bold text-brand">← All settings</Link>

      {problems.length ? (
        <Card className="mt-4 border-danger/40 bg-danger-tint p-4">
          <p className="text-label font-bold text-danger">Not saved</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-label text-content-secondary">
            {problems.map((problem) => <li key={problem}>{problem}</li>)}
          </ul>
        </Card>
      ) : null}

      {/* ── The stop switch ────────────────────────────────────────────────── */}
      <Card className="mt-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-extrabold text-content">Over-the-air updates</h2>
            <p className="mt-1 max-w-2xl text-caption leading-relaxed text-content-muted">
              Normally every commit that reaches <code>main</code> and passes CI publishes a new
              JavaScript bundle to installed apps. Pausing stops that at the source — the publish
              workflow reads this switch and refuses — so nothing new leaves while you work out
              what went wrong. It does not remove a bundle that already went out; for that, run
              the <strong className="font-bold">Mobile Rollback</strong> workflow.
            </p>
          </div>
          <button
            onClick={() => save({ ...release, ota_paused: !release.ota_paused })}
            disabled={saving}
            className={`flex-none rounded-xl px-5 py-3 text-label font-bold disabled:opacity-40 ${
              release.ota_paused ? 'bg-danger text-white' : 'bg-success text-white'
            }`}
          >
            {release.ota_paused ? 'Paused — resume updates' : 'Publishing — pause updates'}
          </button>
        </div>
        {release.ota_paused ? (
          <label className="mt-4 block text-label font-semibold text-content">
            Why it is paused
            <input
              value={release.ota_pause_reason || ''}
              maxLength={200}
              onChange={(e) => setRelease({ ...release, ota_pause_reason: e.target.value })}
              onBlur={() => save()}
              placeholder="Shown in the workflow run that refuses to publish"
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:outline-none"
            />
          </label>
        ) : null}
      </Card>

      {/* ── Per-platform versions ──────────────────────────────────────────── */}
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {PLATFORMS.map(({ key, label, hint }) => {
          const block = release[key]
          const live = Boolean(block.url)
          return (
            <Card key={key} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-extrabold text-content">{label}</h2>
                <span className={`rounded-md px-2 py-1 text-caption font-bold ${
                  live ? 'bg-success-tint text-success' : 'bg-surface-alt text-content-secondary'
                }`}>
                  {live ? 'On the store' : 'No store link'}
                </span>
              </div>

              <label className="mt-4 block text-label font-semibold text-content">
                Store link
                <input
                  value={block.url || ''}
                  onChange={(e) => setBlock(key, 'url', e.target.value)}
                  onBlur={() => save()}
                  placeholder={hint}
                  className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:outline-none"
                />
                <span className="mt-1 block text-caption font-normal text-content-muted">
                  Leave empty until the app is really published. While it is empty neither
                  setting below does anything — there would be nowhere to send anybody.
                </span>
              </label>

              <label className="mt-4 block text-label font-semibold text-content">
                Newest version on the store
                <input
                  value={block.latest_version}
                  onChange={(e) => setBlock(key, 'latest_version', e.target.value)}
                  onBlur={() => save()}
                  placeholder="1.0.0"
                  className="mt-1.5 h-11 w-40 rounded-xl border border-line bg-surface px-3 font-normal focus:outline-none"
                />
                <span className="mt-1 block text-caption font-normal text-content-muted">
                  Anyone on an older build sees a prompt they can dismiss.
                </span>
              </label>

              <div className="mt-4 rounded-xl border border-warning/40 bg-warning-tint p-4">
                <p className="flex items-center gap-2 text-label font-bold text-warning-text">
                  <Icon name="alert" size={14} />
                  Oldest version still allowed to run
                </p>
                <input
                  value={block.min_supported_version}
                  onChange={(e) => setBlock(key, 'min_supported_version', e.target.value)}
                  onBlur={() => save()}
                  placeholder="1.0.0"
                  className="mt-2 h-11 w-40 rounded-xl border border-line bg-surface px-3 font-normal focus:outline-none"
                />
                <p className="mt-2 text-caption leading-relaxed text-content-secondary">
                  Anything older than this is <strong className="font-bold">locked out</strong> —
                  a full-screen “update to continue”, with no way past it. Somebody halfway
                  through messaging a seller is stopped where they stand. Raise it only for a
                  build that is genuinely broken or unsafe, never to hurry people along, and only
                  once the newer build is really downloadable on this store.
                </p>
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="mt-5 p-5">
        <label className="block text-label font-semibold text-content">
          What is new
          <textarea
            value={release.release_notes || ''}
            maxLength={500}
            rows={3}
            onChange={(e) => setRelease({ ...release, release_notes: e.target.value })}
            onBlur={() => save()}
            placeholder="One or two lines, shown in the update prompt. Plain language — “faster photos, and rentals now show the daily rate”."
            className="mt-1.5 w-full rounded-xl border border-line bg-surface p-3 font-normal focus:outline-none"
          />
        </label>
      </Card>
    </div>
  )
}
