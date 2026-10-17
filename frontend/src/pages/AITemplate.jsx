import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, Zap, RefreshCw, TrendingUp, Minimize2, BookOpen,
  Play, Loader2, Coins, Sparkles, ArrowLeft, Copy, Check,
  Code2, CheckCircle2, ChevronDown, FileCode, Layers, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AppLayout } from '@layouts/AppLayout';
import { useAiStore } from '@store/ai.store';
import { useAuthStore } from '@store/auth.store';
import { aiApi } from '@api/ai.api';
import { templatesApi } from '@api/templates.api';
import { LANGUAGES, DIFFICULTIES, ROUTES } from '@constants';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

const PROMPT_SUGGESTIONS = [
  {
    label: '⚡ Binary Search',
    prompt: 'Write an efficient iterative binary search algorithm to find the index of a target value in a sorted array.',
    topic: 'Iterative Binary Search',
  },
  {
    label: '🔄 Memoized Fibonacci',
    prompt: 'Implement a recursive Fibonacci generator with memoization cache for high performance.',
    topic: 'Memoized Fibonacci Generator',
  },
  {
    label: '⚙️ LRU Cache',
    prompt: 'Create a Least Recently Used (LRU) Cache data structure with get and put operations in O(1) time complexity.',
    topic: 'Least Recently Used (LRU) Cache',
  },
  {
    label: '📊 Quicksort Partition',
    prompt: 'Implement the Quicksort algorithm with in-place Lomuto partitioning scheme.',
    topic: 'Quicksort Partitioning',
  },
  {
    label: '🎯 Two Sum Map',
    prompt: 'Write a function that returns indices of two numbers that add up to a target using a Hash Map in O(n) time.',
    topic: 'Two Sum Hash Map',
  },
  {
    label: '🌐 REST Fetcher',
    prompt: 'Create an async API client function with retry logic and timeout handling.',
    topic: 'Async REST Client with Retries',
  },
];

const AI_ACTIONS = [
  { icon: RefreshCw, label: 'Regenerate', action: 'regenerate', cost: 5, desc: 'Fresh new solution' },
  { icon: TrendingUp, label: 'Improve Code', action: 'improve', cost: 3, desc: 'Idiomatic styling & clean practices' },
  { icon: Zap, label: 'Optimize', action: 'optimize', cost: 3, desc: 'Time & memory complexity' },
  { icon: Minimize2, label: 'Simplify', action: 'simplify', cost: 3, desc: 'Concise & typing-friendly' },
];

const APPROACH_OPTIONS = [
  { value: 'optimal', label: 'Optimal Solution', icon: '⚡', desc: 'Best time & space complexity' },
  { value: 'better', label: 'Improved / Better', icon: '📈', desc: 'Balanced readable implementation' },
  { value: 'brute_force', label: 'Brute Force', icon: '🔨', desc: 'Direct naive approach' },
];

const SCOPE_OPTIONS = [
  { value: 'function_only', label: 'Function Only', icon: Layers, desc: 'Core logic / Solution class (LeetCode style)' },
  { value: 'complete_program', label: 'Full Program', icon: FileCode, desc: 'Includes main() function & runner' },
];

