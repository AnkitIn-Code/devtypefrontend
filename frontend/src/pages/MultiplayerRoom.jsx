import { useEffect, useState, useCallback, useRef, Component } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@websocket/useSocket';
import { WS_EVENTS } from '@websocket/events';
import { useAuthStore } from '@store/auth.store';
import { useTyping } from '@hooks/useTyping';
import { AppLayout } from '@layouts/AppLayout';
import { Badge } from '@components/common/Badge';
import { Button } from '@components/common/Button';
import { TypingArea } from '@components/typing/TypingArea';
import {
  Users, Trophy, Sword, Skull, Link2, Ghost, Cpu, Bug,
  Copy, Check, Send, MessageSquare, Flag, Zap, Clock,
  ChevronDown, ChevronUp, ArrowLeft, Code2, AlertTriangle,
  UserMinus, LogOut, XSquare, Sparkles, RotateCcw,
  CheckCircle2, XCircle, Terminal, Wrench
} from 'lucide-react';
import toast from 'react-hot-toast';
import { templatesApi } from '@api/templates.api';
import { aiApi } from '@api/ai.api';
import { useQuery } from '@tanstack/react-query';
import { ROUTES } from '@constants';

// ─── Error Boundary for Multiplayer Room ─────────────────────────────────────
class RoomErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('[MultiplayerRoom] Error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <AppLayout>
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
            <AlertTriangle size={48} className="text-error" />
            <h2 className="text-xl font-bold text-text-primary">Something went wrong in the race room</h2>
            <p className="text-muted text-sm max-w-md">{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <Button onClick={() => {
              sessionStorage.removeItem('ct_active_room');
              window.location.reload();
            }}>
              Try Again
            </Button>
            <button
              onClick={() => {
                sessionStorage.removeItem('ct_active_room');
                window.location.href = ROUTES.MULTIPLAYER;
              }}
              className="text-sm text-muted underline hover:text-text-primary transition-colors"
            >
              Back to Multiplayer Lobby
            </button>
          </div>
        </AppLayout>
      );
    }
    return this.props.children;
  }
}

// ─── Inline SVG Car ──────────────────────────────────────────────────────────
const CarSVG = ({ color = '#7c3aed', size = 28 }) => (
  <svg width={size} height={size * 0.55} viewBox="0 0 56 31" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="11" width="44" height="14" rx="4" fill={color} />
    <path d="M12 11 L18 4 H38 L44 11" fill={color} opacity="0.8" />
    <rect x="18" y="5" width="20" height="6" rx="2" fill="white" opacity="0.25" />
    <circle cx="14" cy="25" r="5" fill="#1a1a2e" stroke={color} strokeWidth="2" />
    <circle cx="42" cy="25" r="5" fill="#1a1a2e" stroke={color} strokeWidth="2" />
    <circle cx="14" cy="25" r="2" fill={color} opacity="0.7" />
    <circle cx="42" cy="25" r="2" fill={color} opacity="0.7" />
    <rect x="4" y="15" width="4" height="3" rx="1" fill="#fbbf24" opacity="0.9" />
    <rect x="48" y="15" width="4" height="3" rx="1" fill="#ef4444" opacity="0.7" />
  </svg>
);

// Player colors cycling
const PLAYER_COLORS = [
  '#7c3aed', // purple (primary)
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
];

const placementLabel = (n) => {
  if (n === -1) return '💀 DNF';  // BUG-H07: Did Not Finish
  if (n === 1) return '🥇 1st Place!';
  if (n === 2) return '🥈 2nd Place.';
  if (n === 3) return '🥉 3rd Place.';
  return `#${n} Place`;
};

const placementColor = (n) => {
  if (n === -1) return 'text-red-400 border-red-400/40 bg-red-400/10'; // BUG-H07: DNF
  if (n === 1) return 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10';
  if (n === 2) return 'text-slate-300 border-slate-300/40 bg-slate-300/10';
  if (n === 3) return 'text-amber-600 border-amber-600/40 bg-amber-600/10';
  return 'text-muted border-border/40 bg-surface/50';
};

