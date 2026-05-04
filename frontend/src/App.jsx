import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { BrowserRouter as Router, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { jwtDecode } from 'jwt-decode'
import {
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Image,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Send,
  Shield,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
axios.defaults.baseURL = API_BASE

const SUPPORTED_DOCUMENT_EXTENSIONS = ['.txt', '.md', '.json', '.csv', '.html', '.htm']

const AuthContext = createContext(null)

const features = [
  { icon: MessageCircle, title: 'Instant Answers', desc: 'Get immediate responses to city service questions 24/7' },
  { icon: FileText, title: 'Document Guidance', desc: 'Learn required documents for permits & registrations' },
  { icon: Zap, title: 'Smart Search', desc: 'Find information without digging through sources' },
  { icon: Shield, title: 'Verified Information', desc: 'Answers backed by official city documents' },
]

const services = [
  { title: 'Civil Registration', desc: 'Birth, marriage & ID certificates' },
  { title: 'Bill Payments', desc: 'Electricity & water bills via mobile' },
  { title: 'Transport', desc: 'Bus routes, schedules & fares' },
  { title: 'Telecom', desc: 'Ethiotelecom support & USSD codes' },
  { title: 'Business', desc: 'Licenses, permits & business registration' },
  { title: 'Emergency', desc: 'Hospitals, police & fire services' },
]

const stats = [
  { value: '10K+', label: 'Monthly Queries' },
  { value: '50+', label: 'Service Topics' },
  { value: '24/7', label: 'Availability' },
  { value: '99.9%', label: 'Uptime' },
]

const footerLinks = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#' },
      { label: 'Integrations', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'API Reference', href: '#' },
      { label: 'Status', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Security', href: '#' },
    ],
  },
]

export function useAuth() {
  return useContext(AuthContext)
}

function getHistoryStorageKey(userId) {
  return userId ? `chatHistory:${userId}` : null
}

function extractApiError(error, fallback) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const firstMessage = detail.map((item) => item?.msg || item?.message || '').find((message) => typeof message === 'string' && message.trim())
    if (firstMessage) return firstMessage
  }
  if (!error?.response) {
    return `Cannot reach the backend at ${API_BASE}. Make sure the API is running.`
  }
  return fallback
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

async function getCurrentUser(token) {
  const decoded = jwtDecode(token)
  if (decoded.exp * 1000 <= Date.now()) {
    throw new Error('Session expired')
  }
  const response = await axios.get('/auth/me', { headers: authHeaders(token) })
  return { token, ...response.data }
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chatHistory, setChatHistory] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    getCurrentUser(token).then(setUser).catch(() => {
      localStorage.removeItem('token')
      setUser(null)
    }).finally(() => setLoading(false))
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

function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border border-white/10 border-t-white" />
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/chat" replace />
  return children
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
        <Zap className="h-5 w-5" />
      </div>
      <span className="text-lg font-semibold text-white">SmartCity</span>
    </Link>
  )
}

