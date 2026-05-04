import { Link } from 'react-router-dom'
import { ArrowRight, Check, ChevronDown, FileText, MessageCircle, Search, Shield, Sparkles, Zap } from 'lucide-react'

import { Footer, Header } from '../components/layout/SiteChrome'
import cityHubHero from '../assets/city-hub-hero.svg'

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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      <section className="relative flex min-h-[100vh] flex-col justify-start overflow-hidden px-6 pt-14">
        <div className="relative z-10 mx-auto w-full max-w-[1560px]">
          <div className="grid items-center justify-center gap-12 pt-16 lg:min-h-[calc(100vh-6rem)] lg:grid-cols-2 lg:gap-8 lg:pt-0">
            <div className="max-w-[560px] mx-auto text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#141414] px-3 py-1.5 text-xs font-medium text-zinc-300">
                <Sparkles className="h-3 w-3" />
                Addis Ababa Smart-City Assistant
              </div>

              <h1 className="text-[2.8rem] font-semibold leading-[0.92] tracking-[-0.06em] text-white md:text-[3.5rem] lg:text-[4.5rem]">
                Your Smart City
                <br />
                <span className="bg-gradient-to-r from-zinc-200 to-zinc-500 bg-clip-text text-transparent">
                  Guide
                </span>
              </h1>

              <p className="mt-4 max-w-[520px] text-sm leading-7 text-zinc-400">
                Get instant answers about city services, permits, bill payments,
                transport, emergency contacts, and more for Addis Ababa residents.
              </p>

              <div className="mt-6 flex max-w-[540px] items-center gap-3 rounded-[1.1rem] bg-[#1a1a1a] px-4 py-3 text-zinc-500">
                <Search className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="text-left text-sm text-zinc-500">
                  Ask a question...
                </span>
              </div>
            </div>

            <div className="relative flex justify-center">
              <div className="w-full max-w-[800px] overflow-hidden bg-black">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="aspect-[1.18/1] h-auto w-full object-cover"
                >
                  <source src="/hero.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-pulse">
          <ChevronDown className="h-5 w-5 text-zinc-500" />
        </div>
      </section>

      <section id="features" className="px-6 lg:px-8 py-24">
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

      <section id="services" className="px-6 lg:px-8 py-24">
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
            we&apos;re here to help 24/7.
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
