/** Open private ID evidence through the administrator's live, httpOnly session.
 * The API's signed URL remains useful for other clients, but its expiry must
 * never interrupt a reviewer who is still signed in to this console.
 */
export function idDocumentHref(storedUrl: string): string | null {
  try {
    const pathname = new URL(storedUrl, 'https://local.invalid').pathname
    const match = pathname.match(/^\/id-verification\/doc\/([^/]+)$/)
    if (!match) return null
    const filename = decodeURIComponent(match[1])
    if (!filename || filename === '.' || filename === '..' || /[/\\\u0000]/.test(filename)) return null
    return `/api/backend/id-verification/doc/${encodeURIComponent(filename)}`
  } catch {
    return null
  }
}
