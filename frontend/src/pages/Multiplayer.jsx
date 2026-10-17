import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Plus, Link as LinkIcon, Copy, Check, ArrowRight,
  Trophy, Sword, Skull, Link2, Ghost, Cpu, Bug, Loader2,
  Play, History, Zap, Sparkles, RefreshCw, Radio, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AppLayout } from '@layouts/AppLayout';
import { Input } from '@components/common/Input';
import { Button } from '@components/common/Button';
import { Badge } from '@components/common/Badge';
import { LoginRequiredModal } from '@components/common/Modal';
import { useAuthStore } from '@store/auth.store';
import { useSocket } from '@websocket/useSocket';
import { WS_EVENTS } from '@websocket/events';
import { multiplayerApi } from '@api/multiplayer.api';
import { reportsApi } from '@api/reports.api';
import { ROUTES } from '@constants';

const GAME_MODES = [
  {
    id: 'CLASSIC_RACE',
    icon: Trophy,
    emoji: '🏎️',
    label: 'Classic Race',
    desc: 'All players type the same snippet. First to finish wins.',
    color: 'text-primary',
    bg: 'bg-primary/10 border-primary/20',
    maxPlayers: '2–8 players',
    numericMaxPlayers: 8,
    ranked: false,
  },
  {
    id: 'DUEL',
    icon: Sword,
    emoji: '⚔️',
    label: '1v1 Ranked Duel',
    desc: 'Strict 1v1 ELO matchmaking. Win or lose rating.',
    color: 'text-warning',
    bg: 'bg-warning/10 border-warning/20',
    maxPlayers: '2 players',
    numericMaxPlayers: 2,
    ranked: true,
    queueMode: true,
  },
  {
    id: 'BATTLE_ROYALE',
    icon: Skull,
    emoji: '💀',
    label: 'Battle Royale',
    desc: 'Slowest typist each round gets eliminated. Last one standing wins.',
    color: 'text-error',
    bg: 'bg-error/10 border-error/20',
    maxPlayers: '4–16 players',
    numericMaxPlayers: 16,
    ranked: false,
  },
  {
    id: 'RELAY',
    icon: Link2,
    emoji: '🔗',
    label: 'Relay Race',
    desc: 'Team mode — each player types one chunk. Hand off the baton!',
    color: 'text-success',
    bg: 'bg-success/10 border-success/20',
    maxPlayers: '2–6 players',
    numericMaxPlayers: 6,
    ranked: false,
  },
  {
    id: 'GHOST',
    icon: Ghost,
    emoji: '👻',
    label: 'Ghost Race',
    desc: 'Race against your own best recorded session as a ghost.',
    color: 'text-[#a78bfa]',
    bg: 'bg-[#a78bfa]/10 border-[#a78bfa]/20',
    maxPlayers: 'Solo + ghost',
    numericMaxPlayers: 2,
    ranked: false,
  },
  {
    id: 'BOSS_FIGHT',
    icon: Cpu,
    emoji: '🤖',
    label: 'Boss Fight',
    desc: 'Beat an AI boss simulated at your skill level ±10% WPM.',
    color: 'text-[#f97316]',
    bg: 'bg-[#f97316]/10 border-[#f97316]/20',
    maxPlayers: '1–4 vs AI',
    numericMaxPlayers: 4,
    ranked: false,
  },
  {
    id: 'BUG_FIX',
    icon: Bug,
    emoji: '🐛',
    label: 'Bug Fix Race',
    desc: 'Type the corrected version of buggy code. Speed + accuracy scores.',
    color: 'text-[#22d3ee]',
    bg: 'bg-[#22d3ee]/10 border-[#22d3ee]/20',
    maxPlayers: '2–8 players',
    numericMaxPlayers: 8,
    ranked: false,
  },
];

