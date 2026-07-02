import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import './styles.css'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'ONS_TENNIS_NOTIFICATION_NAVIGATE') return

    const targetUrl = new URL(event.data.url || '/#/', window.location.origin)
    if (targetUrl.origin !== window.location.origin) return

    if (targetUrl.pathname !== window.location.pathname || targetUrl.search !== window.location.search) {
      window.location.assign(targetUrl.href)
      return
    }

    window.location.hash = targetUrl.hash || '#/'
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
