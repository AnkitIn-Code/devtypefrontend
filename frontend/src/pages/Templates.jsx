import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Play, Heart, Eye, Sparkles, Zap,
  SlidersHorizontal, LayoutGrid, List, Copy, Check,
  X, Cpu, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AppLayout } from '@layouts/AppLayout';
import { LoginRequiredModal } from '@components/common/Modal';
import { useAuthStore } from '@store/auth.store';
import { templatesApi } from '@api/templates.api';
import { LANGUAGES, DIFFICULTIES, ROUTES } from '@constants';
import { useDebounce } from '@hooks/useDebounce';
import { formatNumber } from '@utils/format.utils';

// ─── Language Meta Definition ────────────────────────────────────────────────
const LANGUAGE_META = {
  javascript: { label: 'JavaScript', color: '#eab308', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', icon: '⚡', ext: 'js' },
  typescript: { label: 'TypeScript', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)', icon: '🔷', ext: 'ts' },
  python:     { label: 'Python',     color: '#0284c7', bg: 'rgba(2,132,199,0.15)', border: 'rgba(2,132,199,0.35)', icon: '🐍', ext: 'py' },
  java:       { label: 'Java',       color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)',  icon: '☕', ext: 'java' },
  cpp:        { label: 'C++',        color: '#6366f1', bg: 'rgba(99,102,241,0.12)',border: 'rgba(99,102,241,0.3)', icon: '⚙️', ext: 'cpp' },
  c:          { label: 'C',          color: '#64748b', bg: 'rgba(100,116,139,0.12)',border: 'rgba(100,116,139,0.3)', icon: '🔧', ext: 'c' },
  rust:       { label: 'Rust',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)',  icon: '🦀', ext: 'rs' },
  go:         { label: 'Go',         color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.3)',  icon: '🐹', ext: 'go' },
  sql:        { label: 'SQL',        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)',  icon: '🗃️', ext: 'sql' },
  html:       { label: 'HTML',       color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)',  icon: '🌐', ext: 'html' },
  css:        { label: 'CSS',        color: '#2563eb', bg: 'rgba(37,99,235,0.12)', border: 'rgba(37,99,235,0.3)',  icon: '🎨', ext: 'css' },
  shell:      { label: 'Shell',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)',  icon: '🖥️', ext: 'sh' },
};

const getLangMeta = (lang) =>
  LANGUAGE_META[lang?.toLowerCase()] || {
    label: lang || 'Code',
    color: 'var(--accent)',
    bg: 'var(--accent-dim)',
    border: 'var(--accent-border)',
    icon: '💻',
    ext: 'txt',
  };

// 3 standard levels only
const DIFFICULTY_META = {
  BEGINNER:     { label: 'Beginner',     color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  INTERMEDIATE: { label: 'Intermediate', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  ADVANCED:     { label: 'Advanced',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)'  },
};

const getDiffMeta = (diff) => DIFFICULTY_META[diff] || DIFFICULTY_META.INTERMEDIATE;

const estimateTypingTime = (code = '') => {
  const chars = code.length;
  const words = Math.max(1, Math.round(chars / 5));
  const mins = Math.max(0.5, Math.round((words / 45) * 10) / 10);
  return mins < 1 ? `${Math.round(mins * 60)}s` : `${mins} min`;
};

// ─── Custom Theme Dropdown ───────────────────────────────────────────────────
const ThemeDropdown = ({ icon: Icon, value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all text-xs font-bold"
        style={{
          background: 'var(--card-bg)',
          borderColor: isOpen ? 'var(--accent)' : 'var(--border)',
          color: 'var(--text-primary)',
          boxShadow: isOpen ? '0 0 0 2px var(--accent-dim)' : 'none',
        }}
      >
        {Icon && <Icon size={14} style={{ color: 'var(--accent-light)' }} />}
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-muted)' }}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 w-48 rounded-2xl p-1.5 shadow-2xl z-40 border"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border)',
              boxShadow: '0 16px 36px rgba(0,0,0,0.35)',
            }}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                  style={{
                    background: isSelected ? 'var(--accent-dim)' : 'transparent',
                    color: isSelected ? 'var(--accent-light)' : 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--bg-surface-2)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div className="flex items-center gap-2">
                    {opt.dotColor && (
                      <span className="w-2 h-2 rounded-full" style={{ background: opt.dotColor }} />
                    )}
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check size={12} style={{ color: 'var(--accent-light)' }} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Modal: Quick Code Inspector ─────────────────────────────────────────────
const CodeInspectorModal = ({ template, isOpen, onClose, onPlay }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !template) return null;

  const lang = getLangMeta(template.language);
  const diff = getDiffMeta(template.difficulty);
  const lines = (template.code || '').split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(template.code || '');
    setCopied(true);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-10"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="p-5 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-surface-2)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background: lang.bg, border: `1px solid ${lang.border}` }}
            >
              {lang.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  {template.title}
                </h3>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: diff.bg, color: diff.color, border: `1px solid ${diff.border}` }}
                >
                  {diff.label}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {lang.label} • {lines.length} lines • {template.code?.length || 0} characters
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 rounded-xl border transition-all text-xs font-semibold flex items-center gap-1.5"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl border transition-all hover:bg-white/5"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div
          className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        >
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-white/[0.04] transition-colors">
                  <td
                    className="select-none pr-4 pl-2 text-right font-mono text-[11px] align-top w-10"
                    style={{ color: 'var(--text-muted)', opacity: 0.5, userSelect: 'none' }}
                  >
                    {idx + 1}
                  </td>
                  <td
                    className="pr-4 whitespace-pre font-mono text-[12.5px] font-medium leading-relaxed"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {line || '\u00A0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          className="p-4 border-t flex items-center justify-between"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-surface-2)' }}
        >
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1">
              <Eye size={13} /> {formatNumber(template.plays || 0)} plays
            </span>
            <span className="flex items-center gap-1">
              <Heart size={13} /> {formatNumber(template.likes || 0)} likes
            </span>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              onClose();
              onPlay(template.id);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg shadow-violet-500/25"
            style={{ background: 'linear-gradient(135deg, var(--accent), #4f46e5)' }}
          >
            <Play size={14} fill="currentColor" /> Practice Now
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Bento Card Component ────────────────────────────────────────────────────
const BentoTemplateCard = ({ template, onPlay, onLike, onInspect, index }) => {
  const lang = getLangMeta(template.language);
  const diff = getDiffMeta(template.difficulty);
  const codeLines = (template.code || '').split('\n').slice(0, 4);
  const timeEst = estimateTypingTime(template.code);
  const tags = Array.isArray(template.tags) ? template.tags : Array.from(template.tags || []);
  const isLiked = !!template.isLiked;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
      whileHover={{ y: -4 }}
      className="group relative rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 cursor-pointer overflow-hidden border"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.08)',
      }}
      onClick={() => onInspect(template)}
    >
      <div
        className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, ${lang.color}, var(--accent))` }}
      />

      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
              style={{ background: lang.bg, border: `1px solid ${lang.border}` }}
            >
              {lang.icon}
            </span>
            <div>
              <span className="text-[11px] font-bold tracking-wide" style={{ color: lang.color }}>
                {lang.label}
              </span>
              <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <span className="font-mono">{template.code?.split('\n').length || 1} lines</span>
                <span>•</span>
                <span>{timeEst}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-bold"
              style={{ background: diff.bg, color: diff.color, border: `1px solid ${diff.border}` }}
            >
              {diff.label}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike(template);
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                isLiked
                  ? 'text-rose-500 bg-rose-500/10'
                  : 'text-text-muted hover:text-rose-400 hover:bg-rose-500/10'
              }`}
              style={{ color: isLiked ? '#f43f5e' : 'var(--text-muted)' }}
              title={isLiked ? 'Unlike template' : 'Like template'}
            >
              <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <h3
          className="font-bold text-base group-hover:text-primary transition-colors line-clamp-1 mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          {template.title}
        </h3>
        <p className="text-xs line-clamp-2 mb-3 min-h-[32px]" style={{ color: 'var(--text-secondary)' }}>
          {template.description || `Practice ${lang.label} typing speed and syntax accuracy.`}
        </p>

        {/* Code Snippet Box — Crisp, high-contrast, theme-adaptive */}
        <div
          className="rounded-xl p-3 font-mono text-[11.5px] leading-relaxed mb-3 border relative overflow-hidden transition-colors"
          style={{
            background: 'var(--bg-surface-2)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <div className="space-y-1">
            {codeLines.map((line, i) => (
              <div key={i} className="flex gap-2.5 text-[11px] font-mono">
                <span
                  className="select-none w-3.5 text-right shrink-0 font-mono text-[10px]"
                  style={{ color: 'var(--text-muted)', opacity: 0.5 }}
                >
                  {i + 1}
                </span>
                <span className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                  {line || ' '}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                style={{
                  background: 'var(--bg-surface-2)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div
        className="flex items-center justify-between pt-3 border-t mt-1"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1">
            <Eye size={12} /> {formatNumber(template.plays || 0)}
          </span>
          <span className="flex items-center gap-1">
            <Heart size={12} fill={isLiked ? '#f43f5e' : 'none'} style={{ color: isLiked ? '#f43f5e' : 'inherit' }} />{' '}
            {formatNumber(template.likes || 0)}
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            onPlay(template.id);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-md shadow-violet-500/20"
          style={{ background: 'linear-gradient(135deg, var(--accent), #4f46e5)' }}
        >
          <Play size={12} fill="currentColor" /> Practice
        </motion.button>
      </div>
    </motion.div>
  );
};

// ─── Compact List Row Component ──────────────────────────────────────────────
const CompactTemplateRow = ({ template, onPlay, onLike, onInspect, index }) => {
  const lang = getLangMeta(template.language);
  const diff = getDiffMeta(template.difficulty);
  const timeEst = estimateTypingTime(template.code);
  const isLiked = !!template.isLiked;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
      whileHover={{ scale: 1.002, x: 2 }}
      onClick={() => onInspect(template)}
      className="group flex items-center justify-between p-3.5 px-5 rounded-2xl transition-all cursor-pointer border mb-2"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
          style={{ background: lang.bg, border: `1px solid ${lang.border}` }}
        >
          {lang.icon}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4
              className="font-bold text-sm group-hover:text-primary transition-colors truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {template.title}
            </h4>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold shrink-0 hidden sm:inline-block"
              style={{ background: diff.bg, color: diff.color, border: `1px solid ${diff.border}` }}
            >
              {diff.label}
            </span>
          </div>
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {lang.label} • {template.code?.split('\n').length || 1} lines • {timeEst}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden md:flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1">
            <Eye size={12} /> {formatNumber(template.plays || 0)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike(template);
            }}
            className="flex items-center gap-1 hover:text-rose-400 transition-colors"
            style={{ color: isLiked ? '#f43f5e' : 'inherit' }}
          >
            <Heart size={12} fill={isLiked ? '#f43f5e' : 'none'} /> {formatNumber(template.likes || 0)}
          </button>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            onPlay(template.id);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm"
          style={{ background: 'linear-gradient(135deg, var(--accent), #4f46e5)' }}
        >
          <Play size={11} fill="currentColor" /> Play
        </motion.button>
      </div>
    </motion.div>
  );
};

// ─── Main Templates Component ────────────────────────────────────────────────
const Templates = () => {
  const [search, setSearch] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
  const [sortBy, setSortBy] = useState('popular'); // 'popular' | 'likes' | 'newest'
  const [viewMode, setViewMode] = useState('grid');
  const [inspectedTemplate, setInspectedTemplate] = useState(null);
  const [loginModal, setLoginModal] = useState(false);

  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.PRACTICE} replace />;
  }

  const debouncedSearch = useDebounce(search, 300);

  const { data: rawTemplates = [], isLoading } = useQuery({
    queryKey: ['templates', { search: debouncedSearch }],
    queryFn: () => templatesApi.getAll({ search: debouncedSearch, size: 100 }),
    select: (d) => d.data || [],
  });

  // Filter & Sort client-side
  const filteredTemplates = useMemo(() => {
    let list = [...rawTemplates];

    // Filter by Language
    if (selectedLanguage !== 'ALL') {
      list = list.filter((t) => t.language?.toLowerCase() === selectedLanguage.toLowerCase());
    }

    // Filter by 3 Difficulty Levels
    if (selectedDifficulty !== 'ALL') {
      list = list.filter((t) => t.difficulty?.toUpperCase() === selectedDifficulty.toUpperCase());
    }

    // Sort by Selected Criteria (Never filters items out)
    list.sort((a, b) => {
      if (sortBy === 'popular') {
        const diff = (b.plays || 0) - (a.plays || 0);
        if (diff !== 0) return diff;
        return (b.likes || 0) - (a.likes || 0);
      }
      if (sortBy === 'likes') {
        const diff = (b.likes || 0) - (a.likes || 0);
        if (diff !== 0) return diff;
        return (b.plays || 0) - (a.plays || 0);
      }
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      return 0;
    });

    return list;
  }, [rawTemplates, selectedLanguage, selectedDifficulty, sortBy]);

  const languageStats = useMemo(() => {
    const counts = {};
    rawTemplates.forEach((t) => {
      const l = t.language?.toLowerCase();
      if (l) counts[l] = (counts[l] || 0) + 1;
    });
    return counts;
  }, [rawTemplates]);

  const handlePlay = (id) => {
    templatesApi.recordPlay(id).catch(() => {});
    navigate(`${ROUTES.TYPING}/${id}`);
  };

  const handleInspect = (template) => {
    templatesApi.recordPlay(template.id).catch(() => {});
    setInspectedTemplate(template);
  };

  const handleLike = async (template) => {
    if (!isAuthenticated) {
      setLoginModal(true);
      return;
    }

    const previousData = queryClient.getQueryData(['templates', { search: debouncedSearch }]);
    const currentIsLiked = !!template.isLiked;
    const currentLikes = template.likes || 0;

    // Optimistic update
    queryClient.setQueryData(['templates', { search: debouncedSearch }], (old) => {
      if (!old || !old.data) return old;
      return {
        ...old,
        data: old.data.map((t) =>
          t.id === template.id
            ? {
                ...t,
                isLiked: !currentIsLiked,
                likes: currentIsLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1,
              }
            : t
        ),
      };
    });

    try {
      const res = await templatesApi.toggleLike(template.id);
      if (res.data?.liked) {
        toast.success('Added to favorites!');
      } else {
        toast.success('Removed from favorites');
      }
      queryClient.invalidateQueries(['templates']);
    } catch (err) {
      // Revert optimistic update
      queryClient.setQueryData(['templates', { search: debouncedSearch }], previousData);
      toast.error('Failed to update favorite. Please try again.');
    }
  };

  const handleCreate = () => {
    if (!isAuthenticated) {
      setLoginModal(true);
      return;
    }
    navigate(ROUTES.CREATE_TEMPLATE);
  };

  // 3 Difficulty Options
  const difficultyOptions = [
    { value: 'ALL', label: 'All Levels' },
    ...DIFFICULTIES.map((d) => ({
      value: d.value,
      label: d.label,
      dotColor: DIFFICULTY_META[d.value]?.color,
    })),
  ];

  // 3 Sort Options (Removed shortest length)
  const sortOptions = [
    { value: 'popular', label: 'Most Popular' },
    { value: 'likes', label: 'Most Liked' },
    { value: 'newest', label: 'Newest Added' },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Top Hero Banner */}
        <div
          className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border"
          style={{
            background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--bg-surface-2) 100%)',
            borderColor: 'var(--border)',
          }}
        >
          <div
            className="absolute -top-16 -right-16 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ background: 'var(--accent)' }}
          />
          <div
            className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full blur-3xl opacity-15 pointer-events-none"
            style={{ background: '#3b82f6' }}
          />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}
                >
                  <Sparkles size={12} /> Curated Catalog
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {rawTemplates.length} snippets available
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Explore Code Templates
              </h1>
              <p className="text-sm max-w-xl leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Practice typing real-world algorithms, data structures, and production-grade snippets across 12+ programming languages.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => navigate(ROUTES.AI_TEMPLATE)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm border transition-all duration-200"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <Cpu size={15} style={{ color: 'var(--accent-light)' }} />
                <span>AI Generator</span>
              </button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm text-white shadow-lg shadow-violet-500/25"
                style={{ background: 'linear-gradient(135deg, var(--accent), #4f46e5)' }}
              >
                <Plus size={16} />
                <span>New Template</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Bar - Rounded with theme input background */}
            <div
              className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
            >
              <Search size={16} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
              <input
                type="text"
                placeholder="Search by snippet name, topic, or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm outline-none font-medium"
                style={{ color: 'var(--text-primary)' }}
              />
              {search && (
                <button onClick={() => setSearch('')} className="p-1" style={{ color: 'var(--text-muted)' }}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* 3-Level Difficulty Dropdown */}
            <ThemeDropdown
              icon={Zap}
              value={selectedDifficulty}
              onChange={setSelectedDifficulty}
              options={difficultyOptions}
              placeholder="All Levels"
            />

            {/* Sort Dropdown (Popular, Likes, Newest) */}
            <ThemeDropdown
              icon={SlidersHorizontal}
              value={sortBy}
              onChange={setSortBy}
              options={sortOptions}
              placeholder="Sort By"
            />

            {/* View Mode Toggle */}
            <div
              className="flex items-center p-1 rounded-2xl border shrink-0"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
            >
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition-all ${
                  viewMode === 'grid'
                    ? 'text-white shadow-sm'
                    : 'hover:text-text-primary'
                }`}
                style={
                  viewMode === 'grid'
                    ? { background: 'var(--accent)' }
                    : { color: 'var(--text-muted)' }
                }
                title="Grid View"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition-all ${
                  viewMode === 'list'
                    ? 'text-white shadow-sm'
                    : 'hover:text-text-primary'
                }`}
                style={
                  viewMode === 'list'
                    ? { background: 'var(--accent)' }
                    : { color: 'var(--text-muted)' }
                }
                title="List View"
              >
                <List size={15} />
              </button>
            </div>
          </div>

          {/* Language Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
            <button
              onClick={() => setSelectedLanguage('ALL')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 border"
              style={
                selectedLanguage === 'ALL'
                  ? {
                      background: 'var(--accent-dim)',
                      borderColor: 'var(--accent-border)',
                      color: 'var(--accent-light)',
                    }
                  : {
                      background: 'var(--card-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-muted)',
                    }
              }
            >
              <span>🌐</span>
              <span>All Languages</span>
              <span className="text-[10px] opacity-60 font-mono">({rawTemplates.length})</span>
            </button>

            {LANGUAGES.map((lang) => {
              const meta = getLangMeta(lang.value);
              const count = languageStats[lang.value] || 0;
              const isSelected = selectedLanguage === lang.value;

              return (
                <button
                  key={lang.value}
                  onClick={() => setSelectedLanguage(isSelected ? 'ALL' : lang.value)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 border hover:scale-[1.02]"
                  style={
                    isSelected
                      ? {
                          background: meta.bg,
                          borderColor: meta.border,
                          color: meta.color,
                        }
                      : {
                          background: 'var(--card-bg)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-muted)',
                        }
                  }
                >
                  <span>{meta.icon}</span>
                  <span>{meta.label}</span>
                  {count > 0 && (
                    <span className="text-[10px] opacity-60 font-mono">({count})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Filter Bar Summary */}
        {(selectedLanguage !== 'ALL' || selectedDifficulty !== 'ALL' || search) && (
          <div className="flex items-center justify-between text-xs px-1" style={{ color: 'var(--text-muted)' }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span>Showing {filteredTemplates.length} templates for:</span>
              {selectedLanguage !== 'ALL' && (
                <span
                  className="px-2.5 py-1 rounded-xl font-bold text-[11px] flex items-center gap-1.5"
                  style={{
                    background: getLangMeta(selectedLanguage).bg,
                    color: getLangMeta(selectedLanguage).color,
                    border: `1px solid ${getLangMeta(selectedLanguage).border}`,
                  }}
                >
                  {getLangMeta(selectedLanguage).label}
                  <button onClick={() => setSelectedLanguage('ALL')}>
                    <X size={11} />
                  </button>
                </span>
              )}
              {selectedDifficulty !== 'ALL' && (
                <span
                  className="px-2.5 py-1 rounded-xl font-bold text-[11px] flex items-center gap-1.5"
                  style={{
                    background: getDiffMeta(selectedDifficulty).bg,
                    color: getDiffMeta(selectedDifficulty).color,
                    border: `1px solid ${getDiffMeta(selectedDifficulty).border}`,
                  }}
                >
                  {getDiffMeta(selectedDifficulty).label}
                  <button onClick={() => setSelectedDifficulty('ALL')}>
                    <X size={11} />
                  </button>
                </span>
              )}
              {search && (
                <span
                  className="px-2.5 py-1 rounded-xl font-bold text-[11px] border flex items-center gap-1.5"
                  style={{
                    background: 'var(--bg-surface-2)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  "{search}"
                  <button onClick={() => setSearch('')}>
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedLanguage('ALL');
                setSelectedDifficulty('ALL');
                setSearch('');
              }}
              className="text-xs hover:text-rose-400 font-semibold transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Content Grid / List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-64 rounded-2xl p-5 border animate-pulse flex flex-col justify-between"
                style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="w-10 h-10 rounded-lg" style={{ background: 'var(--bg-surface-2)' }} />
                    <div className="w-16 h-5 rounded" style={{ background: 'var(--bg-surface-2)' }} />
                  </div>
                  <div className="w-3/4 h-4 rounded" style={{ background: 'var(--bg-surface-2)' }} />
                  <div className="w-full h-16 rounded-xl" style={{ background: 'var(--bg-surface-2)' }} />
                </div>
                <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="w-20 h-3 rounded" style={{ background: 'var(--bg-surface-2)' }} />
                  <div className="w-20 h-7 rounded-lg" style={{ background: 'var(--bg-surface-2)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTemplates.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTemplates.map((template, idx) => (
                <BentoTemplateCard
                  key={template.id}
                  template={template}
                  index={idx}
                  onPlay={handlePlay}
                  onLike={handleLike}
                  onInspect={handleInspect}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map((template, idx) => (
                <CompactTemplateRow
                  key={template.id}
                  template={template}
                  index={idx}
                  onPlay={handlePlay}
                  onLike={handleLike}
                  onInspect={handleInspect}
                />
              ))}
            </div>
          )
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-12 text-center rounded-3xl border flex flex-col items-center justify-center space-y-4"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner"
              style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}
            >
              🔍
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                No templates found
              </h3>
              <p className="text-sm mt-1 max-w-sm" style={{ color: 'var(--text-muted)' }}>
                We couldn't find any code templates matching your current filter criteria.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setSelectedLanguage('ALL');
                  setSelectedDifficulty('ALL');
                  setSearch('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold border transition-colors hover:bg-surface-2"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Clear Filters
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md"
                style={{ background: 'linear-gradient(135deg, var(--accent), #4f46e5)' }}
              >
                Create Custom Template
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Code Inspection Modal */}
      <AnimatePresence>
        {inspectedTemplate && (
          <CodeInspectorModal
            template={inspectedTemplate}
            isOpen={!!inspectedTemplate}
            onClose={() => setInspectedTemplate(null)}
            onPlay={handlePlay}
          />
        )}
      </AnimatePresence>

      {/* Login Required Modal */}
      <LoginRequiredModal
        isOpen={loginModal}
        onClose={() => setLoginModal(false)}
        onLogin={() => navigate(ROUTES.LOGIN)}
        feature="create templates or like"
      />
    </AppLayout>
  );
};

export default Templates;
