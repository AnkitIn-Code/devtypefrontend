import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Code2 } from 'lucide-react';
import { ROUTES } from '@constants';

export const AuthLayout = ({ children, title, subtitle }) => (
  <div
    className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden"
    style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', transition: 'background 0.3s ease' }}
  >
    {/* Dynamic Background Glows */}
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full blur-[100px] opacity-20"
        style={{ background: 'var(--accent)' }}
      />
      <div
        className="absolute bottom-10 right-10 w-64 h-64 rounded-full blur-[90px] opacity-10"
        style={{ background: '#4f46e5' }}
      />
    </div>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-md relative z-10 mx-auto"
    >
      {/* Brand Header */}
      <div className="text-center mb-6 sm:mb-8">
        <Link to={ROUTES.HOME} className="inline-flex items-center gap-2.5 group">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
              boxShadow: '0 4px 14px rgba(124,58,237,0.3)'
            }}
          >
            <Code2 size={20} className="text-white" />
          </div>
          <span className="font-black text-xl sm:text-2xl tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Code<span style={{ color: 'var(--accent-light)' }}>Type</span> AI
          </span>
        </Link>
        {title && (
          <h1
            className="text-2xl sm:text-3xl font-black mt-6 mb-2 tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-sm sm:text-base max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Auth Card Container */}
      <div
        className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        {children}
      </div>
    </motion.div>
  </div>
);
