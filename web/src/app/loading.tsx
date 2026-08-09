import { LogoMark } from '@/components/brand/Logo'

// The route-transition loading state — the same clockwise mark as the opening
// splash, so "the site is working" always looks like Sawa and never like a
// browser default. Next.js shows this only while a server component route is
// actually streaming; it costs nothing when navigation is instant.
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading">
      <span className="animate-[spin_1.1s_cubic-bezier(0.45,0.05,0.55,0.95)_infinite]">
        <LogoMark size={44} id="routeLoadingMark" />
      </span>
    </div>
  )
}
