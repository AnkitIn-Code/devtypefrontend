import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileCode2, Cpu, BarChart3, Users, Trophy, Medal,
  User, Settings, Code2, Bell, Search, LogOut, Zap, Menu, X, ChevronDown,
  Sun, Moon
} from 'lucide-react';
import { useAuthStore } from '@store/auth.store';
import { useSettingsStore } from '@store/settings.store';
import { ROUTES } from '@constants';
import { Avatar } from '@components/common/Badge';
import { cn } from '@utils/format.utils';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: ROUTES.DASHBOARD },
  { icon: FileCode2, label: 'Templates', href: ROUTES.TEMPLATES },
  { icon: Cpu, label: 'AI Gen', href: ROUTES.AI_TEMPLATE },
  { icon: BarChart3, label: 'Reports', href: ROUTES.REPORTS },
  { icon: Users, label: 'Multiplayer', href: ROUTES.MULTIPLAYER },
  { icon: Trophy, label: 'Leaderboard', href: ROUTES.LEADERBOARD },
  { icon: Medal, label: 'Achievements', href: ROUTES.ACHIEVEMENTS },
];

const USER_NAV = [
  { icon: User, label: 'Profile', href: ROUTES.PROFILE },
  { icon: Settings, label: 'Settings', href: ROUTES.SETTINGS },
];

const Navbar = () => {
  const { pathname } = useLocation();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useSettingsStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isDark = theme === 'dark';

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
    setUserMenuOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-16">
        {/* Backdrop blur bar */}
        <div className="absolute inset-0 backdrop-blur-2xl border-b transition-colors duration-300"
          style={{ background: 'var(--nav-bg)', borderColor: 'var(--nav-border)' }} />

        <div className="relative max-w-screen-2xl mx-auto h-full flex items-center px-4 sm:px-6 gap-4">
          {/* Logo */}
          <Link to={ROUTES.DASHBOARD} className="flex items-center gap-2.5 shrink-0 group mr-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:shadow-violet-500/50 transition-all">
              <Code2 size={15} className="text-white" />
            </div>
            <span className="font-black text-base tracking-tight hidden sm:block" style={{ color: 'var(--text-primary)' }}>
              Code<span style={{ color: 'var(--accent-light)' }}>Type</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 flex-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link key={item.href} to={item.href}>
                  <motion.div
                    whileHover={{ y: -1 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                    style={isActive ? {
                      background: 'var(--accent-dim)',
                      color: 'var(--accent-light)',
                      border: '1px solid var(--accent-border)'
                    } : { color: 'var(--text-secondary)' }}
                  >
                    <item.icon size={15} />
                    {item.label}
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Theme Toggle */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="relative p-2 rounded-xl transition-all duration-300 overflow-hidden"
              style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}
            >
              <AnimatePresence mode="wait">
                {isDark ? (
                  <motion.span
                    key="sun"
                    initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.25 }}
                    className="flex"
                  >
                    <Sun size={16} style={{ color: 'var(--accent-light)' }} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="moon"
                    initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.25 }}
                    className="flex"
                  >
                    <Moon size={16} style={{ color: 'var(--accent-light)' }} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Practice CTA */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(ROUTES.TYPING)}
              className="hidden md:flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-sm font-semibold transition-all"
              style={{ background: 'linear-gradient(135deg, var(--accent), #4f46e5)', boxShadow: '0 4px 14px rgba(124,58,237,0.25)' }}
            >
              <Zap size={14} /> Practice
            </motion.button>

            {/* XP Badge */}
            {user && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
                <Zap size={12} style={{ color: 'var(--accent-light)' }} />
                <span className="text-xs font-bold" style={{ color: 'var(--accent-light)' }}>{user.xp?.toLocaleString() || 0} XP</span>
              </div>
            )}

            {/* Notifications */}
            <button className="relative p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-light)' }} />
            </button>

            {/* User Menu */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <Avatar name={user.name} size="sm" />
                  <ChevronDown size={14} className={cn('text-zinc-500 transition-transform', userMenuOpen && 'rotate-180')} />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-52 rounded-2xl shadow-2xl overflow-hidden"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                    >
                      {/* User info */}
                      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                      </div>

                      <div className="p-2 space-y-0.5">
                        {USER_NAV.map(item => (
                          <Link key={item.href} to={item.href} onClick={() => setUserMenuOpen(false)}>
                            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
                              style={{ color: 'var(--text-secondary)' }}
                              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--accent-dim)'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
                            >
                              <item.icon size={15} />
                              {item.label}
                            </div>
                          </Link>
                        ))}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut size={15} />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed left-0 top-0 bottom-0 w-72 z-50 lg:hidden flex flex-col"
              style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <Code2 size={15} className="text-white" />
                </div>
                <span className="font-black" style={{ color: 'var(--text-primary)' }}>Code<span style={{ color: 'var(--accent-light)' }}>Type</span></span>
                <button onClick={() => setMobileOpen(false)} className="ml-auto" style={{ color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)}>
                      <div className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                        isActive
                          ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      )}>
                        <item.icon size={17} />
                        {item.label}
                      </div>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-zinc-800">
                <button
                  onClick={() => { navigate(ROUTES.TYPING); setMobileOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold"
                >
                  <Zap size={15} /> Start Practice
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Click outside user menu */}
      {userMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
      )}
    </>
  );
};

export const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', transition: 'background 0.3s ease, color 0.3s ease' }}>
      <Navbar />
      <main className="pt-16 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
