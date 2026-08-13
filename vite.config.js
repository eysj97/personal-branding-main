import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createAnalyzeHandler } from './server/analyze.js'
import { createChatHandler } from './server/chat.js'

// The two AI endpoints, in development.
//
// The handlers themselves live in server/ and are mounted twice: here for
// `npm run dev`, and by the files in api/ on the deployed site. That is the
// whole reason they moved out of this file. They used to be written inline with
// `apply: 'serve'`, which meant a static build had no /api/* at all — the fetch
// 404'd and everything fell to the local fallbacks. That was deliberate and
// documented, but it also meant the deployed site never once called the model,
// so what a visitor saw was not what you had been testing.
//
// `apply: 'serve'` is still correct here, and now means what it says: in
// production these paths are served by api/analyze.js and api/chat.js, so Vite
// should not also claim them.
//
// The key still never reaches the browser. It is read in this Node process and
// handed to the handler; nothing about it is bundled.
function devEndpoint(name, path, handler) {
  return {
    name,
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(path, handler)
    },
  }
}

export default defineConfig(({ mode }) => {
  // The third argument is '' so non-VITE_-prefixed vars load too. This value is
  // only ever read here in the Node process — it is not exposed to the client.
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.ANTHROPIC_API_KEY

  return {
    plugins: [
      react(),
      tailwindcss(),
      devEndpoint('snapkeep-analyze', '/api/analyze', createAnalyzeHandler(apiKey)),
      devEndpoint('chatbot-answer', '/api/chat', createChatHandler(apiKey)),
    ],
  }
})

// A note on `npm run build`, if it fails with "Rolldown failed to resolve
// import 'react'" or "지정된 경로를 찾을 수 없습니다 (os error 3)":
//
// That is the path this folder lives under, not the code. Vite 8 bundles with
// Rolldown, whose Windows native binding cannot read files under a path
// containing Hangul — and this one sits in …/문서/윤수정/uxui디자이너/….
// Copying the project verbatim (same node_modules) to an ASCII-only path and
// running the same command builds it in under a second.
//
// The dev server is unaffected: it resolves and serves per request in JS and
// never hands these paths to that binding.
//
// Aliasing react/react-dom to absolute paths does not fix it — it only moves
// the failure from resolving the package to opening the file. The fix is to
// keep the project somewhere ASCII, e.g. C:\dev\personal-branding.
//
// This also means Vercel builds fine: its checkout path is ASCII.
