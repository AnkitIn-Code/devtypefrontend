import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X, Sparkles, User, Minimize2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { aiApi } from '@api/ai.api';
import { useAuthStore } from '@store/auth.store';

export const AIChatDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your DevType AI Assistant powered by DeepSeek-V4-Pro. Ask me anything about algorithms, code optimization, or typing techniques!",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { isAuthenticated, isGuest } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isAuthenticated || isGuest) return null;

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newHistory = [...messages, { role: 'user', content: userMessage }];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      const historyPayload = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-8);

      const res = await aiApi.chat(userMessage, historyPayload);
      if (res?.success === false && res?.error) {
        setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${res.error}` }]);
      } else {
        const reply = res?.response || res?.data?.response || res?.reply || res?.message || res?.content || "I'm here to help! Ask me anything about code or typing practice.";
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'AI Assistant unavailable';
      toast.error(errMsg);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${errMsg}. Please check backend logs or connection.` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Chat cleared. What coding topic or algorithm would you like to explore?",
      },
    ]);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isOpen && (
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 transition-all border border-violet-400/30 cursor-pointer"
            title="Chat with DeepSeek-V4-Pro AI"
          >
            <Bot size={16} className="text-violet-200" />
            <span>AI Assistant</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </motion.button>
        )}
      </div>

      {/* Floating Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 w-84 sm:w-96 h-[480px] rounded-3xl z-50 flex flex-col shadow-2xl overflow-hidden border"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Header */}
            <div
              className="p-3.5 px-4 flex items-center justify-between border-b"
              style={{
                borderColor: 'var(--border)',
                background: 'linear-gradient(90deg, rgba(124,58,237,0.12), transparent)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <Bot size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                    DevType AI <span className="text-[9px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 font-mono">DeepSeek-V4</span>
                  </h4>
                  <p className="text-[10px] text-muted">Coding & Practice Assistant</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleClear}
                  className="p-1.5 rounded-lg text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
                  title="Clear chat"
                >
                  <Trash2 size={13} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
                  title="Close"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Message History */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0 mt-0.5">
                      <Bot size={12} />
                    </div>
                  )}
                  <div
                    className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-violet-600 text-white rounded-br-sm'
                        : 'bg-surface-2/80 text-text-primary border border-border/40 rounded-bl-sm'
                    }`}
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {m.content}
                  </div>
                  {m.role === 'user' && (
                    <div className="w-6 h-6 rounded-lg bg-surface-2 border border-border/40 flex items-center justify-center text-text-secondary shrink-0 mt-0.5">
                      <User size={12} />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted text-[11px]">
                  <Bot size={12} className="text-violet-400 animate-spin" />
                  <span>DeepSeek is thinking…</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSend} className="p-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask DeepSeek about code..."
                disabled={isLoading}
                className="flex-1 bg-surface-2 border border-border/40 rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-muted focus:outline-none focus:border-violet-500/60"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
