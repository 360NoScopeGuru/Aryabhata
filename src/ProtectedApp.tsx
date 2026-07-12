import { useAuth } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'

import App from './App.tsx'

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 28 28"
        fill="none"
        style={{ animation: 'spin 2s linear infinite' }}
      >
        <circle cx="14" cy="14" r="11" stroke="var(--accent)" strokeWidth="0.75" opacity="0.2" />
        <path
          d="M14 3 A11 11 0 0 1 25 14"
          stroke="var(--accent)"
          strokeWidth="0.75"
          strokeLinecap="round"
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </svg>
    </div>
  )
}

export default function ProtectedApp() {
  const { isLoaded, isSignedIn } = useAuth()
  if (!isLoaded) return <LoadingScreen />
  if (!isSignedIn) return <Navigate to="/sign-in" replace />
  return <App />
}
