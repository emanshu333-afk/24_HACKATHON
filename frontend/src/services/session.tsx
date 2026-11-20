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
  const [{ signedIn, expired }, setSession] = useState<{ signedIn: SignedIn | null; expired: boolean }>({ signedIn: null, expired: false })
  const expire = useCallback((owner: SignedIn) => setSession(current => current.signedIn === owner ? { signedIn: null, expired: true } : current), [])
  useEffect(() => {
    if (!signedIn) return
    const timer = window.setTimeout(() => expire(signedIn), Math.max(0, signedIn.expiresAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [signedIn, expire])
  const signIn = async (body: LoginRequest, signal: AbortSignal) => {
    const login = await api.login(body, signal)
    if (typeof login.token !== 'string' || !login.token || !Number.isInteger(login.expiresIn) || login.expiresIn <= 0 || login.expiresIn > 3600) throw new Error('Invalid session response')
    const expiresAt = Date.now() + login.expiresIn * 1000
    const user = await api.me(login.token, signal)
    if (typeof user.id !== 'string' || !user.id || typeof user.email !== 'string' || !['ADMIN', 'STUDENT', 'APPROVER', 'AUDITOR'].includes(user.role)) throw new Error('Invalid account response')
    signal.throwIfAborted()
    setSession({ expired: false, signedIn: { token: login.token, user, expiresAt } })
    return user
  }
  const call = useCallback(async <T,>(operation: (token: string) => Promise<T>) => {
    if (!signedIn || Date.now() >= signedIn.expiresAt) {
      if (signedIn) expire(signedIn)
      throw new HttpError(401, 'UNAUTHORIZED')
    }
    try { return await operation(signedIn.token) }
    catch (error) {
      if (error instanceof HttpError && error.status === 401) expire(signedIn)
      throw error
    }
  }, [signedIn, expire])
  return <Context.Provider value={{ signedIn, expired, signIn, signOut: () => setSession({ signedIn: null, expired: false }), call }}>{children}</Context.Provider>
}

export function useSession() { const session = useContext(Context); if (!session) throw new Error('Session provider missing'); return session }

export function useLive<T>(load: (token: string, signal: AbortSignal) => Promise<T>) {
  const { call } = useSession()
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{ call: typeof call; load: typeof load; revision: number; value?: T; failure?: unknown }>()
  useEffect(() => {
    const controller = new AbortController()
    call(token => load(token, controller.signal)).then(value => {
      if (!controller.signal.aborted) setState({ call, load, revision, value })
    }).catch(failure => { if (!controller.signal.aborted) setState({ call, load, revision, failure }) })
    return () => controller.abort()
  }, [call, load, revision])
  const current = state?.call === call && state.load === load && state.revision === revision ? state : undefined
  return { value: current?.value, failure: current?.failure, reload: () => setRevision(r => r + 1) }
}