function Header() {
  const [scrolled, setScrolled] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all ${scrolled ? 'bg-black/80 backdrop-blur-md border-b border-white/10' : ''}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Brand />
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-zinc-400 transition hover:text-white">Features</a>
          <a href="#services" className="text-sm text-zinc-400 transition hover:text-white">Services</a>
          <a href="#about" className="text-sm text-zinc-400 transition hover:text-white">About</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-zinc-400 transition hover:text-white">Sign in</Link>
          <Link to="/signup" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-6">
          <div className="md:col-span-2">
            <Brand />
            <p className="mt-4 max-w-xs text-sm text-zinc-500">
              AI-powered assistant helping residents navigate city services in Addis Ababa.
            </p>
          </div>
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-medium text-white">{group.title}</h4>
              <ul className="mt-4 space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-zinc-500 transition hover:text-white">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex items-center justify-between border-t border-white/10 pt-8">
          <p className="text-sm text-zinc-600">© 2024 SmartCity. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-zinc-600 transition hover:text-white">
              <span className="sr-only">Twitter</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.25c2.38.02 4.78-.6 6.62-1.76l.28-.18-1.75-.63c-.67-.24-1.39-.47-2.16-.61l-.26-.05-.27.08c-.83.25-1.84.38-2.87.35l-.31-.02.08-.31c.1-.4.25-.79.44-1.16l.12-.24-.24-.11c-1.3-.6-2.72-1.02-4.22-1.25l-.33-.05.05-.33c.25-1.52.97-2.94 2.13-4.21l.19-.21.21.19c1.06.94 2.31 1.63 3.7 2.02l.27.08-.27.08c-.77.23-1.52.34-2.28.34-.76 0-1.51-.11-2.28-.34l-.27-.08.27-.08c1.39-.39 2.64-1.08 3.7-2.02l.21-.19-.19-.21C14.26 8.2 13.54 6.78 13.29 5.26l-.05-.33.33-.05c.5 1.5 1.92 2.92 3.22 3.52l.24.11-.12.24c-.19.37-.34.76-.44 1.16l-.08.31.31-.02c1.03-.03 2.04.1 2.87.35l.24.11-.12.24c-.19.37-.34.76-.44 1.16l-.08.31.27-.05c2.84-1.16 5.24-1.78 6.62-1.76l.33.05-.05.33c-.25 1.5-.96 2.9-2.13 4.21l-.18.21.18.21c1.17 1.31 1.88 2.69 2.13 4.21l.05.33-.33.05c-1.5.5-2.92 1.92-3.52 3.22l-.11.24.24.11c.6 1.3 1.02 2.72 1.25 4.22l.05.33-.33.05c-1.52.25-2.9.96-4.21 2.13l-.21.18.21.19c.94 1.06 1.63 2.31 2.02 3.7l.08.27-.27.08c-.23.77-.34 1.52-.34 2.28s.11 1.51.34 2.28l.27.08-.27.08c-.39 1.39-1.08 2.64-2.02 3.7l-.19.21.19.21c-1.31 1.17-2.69 1.88-4.21 2.13l-.33.05.05-.33z" /></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

function LandingPage() {
  const [videoLoaded, setVideoLoaded] = useState(false)

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-16">
        <video autoPlay loop muted playsinline onLoadedData={() => setVideoLoaded(true)} className="absolute inset-0 h-full w-full object-cover opacity-30">
          <source src="https://framerusercontent.com/assets/Kny5Ty8J6mn9PsM1TGpXsWNtNh4.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />
        
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className={`transition-all duration-700 ${videoLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-zinc-300">
              <Sparkles className="h-3 w-3" />
              AI-Powered City Assistant
            </div>
            
            <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-7xl lg:text-8xl">
              Your Smart City<br />
              <span className="bg-gradient-to-r from-zinc-200 to-zinc-500 bg-clip-text text-transparent">
                Guide
              </span>
            </h1>
            
            <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 md:text-xl">
              Get instant answers about city services, permits, bill payments, 
              transport, and more for Addis Ababa residents.
            </p>
            
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-black transition hover:bg-zinc-200">
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-base font-medium text-white transition hover:border-white/40 hover:bg-white/5">
                Sign In
              </Link>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-pulse">
          <ChevronDown className="h-5 w-5 text-zinc-500" />
        </div>
      </section>

      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold md:text-5xl">Everything you need</h2>
          <p className="mt-4 text-zinc-400">Powerful features to help you navigate city services</p>
          
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold md:text-5xl">Services we cover</h2>
              <p className="mt-4 text-zinc-400">
                Find help with a wide range of city services, from civil registration 
                to emergency contacts.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {services.map((service) => (
                <div key={service.title} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-4">
                  <Check className="h-5 w-5 shrink-0 text-zinc-400" />
                  <div>
                    <div className="font-medium">{service.title}</div>
                    <div className="text-sm text-zinc-500">{service.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold text-white">{stat.value}</div>
                <div className="mt-1 text-sm text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold md:text-5xl">Built for residents</h2>
          <p className="mt-4 text-zinc-400">
            SmartCity Assistant is designed to make city services accessible to everyone. 
            Whether you need help with permits, bill payments, or finding the nearest hospital, 
            we're here to help 24/7.
          </p>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-12 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Ready to get started?</h2>
          <p className="mt-4 text-zinc-400">Join thousands of residents using SmartCity every month</p>
          <div className="mt-8">
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-black transition hover:bg-zinc-200">
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function AuthPage() {
  const location = useLocation()
  const [isLogin, setIsLogin] = useState(location.pathname !== '/signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    setIsLogin(location.pathname !== '/signup')
    setError('')
    setNotice('')
  }, [location.pathname])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setSubmitting(true)

    if (isLogin) {
      const result = await login(email, password)
      if (result.success) navigate('/chat')
      else setError(result.error)
    } else {
      const result = await register(email, password, name)
      if (result.success) {
        navigate('/login')
        setPassword('')
        setNotice(result.message)
      } else setError(result.error)
    }

    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black">
              <Zap className="h-7 w-7" />
            </div>
            <span className="text-2xl font-bold text-white">SmartCity</span>
          </Link>
        </div>
        
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-10">
          <div className="mb-8 flex rounded-2xl bg-white/5 p-1.5">
            <button type="button" onClick={() => navigate('/login')} className={`flex-1 rounded-xl py-3 text-base font-medium transition ${isLogin ? 'bg-white text-black shadow-lg' : 'text-zinc-400 hover:text-white'}`}>
              Sign in
            </button>
            <button type="button" onClick={() => navigate('/signup')} className={`flex-1 rounded-xl py-3 text-base font-medium transition ${!isLogin ? 'bg-white text-black shadow-lg' : 'text-zinc-400 hover:text-white'}`}>
              Create account
            </button>
          </div>

          <h1 className="text-3xl font-bold">{isLogin ? 'Welcome back' : 'Get started'}</h1>
          <p className="mt-3 text-base text-zinc-400">{isLogin ? 'Enter your details to continue to the assistant' : 'Create an account to start using SmartCity'}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-base font-medium text-zinc-300">Full name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-5 py-4 text-lg text-white placeholder-zinc-500 focus:border-white focus:outline-none" />
              </div>
            )}
            <div>
              <label className="block text-base font-medium text-zinc-300">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-5 py-4 text-lg text-white placeholder-zinc-500 focus:border-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-base font-medium text-zinc-300">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-5 py-4 text-lg text-white placeholder-zinc-500 focus:border-white focus:outline-none" />
            </div>

            {notice && <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-base text-green-400">{notice}</div>}
            {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-base text-red-400">{error}</div>}

            <button type="submit" disabled={submitting} className="w-full rounded-xl bg-white py-4 text-lg font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50">
              {submitting ? 'Please wait...' : isLogin ? 'Continue' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-base text-zinc-500">
          <Link to="/" className="text-white hover:underline">← Back to home</Link>
        </p>
      </div>
    </div>
  )
}

function MarkdownContent({ content }) {
  const normalizedContent = content
    .replace(/\s+\*\s+/g, '\n- ')
    .replace(/:\s+- /g, ':\n- ')
    .replace(/\s+Source:\s+/g, '\n\nSource: ')
    .replace(/(\d+\.)\s+\*\*(.*?)\*\*/g, '\n$1 $2')
    .replace(/\*\*(.*?)\*\*/g, '\n## $1')
    .replace(/([^.:\n])\s+(\d+\.)\s+/g, '$1\n$2 ')
    .replace(/([a-z])\s+(These|This|They|It|For post-paid|Since May|Since|You can also)\b/g, '$1. $2')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const lines = normalizedContent.split('\n').filter(Boolean)
  
  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        if (line.startsWith('Source: ')) {
          return (
            <div key={i} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300">
              {line}
            </div>
          )
        }
        if (line.startsWith('- ')) {
          return <li key={i} className="ml-5 list-disc text-[15px] leading-8 text-zinc-200">{line.slice(2)}</li>
        }
        if (/^\d+\.\s/.test(line)) {
          return <li key={i} className="ml-5 list-decimal text-[15px] leading-8 text-zinc-200">{line.replace(/^\d+\.\s/, '')}</li>
        }
        if (line.startsWith('## ')) {
          return <h3 key={i} className="mt-5 text-lg font-semibold text-white">{line.slice(3)}</h3>
        }
        if (line.startsWith('# ')) {
          return <h3 key={i} className="text-lg font-semibold text-white">{line.slice(2)}</h3>
        }
        return <p key={i} className="text-[15px] leading-8 text-zinc-200">{line}</p>
      })}
    </div>
  )
}

function ChatPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [attachment, setAttachment] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedChat, setSelectedChat] = useState(null)
  const [historySearch, setHistorySearch] = useState('')
  const [showHistorySearch, setShowHistorySearch] = useState(false)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [messageMenuId, setMessageMenuId] = useState(null)
  const [toast, setToast] = useState('')
  const { user, logout, chatHistory, upsertHistory, deleteFromHistory } = useAuth()
  const navigate = useNavigate()
  const messagesEndRef = useRef(null)
  const abortControllerRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const createId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }

  const createConversationTitle = (question) => {
    const normalized = question.replace(/\s+/g, ' ').trim()
    return normalized.length > 48 ? `${normalized.slice(0, 48).trim()}...` : normalized
  }

  const saveConversation = (conversationId, question, nextMessages) => {
    upsertHistory({
      id: conversationId,
      title: chatHistory.find((chat) => chat.id === conversationId)?.title || createConversationTitle(question || 'New attachment'),
      messages: nextMessages,
    })
  }

  const buildUserMessageContent = (question, activeAttachment) => {
    const trimmedQuestion = question.trim()
    if (!activeAttachment) return trimmedQuestion
    if (trimmedQuestion) return `${trimmedQuestion}\n\nAttached: ${activeAttachment.file.name}`
    return `Attached: ${activeAttachment.file.name}`
  }

  const uploadDocumentAttachment = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('language', 'en')

    const uploadResponse = await axios.post('/documents/upload', formData, {
      headers: authHeaders(user.token),
    })

    await axios.post(
      '/documents/ingest',
      { document_id: uploadResponse.data.document_id, force: true },
      { headers: authHeaders(user.token) },
    )

    return uploadResponse.data
  }

  const handleAttachmentPick = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (file.type.startsWith('image/')) {
      setAttachment({ file, kind: 'image' })
      setToast('Image attached')
      return
    }

    const suffix = `.${file.name.split('.').pop()?.toLowerCase() || ''}`
    if (SUPPORTED_DOCUMENT_EXTENSIONS.includes(suffix)) {
      setAttachment({ file, kind: 'document' })
      setToast('Document attached')
      return
    }

    setToast(`Unsupported file type. Use ${SUPPORTED_DOCUMENT_EXTENSIONS.join(', ')} or an image.`)
  }

  const sendMessage = async (event, preset) => {
    event?.preventDefault()
    const question = (preset ?? input).trim()
    const activeAttachment = preset ? null : attachment
    if ((!question && !activeAttachment) || loading) return
    if (!preset) {
      setInput('')
      setAttachment(null)
    }

    const conversationId = selectedChat || createId()
    const normalizedQuestion = question || activeAttachment?.file.name || 'Attachment'
    const userMessage = {
      id: createId(),
      role: 'user',
      content: buildUserMessageContent(question, activeAttachment),
      attachmentName: activeAttachment?.file.name || null,
    }
    const assistantMessageId = createId()
    let placeholderInserted = false

    if (!selectedChat) {
      setSelectedChat(conversationId)
    }

    try {
      if (activeAttachment?.kind === 'image') {
        const assistantMessage = {
          id: createId(),
          role: 'assistant',
          content: "I can't analyze image attachments yet. Please describe the picture in text, or upload a text, JSON, CSV, Markdown, or HTML document instead.",
          streaming: false,
          suggestedQuestions: [
            'Where do I register a business?',
            'How do I pay my electricity bill?',
            'What documents are needed for marriage registration?',
          ],
          responseKind: 'missing_data',
          searchSuggestions: [],
          sources: [],
        }
        const nextMessages = [...messages, userMessage, assistantMessage]
        setMessages(nextMessages)
        saveConversation(conversationId, normalizedQuestion, nextMessages)
        setToast('Image attached, but image analysis is not supported yet')
        return
      }

      let uploadedDocument = null
      if (activeAttachment?.kind === 'document') {
        setLoading(true)
        uploadedDocument = await uploadDocumentAttachment(activeAttachment.file)
        setToast(`${activeAttachment.file.name} added to the assistant`)

        if (!question) {
          const assistantMessage = {
            id: createId(),
            role: 'assistant',
            content: `I added "${uploadedDocument.title}" to the assistant knowledge base. You can now ask questions about that document.`,
            streaming: false,
            suggestedQuestions: [
              `Summarize ${uploadedDocument.title}`,
              `What are the key requirements in ${uploadedDocument.title}?`,
              `What should I know from ${uploadedDocument.title}?`,
            ],
            responseKind: 'answer',
            searchSuggestions: [],
            sources: [{ title: uploadedDocument.title }],
          }
          const nextMessages = [...messages, userMessage, assistantMessage]
          setMessages(nextMessages)
          saveConversation(conversationId, normalizedQuestion, nextMessages)
          return
        }
      }

      const assistantPlaceholder = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        streaming: true,
        sources: uploadedDocument ? [{ title: uploadedDocument.title }] : [],
        confidence: 0,
        searchSuggestions: [],
      }

      setMessages((prev) => [...prev, userMessage, assistantPlaceholder])
      placeholderInserted = true
      setLoading(true)

      abortControllerRef.current = new AbortController()

      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(user.token),
        },
        body: JSON.stringify({ question, language: 'en' }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`Chat request failed with status ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullAnswer = ''
      let responseMeta = {
        answer: '',
        queryId: null,
        sources: [],
        searchSuggestions: [],
        suggestedQuestions: [],
        responseKind: 'answer',
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'content') {
                fullAnswer += data.content
                setMessages((prev) => prev.map((message) => (
                  message.id === assistantMessageId
                    ? { ...message, content: fullAnswer, streaming: true }
                    : message
                )))
              } else if (data.type === 'meta') {
                responseMeta = {
                  answer: data.answer || '',
                  queryId: data.query_id || null,
                  sources: data.sources || [],
                  searchSuggestions: data.search_suggestions || [],
                  suggestedQuestions: data.suggested_questions || [],
                  responseKind: data.response_kind || 'answer',
                }
              } else if (data.type === 'done') {
                break
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (e) {
              // Skip parse errors
            }
          }
        }
      }

      const assistantMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: fullAnswer.trim() || responseMeta.answer || "I don't have sufficient data to answer that.",
        streaming: false,
        query_id: responseMeta.queryId,
        sources: responseMeta.sources,
        confidence: 0.6,
        searchSuggestions: responseMeta.searchSuggestions,
        suggestedQuestions: responseMeta.suggestedQuestions,
        responseKind: responseMeta.responseKind,
      }

      setMessages((prev) => {
        const updated = prev.map((message) => (
          message.id === assistantMessageId ? assistantMessage : message
        ))
        saveConversation(conversationId, normalizedQuestion, updated)

        return updated
      })
    } catch (error) {
      if (!placeholderInserted) {
        const assistantErrorMessage = {
          id: createId(),
          role: 'assistant',
          content: extractApiError(error, 'Sorry, I could not process that attachment.'),
          error: true,
          streaming: false,
          sources: [],
          searchSuggestions: [],
          suggestedQuestions: [],
        }
        const nextMessages = [...messages, userMessage, assistantErrorMessage]
        setMessages(nextMessages)
        saveConversation(conversationId, normalizedQuestion, nextMessages)
        return
      }

      setMessages((prev) => {
        const updated = prev.map((message) => (
          message.id === assistantMessageId
            ? {
                ...message,
                content: extractApiError(error, 'Sorry, I encountered an error.'),
                error: true,
                streaming: false,
              }
            : message
        ))
        saveConversation(conversationId, normalizedQuestion, updated)

        return updated
      })
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }

  const regenerateMessage = async (index) => {
    if (index < 1) return
    const prevUserMessage = messages[index - 1]
    if (prevUserMessage?.role !== 'user') return
    
    const question = prevUserMessage.content
    setMessages((prev) => prev.slice(0, index))
    await sendMessage(null, question)
  }

  const loadChat = (chat) => {
    setSelectedChat(chat.id)
    setMessages(chat.messages || [])
  }

  const newChat = () => {
    setSelectedChat(null)
    setMessages([])
  }

  const handleDeleteChat = (chatId) => {
    deleteFromHistory(chatId)
    if (selectedChat === chatId) {
      newChat()
    }
  }

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content)
    setToast('Copied to clipboard')
  }

  const shareCurrentChat = async () => {
    const activeChat = chatHistory.find((chat) => chat.id === selectedChat)
    const text = activeChat
      ? `${activeChat.title}\n\n${activeChat.messages.map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`).join('\n\n')}`
      : 'SmartCity Assistant conversation'

    try {
      if (navigator.share) {
        await navigator.share({ title: activeChat?.title || 'SmartCity chat', text })
      } else {
        await navigator.clipboard.writeText(text)
      }
      setToast('Chat shared')
    } catch {
      setToast('Share cancelled')
    }
  }

  const shareMessage = async (content) => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'SmartCity answer', text: content })
      } else {
        await navigator.clipboard.writeText(content)
      }
      setToast('Message shared')
    } catch {
      setToast('Share cancelled')
    }
  }

  const sendFeedback = async (message, rating) => {
    if (!message.query_id) {
      setToast('Feedback is not available for this answer yet')
      return
    }
    try {
      await axios.post('/feedback', { query_id: message.query_id, rating }, { headers: authHeaders(user.token) })
      setToast(rating === 'positive' ? 'Marked helpful' : 'Marked not helpful')
    } catch (error) {
      setToast(extractApiError(error, 'Could not save feedback'))
    }
  }

  const clearCurrentChat = () => {
    if (selectedChat) {
      deleteFromHistory(selectedChat)
    }
    setHeaderMenuOpen(false)
    newChat()
  }

  const handleMessageMenuAction = async (message, action) => {
    setMessageMenuId(null)

    if (action === 'copy') {
      copyMessage(message.content)
      return
    }

    if (action === 'share') {
      await shareMessage(message.content)
      return
    }

    if (action === 'details') {
      if (message.sources?.length) {
        setToast(`Sources: ${message.sources.map((source) => source.title).join(', ')}`)
      } else {
        setToast('No extra details for this message')
      }
    }
  }

  const filteredHistory = chatHistory.filter((chat) =>
    chat.title.toLowerCase().includes(historySearch.toLowerCase().trim())
  )

  return (
    <div className="flex h-screen bg-[#000000] text-white">
      <aside className={`${sidebarOpen ? 'w-[268px]' : 'w-0'} flex flex-col overflow-hidden bg-[#171717] transition-all duration-300`}>
        <div className="flex items-center px-5 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
              <Zap className="h-4 w-4" />
            </div>
            <div className="text-[1.05rem] font-semibold tracking-tight text-white">SmartCity</div>
          </div>
        </div>

        <div className="space-y-1 px-3">
          <button onClick={newChat} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[14px] text-white transition hover:bg-white/5">
            <Plus className="h-5 w-5" />
            New chat
          </button>
          <button onClick={() => setShowHistorySearch((value) => !value)} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[14px] text-white transition hover:bg-white/5">
            <Search className="h-5 w-5" />
            Search chats
          </button>
        </div>

        {showHistorySearch && (
          <div className="px-3 pt-3">
            <input
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="Search conversations"
              className="w-full rounded-xl bg-[#2a2a2a] px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
            />
          </div>
        )}

        <div className="mt-8 flex-1 overflow-y-auto px-3">
          <div className="mb-3 px-2 text-[12px] font-medium uppercase tracking-[0.08em] text-white/70">Recents</div>
          <div className="space-y-1">
            {filteredHistory.length === 0 ? (
              <p className="px-2 text-sm text-zinc-500">No chats yet</p>
            ) : (
              filteredHistory.slice(0, 20).map((chat) => (
                <div
                  key={chat.id}
                  className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-[13.5px] transition ${
                    selectedChat === chat.id
                      ? 'bg-[#2a2a2a] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
                      : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {selectedChat === chat.id && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-white/80" />
                  )}
                  <button onClick={() => loadChat(chat)} className="flex-1 truncate text-left">{chat.title}</button>
                  <button onClick={() => handleDeleteChat(chat.id)} className="opacity-0 transition group-hover:opacity-100 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-auto border-t border-white/8 px-4 py-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-sm font-semibold text-white">
              {(user.name || user.email || 'S').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium text-white">{user.name || 'SmartCity user'}</div>
              <div className="truncate text-xs text-zinc-500">{user.email}</div>
            </div>
            <button onClick={() => { logout(); navigate('/') }} className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col bg-[#000000]">
        <header className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-md p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white">
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-white">
            <button onClick={shareCurrentChat} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-white/5">
              <Share2 className="h-4 w-4" />
              Share
            </button>
            <div className="relative">
              <button onClick={() => setHeaderMenuOpen((value) => !value)} className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white">
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {headerMenuOpen && (
                <div className="absolute right-0 top-12 z-20 min-w-[180px] rounded-xl bg-[#242424] p-2 shadow-2xl">
                  <button onClick={newChat} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/5">
                    <Plus className="h-4 w-4" />
                    New chat
                  </button>
                  <button onClick={clearCurrentChat} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/5">
                    <Trash2 className="h-4 w-4" />
                    Clear current chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center">
              <div className="mb-10 text-center">
                <h1 className="text-[1.7rem] font-semibold tracking-tight text-white">How can I help?</h1>
                <p className="mt-3 text-sm text-zinc-500">Ask about city services, permits, utilities, transport, or public information.</p>
              </div>
              <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
                {['How do I register my business?', 'Pay electricity bill', 'Report broken streetlight', 'Bus routes to Mercato'].map((prompt) => (
                  <button key={prompt} onClick={(e) => sendMessage(e, prompt)} className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4 text-left text-sm text-zinc-200 transition hover:bg-white/[0.06]">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-14">
              {messages.map((message, index) => (
                <div key={message.id || index} className={`${message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}>
                  {message.role === 'assistant' ? (
                    <div className="group flex max-w-[48rem] gap-4">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-white">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="pt-0.5">
                        {message.streaming ? (
                          <div className="flex items-center gap-2 py-2">
                            <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
                            <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-400 [animation-delay:120ms]" />
                            <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-400 [animation-delay:240ms]" />
                          </div>
                        ) : message.error ? (
                          <p className="max-w-3xl text-[15px] leading-8 text-red-400">{message.content}</p>
                        ) : (
                          <>
                            <div className="max-w-3xl">
                              <MarkdownContent content={message.content} />
                            </div>
                            <div className="mt-4 flex items-center gap-1 text-zinc-400">
                              <button onClick={() => copyMessage(message.content)} className="rounded-md p-2 transition hover:bg-white/5 hover:text-white">
                                <Copy className="h-4 w-4" />
                              </button>
                              <button onClick={() => sendFeedback(message, 'positive')} className="rounded-md p-2 transition hover:bg-white/5 hover:text-white">
                                <ThumbsUp className="h-4 w-4" />
                              </button>
                              <button onClick={() => sendFeedback(message, 'negative')} className="rounded-md p-2 transition hover:bg-white/5 hover:text-white">
                                <ThumbsDown className="h-4 w-4" />
                              </button>
                              <button onClick={() => shareMessage(message.content)} className="rounded-md p-2 transition hover:bg-white/5 hover:text-white">
                                <Share2 className="h-4 w-4" />
                              </button>
                              {index > 0 && index === messages.length - 1 && (
                                <button onClick={() => regenerateMessage(index)} className="rounded-md p-2 transition hover:bg-white/5 hover:text-white">
                                  <RefreshCw className="h-4 w-4" />
                                </button>
                              )}
                              <div className="relative">
                                <button onClick={() => setMessageMenuId((current) => current === message.id ? null : message.id)} className="rounded-md p-2 transition hover:bg-white/5 hover:text-white">
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                                {messageMenuId === message.id && (
                                  <div className="absolute right-0 top-10 z-20 min-w-[150px] rounded-xl bg-[#1f1f1f] p-2 shadow-2xl">
                                    <button onClick={() => handleMessageMenuAction(message, 'copy')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/5">
                                      <Copy className="h-4 w-4" />
                                      Copy text
                                    </button>
                                    <button onClick={() => handleMessageMenuAction(message, 'share')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/5">
                                      <Share2 className="h-4 w-4" />
                                      Share
                                    </button>
                                    <button onClick={() => handleMessageMenuAction(message, 'details')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/5">
                                      <Bell className="h-4 w-4" />
                                      Details
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {message.sources?.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {message.sources.map((source, i) => (
                                  <span key={i} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300">
                                    {source.title}
                                  </span>
                                ))}
                              </div>
                            )}
                            {message.suggestedQuestions?.length > 0 && (
                              <div className="mt-5 flex flex-wrap gap-2">
                                {message.suggestedQuestions.map((suggestion, i) => (
                                  <button
                                    key={`${suggestion}-${i}`}
                                    type="button"
                                    onClick={(e) => sendMessage(e, suggestion)}
                                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-200 transition hover:bg-white/[0.08]"
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            )}
                            {message.searchSuggestions?.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {message.searchSuggestions.map((item, i) => (
                                  <a
                                    key={`${item.label}-${i}`}
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-full border border-white/10 px-3 py-2 text-xs text-zinc-200 transition hover:bg-white/[0.08]"
                                  >
                                    {item.label}
                                  </a>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4">
                      <div className="rounded-[22px] bg-[#1f1f1f] px-5 py-3 text-[15px] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                        {message.content}
                      </div>
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-white">
                        <User className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-4">
          <div className="mx-auto max-w-4xl">
            <form onSubmit={sendMessage} className="rounded-[28px] bg-[#1f1f1f] px-4 py-3 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.json,.csv,.html,.htm,image/*"
                onChange={handleAttachmentPick}
                className="hidden"
              />
              {attachment && (
                <div className="mb-3 flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-zinc-200">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white">
                      {attachment.kind === 'image' ? <Image className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-white">{attachment.file.name}</div>
                      <div className="text-xs text-zinc-500">
                        {attachment.kind === 'image' ? 'Image attached. Analysis is not available yet.' : 'Document will be added to the assistant before your next message.'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
                >
                  <Plus className="h-5 w-5" />
                </button>
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything" className="flex-1 bg-transparent py-2 text-[15px] text-white placeholder-zinc-500 focus:outline-none" disabled={loading} />
                <div className="hidden items-center gap-2 text-sm text-zinc-400 md:flex">
                  <span>Instant</span>
                </div>
                <button type="submit" disabled={(!input.trim() && !attachment) || loading} className="rounded-full bg-white p-3 text-black transition hover:bg-zinc-200 disabled:opacity-50">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
            <p className="mt-3 text-center text-xs text-zinc-500">
              SmartCity can make mistakes. Check important information carefully.
            </p>
          </div>
        </div>
        {toast && (
          <div className="pointer-events-none fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-[#2a2a2a] px-4 py-2 text-sm text-white shadow-2xl">
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}

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
