import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Code2 } from 'lucide-react';
import { ROUTES } from '@constants';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Code2 size={16} className="text-zinc-900" />
          </div>
          <span className="font-bold text-lg">Code<span className="text-primary">Type</span> AI</span>
        </div>

        <div className="glass-card p-10">
          <div className="font-mono text-8xl font-black text-primary mb-4">404</div>
          <h1 className="text-2xl font-bold text-text-primary mb-3">Page Not Found</h1>
          <p className="text-text-secondary text-sm mb-8">
            The page you're looking for doesn't exist or has been moved.
            Let's get you back to coding!
          </p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="btn-ghost border border-border rounded-xl px-5 py-2.5 flex items-center gap-2 text-sm"
            >
              <ArrowLeft size={15} /> Go Back
            </button>
            <button
              onClick={() => navigate(ROUTES.HOME)}
              className="btn-primary rounded-xl px-5 py-2.5 flex items-center gap-2 text-sm"
            >
              <Home size={15} /> Home
            </button>
          </div>
        </div>

        {/* Random code snippets */}
        <div className="mt-8 font-mono text-xs text-primary/20 text-left space-y-1">
          <p>{'// Page not found'}</p>
          <p>{'throw new NotFoundException("Route: " + path);'}</p>
          <p>{'return Response.status(404).build();'}</p>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
