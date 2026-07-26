import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Link as LinkIcon, Copy, Check, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppLayout } from '@layouts/AppLayout';
import { Input } from '@components/common/Input';
import { Button } from '@components/common/Button';
import { Badge } from '@components/common/Badge';
import { LoginRequiredModal } from '@components/common/Modal';
import { useAuthStore } from '@store/auth.store';
import { multiplayerApi } from '@api/multiplayer.api';
import { ROUTES } from '@constants';

const Multiplayer = () => {
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [roomCode, setRoomCode] = useState('');
  const [createdRoom, setCreatedRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginModal, setLoginModal] = useState(false);
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!isAuthenticated) { setLoginModal(true); return; }
    setIsLoading(true);
    try {
      const res = await multiplayerApi.createRoom({ userId: user?.id });
      setCreatedRoom(res.data);
      setMode('created');
      toast.success('Room created!');
    } catch {
      toast.error('Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!isAuthenticated) { setLoginModal(true); return; }
    if (!roomCode.trim()) { toast.error('Enter a room code'); return; }
    setIsLoading(true);
    try {
      await multiplayerApi.joinRoom(roomCode.toUpperCase(), user?.id);
      navigate(`${ROUTES.MULTIPLAYER}/${roomCode.toUpperCase()}`);
    } catch {
      toast.error('Room not found or full');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users size={24} className="text-primary" /> Multiplayer
          </h1>
          <p className="text-text-secondary text-sm mt-1">Race against other developers in real-time typing battles</p>
        </div>

        {/* Hero Card */}
        <div className="glass-card p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10"
          >
            <div className="text-6xl mb-4">⚡</div>
            <h2 className="text-2xl font-bold mb-2">Real-Time Code Racing</h2>
            <p className="text-text-secondary mb-8 max-w-md mx-auto text-sm">
              Challenge friends or random developers. Type the same code snippet and see who finishes first!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleCreate} isLoading={isLoading && mode !== 'join'} size="lg" className="flex items-center gap-2">
                <Plus size={18} /> Create Room
              </Button>
              <Button variant="outline" size="lg" onClick={() => setMode('join')} className="flex items-center gap-2">
                <Users size={18} /> Join Room
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Join Room Form */}
        <AnimatePresence>
          {mode === 'join' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card p-6"
            >
              <h3 className="font-semibold text-text-primary mb-4">Join a Room</h3>
              <div className="flex gap-3">
                <input
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter room code (e.g. ABC123)"
                  maxLength={6}
                  className="input-field font-mono text-lg tracking-widest uppercase flex-1"
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                />
                <Button onClick={handleJoin} isLoading={isLoading} className="flex items-center gap-2 px-6">
                  Join <ArrowRight size={16} />
                </Button>
              </div>
            </motion.div>
          )}

          {mode === 'created' && createdRoom && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 border border-primary/20"
            >
              <h3 className="font-semibold text-text-primary mb-4 text-primary flex items-center gap-2">
                ✓ Room Created
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider">Room Code</label>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="font-mono text-4xl font-black text-primary tracking-widest">
                      {createdRoom.roomCode}
                    </span>
                    <button onClick={() => handleCopy(createdRoom.roomCode)} className="p-2 rounded-lg hover:bg-surface-2 text-muted hover:text-primary transition-colors">
                      {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider">Invite Link</label>
                  <div className="flex items-center gap-2 mt-2">
                    <input readOnly value={createdRoom.inviteLink} className="input-field text-sm flex-1 text-muted" />
                    <button onClick={() => handleCopy(createdRoom.inviteLink)} className="p-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted hover:text-text-primary transition-colors">
                      <LinkIcon size={16} />
                    </button>
                  </div>
                </div>
                <Button onClick={() => navigate(`${ROUTES.MULTIPLAYER}/${createdRoom.roomCode}`)} className="w-full" size="lg">
                  Enter Room <ArrowRight size={16} />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '🏎️', title: 'Live Progress', desc: 'Watch all players type in real time with live progress bars' },
            { icon: '🏆', title: 'Live Rankings', desc: 'See who is leading with instant rank updates as you type' },
            { icon: '🎊', title: 'Winner Animation', desc: 'Celebrate victory with a spectacular winner announcement' },
          ].map((f) => (
            <div key={f.title} className="glass-card p-5 text-center">
              <div className="text-3xl mb-2">{f.icon}</div>
              <h4 className="font-semibold text-text-primary mb-1">{f.title}</h4>
              <p className="text-xs text-text-secondary">{f.desc}</p>
            </div>
          ))}
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
