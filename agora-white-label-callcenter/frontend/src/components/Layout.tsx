import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { Settings, PlusCircle, Radio, PhoneCall, Bot, History } from 'lucide-react'
import agoraLogo from '../assets/agora-logo-2.webp'
import { LANGUAGES, setLang, type Lang } from '../i18n'

// Each nav item has its own Google-style accent color
const NAV_ICON_COLOR: Record<string, string> = {
  '/':             'text-gblue-500',
  '/phone-numbers':'text-ggreen-500',
  '/agents':       'text-gyellow-600',
  '/call-history': 'text-gpurple-500',
  '/surveys/new':  'text-gblue-500',
  '/settings':     'text-ink-tertiary',
}

export function Layout() {
  const { t, i18n } = useTranslation()

  const NAV = [
    { to: '/',             label: t('app_nav.campaigns'),    icon: Radio,       end: true },
    { to: '/phone-numbers',label: t('app_nav.phone_numbers'),icon: PhoneCall },
    { to: '/agents',       label: t('app_nav.agents'),       icon: Bot },
    { to: '/call-history', label: t('app_nav.call_history'), icon: History },
    { to: '/surveys/new',  label: t('nav.new_campaign'),     icon: PlusCircle },
    { to: '/settings',     label: t('nav.settings'),         icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-surface">
      {/* Sidebar — Google style: white, 256px */}
      <aside className="w-64 bg-white border-r border-border flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-4 py-3 flex items-center gap-3 border-b border-border-light">
          <img src={agoraLogo} alt="Agora" className="h-7 w-auto object-contain" />
          <span className="text-xs font-medium text-ink-tertiary italic leading-tight">
            {t('nav.subtitle')}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-full text-sm transition-colors',
                  isActive
                    ? 'bg-gblue-50 text-gblue-500 font-medium'
                    : 'text-ink-secondary hover:bg-surface-hover'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2.25 : 1.75}
                    className={isActive ? 'text-gblue-500' : NAV_ICON_COLOR[to] ?? 'text-ink-tertiary'}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Language switcher */}
        <div className="px-3 py-3 border-t border-border-light">
          <select
            value={i18n.language}
            onChange={e => setLang(e.target.value as Lang)}
            className="w-full px-3 py-1.5 rounded-lg text-sm text-ink-secondary bg-surface border border-border focus:outline-none focus:border-blue-400 cursor-pointer"
          >
            {LANGUAGES.map(({ code, flag, label }) => (
              <option key={code} value={code}>
                {flag} {label}
              </option>
            ))}
          </select>
        </div>

        <div className="px-5 py-2 border-t border-border-light">
          <p className="text-[11px] text-ink-disabled">v0.1.0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-surface">
        <Outlet />
      </main>
    </div>
  )
}
