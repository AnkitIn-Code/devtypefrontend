import { Suspense, lazy, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Zap, RefreshCw, TrendingUp, Minimize2, BookOpen, Save, Play, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppLayout } from '@layouts/AppLayout';
import { Input, Select, Textarea } from '@components/common/Input';
import { Button } from '@components/common/Button';
import { Badge } from '@components/common/Badge';
import { useAiStore } from '@store/ai.store';
import { aiApi } from '@api/ai.api';
import { LANGUAGES, DIFFICULTIES, ROUTES } from '@constants';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

const AI_ACTIONS = [
  { icon: RefreshCw, label: 'Regenerate', action: 'regenerate', variant: 'ghost' },
  { icon: TrendingUp, label: 'Improve', action: 'improve', variant: 'ghost' },
  { icon: Zap, label: 'Optimize', action: 'optimize', variant: 'ghost' },
  { icon: Minimize2, label: 'Simplify', action: 'simplify', variant: 'ghost' },
  { icon: BookOpen, label: 'Explain', action: 'explain', variant: 'ghost' },
];

const AITemplate = () => {
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState(null);

  const {
    prompt, language, difficulty, topic, length, generatedCode, isGenerating, explanation,
    setPrompt, setLanguage, setDifficulty, setTopic, setLength, setGenerating, setResult,
  } = useAiStore();

  const handleGenerate = async () => {
    if (!prompt.trim() && !topic.trim()) {
      toast.error('Please enter a prompt or topic');
      return;
    }
    setGenerating(true);
    try {
      const res = await aiApi.generate({ prompt, language, difficulty, topic, length });
      setResult(res.data);
      toast.success('Generated successfully! ✨');
    } catch {
      toast.error('Generation failed. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAction = async (action) => {
    if (!generatedCode) return;
    setActionLoading(action);
    try {
      let res;
      switch (action) {
        case 'improve': res = await aiApi.improve(generatedCode); break;
        case 'optimize': res = await aiApi.optimize(generatedCode); break;
        case 'simplify': res = await aiApi.simplify(generatedCode); break;
        case 'explain': res = await aiApi.explain(generatedCode); toast(res.data.explanation, { duration: 6000, icon: '📖' }); return;
        case 'regenerate': await handleGenerate(); return;
      }
      if (res?.data?.code) setResult({ ...res.data, language });
      toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)}d successfully!`);
    } catch {
      toast.error('Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveAndPractice = async () => {
    try {
      await aiApi.save({ code: generatedCode, language, difficulty, topic });
      toast.success('Saved! Redirecting to practice...');
      navigate(ROUTES.TYPING);
    } catch {
      toast.error('Failed to save');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu size={22} className="text-primary" />
            <h1 className="text-2xl font-bold text-text-primary">AI Template Generator</h1>
          </div>
          <p className="text-text-secondary text-sm">Describe what you want to practice, and AI generates a perfect typing challenge.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Config Panel */}
          <div className="lg:col-span-2 space-y-5">
            <div className="glass-card p-5 space-y-4">
              <h3 className="font-semibold text-sm text-text-primary">Generation Settings</h3>

              <Textarea
                label="Prompt / Description"
                placeholder="e.g., A recursive fibonacci function with memoization..."
                rows={4}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Language"
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  options={LANGUAGES}
                />
                <Select
                  label="Difficulty"
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value)}
                  options={DIFFICULTIES}
                />
              </div>

              <Input
                label="Topic"
                placeholder="e.g., Sorting algorithms, React hooks..."
                value={topic}
                onChange={e => setTopic(e.target.value)}
              />

              <Select
                label="Length"
                value={length}
                onChange={e => setLength(e.target.value)}
                options={[
                  { value: 'short', label: 'Short (~10 lines)' },
                  { value: 'medium', label: 'Medium (~25 lines)' },
                  { value: 'long', label: 'Long (~50 lines)' },
                ]}
              />

              <Button
                onClick={handleGenerate}
                isLoading={isGenerating}
                className="w-full"
                size="lg"
              >
                <Zap size={16} /> {isGenerating ? 'Generating...' : 'Generate with AI'}
              </Button>
            </div>

            {/* AI Action Buttons */}
            {generatedCode && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 space-y-2"
              >
                <h4 className="text-xs text-muted uppercase tracking-wider mb-3">Refine</h4>
                {AI_ACTIONS.map(({ icon: Icon, label, action }) => (
                  <button
                    key={action}
                    onClick={() => handleAction(action)}
                    disabled={actionLoading !== null}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-2/50 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === action ? (
                      <Loader2 size={15} className="animate-spin text-primary" />
                    ) : (
                      <Icon size={15} className="text-primary" />
                    )}
                    {label}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Editor Panel */}
          <div className="lg:col-span-3">
            <div className="glass-card overflow-hidden h-[600px] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-error/50" />
                  <div className="w-3 h-3 rounded-full bg-warning/50" />
                  <div className="w-3 h-3 rounded-full bg-success/50" />
                </div>
                <div className="flex items-center gap-2">
                  {generatedCode && <Badge variant="success" size="sm">AI Generated</Badge>}
                  <Badge variant="primary" size="sm">{language}</Badge>
                </div>
                {generatedCode && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveAndPractice}
                      className="text-xs"
                    >
                      <Play size={12} /> Practice
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => aiApi.save({ code: generatedCode, language, difficulty }).then(() => toast.success('Saved!'))}
                      className="text-xs"
                    >
                      <Save size={12} /> Save
                    </Button>
                  </div>
                )}
              </div>

              {/* Editor or placeholder */}
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center gap-4"
                  >
                    <div className="relative">
                      <Cpu size={40} className="text-primary animate-pulse" />
                      <motion.div
                        className="absolute inset-0"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <div className="w-full h-full border-2 border-primary/30 border-t-primary rounded-full" />
                      </motion.div>
                    </div>
                    <p className="text-text-secondary font-medium">AI is generating your template...</p>
                    <p className="text-muted text-sm">Analyzing patterns and crafting your challenge</p>
                  </motion.div>
                ) : generatedCode ? (
                  <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1">
                    <Suspense fallback={<div className="flex items-center justify-center h-full text-muted text-sm">Loading editor...</div>}>
                      <MonacoEditor
                        height="100%"
                        language={language}
                        value={generatedCode}
                        theme="vs-dark"
                        options={{
                          fontSize: 14,
                          minimap: { enabled: false },
                          lineNumbers: 'on',
                          wordWrap: 'on',
                          scrollBeyondLastLine: false,
                          fontFamily: 'JetBrains Mono, monospace',
                          readOnly: false,
                          padding: { top: 16 },
                        }}
                      />
                    </Suspense>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8"
                  >
                    <Cpu size={48} className="text-muted/30" />
                    <h3 className="text-text-secondary font-medium">Ready to Generate</h3>
                    <p className="text-muted text-sm max-w-xs">
                      Configure your prompt and settings, then click{' '}
                      <strong className="text-primary">Generate with AI</strong> to create your typing challenge.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Explanation */}
            {explanation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 mt-4"
              >
                <h4 className="text-xs text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                  <BookOpen size={12} /> AI Explanation
                </h4>
                <p className="text-sm text-text-secondary leading-relaxed">{explanation}</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AITemplate;
