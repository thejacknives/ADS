import { useEffect, useState } from 'react'

export default function App() {

  // Stores the backend health check status ('ok', 'error', 'loading...')
  const [status, setStatus] = useState('loading...')
  
  // Stores the backend API URL (e.g., 'http://localhost:8000')
  const [apiUrl, setApiUrl] = useState<string | null>(null)
  
  // Stores the result message after creating a user (success or error)
  const [userResult, setUserResult] = useState<string | null>(null)
  
  // Form input states for creating a new user
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')


  useEffect(() => {
    // Get API URL from environment variable (set in .env or Docker)
    // Falls back to localhost:8000 if not set
    const raw = ((import.meta as any).env?.VITE_API_URL) || 'http://localhost:8000'
    
    // Remove trailing slashes to avoid double slashes in URLs
    // e.g., 'http://localhost:8000/' becomes 'http://localhost:8000'
    let api = raw.replace(/\/+$/, '')

    // RUNTIME OVERRIDE: If app is deployed (not localhost) but API URL 
    // still points to localhost, override to the production backend URL.
    try {
      if (api.includes('localhost') && typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost') {
        api = 'https://movieapp-backend-tsu0.onrender.com'
      }
    } catch (e) {}
    
    // Save the API URL to state so we can use it in other functions
    setApiUrl(api)

    // ============================================
    // HEALTH CHECK - Test if backend is running
    // ============================================
    // Calls: GET http://localhost:8000/health/
    // Expects: { "status": "ok" }
    fetch(`${api}/health/`, { mode: 'cors' })
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const j = await r.json().catch(() => null)
        setStatus((j && j.status) || 'ok')
      })
      .catch((err) => setStatus(`error: ${err?.message}`))
  }, []) 


  const createUser = async () => {
    // Validate that all fields are filled
    if (!username || !email || !password) {
      setUserResult('Please fill all fields')
      return
    }

    try {
      // ============================================
      // API CALL - POST request to create user
      // ============================================
      // Calls: POST http://localhost:8000/api/users/
      // Sends: { "username": "...", "email": "...", "password": "..." }
      // Expects: { "id": 1, "username": "...", "email": "..." }
      const response = await fetch(`${apiUrl}/api/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      })

      if (response.ok) {

        const data = await response.json()
        setUserResult(`User created! ID: ${data.id}, Username: ${data.username}`)
        

        setUsername('')
        setEmail('')
        setPassword('')
      } else {
        // ERROR - Backend returned an error (e.g., user already exists)
        const error = await response.json()
        setUserResult(`Error: ${JSON.stringify(error)}`)
      }
    } catch (err: any) {
      // Couldn't reach the backend at all
      setUserResult(`Error: ${err.message}`)
    }
  }

  //UI
  return (
    <div style={{ fontFamily: 'system-ui', padding: 24, backgroundColor: '#ff00a6ff', minHeight: '100vh' }}>

      <h1>MovieApp</h1>
      <p>API: <code>{apiUrl ?? 'loading...'}</code></p>
      <p>Backend health: <b>{status}</b></p>

      <hr style={{ margin: '20px 0' }} />


      <h2>Test: Create User</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 300 }}>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ padding: 8 }}
        />
        

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 8 }}
        />
        

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 8 }}
        />
        

        <button onClick={createUser} style={{ padding: 10, cursor: 'pointer' }}>
          Create User
        </button>
      </div>


      {userResult && (
        <p style={{ marginTop: 10, padding: 10, backgroundColor: 'white', borderRadius: 4 }}>
          {userResult}
        </p>
      )}
    </div>
  )
}