import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

export const footerLinks = [
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

export function Brand({ compact = false }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
        <Zap className="h-5 w-5" />
      </div>
      {!compact && <span className="text-lg font-semibold text-white">SmartCity</span>}
    </Link>
  )
}

export function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all ${scrolled ? 'bg-black/80 backdrop-blur-md border-b border-white/10' : ''}`}>
      <div className="mx-auto flex h-14 max-w-[1560px] items-center justify-between px-6 lg:px-10">
        <Brand compact />
        <nav className="hidden items-center gap-6 md:flex">
          <a href="#features" className="text-sm font-medium text-zinc-500 transition hover:text-white">Product</a>
          <a href="#services" className="text-sm font-medium text-zinc-500 transition hover:text-white">Services</a>
          <a href="#about" className="text-sm font-medium text-zinc-500 transition hover:text-white">About</a>
          <a href="#support" className="text-sm font-medium text-zinc-500 transition hover:text-white">Support</a>
          <a href="#features" className="text-sm font-medium text-zinc-500 transition hover:text-white">Emergency</a>
          <a href="#features" className="text-sm font-medium text-zinc-500 transition hover:text-white">Transport</a>
          <a href="#features" className="text-sm font-medium text-zinc-500 transition hover:text-white">Billing</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-zinc-300 transition hover:text-white">Log in</Link>
          <Link to="/signup" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200">
            Sign up
          </Link>
        </div>
      </div>
    </header>
  )
}

export function Footer() {
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
          <p className="text-sm text-zinc-600">(c) 2024 SmartCity. All rights reserved.</p>
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
