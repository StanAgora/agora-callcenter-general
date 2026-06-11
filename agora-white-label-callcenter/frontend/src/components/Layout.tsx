import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { PlusCircle, Radio, PhoneCall, Bot, History, PhoneIncoming, BarChart2, LogOut, Settings, UserCircle2 } from 'lucide-react'
import agoraLogo from '../assets/agora-logo-2.webp'
import { LANGUAGES, setLang, type Lang } from '../i18n'
import { logout } from '../lib/auth'

export function Layout() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const NAV = [
    { to: '/dashboard',       label: 'Dashboard',                icon: BarChart2 },
    { to: '/surveys/new',     label: t('nav.new_campaign'),      icon: PlusCircle },
    { to: '/campaigns',       label: t('app_nav.campaigns'),     icon: Radio },
    { to: '/inbound-routing', label: 'Inbound Routing',          icon: PhoneIncoming },
    { to: '/phone-numbers',   label: t('app_nav.phone_numbers'), icon: PhoneCall },
    { to: '/agents',          label: t('app_nav.agents'),        icon: Bot },
    { to: '/call-history',    label: t('app_nav.call_history'),  icon: History },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-4 h-14 flex items-center gap-2.5 border-b border-gray-100">
          <img src={agoraLogo} alt="Agora" className="h-6 w-auto object-contain" />
          <span className="text-[11px] font-medium text-gray-400 tracking-wide">
            {t('nav.subtitle')}
          </span>
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
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
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
        <div className="px-3 py-3 border-t border-gray-100">
          <select
            value={i18n.language}
            onChange={e => setLang(e.target.value as Lang)}
            className="w-full px-3 py-1.5 rounded-lg text-xs text-gray-600 bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
          >
            {LANGUAGES.map(({ code, flag, label }) => (
              <option key={code} value={code}>
                {flag} {label}
              </option>
            ))}
          </select>
        </div>

        {/* User profile */}
        <div className="px-3 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-gray-50">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <UserCircle2 size={15} className="text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">agora</p>
              <p className="text-[10px] text-gray-400 truncate">Admin</p>
            </div>
            <NavLink
              to="/settings"
              title={t('nav.settings')}
              className={({ isActive }) =>
                cn(
                  'p-1 rounded-lg transition-colors',
                  isActive ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
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
      <main className="flex-1 overflow-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
