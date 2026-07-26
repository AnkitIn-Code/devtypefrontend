import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, Play, Heart, Eye, Star, Code2 } from 'lucide-react';
import { AppLayout } from '@layouts/AppLayout';
import { Input } from '@components/common/Input';
import { Badge } from '@components/common/Badge';
import { Button } from '@components/common/Button';
import { LoginRequiredModal } from '@components/common/Modal';
import { useAuthStore } from '@store/auth.store';
import { templatesApi } from '@api/templates.api';
import { LANGUAGES, DIFFICULTIES, ROUTES } from '@constants';
import { useDebounce } from '@hooks/useDebounce';
import { getLanguageLabel, getDifficultyColor, formatNumber } from '@utils/format.utils';

const TemplateCard = ({ template, onPlay, onLike }) => (
  <motion.div
    whileHover={{ y: -4 }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-card p-5 flex flex-col gap-4 group cursor-pointer"
    onClick={() => onPlay(template.id)}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors truncate">
          {template.title}
        </h3>
        <p className="text-sm text-text-secondary mt-1 line-clamp-2">{template.description}</p>
      </div>
      <div className="text-2xl shrink-0">
        {template.language === 'java' ? '☕' : template.language === 'javascript' ? '🟨' :
         template.language === 'python' ? '🐍' : template.language === 'typescript' ? '🔷' :
         template.language === 'sql' ? '🗃️' : '💻'}
      </div>
    </div>

    {/* Code Preview */}
    <div className="bg-background/60 rounded-xl p-3 font-mono text-xs text-muted line-clamp-3 leading-relaxed">
      {template.code}
    </div>

    {/* Tags & Meta */}
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="primary" size="sm">{getLanguageLabel(template.language)}</Badge>
      <Badge
        size="sm"
        className={getDifficultyColor(template.difficulty)}
      >
        {template.difficulty}
      </Badge>
      {template.tags?.slice(0, 2).map(tag => (
        <Badge key={tag} size="sm">{tag}</Badge>
      ))}
    </div>

    {/* Footer */}
    <div className="flex items-center justify-between pt-1 border-t border-border">
      <div className="flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1">
          <Eye size={12} /> {formatNumber(template.plays)}
        </span>
        <span className="flex items-center gap-1 cursor-pointer hover:text-error transition-colors" onClick={(e) => { e.stopPropagation(); onLike(template.id); }}>
          <Heart size={12} /> {formatNumber(template.likes)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onPlay(template.id); }}
          className="flex items-center gap-1.5 btn-primary text-xs px-3 py-1.5 rounded-lg"
        >
          <Play size={12} /> Practice
        </button>
      </div>
    </div>
  </motion.div>
);

const Templates = () => {
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [diffFilter, setDiffFilter] = useState('');
  const [loginModal, setLoginModal] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const debouncedSearch = useDebounce(search, 300);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', { search: debouncedSearch, language: langFilter, difficulty: diffFilter }],
    queryFn: () => templatesApi.getAll({ search: debouncedSearch, language: langFilter, difficulty: diffFilter }),
    select: d => d.data,
  });

  const handlePlay = (id) => navigate(`${ROUTES.TYPING}/${id}`);

  const handleLike = (id) => {
    if (!isAuthenticated) { setLoginModal(true); return; }
    templatesApi.toggleLike(id).then(() => {});
  };

  const handleCreate = () => {
    if (!isAuthenticated) { setLoginModal(true); return; }
    navigate(ROUTES.CREATE_TEMPLATE);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Code Templates</h1>
            <p className="text-text-secondary text-sm mt-1">{templates.length} templates available</p>
          </div>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus size={16} /> Create Template
          </Button>
        </div>

        {/* Filters */}
        <div className="glass-card p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search templates..."
              icon={Search}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={langFilter}
            onChange={e => setLangFilter(e.target.value)}
            className="input-field w-full sm:w-48"
          >
            <option value="">All Languages</option>
            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <select
            value={diffFilter}
            onChange={e => setDiffFilter(e.target.value)}
            className="input-field w-full sm:w-40"
          >
            <option value="">All Levels</option>
            {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card p-5 h-56 animate-pulse" />
            ))}
          </div>
        ) : templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {templates.map(tpl => (
              <TemplateCard key={tpl.id} template={tpl} onPlay={handlePlay} onLike={handleLike} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Code2 size={40} className="text-muted mx-auto mb-4" />
            <h3 className="text-text-secondary font-medium">No templates found</h3>
            <p className="text-muted text-sm mt-1">Try different filters or create your own</p>
          </div>
        )}
      </div>

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
