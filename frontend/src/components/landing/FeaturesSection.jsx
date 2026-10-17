import { motion } from 'framer-motion';
import {
  Zap, Cpu, Users, Trophy, BarChart3, TrendingUp, Award, GitBranch, Layers, Keyboard
} from 'lucide-react';

const FEATURES = [
  {
    icon: Keyboard,
    title: 'Real-Time Typing',
    description: 'Monkeytype-style typing engine with character-level accuracy tracking, WPM, and live stats.',
    color: 'from-yellow-500/20 to-yellow-600/5',
    border: 'border-yellow-500/20',
    iconBg: 'bg-yellow-500/20 text-yellow-400',
  },
  {
    icon: Cpu,
    title: 'AI Template Generator',
    description: 'Generate custom coding challenges with AI. Set language, difficulty, topic, and length.',
    color: 'from-blue-500/20 to-blue-600/5',
    border: 'border-blue-500/20',
    iconBg: 'bg-blue-500/20 text-blue-400',
  },
  {
    icon: Users,
    title: 'Multiplayer Races',
    description: 'Create or join rooms, race live against other developers, watch real-time progress bars.',
    color: 'from-green-500/20 to-green-600/5',
    border: 'border-green-500/20',
    iconBg: 'bg-green-500/20 text-green-400',
  },
  {
    icon: Trophy,
    title: 'Leaderboards',
    description: 'Compete daily, weekly, monthly, globally, and with friends. Climb the rankings.',
    color: 'from-orange-500/20 to-orange-600/5',
    border: 'border-orange-500/20',
    iconBg: 'bg-orange-500/20 text-orange-400',
  },
  {
    icon: BarChart3,
    title: 'Detailed Reports',
    description: 'After every session: speed charts, accuracy heatmaps, mistake analysis, and timelines.',
    color: 'from-purple-500/20 to-purple-600/5',
    border: 'border-purple-500/20',
    iconBg: 'bg-purple-500/20 text-purple-400',
  },
  {
    icon: TrendingUp,
    title: 'Progress Analytics',
    description: 'Track your improvement over time with beautiful charts and consistency metrics.',
    color: 'from-pink-500/20 to-pink-600/5',
    border: 'border-pink-500/20',
    iconBg: 'bg-pink-500/20 text-pink-400',
  },
  {
    icon: Award,
    title: 'Achievements',
    description: 'Earn badges for speed milestones, streaks, templates created, and language mastery.',
    color: 'from-yellow-500/20 to-yellow-600/5',
    border: 'border-yellow-500/20',
    iconBg: 'bg-yellow-500/20 text-yellow-400',
  },
  {
    icon: GitBranch,
    title: 'GitHub Import',
    description: 'Import real code directly from your GitHub repositories as typing templates.',
    color: 'from-zinc-500/20 to-zinc-600/5',
    border: 'border-zinc-500/20',
    iconBg: 'bg-zinc-500/20 text-zinc-400',
  },
  {
    icon: Layers,
    title: 'Custom Templates',
    description: 'Create, edit, share, and duplicate your own templates with Monaco editor support.',
    color: 'from-cyan-500/20 to-cyan-600/5',
    border: 'border-cyan-500/20',
    iconBg: 'bg-cyan-500/20 text-cyan-400',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export const FeaturesSection = () => (
  <section id="features" className="py-24 px-4">
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <span className="inline-block bg-primary/10 border border-primary/30 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-4">
          Everything You Need
        </span>
        <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mb-4">
          Built for <span className="text-gradient">serious developers</span>
        </h2>
        <p className="text-text-secondary max-w-2xl mx-auto text-lg">
          Every feature designed to help you type code faster, more accurately,
          and with deeper understanding of the languages you use every day.
        </p>
      </motion.div>

      {/* Feature Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-100px' }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {FEATURES.map((feature) => (
          <motion.div
            key={feature.title}
            variants={item}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`relative p-6 rounded-2xl border bg-gradient-to-br ${feature.color} ${feature.border} group cursor-default overflow-hidden`}
          >
            {/* Subtle hover glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/2 rounded-2xl" />

            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${feature.iconBg}`}>
              <feature.icon size={20} />
            </div>
            <h3 className="font-semibold text-text-primary mb-2">{feature.title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);