const Multiplayer = () => {
  const [selectedMode, setSelectedMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') || null;
  });
  const [joinCode, setJoinCode] = useState('');
  const [action, setAction] = useState(null); // 'create' | 'join' | 'created' | 'queuing'
  const [isLoading, setIsLoading] = useState(false);
  const [loginModal, setLoginModal] = useState(false);
  const [activeRoomCode, setActiveRoomCode] = useState(null);
  const { isAuthenticated } = useAuthStore();
  const { emit, on, isConnected } = useSocket();
  const navigate = useNavigate();

  // Check if there is an active ongoing race stored in sessionStorage
  useEffect(() => {
    const savedCode = sessionStorage.getItem('ct_active_room');
    if (savedCode) {
      setActiveRoomCode(savedCode);
    }
  }, []);

  // Handle URL query parameters (e.g. ?mode=DUEL&action=queue from Dashboard Ranked Season card)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    const actionParam = params.get('action');

    if (modeParam && GAME_MODES.some(m => m.id === modeParam)) {
      setSelectedMode(modeParam);
    }

    if (actionParam === 'queue' && (modeParam === 'DUEL' || !modeParam)) {
      setSelectedMode('DUEL');
      if (isAuthenticated && isConnected && action !== 'queuing') {
        handleDuelQueue();
      }
    }
  }, [isAuthenticated, isConnected]);

  // Query live open lobby rooms
  const { data: openRooms = [], refetch: refetchOpenRooms } = useQuery({
    queryKey: ['open-rooms'],
    queryFn: async () => {
      try {
        const res = await multiplayerApi.listRooms();
        return res.data || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 5000,
  });

  // Query recent multiplayer match reports
  const { data: recentMatches = [] } = useQuery({
    queryKey: ['recent-matches'],
    queryFn: async () => {
      try {
        const res = await multiplayerApi.getMatchHistory(10);
        return res.data || [];
      } catch {
        return [];
      }
    },
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });

  const handleModeSelect = (mode) => {
    if (!isAuthenticated) { setLoginModal(true); return; }
    setSelectedMode(mode.id);
    setAction(null);
  };

  const handleCreate = () => {
    if (!isAuthenticated) { setLoginModal(true); return; }
    if (!selectedMode) { toast.error('Select a game mode first'); return; }
    if (!isConnected) { toast.error('Not connected to game server. Please wait…'); return; }

    setIsLoading(true);

    const modeConfig = GAME_MODES.find(m => m.id === selectedMode);
    const maxPlayersInt = modeConfig?.numericMaxPlayers || 8;

    const unsubErr = on(WS_EVENTS.ERROR, (err) => {
      unsub();
      unsubErr();
      setIsLoading(false);
      toast.error(err?.message || 'Failed to create room');
    });

    const unsub = on(WS_EVENTS.ROOM_JOINED, (data) => {
      unsub();
      unsubErr();
      setIsLoading(false);
      sessionStorage.setItem('ct_active_room', data.roomCode);
      navigate(`${ROUTES.MULTIPLAYER}/${data.roomCode}`);
    });

    emit(WS_EVENTS.ROOM_CREATE, {
      mode: selectedMode,
      maxPlayers: maxPlayersInt,
    });

    setTimeout(() => {
      setIsLoading((still) => {
        if (still) {
          unsub();
          unsubErr();
          toast.error("Couldn't reach the race server — try again");
          return false;
        }
        return false;
      });
    }, 8000);
  };

  const handleJoin = (codeToJoin) => {
    if (!isAuthenticated) { setLoginModal(true); return; }
    const code = (codeToJoin || joinCode).trim().toUpperCase();
    if (!code) { toast.error('Enter a room code'); return; }
    if (!isConnected) { toast.error('Not connected to game server'); return; }

    setIsLoading(true);

    const unsub = on(WS_EVENTS.ROOM_JOINED, (data) => {
      unsub();
      errUnsub();
      setIsLoading(false);
      sessionStorage.setItem('ct_active_room', data.roomCode);
      navigate(`${ROUTES.MULTIPLAYER}/${data.roomCode}`);
    });

    const errUnsub = on(WS_EVENTS.ERROR, (err) => {
      unsub();
      errUnsub();
      setIsLoading(false);
      toast.error(err?.message || 'Room not found or full');
    });

    emit(WS_EVENTS.ROOM_JOIN, { roomCode: code });

    setTimeout(() => {
      setIsLoading((still) => {
        if (still) {
          unsub();
          errUnsub();
          toast.error("Couldn't reach the race server — try again");
          return false;
        }
        return false;
      });
    }, 8000);
  };

  const handleDuelQueue = () => {
    if (!isAuthenticated) { setLoginModal(true); return; }
    if (!isConnected) { toast.error('Not connected to game server'); return; }

    setAction('queuing');

    const unsub = on(WS_EVENTS.DUEL_MATCH_FOUND, (data) => {
      if (data.status === 'QUEUING') return;
      unsub();
      setAction(null);
      if (data.roomCode) {
        toast.success(`Opponent found: ${data.opponent?.username}! 🎮`);
        sessionStorage.setItem('ct_active_room', data.roomCode);
        navigate(`${ROUTES.MULTIPLAYER}/${data.roomCode}`);
      }
    });

    emit(WS_EVENTS.DUEL_QUEUE, {});
    toast('Searching for opponent…', { icon: '⚔️' });
  };

  const selectedModeConfig = GAME_MODES.find(m => m.id === selectedMode);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── Active Room Rejoin Banner (if user navigated back by mistake) ── */}
        {activeRoomCode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 border border-primary/40 bg-primary/10 flex items-center justify-between flex-wrap gap-3"
          >
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-primary animate-ping" />
              <div>
                <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Radio size={16} className="text-primary" /> Active Match in Progress
                </h3>
                <p className="text-xs text-text-secondary">
                  You are currently in room <strong className="font-mono text-primary">{activeRoomCode}</strong>. Rejoin now!
                </p>
              </div>
            </div>
            <Button
              onClick={() => handleJoin(activeRoomCode)}
              size="sm"
              className="font-bold"
            >
              Rejoin Match <ArrowRight size={14} />
            </Button>
          </motion.div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users size={24} className="text-primary" /> Multiplayer Arena
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Choose a game mode and race against other developers in real-time
          </p>
        </div>

        {/* Mode Grid */}
        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
            Choose Game Mode
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {GAME_MODES.map((mode) => {
              const isSelected = selectedMode === mode.id;
              return (
                <motion.button
                  key={mode.id}
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleModeSelect(mode)}
                  className={`glass-card p-4 text-left border-2 transition-all ${
                    isSelected
                      ? `${mode.bg} border-current ${mode.color}`
                      : 'border-border/40 hover:border-border'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-2xl">{mode.emoji}</span>
                    <div>
                      <div className={`font-bold text-sm ${isSelected ? mode.color : 'text-text-primary'}`}>
                        {mode.label}
                      </div>
                      {mode.ranked && (
                        <Badge variant="warning" size="sm" className="text-[10px]">Ranked</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">{mode.desc}</p>
                  <p className="text-[11px] text-muted mt-2 font-medium">{mode.maxPlayers}</p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Action Panel — only shown when a mode is selected */}
        <AnimatePresence>
          {selectedMode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card p-6 border border-primary/20"
            >
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                {/* Left: Create or Queue */}
                <div className="flex-1 space-y-3">
                  <h3 className="font-semibold text-text-primary flex items-center gap-2">
                    <span className="text-xl">{selectedModeConfig?.emoji}</span>
                    {selectedModeConfig?.label}
                  </h3>

                  {selectedModeConfig?.queueMode ? (
                    <div className="space-y-3">
                      {action === 'queuing' ? (
                        <div className="flex items-center gap-3 text-text-secondary">
                          <Loader2 size={18} className="animate-spin text-primary" />
                          <span className="text-sm">Searching for an opponent…</span>
                          <Button variant="ghost" size="sm" onClick={() => setAction(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button onClick={handleDuelQueue} size="lg" className="font-bold">
                          <Sword size={18} /> Join Ranked Queue
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      onClick={handleCreate}
                      size="lg"
                      className="font-bold"
                      isLoading={isLoading}
                    >
                      <Plus size={18} /> Create Room
                    </Button>
                  )}
                </div>

                {/* Divider */}
                <div className="hidden sm:flex flex-col items-center self-stretch">
                  <div className="flex-1 w-px bg-border" />
                  <span className="text-xs text-muted px-2">or</span>
                  <div className="flex-1 w-px bg-border" />
                </div>

                {/* Right: Join by code */}
                <div className="flex-1 space-y-3">
                  <h4 className="text-sm font-medium text-text-secondary">Join existing room</h4>
                  <div className="flex gap-2">
                    <input
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="Room code (e.g. ABC123)"
                      maxLength={6}
                      disabled={isLoading}
                      className="input-field font-mono text-base tracking-widest uppercase flex-1 disabled:opacity-50"
                      onKeyDown={e => e.key === 'Enter' && handleJoin(joinCode)}
                    />
                    <Button onClick={() => handleJoin(joinCode)} className="px-5" isLoading={isLoading}>
                      Join <ArrowRight size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Open Lobbies & Recent Matches Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Open Lobby Browser */}
          <div className="glass-card p-5 border border-border/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
                <Radio size={16} className="text-success animate-pulse" /> Live Open Lobbies ({openRooms.length})
              </h3>
              <button
                onClick={() => refetchOpenRooms()}
                className="text-xs text-muted hover:text-primary transition-colors flex items-center gap-1"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {openRooms.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {openRooms.map((r, i) => (
                  <div
                    key={r.roomCode ? `${r.roomCode}-${i}` : i}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-2/40 border border-border/30 hover:border-primary/40 transition-colors"
                  >
                    <div>
                      <span className="font-mono font-bold text-primary text-sm tracking-wider mr-2">
                        {r.roomCode}
                      </span>
                      <Badge variant="primary" size="sm">{r.mode}</Badge>
                      <span className="text-xs text-muted ml-2">{r.playerCount} players</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`${ROUTES.MULTIPLAYER}/${r.roomCode}?spectate=true`)}
                        className="text-xs py-1 flex items-center gap-1 bg-surface-2 text-text-secondary hover:text-text-primary border border-border/40"
                      >
                        <Eye size={12} /> Spectate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleJoin(r.roomCode)}
                        isLoading={isLoading}
                        className="text-xs py-1"
                      >
                        Join <ArrowRight size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted text-xs">
                No active open rooms right now. Create one to start racing!
              </div>
            )}
          </div>

          {/* Recent Matches History Column */}
          <div className="glass-card p-5 border border-border/40 space-y-4">
            <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
              <History size={16} className="text-primary" /> Recent Matches History
            </h3>

            {recentMatches.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {recentMatches.map((m, idx) => (
                  <div
                    key={m.id ? `${m.id}-${idx}` : `match-${idx}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-2/30 border border-border/30 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-text-primary flex items-center gap-1.5">
                        {m.placement && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${m.placement === 1 ? 'bg-amber-500/20 text-amber-400' : 'bg-surface-2 text-muted'}`}>
                            #{m.placement}
                          </span>
                        )}
                        <span>{m.snippetTitle || m.templateTitle || 'Multiplayer Match'}</span>
                      </div>
                      <div className="text-muted text-[11px] mt-0.5">
                        {m.completedAt || m.createdAt ? new Date(m.completedAt || m.createdAt).toLocaleDateString() : 'Recent'} · {m.mode ? m.mode.replace('_', ' ') : 'Race'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-primary text-sm">{m.wpm} WPM</div>
                      {m.accuracy != null && (
                        <div className="text-success text-[11px]">{Math.round(m.accuracy)}% acc</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted text-xs">
                No recent matches completed yet.
              </div>
            )}
          </div>

        </div>

      </div>

      <LoginRequiredModal
        isOpen={loginModal}
        onClose={() => setLoginModal(false)}
        onLogin={() => navigate(ROUTES.LOGIN)}
        feature="multiplayer"
      />
    </AppLayout>
  );
};

export default Multiplayer;
