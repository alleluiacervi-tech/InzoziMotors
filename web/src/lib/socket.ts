'use client'

// Realtime socket for Client Components (D2 in docs/WEB-PARITY-PLAN.md).
//
// The app connects with its long-lived session token (src/context/AppContext.js).
// The website can't do that — the token lives in an httpOnly cookie precisely so
// browser JavaScript never sees it. Instead this connects with a 60-second
// ticket minted by the getSocketTicket Server Action, and hands socket.io-client
// a *function* for `auth` rather than a static value: socket.io calls that
// function again before every reconnection attempt, so a ticket that expired
// while the tab was in the background is simply replaced with a fresh one
// rather than failing the reconnect.
//
// `verifyLiveSession` runs server-side on every handshake (backend/src/socket.js),
// so a suspended, deleted or closed account is refused at the NEXT handshake —
// signing out (enabled=false) disconnects immediately rather than waiting for one.
import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { getSocketTicket } from './actions/socket'

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface UseSocketResult {
  /** Set as soon as the instance is created, even before 'connect' fires, so a
   *  consumer's own effect can attach listeners the moment this is non-null
   *  and simply receive events once the handshake completes. */
  socket: Socket | null
  connected: boolean
}

/**
 * Opens (and keeps open) the realtime socket while `enabled` is true — pass
 * `!!user` from a page that already knows whether someone is signed in.
 * Disconnects on unmount and whenever `enabled` flips to false.
 */
export function useSocket(enabled: boolean): UseSocketResult {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setSocket(null)
      setConnected(false)
      return
    }

    const instance: Socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: (cb: (data: Record<string, string>) => void) => {
        getSocketTicket()
          .then((ticket) => cb(ticket ? { ticket } : {}))
          .catch(() => cb({}))
      },
    })

    instance.on('connect', () => setConnected(true))
    instance.on('disconnect', () => setConnected(false))
    setSocket(instance)
    instance.connect()

    return () => {
      instance.disconnect()
      instance.removeAllListeners()
      setSocket(null)
      setConnected(false)
    }
  }, [enabled])

  return { socket, connected }
}
