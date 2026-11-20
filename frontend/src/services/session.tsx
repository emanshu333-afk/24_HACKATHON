import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, HttpError } from './http'
import type { LoginRequest, Me } from './wire'

type SignedIn = { token: string; user: Me; expiresAt: number }
type Session = {
  signedIn: SignedIn | null; expired: boolean;
  signIn: (body: LoginRequest, signal: AbortSignal) => Promise<Me>;
  signOut: () => void;
  call: <T>(operation: (token: string) => Promise<T>) => Promise<T>;
}
const Context = createContext<Session | null>(null)
export function SessionProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState<SignedIn | null>(null), [expired, setExpired] = useState(false)
  useEffect(() => {
    if (!signedIn) return
    const timer = window.setTimeout(() => { setSignedIn(null); setExpired(true) }, Math.max(0, signedIn.expiresAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [signedIn])
  const signIn = async (body: LoginRequest, signal: AbortSignal) => {
    const login = await api.login(body, signal)
    const expiresAt = Date.now() + login.expiresIn * 1000
    const user = await api.me(login.token, signal)
    signal.throwIfAborted()
    setExpired(false); setSignedIn({ token: login.token, user, expiresAt })
    return user
  }
  const call = useCallback(async <T,>(operation: (token: string) => Promise<T>) => {
    if (!signedIn || Date.now() >= signedIn.expiresAt) throw new HttpError(401, 'UNAUTHORIZED')
    try { return await operation(signedIn.token) }
    catch (error) {
      if (error instanceof HttpError && error.status === 401) { setSignedIn(current => current === signedIn ? null : current); setExpired(true) }
      throw error
    }
  }, [signedIn])
  return <Context.Provider value={{ signedIn, expired, signIn, signOut: () => { setSignedIn(null); setExpired(false) }, call }}>{children}</Context.Provider>
}

export function useSession() { const session = useContext(Context); if (!session) throw new Error('Session provider missing'); return session }

export function useLive<T>(load: (token: string, signal: AbortSignal) => Promise<T>) {
  const { call } = useSession()
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{ load: typeof load; revision: number; value?: T; failure?: unknown }>()
  useEffect(() => {
    const controller = new AbortController()
    call(token => load(token, controller.signal)).then(value => {
      if (!controller.signal.aborted) setState({ load, revision, value })
    }).catch(failure => { if (!controller.signal.aborted) setState({ load, revision, failure }) })
    return () => controller.abort()
  }, [call, load, revision])
  const current = state?.load === load && state.revision === revision ? state : undefined
  return { value: current?.value, failure: current?.failure, reload: () => setRevision(r => r + 1) }
}
