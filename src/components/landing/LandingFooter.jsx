import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Code2, MessageSquare, GitBranch, Link2 } from 'lucide-react';
import { ROUTES } from '@constants';

export const LandingFooter = () => {
  const navigate = useNavigate();

  const footerLinks = {
    Product: [
      { label: 'Features', href: '#features' },
      { label: 'Templates', href: ROUTES.TEMPLATES },
      { label: 'AI Generator', href: ROUTES.AI_TEMPLATE },
      { label: 'Multiplayer', href: ROUTES.MULTIPLAYER },
    ],
    Company: [
      { label: 'About', href: '#about' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
    Resources: [
      { label: 'Documentation', href: '#' },
      { label: 'API Reference', href: '#' },
      { label: 'Changelog', href: '#' },
      { label: 'Status', href: '#' },
    ],
  };

  return (
    <footer className="border-t border-border py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Logo & description */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Code2 size={18} className="text-zinc-900" />
              </div>
              <span className="font-bold text-lg">Code<span className="text-primary">Type</span> AI</span>
            </div>
            <p className="text-sm text-text-secondary mb-5 leading-relaxed max-w-xs">
              The AI-powered typing platform built for developers who want to type code faster and more accurately.
            </p>
            <div className="flex items-center gap-3">
              {[MessageSquare, GitBranch, Link2].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-lg glass flex items-center justify-center text-muted hover:text-primary transition-colors">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="font-semibold text-text-primary mb-4 text-sm">{section}</h4>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-text-secondary hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted">© 2025 CodeType AI. All rights reserved.</p>
          <div className="flex items-center gap-6 text-xs text-muted">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
