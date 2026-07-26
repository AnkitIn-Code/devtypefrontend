import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Code2 } from 'lucide-react';
import { ROUTES } from '@constants';

export const AuthLayout = ({ children, title, subtitle }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
    {/* Background decoration */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-yellow-600/5 rounded-full blur-3xl" />
    </div>

    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md relative z-10"
    >
      {/* Logo */}
      <div className="text-center mb-8">
        <Link to={ROUTES.HOME} className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center group-hover:shadow-glow transition-all">
            <Code2 size={20} className="text-zinc-900" />
          </div>
          <span className="font-bold text-xl">Code<span className="text-primary">Type</span> AI</span>
        </Link>
        {title && <h1 className="text-2xl font-bold text-text-primary mt-6 mb-1">{title}</h1>}
        {subtitle && <p className="text-text-secondary text-sm">{subtitle}</p>}
      </div>

      {/* Card */}
      <div className="glass-card p-8">
        {children}
      </div>
    </motion.div>
  </div>
);
