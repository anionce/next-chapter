import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { forwardToHardcover } from './src/lib/hardcoverProxy.ts'

// Mirrors netlify/functions/hardcover.ts so `npm run dev` behaves the same
// way production does: the browser only ever calls this same-origin path,
// never Hardcover directly, and the API key stays server-side (read here
// from process.env, never exposed via import.meta.env/VITE_ prefix).
function hardcoverDevProxy(apiKey: string | undefined): Plugin {
  return {
    name: 'hardcover-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/.netlify/functions/hardcover', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        if (!apiKey) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Missing HARDCOVER_API_KEY in .env' }))
          return
        }
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        const { status, bodyText } = await forwardToHardcover(apiKey, Buffer.concat(chunks).toString('utf-8'))
        res.statusCode = status
        res.setHeader('Content-Type', 'application/json')
        res.end(bodyText)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), hardcoverDevProxy(env.HARDCOVER_API_KEY)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
