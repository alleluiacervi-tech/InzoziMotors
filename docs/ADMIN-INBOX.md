# The admin inbox

Reads `contact@sawacars.com` over IMAP and answers it over SMTP, from inside the
admin dashboard at **`/inbox`**.

---

## What it does

| | |
|---|---|
| **List** | Newest first, 25 per page, unread in bold with a dot, paperclip and size per row |
| **Read** | Full HTML body, sanitised then sandboxed; opening marks it read |
| **Search** | Server-side IMAP SEARCH across sender, subject and body, debounced 400ms |
| **Reply** | In-thread, from `contact@`, appended to Sent, marks the original answered |
| **Flag** | Star / unstar, optimistic |
| **Attachments** | Listed with type and size, downloaded as a stream — never inline |
| **Unread badge** | In the sidebar, polled every 2 minutes |

Admin-only. Every route is behind `requireAdmin`; buyers and sellers get 403,
anonymous callers get 401. Tested in `backend/test/mail-routes.test.js`.

---

## Turning it on

The code ships disabled. With no mailbox configured, `/mail/*` returns
`503 MAIL_NOT_CONFIGURED` and the Inbox page says the mailbox is not connected —
nothing else on the dashboard is affected.

**1. Add the credentials to the host `.env`** (next to `docker-compose.prod.yml`,
so `/srv/sawa/.env`):

```
MAIL_USER=contact@sawacars.com
MAIL_PASS=<the mailbox password>
```

`MAIL_IMAP_HOST`, `MAIL_IMAP_PORT`, `MAIL_SMTP_HOST` and `MAIL_SMTP_PORT` default
to Hostinger's values (`imap.hostinger.com:993`, `smtp.hostinger.com:465`) and
only need setting if that changes.

The password belongs in that file and nowhere else. It is not in the repository,
not in the compose file, not in a GitHub secret, and it is never sent to the
browser or written to a log.

**2. RECREATE the API container** so it picks the variables up:

> GitHub → Actions → **Ops** → Run workflow → **`start-stack`**

or on the host: `docker compose -f docker-compose.prod.yml up -d api`

**Not `restart-api`.** That runs `docker compose restart api`, which restarts the
*existing* container — and a container's environment is fixed when it is created,
so a `restart` cannot see a variable added to `.env` afterwards. The inbox would
go on reporting "not connected" and the `.env` edit would look like it had failed.
`up -d` recreates the container when its resolved config has changed, which is
what actually applies a new value.

**3. Check it.** Open `/inbox` in the dashboard. You should see the mailbox
contents. If not, the page will tell you which of these it is:

| What you see | What it means | Fix |
|---|---|---|
| "The mailbox is not connected yet" | `MAIL_USER`/`MAIL_PASS` not visible to the container | Values in `.env`? API restarted after adding them? |
| "The mail server rejected our credentials" | Reached the host, wrong user or password | Check the password by signing in to webmail |
| "Cannot reach the mail server" | Network or firewall between the VPS and port 993 | `nc -vz imap.hostinger.com 993` on the host |
| "No mail yet" | Connected fine, the mailbox is genuinely empty | Send yourself a test message |

Those four are deliberately distinct. An inbox that renders a connection failure
as "no mail" is the bug this dashboard already had on seven other pages.

---

## Why live IMAP rather than a synced copy

Considered both. This reads the mailbox on demand instead of syncing it into
Postgres, because at this scale — one mailbox, a handful of admins — the sync
version costs a schema, a background worker, UID/UIDVALIDITY bookkeeping,
deletion reconciliation and a second source of truth that drifts, in exchange for
benefits that are speculative until we know how `contact@` actually gets used
(instant loads, full-text search, joining a thread to a car or a dispute).

Two things make the live read behave acceptably:

- **One pooled connection**, opened on demand and reused, rather than
  connect-per-request. Connect-per-request costs a TLS handshake plus LOGIN plus
  SELECT on every page load, and shared mail hosts cap concurrent IMAP
  connections per account — two admins with three tabs each would exhaust it and
  start seeing authentication failures that look like a wrong password.
