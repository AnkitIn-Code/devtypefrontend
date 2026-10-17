import { Code2, MessageSquare, GitBranch, Link2 } from 'lucide-react';

export const LandingFooter = () => {
  return (
    <footer className="border-t border-border py-10 px-4 bg-background/50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Logo & description */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md">
            <Code2 size={18} className="text-zinc-900" />
          </div>
          <div>
            <span className="font-bold text-base text-text-primary">
              Code<span className="text-primary">Type</span> AI
            </span>
            <p className="text-xs text-muted">The AI-powered code typing platform for developers</p>
          </div>
        </div>

        {/* Minimal Copyright */}
        <div className="flex items-center gap-6 text-xs text-muted">
          <span>© 2026 DevType AI. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};
