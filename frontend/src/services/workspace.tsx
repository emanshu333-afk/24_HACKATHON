import { createContext, useContext, useState, type ReactNode } from 'react'
import { results as initialResults, corrections as initialCorrections } from './demo'
import type { Correction, Result } from './model'

type Workspace = { results: Result[]; corrections: Correction[]; addResult: (result: Result) => void; addCorrection: (correction: Correction) => void }
const Context = createContext<Workspace | null>(null)
export function DemoWorkspace({ children }: { children: ReactNode }) {
  const [results, setResults] = useState(initialResults), [corrections, setCorrections] = useState(initialCorrections)
  return <Context.Provider value={{ results, corrections, addResult: result => setResults(items => [result, ...items]), addCorrection: correction => setCorrections(items => [correction, ...items]) }}>{children}</Context.Provider>
}
export function useWorkspace() { const workspace = useContext(Context); if (!workspace) throw new Error('Demo workspace missing'); return workspace }
