import { Icon } from '@/components/ui'

// The one honest list of what genuinely needs the app — shared by the homepage
// showcase and /download so the story can't drift between them. Checklist rows,
// not icon-square cards: these are capabilities, not features to be sold.

export const APP_CAPABILITIES = [
  {
    title: 'Camera capture for verification',
    desc: 'Sellers photograph their national ID and take a live selfie in the app. That check needs a camera, so it lives there.',
  },
  {
    title: 'The 36-angle seller shoot',
    desc: 'Reference photos at submission and rental condition records are captured in the app, slot by slot.',
  },
  {
    title: 'Push notifications',
    desc: 'A price drop on a saved car, a reply from our team, a new match for a saved search — the moment it happens.',
  },
  {
    title: 'One account, both places',
    desc: 'Saved cars, searches, requests and your whole history are the same on the web and in the app.',
  },
] as const

export function AppCapabilities({ className = '' }: { className?: string }) {
  return (
    <ul className={`space-y-4 ${className}`}>
      {APP_CAPABILITIES.map((item) => (
        <li key={item.title} className="flex gap-3">
          <Icon name="check-circle" size={20} className="mt-0.5 shrink-0 text-success" />
          <div>
            <h3 className="text-body font-extrabold text-content">{item.title}</h3>
            <p className="mt-1 max-w-prose text-caption leading-relaxed text-content-secondary">
              {item.desc}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default AppCapabilities
