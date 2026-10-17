import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSocket } from '@websocket/useSocket';

export const useAchievementSocket = () => {
  const { on, isConnected } = useSocket();

  useEffect(() => {
    if (!isConnected) return;

    const unsub = on('achievement:unlock', (data) => {
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full glass-card p-4 border border-primary/40 bg-zinc-900/95 shadow-2xl flex items-center gap-3 pointer-events-auto`}
          >
            <div className="text-3xl p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              {data.iconUrl || data.icon || '🏆'}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold tracking-widest text-primary uppercase">
                Achievement Unlocked!
              </p>
              <h4 className="text-sm font-bold text-text-primary">{data.name}</h4>
              <p className="text-xs text-text-secondary line-clamp-1">{data.description}</p>
            </div>
            {data.xpReward && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 shrink-0">
                +{data.xpReward} XP
              </span>
            )}
          </div>
        ),
        { duration: 5000, position: 'top-right' }
      );
    });

    return () => unsub?.();
  }, [isConnected, on]);
};
