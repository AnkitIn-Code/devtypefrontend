import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileCode2, Cpu, BarChart3, Users, Trophy, Medal,
  User, Settings, ChevronLeft, ChevronRight, Code2, Bell, Search, LogOut, Zap
} from 'lucide-react';
import { useAuthStore } from '@store/auth.store';
import { ROUTES } from '@constants';
import { Avatar } from '@components/common/Badge';
import { cn } from '@utils/format.utils';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: ROUTES.DASHBOARD },
  { icon: FileCode2, label: 'My Templates', href: ROUTES.TEMPLATES },
  { icon: Cpu, label: 'AI Generator', href: ROUTES.AI_TEMPLATE },
  { icon: BarChart3, label: 'Reports', href: ROUTES.REPORTS },
  { icon: Users, label: 'Multiplayer', href: ROUTES.MULTIPLAYER },
  { icon: Medal, label: 'Achievements', href: ROUTES.ACHIEVEMENTS },
  { icon: Trophy, label: 'Leaderboard', href: ROUTES.LEADERBOARD },
  { icon: User, label: 'Profile', href: ROUTES.PROFILE },
  { icon: Settings, label: 'Settings', href: ROUTES.SETTINGS },
];

const Sidebar = ({ collapsed, onToggle }) => {
  const { pathname } = useLocation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 240 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-full bg-surface/80 backdrop-blur-xl border-r border-border z-40 flex flex-col overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 h-16 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Code2 size={16} className="text-zinc-900" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="font-bold text-sm text-text-primary whitespace-nowrap"
            >
              Code<span className="text-primary">Type</span> AI
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} to={item.href}>
              <motion.div
                whileHover={{ x: collapsed ? 0 : 3 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-2/50'
                )}
              >
                <item.icon size={18} className="shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User + Collapse */}
      <div className="p-3 border-t border-border space-y-2">
        {/* Quick Practice Button */}
        <Link to={ROUTES.TYPING}>
          <div className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20',
            'text-primary hover:bg-primary/20 transition-all cursor-pointer',
            collapsed && 'justify-center'
          )}>
            <Zap size={16} className="shrink-0" />
            {!collapsed && <span className="text-sm font-semibold">Practice Now</span>}
          </div>
        </Link>

        {/* User Info */}
        {user && (
          <div className={cn('flex items-center gap-3 px-2 py-2', collapsed && 'justify-center')}>
            <Avatar name={user.name} size="sm" className="shrink-0" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
                <p className="text-xs text-muted truncate">{user.email}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors"
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={onToggle}
          className={cn(
            'flex items-center justify-center w-full py-2 rounded-xl text-muted',
            'hover:text-text-primary hover:bg-surface-2/50 transition-colors'
          )}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </motion.aside>
  );
};

const TopBar = ({ sidebarWidth }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <header
      style={{ left: sidebarWidth }}
      className="fixed top-0 right-0 h-16 bg-background/80 backdrop-blur-xl border-b border-border z-30 flex items-center px-6 gap-4"
    >
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            placeholder="Search templates, reports..."
            className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* XP Badge */}
        {user && (
          <div className="hidden sm:flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5">
            <Zap size={12} className="text-primary" />
            <span className="text-xs font-semibold text-primary">{user.xp?.toLocaleString() || 0} XP</span>
          </div>
        )}

        {/* Notifications */}
        <button className="relative p-2.5 rounded-xl hover:bg-surface-2 text-muted hover:text-text-primary transition-colors">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full" />
        </button>

        {/* Avatar */}
        {user && (
          <button onClick={() => navigate(ROUTES.PROFILE)}>
            <Avatar name={user.name} size="sm" />
          </button>
        )}
      </div>
    </header>
  );
};

export const AppLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 68 : 240;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <TopBar sidebarWidth={sidebarWidth} />
      <main
        style={{ marginLeft: sidebarWidth }}
        className="min-h-screen pt-16 transition-all duration-300"
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
