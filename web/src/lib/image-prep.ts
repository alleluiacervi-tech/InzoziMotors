// Browser-only photo preparation for uploads (P2-D5 in docs/WEB-PARITY-PLAN.md).
//
// A file within the limit is sent exactly as chosen: an ID document is evidence
// and every re-encode costs small print. Only a file over the limit is
// redrawn, at most 3000 px on its long edge and JPEG quality 0.92. The browser
// applies the orientation tag while decoding, so the result is upright and
// carries no metadata.

const MAX_EDGE = 3000
const QUALITY = 0.92

export async function prepareForUpload(file: File, limitBytes: number): Promise<File> {
  if (file.size <= limitBytes) return file

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas unavailable')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await canvasToJpeg(canvas)
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`, { type: 'image/jpeg' })
}

export function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the photo'))),
      'image/jpeg',
      QUALITY,
    )
  })
}

/** Accepted by every upload route; listing it explicitly also makes iOS Safari
 *  hand over a JPEG instead of a HEIC it would otherwise send. */
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'

/** Upload a FormData through the website's upload proxy and return the parsed
 *  JSON, or throw with the server's own error message. */
export async function postUpload(url: string, body: FormData): Promise<unknown> {
  const res = await fetch(url, { method: 'POST', body })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`)
  return data
}
