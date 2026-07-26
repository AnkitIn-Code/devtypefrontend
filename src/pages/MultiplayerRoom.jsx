import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@websocket/useSocket';
import { WS_EVENTS } from '@websocket/events';
import { useAuthStore } from '@store/auth.store';
import { multiplayerApi } from '@api/multiplayer.api';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@layouts/AppLayout';
import { Avatar, Badge } from '@components/common/Badge';
import { Button } from '@components/common/Button';
import { Users, Check, ArrowRight, Crown, Trophy } from 'lucide-react';
import { ROUTES } from '@constants';

// Mock players for demo
const DEMO_PLAYERS = [
  { id: 'p1', name: 'SpeedCoder', isReady: true, progress: 0, wpm: 0 },
  { id: 'p2', name: 'JavaNinja', isReady: false, progress: 0, wpm: 0 },
  { id: 'p3', name: 'ReactPro', isReady: true, progress: 0, wpm: 0 },
];

const PlayerRow = ({ player, rank, isCurrentUser }) => (
  <motion.div
    layout
    className={`flex items-center gap-4 p-4 rounded-xl ${isCurrentUser ? 'bg-primary/10 border border-primary/20' : 'bg-surface-2/30'}`}
  >
    <div className="w-8 text-center font-bold text-muted">{rank}</div>
    <Avatar name={player.name} size="sm" />
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm text-text-primary">{player.name}</span>
        {isCurrentUser && <Badge variant="primary" size="sm">You</Badge>}
        {player.isReady && <Badge variant="success" size="sm">Ready</Badge>}
      </div>
      <div className="mt-2 h-2 bg-surface rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-yellow-300 rounded-full"
          animate={{ width: `${player.progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
    <div className="text-right shrink-0">
      <div className="text-primary font-bold font-mono">{player.wpm || '--'}</div>
      <div className="text-xs text-muted">WPM</div>
    </div>
  </motion.div>
);

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

  const { data: roomInfo } = useQuery({
    queryKey: ['room', roomCode],
    queryFn: () => multiplayerApi.getRoomInfo(roomCode),
    select: d => d.data,
  });

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

    return () => {
      unsubscribers.forEach(fn => fn?.());
    };
  }, [isConnected]);

  // Simulate race for demo
  useEffect(() => {
    if (roomState !== 'racing') return;
    const interval = setInterval(() => {
      setPlayers(prev => prev.map(p => ({
        ...p,
        progress: Math.min(p.progress + Math.random() * 8, 100),
        wpm: Math.floor(60 + Math.random() * 60),
      })));
    }, 500);
    return () => clearInterval(interval);
  }, [roomState]);

  const handleReady = () => {
    setIsReady(true);
    emit(WS_EVENTS.PLAYER_READY, { roomCode, userId: user?.id });
    setPlayers(prev => prev.map(p => p.id === 'p1' ? { ...p, isReady: true } : p));
  };

  const sortedPlayers = [...players].sort((a, b) => b.progress - a.progress);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy size={22} className="text-primary" /> Race Room
            </h1>
            <p className="text-muted text-sm mt-1">
              Code: <span className="font-mono text-primary font-bold">{roomCode}</span>
              · {players.length} players
              · <span className={`font-medium ${isConnected ? 'text-success' : 'text-error'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </p>
          </div>

          {roomState === 'waiting' && !isReady && (
            <Button onClick={handleReady} className="flex items-center gap-2">
              <Check size={16} /> Ready
            </Button>
          )}
          {isReady && roomState === 'waiting' && (
            <Badge variant="success" size="lg">Waiting for others...</Badge>
          )}
        </div>

        {/* Countdown overlay */}
        <AnimatePresence>
          {roomState === 'countdown' && (
            <motion.div
              initial={{ opacity: 0, scale: 2 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
            >
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="text-9xl font-black text-primary"
              >
                {countdown || 'GO!'}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Winner banner */}
        <AnimatePresence>
          {roomState === 'finished' && winner && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 border border-primary/30 bg-primary/10 text-center"
            >
              <div className="text-5xl mb-2">🎉</div>
              <h2 className="text-2xl font-bold text-primary">{winner} Wins!</h2>
              <p className="text-text-secondary mt-2">Amazing race! Great coding everyone.</p>
              <Button onClick={() => navigate(ROUTES.MULTIPLAYER)} className="mt-4" variant="outline">
                Back to Lobby
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Template Info */}
        {roomInfo?.template && (
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-xl">💻</span>
            </div>
            <div>
              <p className="font-medium text-text-primary text-sm">{roomInfo.template.title}</p>
              <p className="text-xs text-muted">{roomInfo.template.language} · Next challenge</p>
            </div>
            <Badge variant="primary" size="sm" className="ml-auto">{roomInfo.template.language}</Badge>
          </div>
        )}

        {/* Players */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Users size={16} className="text-primary" /> Players ({players.length})
          </h3>
          <div className="space-y-3">
            {sortedPlayers.map((player, i) => (
              <PlayerRow
                key={player.id}
                player={player}
                rank={i + 1}
                isCurrentUser={player.id === 'p1'}
              />
            ))}
          </div>
        </div>

        {/* Start button (host only) */}
        {roomState === 'waiting' && (
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
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
            }}
          >
            Start Race <ArrowRight size={16} />
          </Button>
        )}
      </div>
    </AppLayout>
  );
};

export default MultiplayerRoom;
