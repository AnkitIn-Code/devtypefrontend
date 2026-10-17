import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Play, Eye, Code2, Sparkles, UserPlus, LogIn, ArrowLeft } from 'lucide-react';
import { Badge } from '@components/common/Badge';
import { Button } from '@components/common/Button';
import { templatesApi } from '@api/templates.api';
import { ROUTES } from '@constants';
import { getLanguageLabel, getDifficultyColor, formatNumber } from '@utils/format.utils';

// Unauthenticated Guest Template Card (Clean presentation, no filter inputs)
const GuestTemplateCard = ({ template, onPlay }) => (
  <motion.div
    whileHover={{ y: -4 }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-card p-5 flex flex-col gap-4 group cursor-pointer border border-border/40 hover:border-primary/40 transition-all shadow-md"
    onClick={() => onPlay(template.id)}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-text-primary group-hover:text-primary transition-colors truncate text-base">
          {template.title}
        </h3>
        <p className="text-xs text-text-secondary mt-1 line-clamp-2">{template.description}</p>
      </div>
      <div className="text-2xl shrink-0">
        {template.language === 'java' ? '☕' : template.language === 'javascript' ? '🟨' :
         template.language === 'python' ? '🐍' : template.language === 'typescript' ? '🔷' :
         template.language === 'sql' ? '🗃️' : '💻'}
      </div>
    </div>

    {/* Code Preview */}
    <div className="bg-background/70 rounded-xl p-3.5 font-mono text-xs text-text-secondary line-clamp-3 leading-relaxed border border-border/30">
      {template.code}
    </div>

    {/* Tags & Meta */}
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="primary" size="sm">{getLanguageLabel(template.language)}</Badge>
      <Badge size="sm" className={getDifficultyColor(template.difficulty)}>
        {template.difficulty}
      </Badge>
      {(Array.isArray(template.tags) ? template.tags : Array.from(template.tags || [])).slice(0, 2).map(tag => (
        <Badge key={tag} size="sm">{tag}</Badge>
      ))}
    </div>

    {/* Footer CTA */}
    <div className="flex items-center justify-between pt-2 border-t border-border/40">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Eye size={13} /> {formatNumber(template.plays || 0)} plays
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onPlay(template.id); }}
        className="flex items-center gap-1.5 btn-primary text-xs px-4 py-2 rounded-xl font-bold shadow-md"
      >
        <Play size={13} /> Start Practice
      </button>
    </div>
  </motion.div>
);

const GuestPractice = () => {
  const navigate = useNavigate();

  // ONLY fetch pre-saved system templates (systemOnly: true, no filter parameters)
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['guest-system-templates'],
    queryFn: () => templatesApi.getAll({ systemOnly: true, size: 50 }),
    select: d => d.data || [],
  });

  const handlePlay = (id) => {
    navigate(`${ROUTES.TYPING}/${id}`);
  };

  return (
    <div
      className="min-h-screen p-4 sm:p-6 md:p-8 space-y-8"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      {/* Top Navigation Bar */}
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <button
          onClick={() => navigate(ROUTES.HOME)}
          className="flex items-center gap-2 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={16} /> Back to Home
        </button>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={() => navigate(ROUTES.LOGIN)} className="text-xs font-bold border border-border/40">
            <LogIn size={14} className="mr-1.5" /> Log In
          </Button>
          <Button size="sm" variant="primary" onClick={() => navigate(ROUTES.SIGNUP)} className="text-xs font-bold px-4">
            <UserPlus size={14} className="mr-1.5" /> Sign Up Free
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Hero */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold">
            <Sparkles size={14} /> System Code Practice
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
            Practice Pre-Saved Code Templates
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Select any pre-saved system template below to test your typing speed. Sign up for free to save custom templates, track your permanent WPM, and battle friends!
          </p>
        </div>

        {/* Templates Grid (No filter inputs as requested) */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card p-6 h-56 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {templates.map(tpl => (
              <GuestTemplateCard key={tpl.id} template={tpl} onPlay={handlePlay} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 glass-card rounded-3xl p-8 max-w-md mx-auto">
            <Code2 size={44} className="text-primary mx-auto mb-3 opacity-80" />
            <h3 className="text-text-primary font-bold text-lg">System Templates Loaded</h3>
            <p className="text-muted text-xs mt-1">Ready to practice code. Select any template to begin!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestPractice;
