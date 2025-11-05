import { useEffect, useState } from 'react'

export default function App() {
  const [status, setStatus] = useState('loading...')
  useEffect(() => {
    const api = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    fetch(`${api}/health/`).then(async r => {
      try { const j = await r.json(); setStatus(j.status || 'ok') }
      catch { setStatus('ok') }
    }).catch(() => setStatus('backend not reachable'))
  }, [])
  return (
    <div style={{fontFamily:'system-ui', padding: 24}}>
      <h1>MovieApp</h1>
      <p>Backend health: <b>{status}</b></p>
    </div>
  )
}
