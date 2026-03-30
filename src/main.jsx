import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Limpa sessão corrompida antes de iniciar o app
try {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const projectId = new URL(supabaseUrl).hostname.split('.')[0]
  const storageKey = `sb-${projectId}-auth-token`
  const raw = localStorage.getItem(storageKey)

  if (raw) {
    const parsed = JSON.parse(raw)
    const expiresAt = parsed?.expires_at
    if (!expiresAt || Date.now() / 1000 > expiresAt) {
      localStorage.removeItem(storageKey)
    }
  }
} catch {
  localStorage.clear()
}

createRoot(document.getElementById('root')).render(
  <App />
)