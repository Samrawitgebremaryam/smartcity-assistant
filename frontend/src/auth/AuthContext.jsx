import { createContext, useContext, useEffect, useState } from 'react'

import axios, { extractApiError, getCurrentUser } from '../lib/api'

const AuthContext = createContext(null)

function getHistoryStorageKey(userId) {
  return userId ? `chatHistory:${userId}` : null
}

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chatHistory, setChatHistory] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    getCurrentUser(token)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('token')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const storageKey = getHistoryStorageKey(user?.id)
    if (!storageKey) {
      setChatHistory([])
      return
    }

    const saved = localStorage.getItem(storageKey)
    setChatHistory(saved ? JSON.parse(saved) : [])
  }, [user?.id])

  useEffect(() => {
    const storageKey = getHistoryStorageKey(user?.id)
    if (!storageKey) return
    localStorage.setItem(storageKey, JSON.stringify(chatHistory))
  }, [chatHistory, user?.id])

  const login = async (email, password) => {
    try {
      const response = await axios.post('/auth/login', { email, password })
      localStorage.setItem('token', response.data.access_token)
      const currentUser = await getCurrentUser(response.data.access_token)
      setUser(currentUser)
      return { success: true }
    } catch (error) {
      localStorage.removeItem('token')
      setUser(null)
      return { success: false, error: extractApiError(error, 'Login failed') }
    }
  }

  const register = async (email, password, name) => {
    try {
      await axios.post('/auth/register', { email, password, name })
      return { success: true, message: 'Registration successful. Please sign in.' }
    } catch (error) {
      return { success: false, error: extractApiError(error, 'Registration failed') }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const upsertHistory = (chat) => {
    setChatHistory((prev) => {
      const next = prev.filter((item) => item.id !== chat.id)
      return [{ ...chat, updatedAt: new Date().toISOString() }, ...next]
    })
  }

  const deleteFromHistory = (chatId) => {
    setChatHistory((prev) => prev.filter((chat) => chat.id !== chatId))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, chatHistory, upsertHistory, deleteFromHistory }}>
      {children}
    </AuthContext.Provider>
  )
}
