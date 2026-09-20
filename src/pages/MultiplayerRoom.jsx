import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@websocket/useSocket';
import { WS_EVENTS } from '@websocket/events';
import { useAuthStore } from '@store/auth.store';
import { useTyping } from '@hooks/useTyping';
import { multiplayerApi } from '@api/multiplayer.api';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@layouts/AppLayout';
import { Avatar, Badge } from '@components/common/Badge';
import { Button } from '@components/common/Button';
import { TypingArea } from '@components/typing/TypingArea';
import { Users, Check, ArrowRight, Trophy, Monitor, Eye, Sparkles } from 'lucide-react';
import { ROUTES } from '@constants';

const DEMO_TEMPLATE = {
  id: 'mp_001',
  title: 'QuickSort Partition',
  language: 'javascript',
  code: `function partition(arr, low, high) {
  let pivot = arr[high];
  let i = low - 1;
  for (let j = low; j < high; j++) {
    if (arr[j] < pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
  return i + 1;
}`,
};

const DEMO_PLAYERS = [
  { id: 'p1', name: 'You (SpeedCoder)', isReady: true, progress: 0, wpm: 0, accuracy: 100 },
  { id: 'p2', name: 'JavaNinja (Friend)', isReady: true, progress: 0, wpm: 0, accuracy: 98 },
];

export const OpponentScreenPreview = ({ opponent, templateCode }) => {
  const charArray = templateCode ? templateCode.split('') : [];
  const opponentIndex = Math.floor((opponent.progress / 100) * charArray.length);

  return (
    <div className="glass-card p-5 border border-primary/20 bg-surface/50 relative flex flex-col justify-between h-full min-h-[380px]">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <Avatar name={opponent.name} size="sm" />
          <div>
            <h4 className="font-semibold text-xs text-text-primary">{opponent.name}</h4>
            <div className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Screen View</span>
            </div>
          </div>
        </div>
        <Badge variant="primary" size="sm" className="flex items-center gap-1">
          <Eye size={12} /> Sync
        </Badge>
      </div>

      {/* Screen Monitor Simulation */}
      <div className="my-4 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 font-mono text-xs leading-relaxed overflow-hidden relative flex-1 min-h-[220px]">
        {/* Scanline decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none opacity-40" />

        <div className="whitespace-pre-wrap select-none">
          {charArray.map((ch, idx) => {
            const isTyped = idx < opponentIndex;
            const isCursor = idx === opponentIndex;
            const displayChar = ch === ' ' ? '\u00A0' : ch;

            return (
              <span
                key={idx}
                className={`relative ${
                  isTyped
                    ? 'text-emerald-400 font-medium'
                    : isCursor
                    ? 'text-text-primary underline bg-primary/30'
                    : 'text-zinc-600'
                }`}
              >
                {displayChar}
                {isCursor && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-block w-1.5 h-4 bg-primary align-middle ml-0.5"
                  />
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Live status footer (No mid-contest scores!) */}
      <div className="pt-2 border-t border-border/30 flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-1.5 font-medium text-text-secondary">
          <Monitor size={14} className="text-primary" /> Live Opponent Arena
        </span>
        <span className="text-[11px] text-muted">Score revealed post-match 🔒</span>
      </div>
    </div>
  );
};