// Smart fallback cleaner for prompt -> topic title
const extractSmartTopicFallback = (text) => {
  if (!text) return '';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^(write|create|implement|build|make|generate|design|develop)\s+(an?|the)?\s*/i, '');
  cleaned = cleaned.replace(/^(a\s+function|a\s+class|a\s+method|a\s+program)\s+(to|that|for)?\s*/i, '');
  cleaned = cleaned.replace(/\s+(algorithm|function|data structure|implementation|in|using|with|that|which|to)\b.*$/i, (match) => {
    if (match.includes('LRU') || match.includes('Cache') || match.includes('Search') || match.includes('Tree')) {
      return match.split(/\s+(in|using|with|that|which|to)\b/i)[0];
    }
    return '';
  });
  
  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 5);
  if (words.length === 0) return 'Custom Coding Template';
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const AITemplate = () => {
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState(null);
  const [isInferringTopic, setIsInferringTopic] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedExp, setCopiedExp] = useState(false);
  const { user, updateUser } = useAuthStore();

  const {
    prompt, language, difficulty, topic, approach, codeScope, generatedCode, isGenerating, explanation,
    setPrompt, setLanguage, setDifficulty, setTopic, setApproach, setCodeScope, setGenerating, setResult, setExplanation,
  } = useAiStore();

  const lastInferredPromptRef = useRef('');
  const topicTimeoutRef = useRef(null);
  const explanationRef = useRef(null);

  // Set default language to C++ if none or default
  useEffect(() => {
    if (!language) {
      setLanguage('cpp');
    }
  }, [language, setLanguage]);

  // ─── Automatic Topic Extraction via Fireworks AI ─────────────────────────────
  const inferTopicFromPrompt = async (text, lang) => {
    if (!text || text.trim().length < 6) return;
    if (text.trim() === lastInferredPromptRef.current) return;

    setIsInferringTopic(true);
    try {
      const res = await aiApi.suggestTopic(text.trim(), lang || language || 'cpp');
      if (res?.data?.topic) {
        setTopic(res.data.topic);
        lastInferredPromptRef.current = text.trim();
        return;
      }
    } catch {
      const fallback = extractSmartTopicFallback(text);
      if (fallback) setTopic(fallback);
    } finally {
      setIsInferringTopic(false);
    }
  };

  // Debounced auto topic generation on prompt changes
  useEffect(() => {
    if (topicTimeoutRef.current) {
      clearTimeout(topicTimeoutRef.current);
    }

    if (prompt && prompt.trim().length >= 8 && prompt.trim() !== lastInferredPromptRef.current) {
      topicTimeoutRef.current = setTimeout(() => {
        inferTopicFromPrompt(prompt, language || 'cpp');
      }, 700);
    }

    return () => {
      if (topicTimeoutRef.current) clearTimeout(topicTimeoutRef.current);
    };
  }, [prompt, language]);

  const handleSelectSuggestion = (suggestion) => {
    setPrompt(suggestion.prompt);
    if (suggestion.topic) {
      setTopic(suggestion.topic);
      lastInferredPromptRef.current = suggestion.prompt;
    } else {
      inferTopicFromPrompt(suggestion.prompt, language || 'cpp');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !topic.trim()) {
      toast.error('Please enter a prompt or description');
      return;
    }
    const cost = 5;
    if ((user?.credits || 0) < cost) {
      toast.error(`Insufficient credits! Requires ${cost} credits, but you have ${user?.credits || 0}. Practice to earn more! ⚡`, { duration: 5000 });
      return;
    }

    setGenerating(true);
    setExplanation(''); // Clear previous explanation
    try {
      const finalTopic = topic.trim() || extractSmartTopicFallback(prompt) || 'Custom Algorithm';
      const res = await aiApi.generate({
        language: language || 'cpp',
        difficulty,
        topic: finalTopic,
        approach,
        codeScope: codeScope || 'function_only',
      });
      setResult({ ...res.data, explanation: '' });
      if (res.data?.creditsRemaining !== undefined) {
        updateUser({ credits: res.data.creditsRemaining });
      }
      toast.success('AI Template generated with DeepSeek-V4-Pro-0813! ✨');
    } catch (err) {
      if (err?.response?.status === 503) {
        toast.error(
          '🤖 Fireworks AI service is unavailable — check server connection.',
          { duration: 8000 }
        );
      } else if (err?.response?.status === 402) {
        toast.error('Insufficient credits for AI generation! Complete typing tests to earn +10 credits.', { duration: 5000 });
      } else if (err?.response?.status === 429) {
        toast.error('AI rate limit reached (30 calls/hour). Please try again in a bit.');
      } else {
        toast.error(err?.response?.data?.message || err?.response?.data?.detail || 'Generation failed. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleExplain = async () => {
    if (!generatedCode) {
      toast.error('Generate code first before requesting explanation!');
      return;
    }
    const cost = 1;
    if ((user?.credits || 0) < cost) {
      toast.error(`Insufficient credits! Action requires ${cost} credit.`, { duration: 4000 });
      return;
    }

    setActionLoading('explain');
    try {
      const res = await aiApi.explain(generatedCode, language || 'cpp');
      if (res?.data?.explanation) {
        setExplanation(res.data.explanation);
        toast.success('Code explanation ready below! 📖');
        if (res.data?.creditsRemaining !== undefined) {
          updateUser({ credits: res.data.creditsRemaining });
        }
        setTimeout(() => {
          explanationRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    } catch (err) {
      if (err?.response?.status === 402) {
        toast.error('Insufficient credits! Practice sessions earn you +10 credits each.');
      } else {
        toast.error('Failed to generate explanation. Please try again.');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (action) => {
    if (!generatedCode) return;
    const actionConfig = AI_ACTIONS.find((a) => a.action === action);
    const cost = actionConfig ? actionConfig.cost : 3;

    if ((user?.credits || 0) < cost) {
      toast.error(`Insufficient credits! Action requires ${cost} credits.`, { duration: 4000 });
      return;
    }

    if (action === 'regenerate') {
      await handleGenerate();
      return;
    }

    setActionLoading(action);
    try {
      let res;
      switch (action) {
        case 'improve':
          res = await aiApi.improve(generatedCode, language || 'cpp');
          break;
        case 'optimize':
          res = await aiApi.optimize(generatedCode, language || 'cpp');
          break;
        case 'simplify':
          res = await aiApi.simplify(generatedCode, language || 'cpp');
          break;
      }

      if (res?.data?.code) {
        setResult({ ...res.data, language: language || 'cpp', explanation: '' });
      }
      if (res?.data?.creditsRemaining !== undefined) {
        updateUser({ credits: res.data.creditsRemaining });
      }
      toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} completed!`);
    } catch (err) {
      if (err?.response?.status === 402) {
        toast.error('Insufficient credits! Practice sessions earn you +10 credits each.');
      } else {
        toast.error('Action failed. Please try again.');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyExplanation = () => {
    if (!explanation) return;
    navigator.clipboard.writeText(explanation);
    setCopiedExp(true);
    toast.success('Explanation copied!');
    setTimeout(() => setCopiedExp(false), 2000);
  };

  const handleSaveAndPractice = async () => {
    try {
      let snippetId = useAiStore.getState().snippetId;
      if (!snippetId) {
        const created = await templatesApi.create({
          title: topic || 'AI Generated Practice',
          language: language || 'cpp',
          difficulty,
          code: generatedCode,
          tags: ['ai-generated', language || 'cpp', 'deepseek'],
          isPublic: true,
        });
        snippetId = created.data.id;
      }
      toast.success('Template ready! Starting practice...');
      navigate(`${ROUTES.TYPING}/${snippetId}`);
    } catch {
      toast.error('Failed to launch practice template');
    }
  };

  const activeDifficulties = [
    { value: 'BEGINNER', label: 'Beginner' },
    { value: 'INTERMEDIATE', label: 'Intermediate' },
    { value: 'ADVANCED', label: 'Advanced' },
  ];

  // Helper to parse explanation lines into cleanly highlighted bullet points
  const parseExplanationSections = (text) => {
    if (!text) return [];
    const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const sections = [];
    let currentSection = null;

    for (const line of rawLines) {
      // Match markdown bullet headers like "- **Algorithm approach:**", "1. **Key Logic:**", "**Time/space complexity:**"
      const match = line.match(/^(\d+\.|\*|-)?\s*\*\*(.*?)\*\*:?\s*(.*)$/);
      if (match) {
        if (currentSection) sections.push(currentSection);
        currentSection = {
          title: match[2].trim().replace(/:$/, ''),
          body: match[3] ? match[3].trim() : '',
        };
      } else if (currentSection) {
        currentSection.body += (currentSection.body ? ' ' : '') + line;
      } else {
        sections.push({
          title: null,
          body: line,
        });
      }
    }
    if (currentSection) sections.push(currentSection);
    return sections;
  };

  // Helper to highlight inline code and bold markdown text inside body
  const renderFormattedBody = (bodyText) => {
    if (!bodyText) return null;
    const parts = bodyText.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded font-mono text-xs font-semibold mx-0.5"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-white mx-0.5">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-16">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => navigate(ROUTES.TEMPLATES)}
              className="flex items-center gap-1.5 text-xs font-semibold hover:text-accent transition-colors mb-1"
              style={{ color: 'var(--text-muted)' }}
            >
              <ArrowLeft size={13} />
              <span>Back to Templates</span>
            </button>
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(99,102,241,0.2))',
                  border: '1px solid rgba(168,85,247,0.3)',
                  color: 'var(--accent-light)',
                }}
              >
                <Cpu size={22} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  AI Template Generator
                </h1>
                <p className="text-xs sm:text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Powered by Fireworks AI (DeepSeek-V4-Pro-0813) — Describe any algorithm, data structure, or scenario.
                </p>
              </div>
            </div>
          </div>

          {/* Credits Balance Pill */}
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-full border self-start sm:self-auto shadow-sm"
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--border)',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
            >
              <Coins size={16} className="animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                Credits Balance
              </span>
              <span className="text-sm font-black font-mono" style={{ color: '#f59e0b' }}>
                {user?.credits || 0} Credits
              </span>
            </div>
          </div>
        </div>

        {/* Main Grid: Generator Configuration + Monaco Code Studio */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Configuration Studio (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div
              className="rounded-3xl p-5 sm:p-6 border space-y-5 shadow-md relative overflow-hidden"
              style={{
                background: 'var(--card-bg)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Sparkles size={16} style={{ color: 'var(--accent-light)' }} />
                  <span>Prompt & Parameters</span>
                </h3>
                <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full border" style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  Cost: 5 credits
                </span>
              </div>

              {/* Quick Inspiration Pills */}
              <div className="space-y-2">
                <label className="text-xs font-bold block" style={{ color: 'var(--text-secondary)' }}>
                  Quick Inspiration Prompts:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PROMPT_SUGGESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all duration-150 hover:scale-105"
                      style={{
                        background: 'var(--bg-surface-2)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                    Prompt / Problem Description
                  </label>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    {prompt.length} chars
                  </span>
                </div>
                <textarea
                  rows={4}
                  placeholder="e.g., Create a Least Recently Used (LRU) Cache data structure with get and put operations in O(1) time..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full p-3.5 rounded-2xl text-xs font-mono outline-none border transition-all resize-none leading-relaxed"
                  style={{
                    background: 'var(--bg-surface-2)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Auto-Generated Topic Field with AI Indicator */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <span>Topic Title</span>
                    {isInferringTopic ? (
                      <span className="text-[10px] font-bold text-violet-400 flex items-center gap-1 animate-pulse">
                        <Loader2 size={10} className="animate-spin" /> AI Inferring...
                      </span>
                    ) : topic ? (
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Auto-generated
                      </span>
                    ) : null}
                  </label>
                  {prompt && (
                    <button
                      type="button"
                      onClick={() => inferTopicFromPrompt(prompt, language || 'cpp')}
                      disabled={isInferringTopic}
                      className="text-[10px] font-bold hover:underline flex items-center gap-1"
                      style={{ color: 'var(--accent-light)' }}
                    >
                      <RefreshCw size={9} className={isInferringTopic ? 'animate-spin' : ''} />
                      Regenerate Title
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Least Recently Used (LRU) Cache"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full p-3 rounded-full text-xs font-semibold outline-none border transition-all pl-4 pr-9"
                    style={{
                      background: 'var(--bg-surface-2)',
                      borderColor: topic ? 'var(--accent-border)' : 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  {topic && (
                    <button
                      onClick={() => setTopic('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Language Selection (Default C++ / Rounded Select) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold block" style={{ color: 'var(--text-secondary)' }}>
                  Language
                </label>
                <div className="relative">
                  <select
                    value={language || 'cpp'}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full py-2.5 px-4 rounded-full text-xs font-bold outline-none border transition-all cursor-pointer appearance-none"
                    style={{
                      background: 'var(--bg-surface-2)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" style={{ color: 'var(--text-secondary)' }} />
                </div>
              </div>

              {/* Code Scope: Function Only vs Full Program */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold block" style={{ color: 'var(--text-secondary)' }}>
                  Code Scope / Boilerplate
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SCOPE_OPTIONS.map((scope) => {
                    const isSelected = (codeScope || 'function_only') === scope.value;
                    const Icon = scope.icon;
                    return (
                      <button
                        key={scope.value}
                        type="button"
                        onClick={() => setCodeScope(scope.value)}
                        className="p-2.5 rounded-2xl border text-left transition-all duration-150 flex items-center gap-2.5"
                        style={{
                          background: isSelected ? 'var(--accent-dim)' : 'var(--bg-surface-2)',
                          borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                        }}
                      >
                        <div
                          className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: isSelected ? 'var(--accent)' : 'var(--card-bg)',
                            color: isSelected ? '#fff' : 'var(--text-muted)',
                          }}
                        >
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0">
                          <span
                            className="font-bold text-xs block leading-tight truncate"
                            style={{ color: isSelected ? 'var(--accent-light)' : 'var(--text-primary)' }}
                          >
                            {scope.label}
                          </span>
                          <span className="text-[9.5px] block leading-tight truncate opacity-70" style={{ color: 'var(--text-muted)' }}>
                            {scope.desc.split('(')[0]}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty Selection (Rounded Tabs/Buttons) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold block" style={{ color: 'var(--text-secondary)' }}>
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {activeDifficulties.map((d) => {
                    const isSelected = difficulty === d.value;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setDifficulty(d.value)}
                        className="py-2.5 px-2 rounded-full border text-xs font-bold text-center transition-all duration-150"
                        style={{
                          background: isSelected ? 'var(--accent-dim)' : 'var(--bg-surface-2)',
                          borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                          color: isSelected ? 'var(--accent-light)' : 'var(--text-primary)',
                        }}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Code Approach Cards */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  Code Approach / Complexity
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {APPROACH_OPTIONS.map((opt) => {
                    const isSelected = approach === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setApproach(opt.value)}
                        className="p-2.5 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between"
                        style={{
                          background: isSelected ? 'var(--accent-dim)' : 'var(--bg-surface-2)',
                          borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-base">{opt.icon}</span>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
                        </div>
                        <div>
                          <span
                            className="font-bold text-[11px] block leading-tight truncate"
                            style={{ color: isSelected ? 'var(--accent-light)' : 'var(--text-primary)' }}
                          >
                            {opt.label.split(' ')[0]}
                          </span>
                          <span className="text-[9px] block leading-tight truncate opacity-70" style={{ color: 'var(--text-muted)' }}>
                            {opt.desc.split(' ')[0]}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Generate Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-3.5 px-4 rounded-full font-bold text-sm text-white shadow-xl shadow-violet-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--accent), #4f46e5)' }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>DeepSeek-V4-Pro is Writing Code...</span>
                  </>
                ) : (
                  <>
                    <Zap size={18} fill="currentColor" />
                    <span>Generate Template (5 Credits)</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Right Column: Code Studio & Monaco Editor (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div
              className="rounded-3xl border shadow-lg overflow-hidden flex flex-col h-[580px]"
              style={{
                background: 'var(--card-bg)',
                borderColor: 'var(--border)',
              }}
            >
              {/* Studio Window Header */}
              <div
                className="px-4 py-3 border-b flex items-center justify-between shrink-0"
                style={{
                  background: 'var(--bg-surface-2)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <span className="text-xs font-mono font-bold truncate max-w-[200px]" style={{ color: 'var(--text-primary)' }}>
                    {topic || 'ai-template'}.{language || 'cpp'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {generatedCode && (
                    <>
                      <button
                        onClick={handleCopyCode}
                        className="p-1.5 px-3 rounded-full border text-xs font-semibold flex items-center gap-1 transition-all"
                        style={{
                          background: 'var(--card-bg)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                      </button>

                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={handleSaveAndPractice}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-md shadow-violet-500/20"
                        style={{ background: 'linear-gradient(135deg, var(--accent), #4f46e5)' }}
                      >
                        <Play size={12} fill="currentColor" /> Practice Now
                      </motion.button>
                    </>
                  )}
                </div>
              </div>

              {/* Editor Workspace */}
              <div className="flex-1 relative overflow-hidden" style={{ background: '#12131c' }}>
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div
                      key="generating"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center"
                    >
                      <div className="relative">
                        <div
                          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-xl"
                          style={{
                            background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(99,102,241,0.3))',
                            border: '1px solid rgba(168,85,247,0.4)',
                            color: '#c084fc',
                          }}
                        >
                          <Sparkles size={28} className="animate-spin" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">
                          Synthesizing with DeepSeek-V4-Pro...
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                          Generating clean, structured code for {language || 'cpp'} with {approach} complexity via Fireworks AI.
                        </p>
                      </div>
                    </motion.div>
                  ) : generatedCode ? (
                    <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full w-full">
                      <Suspense
                        fallback={
                          <div className="h-full flex items-center justify-center text-xs font-mono text-zinc-500">
                            Initializing editor...
                          </div>
                        }
                      >
                        <MonacoEditor
                          height="100%"
                          language={(language || 'cpp') === 'c' || (language || 'cpp') === 'cpp' ? 'cpp' : language}
                          value={generatedCode}
                          theme="vs-dark"
                          options={{
                            fontSize: 13,
                            minimap: { enabled: false },
                            lineNumbers: 'on',
                            wordWrap: 'on',
                            scrollBeyondLastLine: false,
                            fontFamily: 'JetBrains Mono, monospace',
                            readOnly: false,
                            padding: { top: 14, bottom: 14 },
                            automaticLayout: true,
                          }}
                        />
                      </Suspense>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center"
                    >
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
                        style={{
                          background: 'var(--bg-surface-2)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <Code2 size={28} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          No Code Generated Yet
                        </h3>
                        <p className="text-xs mt-1 max-w-xs" style={{ color: 'var(--text-muted)' }}>
                          Type a prompt or choose one from the inspiration list, and watch DeepSeek-V4-Pro write your typing template.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* AI Action Refinement Bar (Refactoring Only) */}
            {generatedCode && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl p-4 border space-y-3 shadow-sm"
                style={{
                  background: 'var(--card-bg)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Refine Code with DeepSeek AI
                  </h4>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Instant code enhancements
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AI_ACTIONS.map(({ icon: Icon, label, action, cost, desc }) => (
                    <button
                      key={action}
                      title={desc}
                      onClick={() => handleAction(action)}
                      disabled={actionLoading !== null}
                      className="p-2.5 rounded-2xl border text-center transition-all duration-150 hover:scale-[1.02] flex flex-col items-center justify-between gap-1 disabled:opacity-50"
                      style={{
                        background: 'var(--bg-surface-2)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        {actionLoading === action ? (
                          <Loader2 size={13} className="animate-spin text-violet-400" />
                        ) : (
                          <Icon size={13} style={{ color: 'var(--accent-light)' }} />
                        )}
                        <span className="truncate">{label}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-amber-400">
                        {cost} cr
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Prominent Separate "Explain Code Logic" Action Bar */}
            {generatedCode && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl p-4 sm:p-5 border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                style={{
                  background: 'var(--card-bg)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: 'var(--bg-surface-2)', color: 'var(--accent-light)', border: '1px solid var(--border)' }}
                  >
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      Need to Understand the Implementation?
                    </h4>
                    <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      DeepSeek will explain the algorithm approach, step-by-step logic, and complexity.
                    </p>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleExplain}
                  disabled={actionLoading === 'explain'}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, var(--accent), #4f46e5)' }}
                >
                  {actionLoading === 'explain' ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Analyzing Logic...</span>
                    </>
                  ) : (
                    <>
                      <BookOpen size={14} />
                      <span>Explain Code Logic (1 Credit)</span>
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}

            {/* Dedicated Spacious AI Code Explanation Panel (Monochrome Theme-Consistent) */}
            {explanation && (
              <motion.div
                ref={explanationRef}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl p-6 sm:p-7 border shadow-lg space-y-4 relative"
                style={{
                  background: 'var(--card-bg)',
                  borderColor: 'var(--border)',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2.5">
                    <BookOpen size={17} style={{ color: 'var(--accent-light)' }} />
                    <h4 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      AI Code Explanation
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyExplanation}
                      className="px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all"
                      style={{
                        background: 'var(--bg-surface-2)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {copiedExp ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedExp ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={() => setExplanation('')}
                      className="p-1 rounded-full hover:bg-zinc-800/40 text-xs opacity-70 hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* Spaced Section Breakdown with Highlighted Titles */}
                <div className="space-y-3.5 pt-1">
                  {parseExplanationSections(explanation).map((section, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border transition-all"
                      style={{
                        background: 'var(--bg-surface-2)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {section.title && (
                          <strong className="font-bold text-white tracking-wide mr-1.5">
                            {section.title}:
                          </strong>
                        )}
                        {renderFormattedBody(section.body)}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AITemplate;
