import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, Cpu, Play } from 'lucide-react';
import { ROUTES } from '@constants';

// Code snippets that float in the background
const BG_SNIPPETS = [
  { text: 'public static void main(String[] args) {', x: '5%', y: '12%', size: 'text-sm', opacity: 0.06 },
  { text: 'const [count, setCount] = useState(0);', x: '60%', y: '8%', size: 'text-xs', opacity: 0.05 },
  { text: '@RestController @RequestMapping("/api")', x: '15%', y: '75%', size: 'text-xs', opacity: 0.06 },
  { text: 'SELECT * FROM users WHERE active = true', x: '55%', y: '80%', size: 'text-sm', opacity: 0.05 },
  { text: 'function binarySearch(arr, target) {', x: '2%', y: '45%', size: 'text-xs', opacity: 0.07 },
  { text: 'async def fetch_data(url: str) -> dict:', x: '65%', y: '50%', size: 'text-xs', opacity: 0.05 },
  { text: 'type DeepPartial<T> = { [P in keyof T]?:', x: '30%', y: '20%', size: 'text-xs', opacity: 0.04 },
  { text: 'import React, { useEffect, useRef }', x: '70%', y: '25%', size: 'text-xs', opacity: 0.06 },
  { text: 'for (let i = 0; i < arr.length; i++) {', x: '10%', y: '90%', size: 'text-xs', opacity: 0.05 },
  { text: 'return ResponseEntity.ok(service.findAll());', x: '50%', y: '93%', size: 'text-xs', opacity: 0.04 },
  { text: '01101001 01110100 01100101 01110010', x: '80%', y: '65%', size: 'text-xs', opacity: 0.04 },
  { text: 'git commit -m "feat: add AI typing engine"', x: '3%', y: '60%', size: 'text-xs', opacity: 0.05 },
];

// The demo text typed in hero
const DEMO_TEXT = `function quickSort(arr, low, high) {
  if (low < high) {
    const pi = partition(arr, low, high);
    quickSort(arr, low, pi - 1);
    quickSort(arr, pi + 1, high);
  }
}`;

// Typing animation hook
const useHeroTyping = (text) => {
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (visibleIndex >= text.length) {
      // Reset after a pause
      const resetTimer = setTimeout(() => setVisibleIndex(0), 2000);
      return () => clearTimeout(resetTimer);
    }
    const delay = text[visibleIndex] === '\n' ? 80 : Math.random() * 40 + 30;
    const timer = setTimeout(() => setVisibleIndex(i => i + 1), delay);
    return () => clearTimeout(timer);
  }, [visibleIndex, text]);

  // Cursor blink
  useEffect(() => {
    const blink = setInterval(() => setShowCursor(v => !v), 530);
    return () => clearInterval(blink);
  }, []);

  return { visibleIndex, showCursor };
};

export const HeroSection = () => {
  const navigate = useNavigate();
  const { visibleIndex, showCursor } = useHeroTyping(DEMO_TEXT);

  const chars = DEMO_TEXT.split('');

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20">
      {/* Background floating code */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {BG_SNIPPETS.map((snippet, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: snippet.opacity, y: 0 }}
            transition={{ delay: i * 0.15, duration: 1.2 }}
            style={{ left: snippet.x, top: snippet.y }}
            className={`absolute font-mono ${snippet.size} text-primary whitespace-nowrap`}
          >
            {snippet.text}
          </motion.div>
        ))}

        {/* Radial gradient center glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-yellow-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 mb-8"
        >
          <Zap size={14} className="text-primary" />
          <span className="text-sm font-medium text-primary">AI-Powered Typing Practice</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight"
        >
          Code Faster.
          <br />
          <span className="text-gradient">Think Better.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          The only typing platform built specifically for developers. Practice real code snippets,
          race against others, and get AI-generated challenges tailored to your stack.
        </motion.p>

        {/* Typing Demo Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="glass-card p-6 mb-10 text-left mx-auto max-w-2xl"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-error/60" />
            <div className="w-3 h-3 rounded-full bg-warning/60" />
            <div className="w-3 h-3 rounded-full bg-success/60" />
            <span className="ml-2 text-xs text-muted font-mono">quickSort.java</span>
          </div>
          <div className="font-mono text-sm leading-loose">
            {chars.map((char, i) => {
              let className = 'text-muted';
              if (i < visibleIndex) className = 'text-success';
              if (i === visibleIndex) className = 'text-text-primary relative';

              if (char === '\n') {
                return (
                  <span key={i}>
                    {i === visibleIndex && showCursor && (
                      <span className="inline-block w-0.5 h-4 bg-primary align-middle ml-0.5 animate-blink" />
                    )}
                    <br />
                  </span>
                );
              }
              return (
                <span key={i} className={className}>
                  {char}
                  {i === visibleIndex && showCursor && (
                    <span className="inline-block w-0.5 h-4 bg-primary align-middle animate-blink" />
                  )}
                </span>
              );
            })}
            {visibleIndex >= chars.length && showCursor && (
              <span className="inline-block w-0.5 h-4 bg-primary align-middle animate-blink" />
            )}
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(ROUTES.TYPING)}
            className="btn-primary text-base px-8 py-3.5 rounded-xl flex items-center gap-2 shadow-glow"
          >
            <Play size={18} />
            Start Practicing
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(ROUTES.AI_TEMPLATE)}
            className="btn-outline text-base px-8 py-3.5 rounded-xl flex items-center gap-2"
          >
            <Cpu size={18} />
            Generate with AI
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(ROUTES.CREATE_TEMPLATE)}
            className="btn-ghost text-base px-8 py-3.5 rounded-xl"
          >
            Create Template
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(ROUTES.LEADERBOARD)}
            className="btn-ghost text-base px-8 py-3.5 rounded-xl"
          >
            View Leaderboard
          </motion.button>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="flex items-center justify-center gap-8 mt-14 text-center"
        >
          {[
            { value: '50K+', label: 'Developers' },
            { value: '2M+', label: 'Tests Completed' },
            { value: '120 WPM', label: 'Top Speed' },
            { value: '500+', label: 'Code Templates' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-muted mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