const MultiplayerRoom = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { emit, on, isConnected } = useSocket();
  const [roomState, setRoomState] = useState('waiting'); // waiting | countdown | racing | finished
  const [countdown, setCountdown] = useState(3);
  const [players, setPlayers] = useState(DEMO_PLAYERS);
  const [winner, setWinner] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const {
    template, typedChars, currentIndex, wpm, accuracy, status,
    setTemplate, reset
  } = useTyping();

  const { data: roomInfo } = useQuery({
    queryKey: ['room', roomCode],
    queryFn: () => multiplayerApi.getRoomInfo(roomCode),
    select: d => d.data,
  });

  // Initialize contest template
  useEffect(() => {
    setTemplate(roomInfo?.template || DEMO_TEMPLATE);
  }, [roomInfo]);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribers = [
      on(WS_EVENTS.ROOM_UPDATE, (data) => setPlayers(data.players)),
      on(WS_EVENTS.COUNTDOWN, (data) => {
        setRoomState('countdown');
        setCountdown(data.count);
        if (data.count === 0) setRoomState('racing');
      }),
      on(WS_EVENTS.PLAYER_PROGRESS, (data) => {
        setPlayers(prev => prev.map(p => p.id === data.playerId ? { ...p, progress: data.progress, wpm: data.wpm } : p));
      }),
      on(WS_EVENTS.RACE_FINISH, (data) => {
        setWinner(data.winner);
        setRoomState('finished');
      }),
    ];

    emit(WS_EVENTS.ROOM_JOIN, { roomCode, userId: user?.id });
    return () => unsubscribers.forEach(fn => fn?.());
  }, [isConnected]);

  // Update user progress to server / opponent
  useEffect(() => {
    if (roomState !== 'racing' || typedChars.length === 0) return;
    const progress = Math.min(Math.round((currentIndex / typedChars.length) * 100), 100);

    setPlayers(prev => prev.map(p => p.id === 'p1' ? { ...p, progress, wpm, accuracy } : p));

    // Emit live progress over WS
    emit(WS_EVENTS.PLAYER_PROGRESS, { roomCode, userId: user?.id, progress, wpm });

    // Check if current user finished
    if (progress >= 100 && roomState === 'racing') {
      setTimeout(() => {
        setWinner(user?.name || 'You (SpeedCoder)');
        setRoomState('finished');
      }, 300);
    }
  }, [currentIndex, typedChars.length, roomState]);

  // Simulate opponent typing during race
  useEffect(() => {
    if (roomState !== 'racing') return;
    const interval = setInterval(() => {
      setPlayers(prev => prev.map(p => {
        if (p.id === 'p1') return p;
        const newProgress = Math.min(p.progress + Math.random() * 4 + 1, 100);
        const newWpm = Math.floor(65 + Math.random() * 25);
        if (newProgress >= 100 && roomState === 'racing') {
          setWinner(p.name);
          setRoomState('finished');
        }
        return { ...p, progress: newProgress, wpm: newWpm };
      }));
    }, 450);

    return () => clearInterval(interval);
  }, [roomState]);

  const handleReady = () => {
    setIsReady(true);
    emit(WS_EVENTS.PLAYER_READY, { roomCode, userId: user?.id });
    setPlayers(prev => prev.map(p => p.id === 'p1' ? { ...p, isReady: true } : p));
  };

  const handleStartRace = () => {
    setRoomState('countdown');
    let count = 3;
    const cd = setInterval(() => {
      setCountdown(count);
      count--;
      if (count < 0) {
        clearInterval(cd);
        setRoomState('racing');
      }
    }, 1000);
  };

  const opponentPlayer = players.find(p => p.id !== 'p1') || DEMO_PLAYERS[1];
  const sortedPlayers = [...players].sort((a, b) => (b.wpm || b.progress) - (a.wpm || a.progress));

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy size={22} className="text-primary" /> Multiplayer Race Room
            </h1>
            <p className="text-muted text-sm mt-1">
              Room Code: <span className="font-mono text-primary font-bold">{roomCode}</span>
              · Mode: <span className="text-text-primary font-medium">Dual Screen Contest</span>
            </p>
          </div>

          {roomState === 'waiting' && !isReady && (
            <Button onClick={handleReady} className="flex items-center gap-2">
              <Check size={16} /> Ready
            </Button>
          )}
          {isReady && roomState === 'waiting' && (
            <Badge variant="success" size="lg">Ready — Waiting for Host...</Badge>
          )}
        </div>

        {/* Countdown Overlay */}
        <AnimatePresence>
          {roomState === 'countdown' && (
            <motion.div
              initial={{ opacity: 0, scale: 2 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/85 backdrop-blur-md z-50 flex items-center justify-center"
            >
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="text-9xl font-black text-primary font-mono tracking-tighter"
              >
                {countdown || 'GO!'}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RACING STATE: SIDE-BY-SIDE DUAL SCREEN ARENA */}
        {roomState === 'racing' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
          >
            {/* Main Screen: User's Typing Screen (Left 7 Columns) */}
            <div className="lg:col-span-7 flex flex-col space-y-3">
              <div className="glass-card p-6 border border-primary/30 relative flex-1 flex flex-col justify-between min-h-[380px]">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <Avatar name={user?.name || 'You'} size="sm" />
                    <span className="font-semibold text-sm text-text-primary">Your Screen</span>
                    <Badge variant="primary" size="sm">Active Contest</Badge>
                  </div>
                  <span className="text-xs text-muted">Smart Auto-Indent ON</span>
                </div>

                <div className="my-4 overflow-auto max-h-[50vh] no-scrollbar">
                  {typedChars.length > 0 ? (
                    <TypingArea
                      typedChars={typedChars}
                      currentIndex={currentIndex}
                      fontSize={16}
                    />
                  ) : (
                    <div className="text-muted text-sm py-12 text-center">Loading code arena...</div>
                  )}
                </div>

                <div className="pt-2 border-t border-border/30 flex items-center justify-between text-xs text-muted">
                  <span>Keep typing to beat your opponent! ⚡</span>
                  <span className="text-primary font-medium">Scores hidden until match ends</span>
                </div>
              </div>
            </div>

            {/* Friend's Screen: Live Screen Feed (Right 5 Columns) */}
            <div className="lg:col-span-5 flex flex-col">
              <OpponentScreenPreview
                opponent={opponentPlayer}
                templateCode={template?.code || DEMO_TEMPLATE.code}
              />
            </div>
          </motion.div>
        )}

        {/* LOBBY / WAITING STATE */}
        {roomState === 'waiting' && (
          <div className="space-y-6">
            <div className="glass-card p-5">
              <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Users size={16} className="text-primary" /> Contestants Joined ({players.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {players.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-4 rounded-xl bg-surface-2/40 border border-border/40">
                    <Avatar name={p.name} size="md" />
                    <div>
                      <h4 className="font-semibold text-sm text-text-primary">{p.name}</h4>
                      <p className="text-xs text-muted">{p.isReady ? 'Ready for contest' : 'Preparing...'}</p>
                    </div>
                    {p.isReady && <Badge variant="success" size="sm" className="ml-auto">Ready</Badge>}
                  </div>
                ))}
              </div>
            </div>

            <Button size="lg" className="w-full font-bold py-3" onClick={handleStartRace}>
              Start Match <ArrowRight size={18} />
            </Button>
          </div>
        )}

        {/* MATCH FINISHED: REVEAL POST-MATCH SCOREBOARD */}
        <AnimatePresence>
          {roomState === 'finished' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 border border-primary/40 bg-surface/80 text-center space-y-6 max-w-2xl mx-auto shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto text-3xl">
                🏆
              </div>
              <div>
                <Badge variant="primary" size="lg" className="mb-2">Match Finished</Badge>
                <h2 className="text-3xl font-black text-primary">{winner} Won the Race!</h2>
                <p className="text-text-secondary text-sm mt-1">Scores & performance stats are now unlocked!</p>
              </div>

              {/* Leaderboard Breakdown Table */}
              <div className="space-y-3 text-left">
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">Final Match Leaderboard</h4>
                {sortedPlayers.map((player, rank) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-4 rounded-xl border ${
                      rank === 0 ? 'bg-primary/10 border-primary/30' : 'bg-surface-2/30 border-border/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        rank === 0 ? 'bg-primary text-zinc-950' : 'bg-surface-2 text-muted'
                      }`}>
                        #{rank + 1}
                      </span>
                      <Avatar name={player.name} size="sm" />
                      <span className="font-semibold text-sm text-text-primary">{player.name}</span>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-lg font-black font-mono text-primary">{player.wpm || 72} WPM</div>
                        <div className="text-[11px] text-muted">{player.accuracy || 98}% Accuracy</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={() => { setRoomState('waiting'); reset(); }} variant="outline" className="flex-1">
                  Rematch
                </Button>
                <Button onClick={() => navigate(ROUTES.MULTIPLAYER)} variant="primary" className="flex-1">
                  Back to Lobby
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default MultiplayerRoom;