- **Envelopes cached 60 seconds**, bodies fetched lazily per message. Fetching
  bodies for a 25-message page is what makes a naive IMAP inbox feel broken. Any
  write (reply, flag change) clears the cache, so an action's effect is never
  hidden by it.

The route shapes are storage-agnostic on purpose, so moving to a background sync
later is a change inside `backend/src/lib/mail/` and nowhere else.

**Switch when** any of these becomes true: more than ~100 messages a day, more
than ~3 concurrent admins, or a real need to link a thread to a record.

---

## Security

Incoming mail is the most hostile input the product accepts: anyone can write to
`contact@sawacars.com`, and the reader is an admin whose session can approve
identity documents and generate contracts.

**Two independent layers on the body**, because a sanitiser bypass is a recurring
class of bug rather than a hypothetical:

1. `backend/src/lib/mail/sanitize.js` — an allowlist sanitiser. Drops `<script>`
   (and its contents, so CSS and JS never leak in as visible text), `<iframe>`,
   `<object>`, `<embed>`, `<form>`, `<input>`, `<base>`, every `on*` handler, and
   any `javascript:` or `data:text/html` URL. `style` survives but filtered —
   `position`, `z-index`, `transform` and `opacity` are all refused, because
   those are what a message would use to draw over the dashboard chrome or hide
   text from the reader.
2. `admin/.../inbox/MessageBody.tsx` — a `srcdoc` iframe with `sandbox` and
   **no** `allow-scripts` and **no** `allow-same-origin`, plus a `default-src
   'none'` CSP inside the frame. This layer exists partly because the API runs
   helmet with `contentSecurityPolicy: false`, so nothing else stands behind
   layer 1.

`backend/test/mail-sanitize.test.js` asserts 14 specific techniques, each a real
one rather than a category.

**Remote images are blocked by default.** A remote image in mail is a tracking
pixel: loading it confirms to the sender that a human opened the message and
leaks the reader's IP. Blocked images become an inert placeholder with the
original URL parked in `data-blocked-src` (a `data-*` attribute is never
fetched), and the page offers a "Load images" button that re-requests with
`?images=1`.

**Attachments always download, never render.** The server forces
`Content-Disposition: attachment` and `X-Content-Type-Options: nosniff` with a
generic content type, because an HTML or SVG attachment opened inline would
execute in the dashboard's origin — the sanitiser protects the message body, not
a file the admin opens. Filenames are stripped of path separators and CRLF
before they reach a header.

**Replies are reply-only.** The recipient comes from the message being answered
and there is no `To:` field, because a free recipient turns an admin page into a
send-anything-from-`contact@` console — an open relay with a login screen. Abuse
of the company's real address gets `sawacars.com` blacklisted, which takes days
to undo and breaks password-reset delivery on the way. Sending is additionally
rate-limited to 12 per minute.

---

## What is not verified yet

The live IMAP and SMTP conversation has **not** been exercised: the build
environment has no route to port 993, and pointing the test suite at the real
mailbox would make CI depend on a third party and on a password.

Verified: the sanitiser (14 tests), the route auth gating and error mapping
(6 tests), and the full backend suite (52 tests) — all against a real Postgres.

Unverified until step 3 above is done on the VPS: connect, LOGIN, envelope
fetch, MIME parsing of a real message, attachment extraction, `APPEND` to Sent,
and threading headers as a customer's mail client sees them.

---

## Files

```
backend/src/lib/mail/connection.js   pooled IMAP connection, error classification
backend/src/lib/mail/mailbox.js      list, read, attachments, flags, reply
backend/src/lib/mail/sanitize.js     the allowlist sanitiser
backend/src/routes/mail.js           6 admin-only routes
backend/test/mail-sanitize.test.js   14 sanitiser tests
backend/test/mail-routes.test.js     6 route tests
admin/src/app/(admin)/inbox/page.tsx        two-pane list + reading pane
admin/src/app/(admin)/inbox/MessageBody.tsx sandboxed body renderer
```
