import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'

import { useAuth } from '../auth/AuthContext'

export default function AuthPage() {
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
      } else {
        setError(result.error)
      }
    }

    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black">
              <Zap className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold text-white">SmartCity</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-white/20 bg-zinc-900/50 p-8">
          <div className="mb-6 flex rounded-xl bg-white/5 p-1">
            <button type="button" onClick={() => navigate('/login')} className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${isLogin ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>
              Sign in
            </button>
            <button type="button" onClick={() => navigate('/signup')} className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${!isLogin ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>
              Create account
            </button>
          </div>

          <h1 className="text-2xl font-bold">{isLogin ? 'Welcome back' : 'Get started'}</h1>
          <p className="mt-2 text-sm text-zinc-400">{isLogin ? 'Enter your details to continue' : 'Create an account to start using SmartCity'}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-zinc-300">Full name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-white focus:outline-none" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-zinc-300">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-white focus:outline-none" />
            </div>

            {notice && <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">{notice}</div>}
            {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

            <button type="submit" disabled={submitting} className="w-full rounded-lg bg-white py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50">
              {submitting ? 'Please wait...' : isLogin ? 'Continue' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link to="/" className="text-white hover:underline">Back to home</Link>
        </p>
      </div>
    </div>
  )
}
