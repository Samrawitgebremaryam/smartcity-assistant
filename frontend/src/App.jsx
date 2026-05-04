import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'

import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards'
import AuthPage from './pages/AuthPage'
import ChatPage from './pages/ChatPage'
import LandingPage from './pages/LandingPage'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicOnlyRoute><AuthPage /></PublicOnlyRoute>} />
          <Route path="/signup" element={<PublicOnlyRoute><AuthPage /></PublicOnlyRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
