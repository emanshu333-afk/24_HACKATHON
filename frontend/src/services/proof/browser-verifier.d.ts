import type { BrowserVerifier, Verification } from '../wire'
export const verifyEvidence: BrowserVerifier
export function canonical(value: unknown): string
export function compareDisplayedResult(verification: Verification, displayed: unknown): Verification
export function digest(domain: string, value: unknown): Promise<string>
export function keyId(pem: string): Promise<string>
export function verifyValue(domain: string, value: unknown, signature: string, pem: string): Promise<boolean>
