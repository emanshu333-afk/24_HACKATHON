import { defineConfig } from '@playwright/test'
import { readVectors } from './e2e/proof-vectors'

const vectors = readVectors()
const publicApi = process.env.VERIMARK_PUBLIC_SMOKE_URL
const publicKey = process.env.VERIMARK_PUBLIC_SMOKE_KEY

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://127.0.0.1:4173', channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  webServer: [
    { command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', env: { VITE_MOCK_MODE: 'true' } },
    { command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort', url: 'http://127.0.0.1:4174', env: { VITE_MOCK_MODE: 'false', VITE_API_URL: '' } },
    ...(vectors ? [{ command: 'npm run dev -- --host 127.0.0.1 --port 4175 --strictPort', url: 'http://127.0.0.1:4175', env: { VITE_MOCK_MODE: 'false', VITE_API_URL: '/fixture-api', VITE_INSTITUTION_PUBLIC_KEY: vectors.publicKey.replace(/\n/g, '\\n') } }] : []),
    ...(publicApi ? [{ command: 'npm run dev -- --host localhost --port 5173 --strictPort', url: 'http://localhost:5173', env: { VITE_MOCK_MODE: 'false', VITE_API_URL: publicApi, VITE_INSTITUTION_PUBLIC_KEY: (publicKey ?? '').replace(/\r?\n/g, '\\n') } }] : []),
  ],
})
