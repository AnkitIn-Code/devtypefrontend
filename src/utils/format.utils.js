/**
 * Format numbers with K suffix
 */
export const formatNumber = (n) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
};

/**
 * Format time duration in seconds to human-readable
 */
export const formatDuration = (seconds) => {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

/**
 * Format date to relative time
 */
export const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) return date.toLocaleDateString();
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text, maxLength = 50) =>
  text?.length > maxLength ? text.slice(0, maxLength) + '...' : text;

/**
 * Get language display name
 */
export const getLanguageLabel = (lang) => {
  const map = {
    javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python',
    java: 'Java', cpp: 'C++', c: 'C', go: 'Go', rust: 'Rust',
    sql: 'SQL', html: 'HTML', css: 'CSS', shell: 'Shell',
  };
  return map[lang] || lang;
};

/**
 * Get difficulty color class
 */
export const getDifficultyColor = (diff) => {
  const map = {
    BEGINNER: 'text-success', INTERMEDIATE: 'text-warning',
    ADVANCED: 'text-error', EXPERT: 'text-purple-400',
  };
  return map[diff] || 'text-muted';
};

/**
 * cn helper — merges class names
 */
export const cn = (...classes) => classes.filter(Boolean).join(' ');
