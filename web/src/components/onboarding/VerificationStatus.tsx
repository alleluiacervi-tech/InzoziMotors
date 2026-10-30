import { Button, Card, Icon } from '@/components/ui'

// The pending/approved card on /dashboard/verify. Shared by the server page
// (what the account's state says on load) and IdVerificationForm (shown the
// moment an upload succeeds, rather than only once the page refresh lands).
export function VerificationStatus({
  approved,
  title,
  body,
  action,
}: {
  approved: boolean
  title: string
  body: string
  action?: { href: string; label: string }
}) {
  return (
    <Card className="p-7 text-center sm:p-10">
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
          approved ? 'bg-success-tint text-success-text' : 'bg-surface-alt text-content-muted'
        }`}
      >
        <Icon name={approved ? 'shield-check' : 'clock'} size={30} />
      </div>
      <h2 className="mt-5 text-title-sm font-extrabold text-content">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-body leading-relaxed text-content-secondary">{body}</p>
      {action ? (
        <div className="mt-6">
          <Button href={action.href}>{action.label}</Button>
        </div>
      ) : null}
    </Card>
  )
}

export default VerificationStatus
