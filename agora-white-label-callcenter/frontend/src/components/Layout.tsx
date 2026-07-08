import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { PlusCircle, Radio, PhoneCall, Bot, History, PhoneIncoming, BarChart2, LogOut, Settings, UserCircle2, FolderInput, ChevronDown } from 'lucide-react'
import agoraLogo from '../assets/agora-logo-2.webp'
import twFlag from '../assets/tw-flag.png'
import { LANGUAGES, setLang, type Lang } from '../i18n'
import { logout } from '../lib/auth'

const UNLOCK_CLICKS = 5
const SESSION_KEY = 'import_unlocked'

export function Layout() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [logoClicks, setLogoClicks] = useState(0)
  const [langOpen, setLangOpen] = useState(false)
  const currentLang = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0]
  const [importUnlocked, setImportUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === '1'
  )

  function handleLogoClick() {
    if (importUnlocked) return
    const next = logoClicks + 1
    setLogoClicks(next)
    if (next >= UNLOCK_CLICKS) {
      setImportUnlocked(true)
      sessionStorage.setItem(SESSION_KEY, '1')
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY)
    logout()
    navigate('/login', { replace: true })
  }

  const NAV = [
    { to: '/dashboard',       label: t('app_nav.dashboard'),       icon: BarChart2 },
    { to: '/surveys/new',     label: t('nav.new_campaign'),        icon: PlusCircle },
    { to: '/campaigns',       label: t('app_nav.campaigns'),       icon: Radio },
    { to: '/inbound-routing', label: t('app_nav.inbound_routing'), icon: PhoneIncoming },
    { to: '/phone-numbers',   label: t('app_nav.phone_numbers'),   icon: PhoneCall },
    { to: '/agents',          label: t('app_nav.agents'),          icon: Bot },
    { to: '/call-history',    label: t('app_nav.call_history'),    icon: History },
    ...(importUnlocked ? [{ to: '/import', label: t('app_nav.import'), icon: FolderInput }] : []),
  ]

  return (
    <div className="flex h-screen bg-[#EEF3FA] relative overflow-hidden">
      {/* Ambient glow bubbles */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(79,172,254,0.20) 0%, rgba(0,242,254,0) 70%)', filter: 'blur(60px)' }} />
      <div className="pointer-events-none absolute bottom-0 right-1/3 w-[640px] h-[640px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, rgba(99,102,241,0) 70%)', filter: 'blur(80px)' }} />
      <div className="pointer-events-none absolute top-1/2 -right-20 w-[420px] h-[420px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(0,242,254,0.12) 0%, rgba(0,242,254,0) 70%)', filter: 'blur(70px)' }} />

      {/* Sidebar */}
      <aside className="w-56 glass-sidebar flex flex-col flex-shrink-0 relative z-10">
        {/* Logo */}
        <div
          className="px-3 py-3 border-b border-white/40 cursor-default select-none"
          onClick={handleLogoClick}
        >
          <img src={agoraLogo} alt="Agora" className="w-full h-auto object-contain" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-700 font-medium'
                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    strokeWidth={isActive ? 2.25 : 1.75}
                    className={isActive ? 'text-indigo-600' : 'text-gray-400'}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Language switcher */}
        <div className="px-3 py-3 border-t border-white/40">
          {langOpen && (
            <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
          )}
          <div className="relative z-50">
            <button
              onClick={() => setLangOpen(o => !o)}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-slate-600 bg-white/50 hover:bg-white/80 border border-white/60 transition-colors cursor-pointer"
            >
              {currentLang.code === 'zh'
                ? <img src={twFlag} alt="TW" className="w-4 h-auto" />
                : <span className="text-sm leading-none">{currentLang.flag}</span>
              }
              <span className="flex-1 text-left">{currentLang.label}</span>
              <ChevronDown size={12} className="text-slate-400" />
            </button>
            {langOpen && (
              <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {LANGUAGES.map(({ code, flag, label }) => (
                  <button
                    key={code}
                    onClick={() => { setLang(code as Lang); setLangOpen(false) }}
                    className={[
                      'flex items-center gap-2 w-full px-2.5 py-1.5 text-xs hover:bg-gray-50',
                      i18n.language === code ? 'text-indigo-600 font-medium bg-indigo-50' : 'text-slate-600',
                    ].join(' ')}
                  >
                    {code === 'zh'
                      ? <img src={twFlag} alt="TW" className="w-4 h-auto" />
                      : <span className="text-sm leading-none">{flag}</span>
                    }
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User profile */}
        <div className="px-3 py-3 border-t border-white/40">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-white/40">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <UserCircle2 size={15} className="text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">Admin</p>
              <p className="text-[10px] text-gray-400 truncate">Admin</p>
            </div>
            <NavLink
              to="/settings"
              title={t('nav.settings')}
              className={({ isActive }) =>
                cn(
                  'p-1 rounded-lg transition-colors',
                  isActive ? 'text-indigo-600 bg-indigo-500/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                )
              }
            >
              <Settings size={14} />
            </NavLink>
            <button
              onClick={handleLogout}
              title={t('login.logout')}
              className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto relative z-10">
        <Outlet />
      </main>
    </div>
  )
}