// ─── Mode badge ───────────────────────────────────────────────────────────────
const ModeBadge = ({ mode }) => {
  const cfg = {
    CLASSIC_RACE:  { icon: Trophy,  label: 'Classic Race',    cls: 'text-primary' },
    DUEL:          { icon: Sword,   label: '1v1 Duel',        cls: 'text-warning' },
    BATTLE_ROYALE: { icon: Skull,   label: 'Battle Royale',   cls: 'text-error' },
    RELAY:         { icon: Link2,   label: 'Relay Race',      cls: 'text-success' },
    GHOST:         { icon: Ghost,   label: 'Ghost Race',      cls: 'text-[#a78bfa]' },
    BOSS_FIGHT:    { icon: Cpu,     label: 'Boss Fight',      cls: 'text-[#f97316]' },
    BUG_FIX:       { icon: Bug,     label: 'Bug Fix Race',    cls: 'text-[#22d3ee]' },
  }[mode] || { icon: Trophy, label: mode, cls: 'text-primary' };
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1 text-sm font-semibold ${cfg.cls}`}>
      <Icon size={14} /> {cfg.label}
    </span>
  );
};

// ─── Race Lane (animated car + progress track) ────────────────────────────────
const RaceLane = ({ player, colorIndex, isMe, divider }) => {
  const color = player.isGhost ? '#a78bfa'
    : player.isBoss ? '#f97316'
    : PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  const progress = Math.min(100, Math.max(0, player.progress || 0));
  // BUG-H07: placement=-1 means DNF; placement>0 means ranked finisher
  const isDnf = player.dnf === true || player.placement === -1;
  const finished = player.placement > 0;

  return (
    <>
      <div className={`px-3 py-2.5 ${isMe ? 'bg-primary/5 rounded-lg' : ''} ${isDnf ? 'opacity-60' : ''}`}>
        {/* Top row: username + WPM badge */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: isDnf ? '#ef4444' : color }}
            />
            <a
              href={`/profile/${encodeURIComponent(player.name || '')}`}
              target="_blank"
              rel="noreferrer"
              className={`text-xs font-semibold truncate hover:underline ${isMe ? 'text-primary' : 'text-text-primary'}`}
            >
              {player.name}
            </a>
            {isMe && <span className="text-[10px] text-muted flex-shrink-0">(you)</span>}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* BUG-H07: show DNF badge for placement=-1, normal placement for >0 */}
            {isDnf && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${placementColor(-1)}`}>
                💀 DNF
              </span>
            )}
            {!isDnf && finished && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${placementColor(player.placement)}`}>
                {placementLabel(player.placement)}
              </span>
            )}
            <span className="text-[11px] font-mono font-bold text-text-secondary">
              {player.wpm || 0} <span className="text-muted font-normal">WPM</span>
            </span>
          </div>
        </div>

        {/* Track */}
        <div className={`relative h-7 rounded-lg overflow-hidden border ${isDnf ? 'bg-red-950/20 border-red-400/20' : 'bg-surface-2/60 border-border/30'}`}>
          {/* Dashed finish line */}
          <div className="absolute right-0 top-0 bottom-0 w-px border-r-2 border-dashed border-border/50" />

          {/* Animated car — hidden for DNF */}
          {!isDnf && (
            <motion.div
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: 0 }}
              animate={{ left: `calc(${progress}% - ${progress > 5 ? 32 : 4}px)` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            >
              <CarSVG color={color} size={32} />
            </motion.div>
          )}

          {/* Progress fill (behind car) */}
          <motion.div
            className="absolute top-0 left-0 h-full rounded-l-lg opacity-20"
            style={{ backgroundColor: isDnf ? '#ef4444' : color }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />

          {/* DNF label inside track */}
          {isDnf && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-red-400 tracking-widest uppercase">Did Not Finish</span>
            </div>
          )}

          {/* Progress % text — hide for DNF */}
          {!isDnf && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted font-mono">
              {Math.round(progress)}%
            </div>
          )}
        </div>
      </div>

      {divider && (
        <div className="border-b border-dashed border-border/25 mx-2" />
      )}
    </>
  );
};


// ─── Chat Box ─────────────────────────────────────────────────────────────────
const ChatBox = ({ messages, onSend, collapsed, onToggle }) => {
  const [msg, setMsg] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const submit = () => {
    if (!msg.trim()) return;
    onSend(msg.trim());
    setMsg('');
  };

  return (
    <div className="border-t border-border/30 pt-2 mt-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-muted hover:text-text-primary transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <MessageSquare size={11} />
          Chat
          {messages.length > 0 && (
            <span className="bg-primary/20 text-primary px-1 rounded text-[10px]">
              {messages.length}
            </span>
          )}
        </span>
        {collapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
      </button>

      {!collapsed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div
            ref={listRef}
            className="max-h-28 overflow-y-auto space-y-1 px-2 py-1 text-xs"
          >
            {messages.length === 0 ? (
              <p className="text-muted text-center py-2">No messages yet</p>
            ) : (
              messages.map((m, i) => (
                <div key={i} className="flex gap-1.5">
                  <span className="text-primary font-semibold flex-shrink-0">{m.username}:</span>
                  <span className="text-text-secondary break-all">{m.message}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-1.5 px-2 pt-1">
            <input
              value={msg}
              onChange={e => setMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Say something…"
              maxLength={200}
              className="flex-1 text-xs bg-surface-2/60 border border-border/40 rounded-lg px-2 py-1.5 text-text-primary placeholder:text-muted outline-none focus:border-primary/50 transition-colors"
            />
            <button
              onClick={submit}
              className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            >
              <Send size={12} />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const MultiplayerRoom = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { emit, on, isConnected } = useSocket();

  // ── State machine ──────────────────────────────────────────────────────────
  // 'waiting' | 'countdown' | 'racing' | 'finished'
  const [roomState, setRoomState] = useState('waiting');
  const [roomMode, setRoomMode] = useState('CLASSIC_RACE');
  const [countdown, setCountdown] = useState(3);
  const [players, setPlayers] = useState([]);
  const [hostId, setHostId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [botFallbackVisible, setBotFallbackVisible] = useState(false);
  const [botFallbackTimer, setBotFallbackTimer] = useState(null);
  const [joinedRoom, setJoinedRoom] = useState(false);
  const joinedRoomRef = useRef(false); // ref for timeout closure (avoids stale closure)
  const [connectTimeout, setConnectTimeout] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null); // template chosen by host
  const [isSpectator, setIsSpectator] = useState(() => {
    return new URLSearchParams(window.location.search).get('spectate') === 'true';
  });

  // ── Bug Fix mode state ───────────────────────────────────────────────────
  const [selectedBugLang, setSelectedBugLang] = useState('javascript');
  const [bugPromptInput, setBugPromptInput] = useState('');
  const [isGeneratingBug, setIsGeneratingBug] = useState(false);
  const [bugCodeInput, setBugCodeInput] = useState('');
  const [isVerifyingBug, setIsVerifyingBug] = useState(false);
  const [bugFeedback, setBugFeedback] = useState(null);
  const [bugSolved, setBugSolved] = useState(false);
  const [raceElapsedSec, setRaceElapsedSec] = useState(0);
  const raceTimerRef = useRef(null);
  const raceStartTimeRef = useRef(null);

  // Derive isHost — coerce to boolean so TanStack Query v5 doesn't throw
  const myUserId = user?.id?.toString();
  const isHost = !!(hostId && hostId === myUserId);

  // Load presaved code templates for host selection (enabled only when confirmed host)
  const { data: availableTemplates = [] } = useQuery({
    queryKey: ['available-templates'],
    queryFn: async () => {
      try {
        const res = await templatesApi.getAll();
        return res.data || [];
      } catch {
        return [];
      }
    },
    enabled: isHost, // now always a boolean — no null/undefined
    staleTime: Infinity,
  });

  // Typing store
  const {
    template, typedChars, currentIndex, wpm, accuracy, elapsedTime,
    status: typingStatus, setTemplate, reset,
  } = useTyping();

  const myPlayer = players.find(p => p.id === myUserId);
  const allPlayers = players;
  const playerCount = allPlayers.length;

  // Sync bug code input when template changes
  useEffect(() => {
    if (template?.buggyCode || template?.code) {
      setBugCodeInput(template.buggyCode || template.code);
    }
    if (template?.language) {
      setSelectedBugLang(template.language.toLowerCase());
    }
  }, [template]);

  // Race stopwatch for BUG_FIX mode
  useEffect(() => {
    if (roomState === 'racing' && roomMode === 'BUG_FIX') {
      raceStartTimeRef.current = Date.now();
      setBugSolved(false);
      setBugFeedback(null);
      setBugCodeInput(template?.buggyCode || template?.code || '');
      setRaceElapsedSec(0);

      raceTimerRef.current = setInterval(() => {
        if (raceStartTimeRef.current) {
          const sec = (Date.now() - raceStartTimeRef.current) / 1000;
          setRaceElapsedSec(sec);
        }
      }, 100);
    } else {
      if (raceTimerRef.current) clearInterval(raceTimerRef.current);
    }
    return () => {
      if (raceTimerRef.current) clearInterval(raceTimerRef.current);
    };
  }, [roomState, roomMode, template]);

  // ── Socket setup (listeners BEFORE emit) ──────────────────────────────────
  useEffect(() => {
    if (!isConnected || !roomCode) return;

    // Safety: don't double-register if already joined
    const unsubs = [];

    // ── room:joined ──────────────────────────────────────────────────────────
    const unsubJoined = on(WS_EVENTS.ROOM_JOINED, (data) => {
      setJoinedRoom(true);
      joinedRoomRef.current = true;
      if (data.isSpectator) {
        setIsSpectator(true);
      }
      setRoomMode(data.mode || 'CLASSIC_RACE');
      setHostId(data.hostId || null);
      if (data.snippet?.code) {
        setTemplate(data.snippet);
        setSelectedTemplate(data.snippet);
      }
      if (data.players) {
        setPlayers(data.players.map(p => ({
          id: p.userId,
          name: p.username,
          // FEAT-S09: restore per-player progress so reconnecting clients show correct positions
          progress: p.progress || 0,
          wpm: p.wpm || 0,
          accuracy: 100,
          isReady: p.isReady,
          // BUG-H07: preserve placement and dnf from server
          placement: p.placement ?? 0,
          dnf: p.dnf ?? false,
        })));
      }
      // EDGE-01/EDGE-02: sync room state from server status so late-joiners/reconnectors
      // immediately see the correct UI phase (countdown/racing/finished) instead of
      // staying stuck on 'waiting' because they missed the original broadcast events.
      if (data.status) {
        const serverStatus = data.status.toLowerCase();
        if (serverStatus === 'racing') {
          setRoomState('racing');
        } else if (serverStatus === 'countdown') {
          setRoomState('countdown');
        } else if (serverStatus === 'finished') {
          setRoomState('finished');
        }
        // 'waiting' — leave as-is (default)
      }
      // Clear connect timeout
      setConnectTimeout(t => { if (t) clearTimeout(t); return null; });
    });
    unsubs.push(unsubJoined);

    // ── room:playerJoined ────────────────────────────────────────────────────
    unsubs.push(on(WS_EVENTS.ROOM_PLAYER_JOINED, (data) => {
      setPlayers(prev => {
        if (prev.find(p => p.id === data.player?.userId)) return prev;
        return [...prev, {
          id: data.player?.userId,
          name: data.player?.username,
          progress: 0, wpm: 0, accuracy: 100, isReady: false, placement: 0,
        }];
      });
      toast(`${data.player?.username} joined the room 👋`, { icon: '🟢', duration: 2500 });
    }));

    // ── room:playerLeft ──────────────────────────────────────────────────────
    unsubs.push(on(WS_EVENTS.ROOM_PLAYER_LEFT, (data) => {
      setPlayers(prev => prev.filter(p => p.id !== data.userId));
      toast(`${data.username || 'A player'} left`, { icon: '🔴', duration: 2000 });
    }));

    // ── race:countdown ───────────────────────────────────────────────────────
    unsubs.push(on(WS_EVENTS.RACE_COUNTDOWN, (data) => {
      setRoomState('countdown');
      setCountdown(data.count ?? 3);
    }));

    // ── race:start ───────────────────────────────────────────────────────────
    unsubs.push(on(WS_EVENTS.RACE_START, (data) => {
      setRoomState('racing');
      if (data.snippet?.code) setTemplate(data.snippet);
    }));

    // ── race:cancelled — BUG-C04: race aborted (player count < 2 at countdown end) ──
    unsubs.push(on(WS_EVENTS.RACE_CANCELLED, (data) => {
      setRoomState('waiting');
      setCountdown(3);
      // Reset all player ready flags so the lobby can restart
      setPlayers(prev => prev.map(p => ({ ...p, isReady: false })));
      toast.error(`Race cancelled: ${data?.reason || 'Not enough players'}`, { duration: 4000, icon: '🚫' });
    }));

    // ── race:progress ────────────────────────────────────────────────────────
    unsubs.push(on(WS_EVENTS.RACE_PROGRESS, (data) => {
      setPlayers(prev => {
        const exists = prev.find(p => p.id === data.userId);
        if (exists) {
          return prev.map(p => p.id === data.userId
            ? { ...p, progress: data.progress, wpm: data.wpm }
            : p);
        }
        // Ghost / Boss mid-race
        return [...prev, {
          id: data.userId,
          name: data.username,
          progress: data.progress,
          wpm: data.wpm,
          accuracy: 100,
          isReady: true,
          placement: 0,
          isGhost: data.isGhost,
          isBoss: data.isBoss,
        }];
      });
    }));

    // ── race:playerFinished ──────────────────────────────────────────────────
    unsubs.push(on(WS_EVENTS.RACE_PLAYER_FINISHED, (data) => {
      setPlayers(prev => prev.map(p =>
        p.id === data.userId
          ? {
              ...p,
              progress: 100,
              wpm: data.wpm,
              placement: data.placement,
              timeTakenSec: data.timeTakenSec,
              durationMs: data.durationMs,
            }
          : p
      ));
      if (data.userId === myUserId) {
        toast.success(`You finished ${placementLabel(data.placement)}! 🎉`);
      }
    }));

    // ── race:results ─────────────────────────────────────────────────────────
    unsubs.push(on(WS_EVENTS.RACE_RESULTS, (data) => {
      if (data.results?.length > 0) {
        setPlayers(data.results.map(r => ({
          id: r.userId,
          name: r.username,
          progress: r.progress ?? 100,
          wpm: r.wpm,
          accuracy: r.accuracy,
          placement: r.placement,
          // BUG-H07: preserve dnf flag from server so RaceLane renders DNF correctly
          dnf: r.dnf ?? (r.placement === -1),
          timeTakenSec: r.timeTakenSec,
          durationMs: r.durationMs,
        })));
      }
      setRoomState('finished');
    }));

    // ── room:chat ────────────────────────────────────────────────────────────
    unsubs.push(on(WS_EVENTS.ROOM_CHAT, (data) => {
      setChatMessages(prev => [...prev, data]);
    }));

    // ── room:templateChange — all players receive the host's choice ──────────
    unsubs.push(on(WS_EVENTS.ROOM_TEMPLATE_CHANGE, (data) => {
      if (data?.code) {
        setTemplate(data);
        setSelectedTemplate(data);
      }
      if (data?.title && data?.username) {
        toast(`Host changed template to "${data.title}" 📝`, { icon: '🔄', duration: 3000 });
      }
    }));

    // ── room:closed — host closed the room ──────────────────────────────────
    unsubs.push(on(WS_EVENTS.ROOM_CLOSED, (data) => {
      toast.error(data?.message || 'The room was closed by the host.');
      sessionStorage.removeItem('ct_active_room');
      reset();
      navigate(ROUTES.MULTIPLAYER);
    }));

    // ── room:kicked — removed from lobby by host ─────────────────────────────
    unsubs.push(on(WS_EVENTS.ROOM_KICKED, (data) => {
      toast.error(data?.message || 'You were removed from the lobby by the host.');
      sessionStorage.removeItem('ct_active_room');
      reset();
      navigate(ROUTES.MULTIPLAYER);
    }));

    // ── error ────────────────────────────────────────────────────────────────
    unsubs.push(on(WS_EVENTS.ERROR, (err) => {
      if (err?.code === 'RACE_IN_PROGRESS') {
        toast.error('Race already started — you cannot join mid-race');
        navigate(ROUTES.MULTIPLAYER);
      }
    }));

    // All listeners registered — NOW emit room:join or room:spectate
    const isSpectating = new URLSearchParams(window.location.search).get('spectate') === 'true';
    if (isSpectating) {
      setIsSpectator(true);
      emit('room:spectate', { roomCode: roomCode.toUpperCase() });
    } else {
      emit(WS_EVENTS.ROOM_JOIN, { roomCode: roomCode.toUpperCase() });
    }

    // Hard timeout: if room:joined doesn't arrive in 8s → error
    const tid = setTimeout(() => {
      if (!joinedRoomRef.current) {
        toast.error("Couldn't connect to the race server. Try again.");
        navigate(ROUTES.MULTIPLAYER);
      }
    }, 8000);
    setConnectTimeout(tid);

    return () => {
      unsubs.forEach(fn => fn?.());
      clearTimeout(tid);
    };
  }, [isConnected, roomCode]); // ← intentionally omit roomMode from deps to prevent double-emit

  // ── Emit my typing progress to server ────────────────────────────────────
  useEffect(() => {
    if (isSpectator || roomState !== 'racing' || typedChars.length === 0) return;

    const total = typedChars.length;
    const progress = Math.min(100, Math.round((currentIndex / total) * 100));

    // Update own player locally
    setPlayers(prev => prev.map(p =>
      p.id === myUserId ? { ...p, progress, wpm, accuracy } : p
    ));

    emit(WS_EVENTS.RACE_PROGRESS, {
      roomCode: roomCode.toUpperCase(),
      progress,
      wpm,
      accuracy,
    });

    if (progress >= 100 && typingStatus === 'finished') {
      emit(WS_EVENTS.RACE_PLAYER_FINISHED, {
        roomCode: roomCode.toUpperCase(),
        wpm,
        accuracy,
      });
    }
  }, [currentIndex, typingStatus]);

  // ── Bot fallback: 20s alone in WAITING ───────────────────────────────────
  useEffect(() => {
    if (roomState !== 'waiting') {
      if (botFallbackTimer) clearTimeout(botFallbackTimer);
      setBotFallbackVisible(false);
      return;
    }
    if (playerCount >= 2) {
      if (botFallbackTimer) clearTimeout(botFallbackTimer);
      setBotFallbackVisible(false);
      return;
    }

    const tid = setTimeout(() => setBotFallbackVisible(true), 20000);
    setBotFallbackTimer(tid);
    return () => clearTimeout(tid);
  }, [roomState, playerCount]);

  const handleSelectTemplate = useCallback((tpl) => {
    if (!tpl || !tpl.code) return;
    emit(WS_EVENTS.ROOM_TEMPLATE_CHANGE, {
      roomCode: roomCode.toUpperCase(),
      snippetId: tpl.id,
      title: tpl.title || 'Selected Code',
      language: tpl.language || 'javascript',
      code: tpl.code,
    });
    setSelectedTemplate(tpl);
    setTemplate(tpl);
    setShowTemplateModal(false);
    toast.success(`Template updated to "${tpl.title}"! 📝`);
  }, [emit, roomCode, setTemplate]);

  const handleGenerateBugTemplate = useCallback(async (isRandom = true) => {
    setIsGeneratingBug(true);
    try {
      const prompt = isRandom ? '' : bugPromptInput.trim();
      let generated = null;

      try {
        const res = await aiApi.generateBuggyTemplate({
          language: selectedBugLang,
          prompt,
        });
        generated = res.data;
      } catch (apiErr) {
        console.warn('AI buggy generator API failed, using built-in challenge fallback', apiErr);
      }

      // If AI did not return valid data, use reliable built-in fallback
      if (!generated?.buggyCode) {
        const fallbacks = {
          python: {
            title: 'Binary Search Bounds',
            description: 'Fix the binary search function so it returns the correct 0-based index of target, or -1 if not found. Watch for off-by-one errors.',
            language: 'python',
            buggyCode: `def binary_search(arr, target):\n    left = 0\n    right = len(arr)\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid\n        else:\n            right = mid\n    return -1`,
            solutionCode: `def binary_search(arr, target):\n    left = 0\n    right = len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1`
          },
          java: {
            title: 'Array Duplicates Removal',
            description: 'Remove duplicates from a sorted array in-place and return the count of unique elements.',
            language: 'java',
            buggyCode: `public class Solution {\n    public static int removeDuplicates(int[] nums) {\n        if (nums.length == 0) return 0;\n        int insertIndex = 0;\n        for (int i = 1; i <= nums.length; i++) {\n            if (nums[i] != nums[insertIndex]) {\n                nums[insertIndex] = nums[i];\n                insertIndex++;\n            }\n        }\n        return insertIndex;\n    }\n}`,
            solutionCode: `public class Solution {\n    public static int removeDuplicates(int[] nums) {\n        if (nums.length == 0) return 0;\n        int insertIndex = 1;\n        for (int i = 1; i < nums.length; i++) {\n            if (nums[i] != nums[i - 1]) {\n                nums[insertIndex] = nums[i];\n                insertIndex++;\n            }\n        }\n        return insertIndex;\n    }\n}`
          },
          cpp: {
            title: 'Valid Palindrome Checker',
            description: 'Check if a string is a palindrome considering only alphanumeric characters and ignoring cases.',
            language: 'cpp',
            buggyCode: `#include <string>\n#include <cctype>\n\nbool isPalindrome(std::string s) {\n    int left = 0;\n    int right = s.length();\n    while (left < right) {\n        while (left < right && !isalnum(s[left])) left++;\n        while (left < right && !isalnum(s[right])) right--;\n        if (tolower(s[left]) != tolower(s[right])) return false;\n        left++;\n        right--;\n    }\n    return true;\n}`,
            solutionCode: `#include <string>\n#include <cctype>\n\nbool isPalindrome(std::string s) {\n    int left = 0;\n    int right = s.length() - 1;\n    while (left < right) {\n        while (left < right && !isalnum(s[left])) left++;\n        while (left < right && !isalnum(s[right])) right--;\n        if (tolower(s[left]) != tolower(s[right])) return false;\n        left++;\n        right--;\n    }\n    return true;\n}`
          },
          javascript: {
            title: 'Fibonacci Sequence Generator',
            description: 'Fix the Fibonacci function so it correctly calculates the nth Fibonacci number without infinite loops.',
            language: 'javascript',
            buggyCode: `function fibonacci(n) {\n  if (n < 0) return 0;\n  if (n === 1) return 1;\n  let a = 0, b = 1;\n  for (let i = 2; i <= n; i++) {\n    let next = a + b;\n    a = b;\n    b = next;\n  }\n  return a;\n}`,
            solutionCode: `function fibonacci(n) {\n  if (n <= 0) return 0;\n  if (n === 1) return 1;\n  let a = 0, b = 1;\n  for (let i = 2; i <= n; i++) {\n    let next = a + b;\n    a = b;\n    b = next;\n  }\n  return b;\n}`
          }
        };
        const langKey = (selectedBugLang || 'javascript').toLowerCase();
        generated = fallbacks[langKey] || fallbacks.javascript;
      }

      const snippetData = {
        id: 'bugfix-' + Date.now(),
        title: generated.title || 'Bug Fix Challenge',
        description: generated.description || 'Find and fix the bugs in the code.',
        language: generated.language || selectedBugLang,
        code: generated.solutionCode || generated.buggyCode,
        buggyCode: generated.buggyCode,
      };

      setTemplate(snippetData);
      setSelectedTemplate(snippetData);
      setBugCodeInput(generated.buggyCode);

      // Broadcast to all room players
      emit(WS_EVENTS.ROOM_TEMPLATE_CHANGE, {
        roomCode: roomCode.toUpperCase(),
        ...snippetData,
      });

      toast.success(`Generated Bug Challenge: "${snippetData.title}"! 🐞`);
      if (!isRandom) setBugPromptInput('');
    } catch (err) {
      console.error('Failed to generate bug template:', err);
      toast.error('Failed to generate challenge. Please try again.');
    } finally {
      setIsGeneratingBug(false);
    }
  }, [emit, roomCode, selectedBugLang, bugPromptInput, setTemplate]);

  const handleSubmitBugFix = useCallback(async () => {
    if (!bugCodeInput.trim() || isVerifyingBug || bugSolved) return;
    setIsVerifyingBug(true);
    setBugFeedback(null);

    const timeTaken = ((Date.now() - (raceStartTimeRef.current || Date.now())) / 1000).toFixed(1);

    try {
      const res = await aiApi.verifyBugFix({
        language: template?.language || selectedBugLang,
        description: template?.description || '',
        originalBuggyCode: template?.buggyCode || template?.code || '',
        userSubmittedCode: bugCodeInput,
      });

      const result = res.data;
      setBugFeedback(result);

      if (result.correct) {
        setBugSolved(true);
        if (raceTimerRef.current) clearInterval(raceTimerRef.current);
        toast.success(`🎉 Solved in ${timeTaken}s!`);

        // Emit finish to server
        emit(WS_EVENTS.RACE_PLAYER_FINISHED, {
          roomCode: roomCode.toUpperCase(),
          wpm: 0,
          accuracy: 100,
          timeTakenSec: parseFloat(timeTaken),
        });
      } else {
        toast.error('Test cases failed. Check the error feedback below!');
      }
    } catch (err) {
      console.error('Verification error:', err);
      // BUG-H11: never auto-approve on API/network failure.
      // An API error is NOT evidence the submission is correct — show a retry prompt.
      toast.error('Verification service unavailable. Please try again in a moment.');
      setBugFeedback({
        correct: false,
        feedback: 'Could not reach the verification service. Your submission was NOT accepted — please retry.',
      });
    } finally {
      setIsVerifyingBug(false);
    }
  }, [emit, roomCode, template, selectedBugLang, bugCodeInput, isVerifyingBug, bugSolved]);

  const handleStartRace = useCallback(() => {
    if (playerCount < 2) {
      toast.error('Need at least 2 players to start');
      return;
    }
    emit(WS_EVENTS.ROOM_START, { roomCode: roomCode.toUpperCase() });
  }, [emit, roomCode, playerCount]);

  const handleBotFallback = useCallback(() => {
    // FEAT-M01: emit boss:start instead of misusing room:start with a bossFight flag.
    // The server's BOSS_START handler creates the boss fight race in BOSS_FIGHT mode.
    emit(WS_EVENTS.BOSS_START, { roomCode: roomCode.toUpperCase() });
    toast('Starting Boss Fight! 🤖', { icon: '⚡' });
  }, [emit, roomCode]);

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(roomCode.toUpperCase());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Room code copied!');
  }, [roomCode]);

  const handleSendChat = useCallback((message) => {
    emit(WS_EVENTS.ROOM_CHAT, { roomCode: roomCode.toUpperCase(), message });
  }, [emit, roomCode]);

  const handleCloseRoom = useCallback(() => {
    if (!roomCode) return;
    emit(WS_EVENTS.ROOM_CLOSE, { roomCode: roomCode.toUpperCase() });
    sessionStorage.removeItem('ct_active_room');
    reset();
    toast('Room closed', { icon: '🚪' });
    navigate(ROUTES.MULTIPLAYER);
  }, [emit, roomCode, reset, navigate]);

  const handleKickPlayer = useCallback((player) => {
    if (!roomCode || !player) return;
    emit(WS_EVENTS.ROOM_KICK, {
      roomCode: roomCode.toUpperCase(),
      userId: player.id,
      username: player.name,
    });
    toast.success(`Removed ${player.name} from lobby`);
  }, [emit, roomCode]);

  const handleLeaveRoom = useCallback(() => {
    if (roomCode) {
      try { emit(WS_EVENTS.ROOM_LEAVE, { roomCode: roomCode.toUpperCase() }); } catch {}
    }
    sessionStorage.removeItem('ct_active_room');
    reset();
    navigate(ROUTES.MULTIPLAYER);
  }, [emit, roomCode, reset, navigate]);

  const handleRematch = useCallback(() => {
    setRoomState('waiting');
    reset();
  }, [reset]);

  // BUG-H07: DNF players (placement=-1) must sort after all ranked finishers.
  // 'placement || 99' was broken for -1 (truthy negative < ranked positions).
  const sortedResults = [...players].sort((a, b) => {
    const pa = a.placement > 0 ? a.placement : 9999;
    const pb = b.placement > 0 ? b.placement : 9999;
    return pa - pb;
  });


  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLeaveRoom}
              className="p-1.5 rounded-lg text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
              title="Leave Room"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-text-primary">Race Room</h1>
                <ModeBadge mode={roomMode} />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted">
                  Code:{' '}
                  <span className="font-mono font-bold text-primary tracking-widest">
                    {roomCode?.toUpperCase()}
                  </span>
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-1 rounded text-muted hover:text-primary transition-colors"
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                </button>
                <span className="text-xs text-muted">· {playerCount} player{playerCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Status chip & Room Action buttons */}
          <div className="flex items-center gap-2">
            {isSpectator && (
              <Badge variant="warning" size="sm" className="font-bold">
                👁️ Spectator Mode
              </Badge>
            )}
            {roomState === 'waiting' && (
              <>
                <Badge variant="ghost" size="sm" className="animate-pulse">
                  ⏳ Waiting for players
                </Badge>
                {isHost && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTemplateModal(true)}
                    className="text-xs py-1.5 px-3 font-semibold flex items-center gap-1.5 border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Code2 size={14} /> Change Snippet
                  </Button>
                )}
                {isHost ? (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={handleCloseRoom}
                    className="text-xs py-1.5 px-3 font-semibold flex items-center gap-1.5 bg-error/10 hover:bg-error/20 text-error border border-error/30"
                  >
                    <XSquare size={14} /> Close Room
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleLeaveRoom}
                    className="text-xs py-1.5 px-3 font-semibold flex items-center gap-1.5 border-error/40 text-error hover:bg-error/10"
                  >
                    <LogOut size={14} /> Leave Room
                  </Button>
                )}
              </>
            )}
            {roomState === 'racing' && (
              <Badge variant="primary" size="sm">
                🏁 Race in progress
              </Badge>
            )}
            {roomState === 'finished' && (
              <div className="flex items-center gap-2">
                <Badge variant="success" size="sm">
                  ✅ Race finished
                </Badge>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleLeaveRoom}
                  className="text-xs py-1.5 px-3 font-semibold flex items-center gap-1.5"
                >
                  <LogOut size={14} /> Exit to Multiplayer
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Countdown Overlay ── */}
        <AnimatePresence>
          {roomState === 'countdown' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center"
            >
              <div className="text-center">
                <motion.div
                  key={countdown}
                  initial={{ scale: 2.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="text-[120px] font-black leading-none font-mono"
                  style={{
                    background: countdown > 0
                      ? 'linear-gradient(135deg, #7c3aed, #a78bfa)'
                      : 'linear-gradient(135deg, #10b981, #34d399)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {countdown > 0 ? countdown : 'GO!'}
                </motion.div>
                <p className="text-muted text-sm mt-4 font-medium">
                  {countdown > 0 ? 'Get ready…' : 'Type as fast as you can!'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════════
            WAITING STATE
        ══════════════════════════════════════════════════════════════════ */}
        {roomState === 'waiting' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left: Room code share + player list */}
            <div className="lg:col-span-2 space-y-4">
              {/* Room code card */}
              <div className="glass-card p-6 border border-primary/20">
                <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
                  Share this code to invite friends
                </h2>
                <div className="flex items-center gap-4">
                  <div className="font-mono text-5xl font-black text-primary tracking-[0.25em]">
                    {roomCode?.toUpperCase()}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/50 text-sm text-muted hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Players list */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
                  <Users size={14} className="text-primary" />
                  Players in lobby ({playerCount})
                </h3>
                {playerCount === 0 ? (
                  <p className="text-muted text-sm">Waiting for players to join…</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {allPlayers.map((p, i) => (
                      <div
                        key={p.id || i}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                          p.id === myUserId
                            ? 'bg-primary/5 border-primary/25'
                            : 'bg-surface-2/40 border-border/40'
                        }`}
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] + '30', color: PLAYER_COLORS[i % PLAYER_COLORS.length] }}
                        >
                          {(p.name || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-text-primary truncate">
                            {p.name}
                            {p.id === myUserId && <span className="text-muted text-xs ml-1">(you)</span>}
                            {p.id === hostId && <span className="text-primary text-xs ml-1">👑 host</span>}
                          </p>
                          <p className="text-xs text-muted">Ready to race</p>
                        </div>

                        {/* Kick button: visible to host for other players */}
                        {isHost && p.id !== myUserId && (
                          <button
                            onClick={() => handleKickPlayer(p)}
                            title={`Remove ${p.name} from lobby`}
                            className="p-1.5 px-2.5 rounded-lg text-error hover:bg-error/20 bg-error/10 border border-error/30 text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
                          >
                            <UserMinus size={13} />
                            <span>Kick</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── If BUG_FIX mode: AI Bug Challenge Studio ── */}
              {roomMode === 'BUG_FIX' && (
                <div className="glass-card p-5 border border-[#22d3ee]/30 bg-[#22d3ee]/5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#22d3ee]/20 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-[#22d3ee]/15 text-[#22d3ee]">
                        <Bug size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-text-primary flex items-center gap-1.5">
                          AI Bug Challenge Studio
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#22d3ee]/20 text-[#22d3ee] font-bold">
                            DeepSeek AI
                          </span>
                        </h3>
                        <p className="text-xs text-muted">
                          {isHost
                            ? 'Select language and generate a buggy problem for everyone to debug!'
                            : 'Host is selecting/generating the AI buggy code challenge.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {isHost && (
                    <div className="space-y-4">
                      {/* Language Selection */}
                      <div>
                        <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">
                          1. Select Programming Language
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['javascript', 'python', 'java', 'cpp', 'typescript', 'go', 'rust'].map((lang) => (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => setSelectedBugLang(lang)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                selectedBugLang === lang
                                  ? 'bg-[#22d3ee] text-black shadow-lg shadow-[#22d3ee]/20 scale-105'
                                  : 'bg-surface-2/60 border border-border/40 text-muted hover:text-text-primary hover:border-[#22d3ee]/40'
                              }`}
                            >
                              {lang.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Two Options */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Option 1: Quick Random */}
                        <div className="p-3.5 rounded-xl bg-surface-2/40 border border-border/40 flex flex-col justify-between space-y-2.5">
                          <div>
                            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                              <Sparkles size={14} className="text-[#22d3ee]" /> Option 1: Quick Random Problem
                            </span>
                            <p className="text-[11px] text-muted mt-1">
                              AI generates a surprise algorithmic bug in {selectedBugLang.toUpperCase()}.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleGenerateBugTemplate(true)}
                            disabled={isGeneratingBug}
                            className="w-full text-xs font-semibold flex items-center justify-center gap-1.5 bg-[#22d3ee]/20 hover:bg-[#22d3ee]/30 text-[#22d3ee] border border-[#22d3ee]/40"
                          >
                            {isGeneratingBug ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 border-2 border-[#22d3ee] border-t-transparent rounded-full animate-spin" />
                                <span>Generating Problem…</span>
                              </div>
                            ) : (
                              <>
                                <Sparkles size={13} /> Generate Random Buggy Problem
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Option 2: Custom Prompt */}
                        <div className="p-3.5 rounded-xl bg-surface-2/40 border border-border/40 flex flex-col justify-between space-y-2.5">
                          <div>
                            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                              <Terminal size={14} className="text-primary" /> Option 2: Custom Problem / Bug
                            </span>
                            <input
                              value={bugPromptInput}
                              onChange={(e) => setBugPromptInput(e.target.value)}
                              placeholder="e.g. Binary Search off-by-one..."
                              className="w-full text-xs bg-surface/70 border border-border/40 rounded-lg px-2.5 py-1.5 text-text-primary placeholder:text-muted outline-none focus:border-[#22d3ee]/50 mt-1.5 transition-colors"
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleGenerateBugTemplate(false)}
                            disabled={isGeneratingBug}
                            className="w-full text-xs font-semibold flex items-center justify-center gap-1.5"
                          >
                            {isGeneratingBug ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span>Generating…</span>
                              </div>
                            ) : (
                              <>
                                <Wrench size={13} /> Generate from Topic
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Challenge Preview */}
                  {template && (
                    <div className="p-3.5 rounded-xl bg-surface/60 border border-[#22d3ee]/25 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-primary">
                            {template.title || 'Current Bug Challenge'}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#22d3ee]/20 text-[#22d3ee] uppercase font-bold">
                            {template.language || selectedBugLang}
                          </span>
                        </div>
                        <span className="text-[11px] text-success font-medium flex items-center gap-1">
                          <Check size={12} /> Ready for all racers
                        </span>
                      </div>
                      {template.description && (
                        <p className="text-xs text-text-secondary bg-surface-2/40 p-2.5 rounded-lg border border-border/30">
                          <strong>Objective:</strong> {template.description}
                        </p>
                      )}
                      <div className="relative font-mono text-xs p-3 rounded-lg bg-background/80 border border-border/40 text-muted max-h-36 overflow-y-auto">
                        <pre className="whitespace-pre-wrap">{template.buggyCode || template.code}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Start panel */}
            <div className="space-y-4">

              {/* ── Selected Template Preview (for non BUG_FIX modes) ── */}
              {roomMode !== 'BUG_FIX' && (selectedTemplate || template) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-4 border border-primary/25 bg-primary/5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Code2 size={12} /> Current Template
                    </h4>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-primary/20 text-primary rounded">
                      {(selectedTemplate || template)?.language}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-text-primary truncate">
                    {(selectedTemplate || template)?.title || 'Race Template'}
                  </p>
                  <pre className="text-[10px] text-muted font-mono bg-background/60 rounded-lg p-2 overflow-hidden line-clamp-3 border border-border/30">
                    {((selectedTemplate || template)?.code || '').slice(0, 120)}…
                  </pre>
                </motion.div>
              )}

              <div className="glass-card p-5 border border-border/30 space-y-4">
                <h3 className="font-semibold text-text-primary text-sm">
                  {roomMode === 'BUG_FIX' ? 'Start Bug Fix Race' : 'Start Race'}
                </h3>

                {isHost ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted">
                      {roomMode === 'BUG_FIX'
                        ? 'Ensure a bug challenge is generated above, then start the debugging race!'
                        : "You're the host. Select a code template and start the race whenever everyone's ready."}
                    </p>
                    {roomMode !== 'BUG_FIX' && (
                      <Button
                        onClick={() => setShowTemplateModal(true)}
                        variant="outline"
                        size="sm"
                        className="w-full text-xs flex items-center justify-center gap-1.5 border-primary/40 text-primary"
                      >
                        <Code2 size={14} /> Change Code Template
                      </Button>
                    )}
                    <Button
                      onClick={handleStartRace}
                      disabled={playerCount < 2}
                      className="w-full font-bold"
                      size="lg"
                    >
                      <Flag size={16} /> Start Race
                    </Button>
                    {playerCount < 2 && (
                      <p className="text-xs text-muted text-center">
                        Need at least 2 players
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-text-secondary text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      Waiting for host to start…
                    </div>
                    <p className="text-xs text-muted">
                      The host will start the race when everyone's ready.
                    </p>
                  </div>
                )}
              </div>

              {/* Bot fallback after 20s alone */}
              <AnimatePresence>
                {botFallbackVisible && playerCount < 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="glass-card p-4 border border-[#f97316]/25 bg-[#f97316]/5 space-y-3"
                  >
                    <div className="flex items-center gap-2 text-[#f97316] font-semibold text-sm">
                      <Cpu size={14} /> Race against a Bot instead?
                    </div>
                    <p className="text-xs text-muted">
                      No one's joined yet. Challenge an AI boss tuned to your WPM!
                    </p>
                    <Button
                      onClick={handleBotFallback}
                      variant="outline"
                      size="sm"
                      className="w-full border-[#f97316]/40 text-[#f97316] hover:bg-[#f97316]/10"
                    >
                      🤖 Start Boss Fight
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            RACING STATE — Two-column layout
        ══════════════════════════════════════════════════════════════════ */}
        {(roomState === 'racing' || roomState === 'countdown') && roomState !== 'finished' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start"
          >
            {/* LEFT — Workspace Area */}
            <div className="space-y-3">
              {roomMode === 'BUG_FIX' ? (
                /* ── BUG FIX WORKSPACE (Interactive Editor + AI Grader) ── */
                <div className="space-y-4">
                  {/* Bug Fix Header & Stopwatch */}
                  <div className="glass-card px-5 py-3 flex items-center justify-between flex-wrap gap-3 border border-[#22d3ee]/30 bg-[#22d3ee]/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-[#22d3ee]/20 text-[#22d3ee]">
                        <Bug size={20} />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                          {template?.title || 'Bug Fix Challenge'}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#22d3ee]/20 text-[#22d3ee] uppercase font-bold">
                            {template?.language || selectedBugLang}
                          </span>
                        </h2>
                        <p className="text-xs text-muted">Modify the code to fix the bugs and submit for AI verification.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface/80 border border-border/40 shadow-sm">
                        <Clock size={14} className="text-[#22d3ee] animate-pulse" />
                        <span className="font-mono font-black text-sm text-text-primary">
                          {raceElapsedSec.toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Objective Card */}
                  {template?.description && (
                    <div className="glass-card p-4 border border-border/40 bg-surface/50 space-y-1">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#22d3ee] flex items-center gap-1.5">
                        <Terminal size={13} /> Objective
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {template.description}
                      </p>
                    </div>
                  )}

                  {/* Interactive Code Editor */}
                  <div className="glass-card border border-primary/20 overflow-hidden flex flex-col rounded-2xl">
                    <div className="px-4 py-2.5 bg-surface-2/60 border-b border-border/40 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
                        <Code2 size={13} className="text-primary" />
                        Editable Workspace ({template?.language || selectedBugLang})
                      </span>
                      <button
                        onClick={() => {
                          setBugCodeInput(template?.buggyCode || template?.code || '');
                          setBugFeedback(null);
                          toast('Code reset to original challenge', { icon: '🔄' });
                        }}
                        disabled={bugSolved}
                        className="text-xs text-muted hover:text-text-primary px-2.5 py-1 rounded-lg border border-border/40 hover:bg-surface-2 transition-colors flex items-center gap-1"
                      >
                        <RotateCcw size={12} /> Reset Code
                      </button>
                    </div>

                    <div className="relative p-2 bg-[#0d1117]">
                      {/* Countdown Overlay */}
                      <AnimatePresence>
                        {roomState === 'countdown' && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-2xl z-10 flex flex-col items-center justify-center gap-2"
                          >
                            <p className="text-primary text-base font-bold">Race starts in {countdown}…</p>
                            <p className="text-muted text-xs">Review the problem objective above!</p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <textarea
                        value={bugCodeInput}
                        onChange={(e) => setBugCodeInput(e.target.value)}
                        disabled={bugSolved || isVerifyingBug || roomState === 'countdown'}
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            const start = e.target.selectionStart;
                            const end = e.target.selectionEnd;
                            const val = e.target.value;
                            setBugCodeInput(val.substring(0, start) + '  ' + val.substring(end));
                            setTimeout(() => {
                              e.target.selectionStart = e.target.selectionEnd = start + 2;
                            }, 0);
                          }
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            handleSubmitBugFix();
                          }
                        }}
                        className="w-full h-80 bg-transparent text-sm font-mono text-slate-100 p-3 outline-none resize-y leading-relaxed"
                        placeholder="Fix the bugs in this code..."
                        spellCheck={false}
                      />
                    </div>

                    {/* Submit Fix Toolbar */}
                    <div className="p-4 bg-surface-2/40 border-t border-border/40 flex items-center justify-between flex-wrap gap-3">
                      <span className="text-xs text-muted">
                        Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border/50 font-mono text-[10px]">Ctrl+Enter</kbd> or click submit
                      </span>
                      <Button
                        onClick={handleSubmitBugFix}
                        disabled={isVerifyingBug || bugSolved || !bugCodeInput.trim() || roomState === 'countdown'}
                        className="px-6 font-bold flex items-center gap-2 bg-[#22d3ee] hover:bg-[#06b6d4] text-black"
                      >
                        {isVerifyingBug ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            <span>Verifying with AI…</span>
                          </div>
                        ) : bugSolved ? (
                          <>
                            <CheckCircle2 size={16} /> Bug Fixed!
                          </>
                        ) : (
                          <>
                            <Send size={15} /> Submit Fix
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Feedback Output Box */}
                  <AnimatePresence>
                    {bugFeedback && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`p-4 rounded-xl border flex items-start gap-3 ${
                          bugFeedback.correct
                            ? 'bg-success/10 border-success/30 text-success'
                            : 'bg-error/10 border-error/30 text-error'
                        }`}
                      >
                        {bugFeedback.correct ? (
                          <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
                        ) : (
                          <XCircle size={20} className="shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm">
                            {bugFeedback.correct ? 'Verification Passed! Bug Fixed!' : 'Test Failed / Bug Detected'}
                          </h4>
                          <p className="text-xs mt-1 leading-relaxed text-text-primary">
                            {bugFeedback.feedback}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                /* ── STANDARD TYPING ARENA ── */
                <>
                  {/* Compact stats bar */}
                  <div className="glass-card px-4 py-2.5 flex items-center gap-5 border border-border/30">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Zap size={13} className="text-primary" />
                      <span className="font-mono font-bold text-primary">{wpm}</span>
                      <span className="text-muted text-xs">WPM</span>
                    </div>
                    <div className="w-px h-4 bg-border" />
                    <div className="flex items-center gap-1.5 text-sm">
                      <Check size={13} className="text-success" />
                      <span className="font-mono font-bold text-success">{Math.round(accuracy)}%</span>
                      <span className="text-muted text-xs">acc</span>
                    </div>
                    <div className="w-px h-4 bg-border" />
                    <div className="flex items-center gap-1.5 text-sm">
                      <Clock size={13} className="text-muted" />
                      <span className="font-mono font-bold text-text-secondary">
                        {Math.floor(elapsedTime)}s
                      </span>
                    </div>
                    <div className="ml-auto text-xs text-muted">
                      {currentIndex} / {typedChars.length} chars
                    </div>
                  </div>

                  {/* Typing code area */}
                  <div className="glass-card p-5 border border-primary/20 relative min-h-[380px] flex flex-col">
                    <AnimatePresence>
                      {roomState === 'countdown' && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-background/70 backdrop-blur-sm rounded-2xl z-10 flex items-center justify-center"
                        >
                          <p className="text-muted text-sm font-medium">Prepare yourself…</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex-1 overflow-auto max-h-[55vh] no-scrollbar">
                      {typedChars.length > 0 ? (
                        <TypingArea
                          typedChars={typedChars}
                          currentIndex={currentIndex}
                          fontSize={15}
                        />
                      ) : (
                        <div className="text-muted text-sm py-12 text-center">
                          Loading code snippet…
                        </div>
                      )}
                    </div>

                    <div className="pt-3 mt-3 border-t border-border/30">
                      <div className="flex justify-between text-xs text-muted mb-1">
                        <span>Your progress</span>
                        <span>{myPlayer ? Math.round(myPlayer.progress) : 0}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          animate={{ width: `${myPlayer?.progress || 0}%` }}
                          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* RIGHT — Race Track / Players Status Sidebar (35%) */}
            <div className="lg:sticky lg:top-6 space-y-3">
              <div className="glass-card p-3 border border-border/30">
                {/* Race track header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
                    {roomMode === 'BUG_FIX' ? 'Debuggers Status' : 'Race Track'}
                  </h3>
                  <span className="text-[11px] text-muted">{playerCount} players</span>
                </div>

                {/* Lanes or Bug Status */}
                {roomMode === 'BUG_FIX' ? (
                  <div className="space-y-2">
                    {allPlayers.map((player, i) => (
                      <div
                        key={player.id || i}
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          player.id === myUserId
                            ? 'bg-[#22d3ee]/10 border-[#22d3ee]/30'
                            : 'bg-surface-2/40 border-border/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{
                              backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] + '30',
                              color: PLAYER_COLORS[i % PLAYER_COLORS.length],
                            }}
                          >
                            {(player.name || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-text-primary truncate">
                            {player.name} {player.id === myUserId && '(you)'}
                          </span>
                        </div>
                        <div>
                          {player.placement ? (
                            <span className="text-[11px] font-bold text-success flex items-center gap-1 bg-success/15 px-2 py-0.5 rounded-lg border border-success/30">
                              <Check size={11} /> {player.timeTakenSec ? `${Number(player.timeTakenSec).toFixed(1)}s` : 'Solved'}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" /> Debugging…
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {allPlayers.map((player, i) => (
                      <RaceLane
                        key={player.id}
                        player={player}
                        colorIndex={i}
                        isMe={player.id === myUserId}
                        divider={i < allPlayers.length - 1}
                      />
                    ))}
                  </div>
                )}

                {/* Chat */}
                <ChatBox
                  messages={chatMessages}
                  onSend={handleSendChat}
                  collapsed={chatCollapsed}
                  onToggle={() => setChatCollapsed(c => !c)}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            FINISHED STATE — Results
        ══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {roomState === 'finished' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start"
            >
              {/* Left: main results card */}
              <div className="glass-card p-8 border border-primary/30 space-y-6">
                <div className="text-center">
                  <div className="text-5xl mb-3">🏁</div>
                  <h2 className="text-2xl font-black text-text-primary">
                    {roomMode === 'BUG_FIX' ? 'Bug Fix Leaderboard' : 'Match Report'}
                  </h2>
                  <p className="text-muted text-sm mt-1">
                    {roomMode === 'BUG_FIX'
                      ? `${sortedResults[0]?.name} fixed the bug fastest in ${
                          sortedResults[0]?.timeTakenSec
                            ? Number(sortedResults[0].timeTakenSec).toFixed(1) + 's'
                            : 'record time'
                        }! 🏆`
                      : `${sortedResults[0]?.name} won the race with ${sortedResults[0]?.wpm || 0} WPM!`}
                  </p>
                </div>

                {/* ── Challenge Summary & Personal Performance ── */}
                <div className="p-4 rounded-xl bg-surface-2/40 border border-border/40 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {roomMode === 'BUG_FIX' ? (
                        <Bug size={16} className="text-[#22d3ee]" />
                      ) : (
                        <Code2 size={16} className="text-primary" />
                      )}
                      <span className="font-semibold text-sm text-text-primary">
                        {template?.title || selectedTemplate?.title || 'Coding Challenge'}
                      </span>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 text-primary uppercase font-bold">
                      {template?.language || selectedTemplate?.language || 'Code'}
                    </span>
                  </div>

                  {/* Personal performance chips */}
                  {(() => {
                    const myResult = sortedResults.find(p => p.id === myUserId);
                    if (!myResult) return null;

                    if (roomMode === 'BUG_FIX') {
                      return (
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30 text-center">
                          <div className="p-2.5 rounded-lg bg-surface/60 border border-border/30">
                            <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Time Taken</p>
                            <p className="text-lg font-black font-mono text-[#22d3ee] mt-0.5">
                              {myResult.timeTakenSec ? `${Number(myResult.timeTakenSec).toFixed(1)}s` : (myResult.placement ? 'Done' : 'DNF')}
                            </p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-surface/60 border border-border/30">
                            <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Status</p>
                            <p className="text-lg font-black font-mono text-success mt-0.5">
                              {myResult.placement ? 'Solved' : 'Incomplete'}
                            </p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-surface/60 border border-border/30">
                            <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Rank</p>
                            <p className="text-lg font-black font-mono text-amber-400 mt-0.5">
                              {placementLabel(myResult.placement || 1)}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30 text-center">
                        <div className="p-2.5 rounded-lg bg-surface/60 border border-border/30">
                          <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Your Speed</p>
                          <p className="text-lg font-black font-mono text-primary mt-0.5">{myResult.wpm || 0} WPM</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-surface/60 border border-border/30">
                          <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Accuracy</p>
                          <p className="text-lg font-black font-mono text-success mt-0.5">{Math.round(myResult.accuracy || 0)}%</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-surface/60 border border-border/30">
                          <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Rank</p>
                          <p className="text-lg font-black font-mono text-amber-400 mt-0.5">
                            {placementLabel(myResult.placement || 1)}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Final Standings / Temporary Leaderboard */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">
                    {roomMode === 'BUG_FIX' ? 'Race Standings (Ranked by Time Taken)' : `Final Standings (${sortedResults.length} Players)`}
                  </h4>
                  {sortedResults.map((player, rank) => {
                    const isDnf = player.dnf === true || player.placement === -1;
                    return (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: rank * 0.07 }}
                        className={`flex items-center justify-between p-4 rounded-xl border ${
                          isDnf
                            ? 'bg-red-950/10 border-red-400/20 opacity-70'
                            : rank === 0
                            ? 'bg-yellow-400/5 border-yellow-400/25'
                            : 'bg-surface-2/30 border-border/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* BUG-H07: use the actual placement from server, not rank+1 fallback */}
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${placementColor(isDnf ? -1 : player.placement)}`}>
                            {isDnf ? '💀 DNF' : placementLabel(player.placement)}
                          </span>
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{
                              backgroundColor: PLAYER_COLORS[rank % PLAYER_COLORS.length] + '30',
                              color: PLAYER_COLORS[rank % PLAYER_COLORS.length],
                            }}
                          >
                            {(player.name || '?')[0].toUpperCase()}
                          </div>
                          <span className={`font-semibold text-sm ${
                            player.id === myUserId ? 'text-primary' : 'text-text-primary'
                          }`}>
                            {player.name}
                            {player.id === myUserId && <span className="text-muted text-xs ml-1">(you)</span>}
                          </span>
                        </div>
                        <div className="text-right">
                          {isDnf ? (
                            <div>
                              <div className="text-sm font-bold text-red-400">Did Not Finish</div>
                              <div className="text-[11px] text-muted">{Math.round(player.progress || 0)}% complete</div>
                            </div>
                          ) : roomMode === 'BUG_FIX' ? (
                            <div>
                              <div className="text-lg font-black font-mono text-[#22d3ee]">
                                {player.timeTakenSec ? `${Number(player.timeTakenSec).toFixed(1)}s` : (player.placement ? 'Solved' : 'DNF')}
                              </div>
                              <div className="text-[11px] text-muted">
                                {player.placement ? 'Time to Fix' : 'Incomplete'}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-lg font-black font-mono text-text-primary">
                                {player.wpm || 0}
                                <span className="text-xs font-normal text-muted ml-1">WPM</span>
                              </div>
                              <div className="text-[11px] text-muted">
                                {Math.round(player.accuracy || 0)}% acc
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleRematch}
                    variant="outline"
                    className="flex-1"
                  >
                    Rematch
                  </Button>
                  <Button
                    onClick={handleLeaveRoom}
                    className="flex-1 font-semibold flex items-center justify-center gap-2"
                  >
                    <LogOut size={16} /> Exit to Multiplayer
                  </Button>
                </div>
              </div>

              {/* Right: final snapshot */}
              <div className="glass-card p-3 border border-border/30">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 px-1">
                  {roomMode === 'BUG_FIX' ? 'Challenge Code Snapshot' : 'Race Track — Final'}
                </h3>
                {roomMode === 'BUG_FIX' ? (
                  <div className="p-3 rounded-lg bg-surface-2/40 border border-border/30 text-xs font-mono space-y-2">
                    <div className="text-[11px] text-[#22d3ee] font-bold">Solution Reference</div>
                    <pre className="text-[10px] text-muted max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {template?.code || template?.buggyCode}
                    </pre>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {sortedResults.map((player, i) => (
                      <RaceLane
                        key={player.id}
                        // BUG-H07: show actual progress for DNF players, 100 for finishers
                        player={{ ...player, progress: (player.dnf || player.placement === -1) ? (player.progress || 0) : 100 }}
                        colorIndex={i}
                        isMe={player.id === myUserId}
                        divider={i < sortedResults.length - 1}
                      />
                    ))}
                  </div>
                )}

                <ChatBox
                  messages={chatMessages}
                  onSend={handleSendChat}
                  collapsed={chatCollapsed}
                  onToggle={() => setChatCollapsed(c => !c)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Host Template Selector Modal ── */}
        <AnimatePresence>
          {showTemplateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-card p-6 border border-primary/30 max-w-xl w-full max-h-[80vh] flex flex-col space-y-4 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
                    <Code2 size={18} className="text-primary" /> Choose Code Template for Race
                  </h3>
                  <button
                    onClick={() => setShowTemplateModal(false)}
                    className="p-1 rounded-lg text-muted hover:text-text-primary hover:bg-surface-2"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-muted">
                  Select a presaved template below. Everyone in the room will automatically switch to your selected snippet!
                </p>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {availableTemplates.length > 0 ? (
                    availableTemplates.map((tpl, tplIdx) => (
                      <div
                        key={tpl.id ? `${tpl.id}-${tplIdx}` : `tpl-${tplIdx}`}
                        onClick={() => handleSelectTemplate(tpl)}
                        className="p-3.5 rounded-xl bg-surface-2/40 border border-border/40 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-bold text-sm text-text-primary group-hover:text-primary transition-colors flex items-center gap-2">
                            {tpl.title}
                            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono">
                              {tpl.language}
                            </span>
                          </div>
                          <p className="text-xs text-muted font-mono mt-1 line-clamp-1 opacity-80">
                            {tpl.code?.slice(0, 60)}…
                          </p>
                        </div>
                        <Button size="sm" variant="ghost" className="text-xs font-semibold shrink-0">
                          Select →
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted text-xs">
                      Loading available templates…
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border/30 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowTemplateModal(false)}>
                    Close
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </AppLayout>
  );
};

const MultiplayerRoomWrapped = (props) => (
  <RoomErrorBoundary>
    <MultiplayerRoom {...props} />
  </RoomErrorBoundary>
);

export default MultiplayerRoomWrapped;


