import { AnimatedAuthCard } from '@components/auth/AnimatedAuthCard';

const Signup = () => {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full blur-[120px] opacity-20"
          style={{ background: 'var(--accent)' }}
        />
        <div
          className="absolute bottom-10 left-10 w-72 h-72 rounded-full blur-[100px] opacity-15"
          style={{ background: '#7c3aed' }}
        />
      </div>

      <AnimatedAuthCard mode="signup" />
    </div>
  );
};

export default Signup;
