'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Placing the Sawa Cars badge over a registration plate.
//
// Drag a box, resize it from the corners, rotate it for an angled shot. The
// preview is the REAL artwork, fetched from the same generator the compositor
// uses — a CSS lookalike could differ from what gets burned in, and then the
// operator would be approving something other than what buyers see.
//
// Saving is destructive on the server: the published file is re-encoded and the
// original moves to a path that is denied. So this is the last look anyone gets
// before the plate stops being readable, which is why the preview has to be
// honest rather than approximate.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useToast } from '@/components/feedback'

type Box = { x: number; y: number; w: number; h: number; angle: number }

/** Fractions of the image, which is what the server stores. Starting size is a
 *  plausible plate rather than zero, so the first drag is a nudge not a hunt. */
const INITIAL: Box = { x: 0.34, y: 0.62, w: 0.32, h: 0.09, angle: 0 }

/** The four corners of a rotated box, in image fractions. The server takes
 *  corners rather than a rectangle so an angled plate is describable. */
function corners(box: Box): { x: number; y: number }[] {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const rad = (box.angle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return [
    [-box.w / 2, -box.h / 2],
    [box.w / 2, -box.h / 2],
    [box.w / 2, box.h / 2],
    [-box.w / 2, box.h / 2],
  ].map(([dx, dy]) => ({
    x: Math.min(1, Math.max(0, cx + dx * cos - dy * sin)),
    y: Math.min(1, Math.max(0, cy + dx * sin + dy * cos)),
  }))
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** The inverse of `corners()`. The server stores the four points, which carry
 *  the rotation that a bounding box throws away — so reopening a mask puts the
 *  badge back exactly where it was left, and repositioning is a nudge rather
 *  than starting over. Returns null for anything it cannot read, and the editor
 *  falls back to INITIAL. */
function boxFromPoints(points: unknown): Box | null {
  if (!Array.isArray(points) || points.length !== 4) return null
  const p = points.map((q: any) => ({ x: Number(q?.x), y: Number(q?.y) }))
  if (p.some((q) => !Number.isFinite(q.x) || !Number.isFinite(q.y))) return null
  const [tl, tr, br] = p
  const w = Math.hypot(tr.x - tl.x, tr.y - tl.y)
  const h = Math.hypot(br.x - tr.x, br.y - tr.y)
  if (!(w > 0) || !(h > 0)) return null
  const cx = p.reduce((sum, q) => sum + q.x, 0) / 4
  const cy = p.reduce((sum, q) => sum + q.y, 0) / 4
  const angle = (Math.atan2(tr.y - tl.y, tr.x - tl.x) * 180) / Math.PI
  return {
    x: clamp01(cx - w / 2),
    y: clamp01(cy - h / 2),
    w: Math.min(1, w),
    h: Math.min(1, h),
    // The editor's own slider range, so a stored value outside it cannot
    // produce a handle the operator can see but not move.
    angle: Math.max(-30, Math.min(30, Number(angle.toFixed(1)))) || 0,
  }
}

export function PlateMasker({ carId, photo, onDone, onCancel }: {
  carId: string
  photo: { id: string; url: string; plate_state?: string; plate_mask?: any; has_original?: boolean }
  onDone: () => void
  onCancel: () => void
}) {
  const toast = useToast()
  const frame = useRef<HTMLDivElement>(null)
  const masked = photo.plate_state === 'masked'
  // Always edit against the unmasked photograph. `photo.url` on a masked photo
  // is the file with the badge already burned in, so placing a cover on it meant
  // aiming at a plate you could not see — and a badge dropped in the wrong place
  // could never be corrected, only stacked on. The route redirects to the
  // published file when no original was kept, so one source serves both cases.
  const sourceUrl = `/api/backend/inspections/cars/${carId}/photos/${photo.id}/original`
  const [box, setBox] = useState<Box>(() => boxFromPoints(photo.plate_mask?.points) || INITIAL)
  const [drag, setDrag] = useState<null | { mode: 'move' | 'resize'; ox: number; oy: number; start: Box }>(null)
  const [saving, setSaving] = useState(false)

  // The badge as the server will actually draw it, at the box's aspect ratio.
  // Requested at a fixed pixel scale so the URL is stable while dragging and
  // the browser can cache it.
  const previewW = Math.max(120, Math.round(box.w * 1200))
  const previewH = Math.max(40, Math.round(box.h * 800))
  const badgeUrl = `/api/backend/inspections/plate-badge/preview.png?w=${previewW}&h=${previewH}`

  const point = useCallback((event: React.PointerEvent) => {
    const rect = frame.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }
  }, [])

  function begin(mode: 'move' | 'resize') {
    return (event: React.PointerEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const p = point(event)
      setDrag({ mode, ox: p.x, oy: p.y, start: box })
      ;(event.target as HTMLElement).setPointerCapture?.(event.pointerId)
    }
  }

  function move(event: React.PointerEvent) {
    if (!drag) return
    const p = point(event)
    const dx = p.x - drag.ox
    const dy = p.y - drag.oy
    if (drag.mode === 'move') {
      setBox({
        ...drag.start,
        x: clamp01(drag.start.x + dx),
        y: clamp01(drag.start.y + dy),
      })
    } else {
      setBox({
        ...drag.start,
        // A floor on both axes: a degenerate box composites a smear that reads
        // as a bug rather than a mask, and the server refuses it anyway.
        w: Math.min(1 - drag.start.x, Math.max(0.04, drag.start.w + dx)),
        h: Math.min(1 - drag.start.y, Math.max(0.02, drag.start.h + dy)),
      })
    }
  }

  // Arrow keys nudge, so precision does not depend on a steady hand or a mouse.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const step = event.shiftKey ? 0.01 : 0.002
      const map: Record<string, () => void> = {
        ArrowLeft:  () => setBox((b) => ({ ...b, x: clamp01(b.x - step) })),
        ArrowRight: () => setBox((b) => ({ ...b, x: clamp01(b.x + step) })),
        ArrowUp:    () => setBox((b) => ({ ...b, y: clamp01(b.y - step) })),
        ArrowDown:  () => setBox((b) => ({ ...b, y: clamp01(b.y + step) })),
      }
      if (map[event.key]) { event.preventDefault(); map[event.key]() }
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  async function save() {
    setSaving(true)
    try {
      await api.maskPlate(carId, photo.id, corners(box))
      toast('Plate hidden. The published photo has been replaced.', 'success')
      onDone()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not mask the plate.', 'error')
    } finally { setSaving(false) }
  }

  // One call, two meanings, and the server picks between them: on an unmasked
  // photo it records a decision, and on a masked one it also puts the original
  // photograph back. That is the undo for a cover placed somewhere wrong enough
  // that moving it is not the answer.
  async function noPlate() {
    setSaving(true)
    try {
      await api.clearPlate(carId, photo.id)
      toast(masked ? 'Cover removed — the original photo is published again.'
                   : 'Recorded: no plate visible in this photo.', 'success')
      onDone()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save.', 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 p-4"
         role="dialog" aria-modal="true" aria-label="Hide the registration plate">
      <div className="max-h-full w-full max-w-4xl overflow-y-auto rounded-xl bg-surface p-5 shadow-card-lg">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-section font-extrabold text-content">
            {masked ? 'Move the plate cover' : 'Hide the registration plate'}
          </h2>
          <p className="text-caption text-content-muted">
            Drag the badge over the plate · corner handle to resize · arrow keys to nudge
          </p>
        </div>

        <div ref={frame}
             className="relative w-full select-none overflow-hidden rounded-lg bg-surface-alt"
             onPointerMove={move}
             onPointerUp={() => setDrag(null)}
             onPointerCancel={() => setDrag(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sourceUrl} alt="" className="block w-full" draggable={false} />

          <div
            onPointerDown={begin('move')}
            style={{
              position: 'absolute',
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.w * 100}%`,
              height: `${box.h * 100}%`,
              transform: `rotate(${box.angle}deg)`,
              transformOrigin: 'center',
              cursor: drag?.mode === 'move' ? 'grabbing' : 'grab',
              touchAction: 'none',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={badgeUrl} alt="Sawa Cars badge preview"
                 className="pointer-events-none block h-full w-full" draggable={false} />
            <span className="pointer-events-none absolute inset-0 rounded ring-2 ring-brand ring-offset-1" aria-hidden />
            <span
              onPointerDown={begin('resize')}
              className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-white bg-brand"
              style={{ touchAction: 'none' }}
              aria-label="Resize"
            />
          </div>
        </div>

        <label className="mt-4 block text-label font-semibold text-content">
          Rotation for an angled shot
          <input type="range" min={-30} max={30} step={0.5} value={box.angle}
                 onChange={(e) => setBox({ ...box, angle: Number(e.target.value) })}
                 className="mt-1.5 w-full accent-brand" />
          <span className="text-caption font-normal text-content-muted tabular-nums">{box.angle}°</span>
        </label>

        <p className="mt-3 rounded-lg bg-surface-alt px-4 py-3 text-caption leading-relaxed text-content-secondary">
          {masked
            ? 'You are working on the original photograph, with the badge where you last left it. Saving re-cuts the published photo from that original, so moving a cover never stacks one badge on another. Cover the plate generously — a sliver of a character at the corner is still a readable plate.'
            : 'Saving replaces the published photo and keeps the original in a private location only the team can reach, so this can be moved or removed later. Cover the plate generously — a sliver of a character at the corner is still a readable plate.'}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={save} disabled={saving}
            className="rounded-xl bg-brand px-5 py-3 text-label font-bold text-white hover:bg-brand-bright disabled:opacity-50">
            {saving ? 'Saving…' : masked ? 'Save new position' : 'Hide the plate'}
          </button>
          <button onClick={noPlate} disabled={saving}
            className="rounded-xl border border-line px-4 py-3 text-label font-bold text-content hover:bg-surface-alt disabled:opacity-50">
            {masked ? 'Remove the cover' : 'No plate in this photo'}
          </button>
          <button onClick={onCancel} disabled={saving}
            className="ml-auto rounded-xl px-4 py-3 text-label font-semibold text-content-muted hover:text-content">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default PlateMasker
