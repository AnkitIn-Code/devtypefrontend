import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileCode2, Cpu, BarChart3, Users, Trophy, Medal,
  User, Settings, Code2, Bell, Search, LogOut, Zap, Menu, X, ChevronDown,
  Sun, Moon, ShieldAlert
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@websocket/useSocket';
import { WS_EVENTS } from '@websocket/events';
import toast from 'react-hot-toast';
import { socialApi } from '@api/social.api';
import { useAuthStore } from '@store/auth.store';
import { useSettingsStore } from '@store/settings.store';
import { ROUTES } from '@constants';
import { Avatar } from '@components/common/Badge';
import { AIChatDrawer } from '@components/common/AIChatDrawer';
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

// ─── Notifications & Friend Requests Dropdown Component ─────────────────────
const NotificationsDropdown = () => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('requests');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, isAuthenticated, isGuest } = useAuthStore();

  // Load Pending Friend Requests from PostgreSQL DB
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['pending-requests'],
    queryFn: () => socialApi.getPendingRequests(),
    select: d => d.data || [],
    enabled: !!user && isAuthenticated && !isGuest,
    refetchInterval: 20000,
    retry: false,
  });

  // Friend Request Mutations
  const acceptMutation = useMutation({
    mutationFn: (id) => socialApi.acceptFriendRequest(id),
    onSuccess: (_, id) => {
      const req = pendingRequests.find(r => r.id === id);
      toast.success(`Now connected with ${req?.username || 'user'}! 🤝`);
      queryClient.invalidateQueries(['pending-requests']);
      queryClient.invalidateQueries(['friends']);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to accept request'),
  });

  const declineMutation = useMutation({
    mutationFn: (id) => socialApi.declineFriendRequest(id),
    onSuccess: () => {
      toast('Request declined', { icon: '👋' });
      queryClient.invalidateQueries(['pending-requests']);
    },
  });

  const totalBadges = pendingRequests.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl transition-all duration-200 border border-transparent hover:border-border/40 hover:bg-surface-2/60"
        style={{ color: 'var(--text-muted)' }}
        title="Notifications & Friend Requests"
      >
        <Bell size={17} />
        {totalBadges > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center animate-pulse shadow-md">
            {totalBadges}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl overflow-hidden z-50 p-4 space-y-3"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              }}
            >
              {/* Dropdown Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border/30">
                <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Bell size={16} className="text-primary" /> Notifications
                </h4>
                <div className="flex items-center gap-1 bg-surface-2 p-0.5 rounded-lg border border-border/40 text-[11px]">
                  <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                      activeTab === 'requests' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-text-primary'
                    }`}
                  >
                    Requests ({pendingRequests.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                      activeTab === 'activity' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-text-primary'
                    }`}
                  >
                    Activity
                  </button>
                </div>
              </div>

              {/* Tab 1: Friend Requests */}
              {activeTab === 'requests' && (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {pendingRequests.length > 0 ? (
                    pendingRequests.map((r) => (
                      <div
                        key={r.id}
                        className="p-2.5 rounded-xl bg-surface-2/50 border border-border/40 flex items-center justify-between gap-3 hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={r.username} url={r.avatarUrl} size="sm" />
                          <div className="min-w-0">
                            <p
                              onClick={() => { navigate(`/profile/${r.username}`); setOpen(false); }}
                              className="text-xs font-bold text-text-primary hover:text-primary cursor-pointer truncate"
                            >
                              {r.username}
                            </p>
                            <p className="text-[10px] text-muted">Sent you a friend request</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => acceptMutation.mutate(r.id)}
                            disabled={acceptMutation.isPending}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/30 transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => declineMutation.mutate(r.id)}
                            disabled={declineMutation.isPending}
                            className="px-2 py-1 rounded-lg bg-surface-2 border border-border/40 text-muted text-[11px] hover:text-text-primary transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-muted text-xs border border-dashed border-border/40 rounded-xl">
                      No pending friend requests.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Activity Alerts */}
              {activeTab === 'activity' && (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  <div className="p-2.5 rounded-xl bg-surface-2/40 border border-border/40 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0">
                      ⚡
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-text-primary">Welcome to DevType!</p>
                      <p className="text-[10px] text-muted">Complete daily challenges to earn XP and level up.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[11px]">
                <button
                  onClick={() => { navigate(ROUTES.PROFILE); setOpen(false); }}
                  className="text-primary hover:underline font-bold flex items-center gap-1"
                >
                  <Users size={12} /> Manage Connected Friends
                </button>
                <span className="text-muted">Database Synced ✓</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

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
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 flex-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link key={item.href} to={item.href} className="shrink-0">
                  <motion.div
                    whileHover={{ y: -1 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[13.5px] font-semibold whitespace-nowrap transition-all duration-200"
                    style={isActive ? {
                      background: 'var(--accent-dim)',
                      color: 'var(--accent-light)',
                      border: '1px solid var(--accent-border)'
                    } : { color: 'var(--text-secondary)' }}
                  >
                    <item.icon size={15} />
                    <span>{item.label}</span>
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
              onClick={() => navigate(ROUTES.PRACTICE)}
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

            {/* Notifications Dropdown (Synced with PostgreSQL Database) */}
            <NotificationsDropdown />

            {/* User Menu */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <Avatar name={user.username || user.name} src={user.avatarUrl} size="sm" />
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
                        {user?.role === 'ADMIN' && (
                          <Link to={ROUTES.ADMIN_SESSIONS} onClick={() => setUserMenuOpen(false)}>
                            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors">
                              <ShieldAlert size={15} />
                              Admin Audit
                            </div>
                          </Link>
                        )}
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

// ─── Global WS Event Listener Hook ───────────────────────────────────────────
// Lives in AppLayout so it is mounted for the entire authenticated session.
// Handles LEADERBOARD_UPDATE (invalidates cached leaderboard queries) and
// NOTIFICATION (shows a toast with optional icon + message).
const useGlobalWsListeners = () => {
  const queryClient = useQueryClient();
  const { on, off } = useSocket();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return; // Don't attach listeners for unauthenticated guests

    const handleLeaderboardUpdate = () => {
      // Invalidate all leaderboard-related queries so the page auto-refetches
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    };

    const handleNotification = (data) => {
      // data shape from backend: { message: string, icon?: string, type?: string }
      const message = data?.message || 'You have a new notification';
      const icon = data?.icon || '🔔';
      const type = data?.type;

      if (type === 'achievement') {
        toast(`${icon} ${message}`, {
          duration: 5000,
          style: {
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            border: '1px solid var(--accent-border)',
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif',
          },
        });
      } else {
        toast(message, { icon, duration: 4000 });
      }
    };

    on(WS_EVENTS.LEADERBOARD_UPDATE, handleLeaderboardUpdate);
    on(WS_EVENTS.NOTIFICATION, handleNotification);

    return () => {
      off(WS_EVENTS.LEADERBOARD_UPDATE, handleLeaderboardUpdate);
      off(WS_EVENTS.NOTIFICATION, handleNotification);
    };
  }, [user, queryClient, on, off]);
};

export const AppLayout = ({ children }) => {
  // Attach global WS event listeners for the lifetime of the layout
  useGlobalWsListeners();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', transition: 'background 0.3s ease, color 0.3s ease' }}>
      <Navbar />
      <main className="pt-16 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
      <AIChatDrawer />
    </div>
  );
};

export default AppLayout;
