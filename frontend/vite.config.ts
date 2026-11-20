import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwind()],
  server: { port: 5173, strictPort: true },
  ...(mode === 'test' && { define: {
    'import.meta.env.VITE_MOCK_MODE': JSON.stringify('true'),
    'import.meta.env.VITE_API_URL': JSON.stringify(''),
    'import.meta.env.VITE_INSTITUTION_PUBLIC_KEY': JSON.stringify(''),
  } }),
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], include: ['src/**/*.test.tsx'] },
}))
