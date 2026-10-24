// Plain-language names for the sign-up screening signals
// (backend/src/lib/signup-risk.js) and a short device description, shared by
// the Users directory, the Network drawer and the Bot sign-ups page.

export const SIGNUP_REASON_LABEL: Record<string, string> = {
  honeypot: 'Filled the hidden form field',
  bot_check_failed: 'Failed the Cloudflare check',
  bot_check_missing: 'No Cloudflare check from the website',
  bot_check_unavailable: 'Cloudflare check unreachable',
  generated_email: 'Email is the name + random digits',
  disposable_email: 'Throwaway email domain',
  tor: 'Signed up over Tor',
  many_signups_from_address: 'Several sign-ups from one address',
  no_activity: 'Never used the account',
  team: 'Held by the team',
}

export const reasonLabel = (reason: string) => SIGNUP_REASON_LABEL[reason] || reason

export const SOURCE_LABEL: Record<string, string> = {
  signup: 'Sign-up',
  login: 'Sign-in',
  request: 'Using the account',
}

/** "iPhone · Sawa app", "Windows · Chrome": enough to tell devices apart. */
export function deviceLabel(ua: string | null | undefined): string {
  if (!ua) return 'Unknown device'
  const os = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'Mac'
    : /Linux/.test(ua) ? 'Linux' : null
  const client = /okhttp|Expo|Darwin|CFNetwork|SawaCars/i.test(ua) && !/Mozilla/.test(ua) ? 'Sawa app'
    : /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari'
    : /curl|python|node|axios|Go-http|bot|spider/i.test(ua) ? 'Script' : null
  return [os, client].filter(Boolean).join(' · ') || ua.slice(0, 40)
}
