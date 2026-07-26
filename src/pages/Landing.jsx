import { LandingNavbar } from '@components/landing/LandingNavbar';
import { HeroSection } from '@components/landing/HeroSection';
import { FeaturesSection } from '@components/landing/FeaturesSection';
import { LandingFooter } from '@components/landing/LandingFooter';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@constants';

const PricingSection = () => {
  const navigate = useNavigate();
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: ['Unlimited practice', '50+ templates', 'Basic reports', 'Leaderboard access', 'Guest mode'],
      cta: 'Get Started',
      highlight: false,
    },
    {
      name: 'Pro',
      price: '$9',
      period: 'per month',
      features: ['Everything in Free', 'AI template generator', 'Multiplayer races', 'Advanced analytics', 'Priority support', 'Custom themes'],
      cta: 'Start Pro Trial',
      highlight: true,
    },
    {
      name: 'Team',
      price: '$29',
      period: 'per month',
      features: ['Everything in Pro', 'Team leaderboard', 'Shared templates', 'Admin dashboard', 'API access', 'SSO'],
      cta: 'Contact Sales',
      highlight: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block bg-primary/10 border border-primary/30 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            Pricing
          </span>
          <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-text-secondary">Start free. Upgrade when you need more power.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`glass-card p-7 flex flex-col ${plan.highlight ? 'border-primary/40 shadow-glow' : ''}`}
            >
              {plan.highlight && (
                <div className="bg-primary/20 border border-primary/30 text-primary text-xs font-semibold px-3 py-1 rounded-full self-start mb-4">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-black text-primary">{plan.price}</span>
                <span className="text-muted text-sm">/{plan.period}</span>
              </div>
              <ul className="flex-1 space-y-2.5 mt-5 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="text-primary">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate(ROUTES.SIGNUP)}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  plan.highlight ? 'btn-primary' : 'btn-outline'
                }`}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Landing = () => (
  <div className="min-h-screen bg-background">
    <LandingNavbar />
    <HeroSection />
    <FeaturesSection />
    <PricingSection />
    <LandingFooter />
  </div>
);

export default Landing;
