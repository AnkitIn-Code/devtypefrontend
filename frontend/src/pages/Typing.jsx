import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Settings2, Code2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTyping } from '@hooks/useTyping';
import { useSettingsStore } from '@store/settings.store';
import { useAuthStore } from '@store/auth.store';
import { TypingArea } from '@components/typing/TypingArea';
import { LiveStats } from '@components/typing/LiveStats';
import { TypingResults } from '@components/typing/TypingResults';
import { Spinner } from '@components/common/Badge';
import { templatesApi } from '@api/templates.api';
import { reportsApi } from '@api/reports.api';
import { gamificationApi } from '@api/gamification.api';
import { userApi } from '@api/user.api';
import { ROUTES } from '@constants';

const DEFAULT_TEMPLATE = {
  id: 'default_001',
  title: 'Binary Search',
  language: 'java',
  difficulty: 'INTERMEDIATE',
  code: `public static int binarySearch(int[] arr, int target) {
    int left = 0, right = arr.length - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`,
};

const Typing = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const { fontSize } = useSettingsStore();

  // BUG-L12: StrictMode synchronous submission ref
  const isSubmittingRef = useRef(false);
  const [failedSessionPayload, setFailedSessionPayload] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const {
    template, typedChars, currentIndex, wpm, rawWpm, accuracy, errors,
    elapsedTime, status, wpmHistory, errorEvents, isFullscreen,
    setTemplate, reset, pause, toggleFullscreen,
  } = useTyping();

  // Load template
  const { data: templateData, isLoading } = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => templateId ? templatesApi.getById(templateId) : Promise.resolve({ data: DEFAULT_TEMPLATE }),
    select: d => d.data,
    enabled: true,
  });

  // Fetch today's challenge so we can detect if the current snippet is the daily challenge
  const { data: dailyChallenge } = useQuery({
    queryKey: ['daily-challenge'],
    queryFn: gamificationApi.getTodayChallenge,
    select: d => d.data,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (templateData) {
      setTemplate(templateData);
      isSubmittingRef.current = false;
      setFailedSessionPayload(null);
    }
  }, [templateData]);

  // Submit session report with error-recovery (EDGE-04)
  const submitSessionReport = useCallback(async (sessionData) => {
    try {
      const res = await reportsApi.create(sessionData);
      const xpEarned = res?.data?.xpEarned || 0;
      toast.success(`Session recorded! +${xpEarned} XP 📊`, { icon: '✅' });
      setFailedSessionPayload(null);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['lang-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      try {
        const userRes = await userApi.getMe();
        useAuthStore.getState().setUser(userRes.data);
      } catch (e) {
        console.error('Failed to refresh user profile:', e);
      }
      return true;
    } catch (err) {
      console.error('Failed to record session:', err);
      // EDGE-04: Store payload so user can manually retry
      setFailedSessionPayload(sessionData);
      toast.error('Failed to save session to server. Click Retry below.', { id: 'save-session-error' });
      return false;
    }
  }, [queryClient]);

  const handleRetrySubmission = async () => {
    if (!failedSessionPayload || isRetrying) return;
    setIsRetrying(true);
    try {
      await submitSessionReport(failedSessionPayload);
    } finally {
      setIsRetrying(false);
    }
  };

  // Save report when finished
  useEffect(() => {
    if (status === 'finished' && !isSubmittingRef.current && isAuthenticated) {
      isSubmittingRef.current = true; // BUG-L12: Synchronously block duplicates before async dispatch

      const isUuid = (id) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const sessionData = {
        snippetId: isUuid(template?.id) ? template.id : null,
        language: template?.language || 'cpp',
        snippetTitle: template?.title || 'Practice Template',
        wpm: Math.max(0, Math.round(wpm)),
        rawWpm: Math.max(0, Math.round(rawWpm)),
        accuracy: parseFloat(Number(accuracy).toFixed(2)),
        durationMs: Math.max(1000, Math.round((elapsedTime || 1) * 1000)),
        errorEvents: errorEvents || [],
        wpmHistory: wpmHistory || [],
      };

      submitSessionReport(sessionData);

      // Auto-submit as daily challenge if this snippet matches today's challenge
      const dailyChallengeSnippetId = dailyChallenge?.snippet?.id;
      const isTheDailyChallenge = isUuid(template?.id) && dailyChallengeSnippetId === template?.id;
      const alreadyCompletedToday = dailyChallenge?.hasCompleted === true;

      if (isTheDailyChallenge && !alreadyCompletedToday) {
        gamificationApi.submitDailyChallenge({
          wpm: Math.max(0, Math.round(wpm)),
          accuracy: parseFloat(Number(accuracy).toFixed(2)),
          durationMs: Math.max(1000, Math.round((elapsedTime || 1) * 1000)),
        }).then((res) => {
          const bonusXp = res?.data?.xpEarned || 150;
          const monthCompleted = res?.data?.monthCompleted || false;
          const monthlyBonus = res?.data?.monthlyBonusXp || 0;

          toast.success(`🎯 Daily Challenge complete! +${bonusXp} XP bonus`, {
            duration: 4000,
            icon: '🌟',
          });

          if (monthCompleted && monthlyBonus > 0) {
            setTimeout(() => {
              toast.success(`🏆 Monthly Challenge Complete! +${monthlyBonus} XP bonus awarded!`, {
                duration: 6000,
                icon: '🎊',
              });
            }, 1500);
          }

          // FEAT-M05: Instantly update cache and invalidate status
          queryClient.setQueryData(['daily-challenge'], (prev) => prev ? { ...prev, hasCompleted: true } : prev);
          queryClient.invalidateQueries({ queryKey: ['daily-challenge'] });
          queryClient.invalidateQueries({ queryKey: ['daily-challenge-status'] });
          queryClient.invalidateQueries({ queryKey: ['daily-challenge-monthly'] });
        }).catch((err) => {
          console.warn('Daily challenge auto-submit skipped:', err?.response?.data?.message || err.message);
        });
      }

    }
  }, [status, isAuthenticated, template, wpm, rawWpm, accuracy, elapsedTime, errorEvents, wpmHistory, dailyChallenge, submitSessionReport]);

  const handleRestart = useCallback(() => {
    isSubmittingRef.current = false;
    setFailedSessionPayload(null);
    reset();
  }, [reset]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      {!isFullscreen && (
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="border-b border-border px-6 py-4 flex items-center justify-between"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted hover:text-text-primary transition-colors text-sm"
          >
            <ChevronLeft size={16} /> Back
          </button>

          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-primary" />
            {/* BUG-L05: Clean title fallback */}
            <span className="font-semibold text-sm text-text-primary">
              {isLoading ? 'Loading...' : (template?.title?.trim() || 'Untitled Snippet')}
            </span>
            {template?.language && (
              <span className="text-xs bg-surface-2 text-muted px-2 py-0.5 rounded-lg">{template.language}</span>
            )}
          </div>

          <button
            onClick={() => navigate(ROUTES.SETTINGS)}
            className="p-2 rounded-lg text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <Settings2 size={16} />
          </button>
        </motion.header>
      )}

      {/* Main Content */}
      <div className={`${isFullscreen ? 'p-10' : 'p-6 max-w-5xl mx-auto'}`}>
        <AnimatePresence mode="wait">
          {status === 'finished' ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8"
            >
              <TypingResults
                wpm={wpm}
                rawWpm={rawWpm}
                accuracy={accuracy}
                errors={errors}
                elapsedTime={elapsedTime}
                wpmHistory={wpmHistory}
                totalChars={typedChars.length}
                onRestart={handleRestart}
                failedSubmission={!!failedSessionPayload}
                isRetrying={isRetrying}
                onRetrySubmission={handleRetrySubmission}
              />
            </motion.div>
          ) : (
            <motion.div
              key="typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-6"
            >
              {/* Split Screen Container: Left (Code Typing Arena) | Right (Live HUD & Graph) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Window: Code Typing Canvas */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-4">
                  <div className="glass-card p-6 md:p-8 relative min-h-[420px] flex flex-col justify-between">
                    {/* Paused overlay */}
                    <AnimatePresence>
                      {status === 'paused' && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10"
                        >
                          <div className="text-center">
                            <div className="text-4xl mb-2">⏸️</div>
                            <p className="text-text-secondary font-medium">Paused — click anywhere to resume</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Idle hint */}
                    {status === 'idle' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-3 right-4 text-xs text-muted font-medium bg-surface-2/60 px-2.5 py-1 rounded-lg border border-border/50"
                      >
                        ⚡ Start typing to begin...
                      </motion.div>
                    )}

                    <div
                      className="overflow-auto max-h-[60vh] no-scrollbar py-2"
                      onClick={status === 'paused' ? pause : undefined}
                    >
                      {typedChars.length > 0 ? (
                        <TypingArea
                          typedChars={typedChars}
                          currentIndex={currentIndex}
                          fontSize={fontSize || 16}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-40">
                          <Spinner size="lg" />
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-border/30 flex items-center justify-between text-xs text-muted">
                      <span>Smart Auto-Indent active ↵</span>
                      <span>
                        <kbd className="bg-surface-2 px-1.5 py-0.5 rounded text-text-secondary">Tab</kbd> restart ·{' '}
                        <kbd className="bg-surface-2 px-1.5 py-0.5 rounded text-text-secondary">Esc</kbd> pause
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Window: Live HUD & Real-time Graph */}
                <div className="lg:col-span-5 xl:col-span-4 sticky top-6">
                  <div className="glass-card p-5">
                    <LiveStats
                      wpm={wpm}
                      rawWpm={rawWpm}
                      accuracy={accuracy}
                      errors={errors}
                      elapsedTime={elapsedTime}
                      currentIndex={currentIndex}
                      totalChars={typedChars.length}
                      status={status}
                      wpmHistory={wpmHistory}
                      onRestart={handleRestart}
                      onPause={pause}
                      onFullscreen={toggleFullscreen}
                      isFullscreen={isFullscreen}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Typing;
