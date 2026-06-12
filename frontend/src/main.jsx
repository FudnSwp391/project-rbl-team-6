import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './context/AuthContext'
import ToastHost from './components/ToastHost'
import './index.css'
import App from './App.jsx'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy_client_id'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      {/* AuthProvider makes user/token available to the whole app */}
      <AuthProvider>
        <App />
        <ToastHost />
      </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
