// The cookie that remembers the Saved page's one-time "get a daily summary?"
// answer, so the card never comes back whichever way it was answered. Kept out of
// the server-action file because a 'use server' module may only export functions.
export const DIGEST_ASKED_COOKIE = 'sawa-digest-asked'
