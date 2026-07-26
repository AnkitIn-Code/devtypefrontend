import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Settings2, Code2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTyping } from '@hooks/useTyping';
import { useTypingStore } from '@store/typing.store';
import { useSettingsStore } from '@store/settings.store';
import { useAuthStore } from '@store/auth.store';
import { TypingArea } from '@components/typing/TypingArea';
import { LiveStats } from '@components/typing/LiveStats';
import { TypingResults } from '@components/typing/TypingResults';
import { Spinner } from '@components/common/Badge';
import { templatesApi } from '@api/templates.api';
import { reportsApi } from '@api/reports.api';
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
  const { isAuthenticated } = useAuthStore();
  const { fontSize } = useSettingsStore();
  const [reportSaved, setReportSaved] = useState(false);

  const {
    template, typedChars, currentIndex, wpm, rawWpm, accuracy, errors,
    elapsedTime, status, wpmHistory, isFullscreen,
    setTemplate, reset, pause, toggleFullscreen,
  } = useTyping();

  // Load template
  const { data: templateData, isLoading } = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => templateId ? templatesApi.getById(templateId) : Promise.resolve({ data: DEFAULT_TEMPLATE }),
    select: d => d.data,
    enabled: true,
  });

  useEffect(() => {
    if (templateData) {
      setTemplate(templateData);
      setReportSaved(false);
    }
  }, [templateData]);

  // Save report when finished
  useEffect(() => {
    if (status === 'finished' && !reportSaved && isAuthenticated) {
      setReportSaved(true);
      const reportData = {
        templateId: template?.id,
        templateTitle: template?.title,
        language: template?.language,
        wpm, rawWpm, accuracy, errors,
        duration: elapsedTime,
        characters: currentIndex,
        wpmHistory,
      };
      reportsApi.create(reportData).then(() => {
        toast.success('Report saved! 📊', { icon: '✅' });
      }).catch(() => {});
    }
  }, [status]);

  const handleRestart = useCallback(() => {
    reset();
    setReportSaved(false);
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
            <span className="font-semibold text-sm text-text-primary">{template?.title || 'Loading...'}</span>
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
              />
            </motion.div>
          ) : (
            <motion.div
              key="typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-6 space-y-6"
            >
              {/* Live Stats */}
              <div className="glass-card p-4">
                <LiveStats
                  wpm={wpm}
                  rawWpm={rawWpm}
                  accuracy={accuracy}
                  errors={errors}
                  elapsedTime={elapsedTime}
                  currentIndex={currentIndex}
                  totalChars={typedChars.length}
                  status={status}
                  onRestart={handleRestart}
                  onPause={pause}
                  onFullscreen={toggleFullscreen}
                  isFullscreen={isFullscreen}
                />
              </div>

              {/* Typing Area */}
              <div className="glass-card p-8 relative">
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
                    className="absolute top-3 right-4 text-xs text-muted"
                  >
                    Start typing to begin...
                  </motion.div>
                )}

                <div
                  className="overflow-auto max-h-[60vh] no-scrollbar"
                  onClick={pause}
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
              </div>

              {/* Keyboard hint */}
              <div className="text-center">
                <p className="text-xs text-muted">
                  Press <kbd className="bg-surface-2 px-1.5 py-0.5 rounded text-text-secondary">Tab</kbd> to restart
                  · <kbd className="bg-surface-2 px-1.5 py-0.5 rounded text-text-secondary">Esc</kbd> to pause
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Typing;
