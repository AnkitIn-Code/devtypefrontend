import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Zap, Moon, Sun, Code2 } from 'lucide-react';
import { useAuthStore } from '@store/auth.store';
import { ROUTES } from '@constants';

export const LandingNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Practice', href: isAuthenticated ? ROUTES.TEMPLATES : ROUTES.PRACTICE },
    { label: 'About', href: '#about' },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-background/90 backdrop-blur-xl border-b border-border shadow-glass' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={ROUTES.HOME} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:shadow-glow transition-all duration-300">
              <Code2 size={18} className="text-zinc-900" />
            </div>
            <span className="font-bold text-lg text-text-primary">
              Code<span className="text-primary">Type</span> AI
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={link.href.startsWith('/') ? (e) => { e.preventDefault(); navigate(link.href); } : undefined}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-200 rounded-lg hover:bg-surface-2/50 cursor-pointer"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => navigate(ROUTES.DASHBOARD)}
                className="btn-primary text-sm px-4 py-2"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate(ROUTES.LOGIN)}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors px-4 py-2"
                >
                  Login
                </button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(ROUTES.SIGNUP)}
                  className="btn-primary text-sm px-4 py-2 rounded-xl"
                >
                  Get Started Free
                </motion.button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-surface-2 text-text-secondary"
          >
            {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block px-4 py-2.5 text-sm text-text-secondary hover:text-primary transition-colors rounded-lg"
                  onClick={() => setIsMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-3 border-t border-border flex gap-3">
                <button onClick={() => navigate(ROUTES.LOGIN)} className="flex-1 btn-ghost border border-border rounded-xl py-2.5 text-sm">
                  Login
                </button>
                <button onClick={() => navigate(ROUTES.SIGNUP)} className="flex-1 btn-primary rounded-xl py-2.5 text-sm">
                  Sign Up
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};
