import { useEffect, useState } from 'react'

export default function App() {
  const [status, setStatus] = useState('loading...')
  const [apiUrl, setApiUrl] = useState<string | null>(null)

  useEffect(() => {
  // Read the build-time env var (Vite injects this at build time).
  // Cast import.meta to any to avoid TypeScript errors when Vite types are not present.
  const raw = ((import.meta as any).env?.VITE_API_URL) || 'http://localhost:8000'
    // Normalize by removing trailing slashes to avoid double-slashes in paths
    const api = raw.replace(/\/+$/, '')
    setApiUrl(api)

    const url = `${api}/health/`
    fetch(url, { mode: 'cors' })
      .then(async r => {
        if (!r.ok) {
          const text = await r.text().catch(() => '')
          throw new Error(`HTTP ${r.status} ${r.statusText} ${text}`)
        }
        const j = await r.json().catch(() => null)
        setStatus((j && j.status) || 'ok')
      })
      .catch((err) => {
        const msg = err?.message || String(err)
        setStatus(`error: ${msg}`)
        // Helpful debugging info in console
        // Check network tab for CORS or network errors
        console.error('Health check failed', { url, msg, err })
      })
  }, [])

  return (
    <div style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h1>MovieApp</h1>
      <p>API: <code>{apiUrl ?? 'loading...'}</code></p>
      <p>Backend health: <b>{status}</b></p>
    </div>
  )
}
