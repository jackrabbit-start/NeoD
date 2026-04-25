import { defineConfig } from 'vite'

const base = process.env.GITHUB_PAGES === 'true' ? '/NeoD/' : '/'

export default defineConfig({
  base,
  server: {
    port: 5173,
  },
})
