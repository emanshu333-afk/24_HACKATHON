import { defineConfig } from '@playwright/test'
import { readVectors } from './e2e/proof-vectors'
import { readFileSync } from 'node:fs'

const vectors = readVectors()
const smokeBackend = process.env.VERIMARK_SMOKE_BACKEND
const liveKeyFile = process.env.VERIMARK_SMOKE_PUBLIC_KEY_FILE

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://127.0.0.1:4173', channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  webServer: [
    { command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', env: { VITE_MOCK_MODE: 'true' } },
    { command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort', url: 'http://127.0.0.1:4174', env: { VITE_MOCK_MODE: 'false', VITE_API_BASE_URL: '' } },
    ...(vectors ? [{ command: 'npm run dev -- --host 127.0.0.1 --port 4175 --strictPort', url: 'http://127.0.0.1:4175', env: { VITE_MOCK_MODE: 'false', VITE_API_BASE_URL: '/fixture-api', VITE_INSTITUTION_PUBLIC_KEY: vectors.publicKey.replace(/\n/g, '\\n') } }] : []),
    ...(smokeBackend && liveKeyFile ? [{ command: 'npm run dev -- --host localhost --port 5173 --strictPort', url: 'http://localhost:5173', env: { VITE_MOCK_MODE: 'false', VITE_API_BASE_URL: smokeBackend, VITE_INSTITUTION_PUBLIC_KEY: readFileSync(liveKeyFile, 'utf8').replace(/\r?\n/g, '\\n') } }] : []),
  ],
})
