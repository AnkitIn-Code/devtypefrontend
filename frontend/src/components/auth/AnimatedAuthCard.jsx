import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Lock, Eye, EyeOff, Globe, Sparkles, ArrowRight, Code2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '@components/common/Input';
import { Button } from '@components/common/Button';
import { Divider } from '@components/common/Badge';
import { useAuthStore } from '@store/auth.store';
import { authApi } from '@api/auth.api';
import { ROUTES } from '@constants';

// Zod schemas for Login & Signup
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

const signupSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const AnimatedAuthCard = ({ mode = 'login' }) => {
  const isSignUpMode = mode === 'signup';
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginAsGuest } = useAuthStore();
  const navigate = useNavigate();

  // Login form hook
  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  // Signup form hook
  const signupForm = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  });

  // Handle Login submission
  const handleLoginSubmit = async (data) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(data);
      const { user, accessToken, refreshToken } = res.data;
      login(user, accessToken, refreshToken);
      toast.success(`Welcome back, ${user.username || 'Coder'}! 🎉`);
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Signup submission
  const handleSignupSubmit = async (data) => {
    setIsLoading(true);
    try {
      const res = await authApi.signup({
        username: data.username,
        email: data.email,
        password: data.password,
      });
      const { user, accessToken, refreshToken } = res.data;
      login(user, accessToken, refreshToken);
      sessionStorage.setItem('show_welcome_bonus_modal', 'true');
      toast.success(`Welcome to DevType, ${user.username}! 🚀`);
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    toast('Google OAuth integration configured.', { icon: '🔧' });
  };

  const handleGuestMode = () => {
    loginAsGuest();
    navigate(ROUTES.TEMPLATES);
    toast.success('Welcome, Guest! Select a code snippet to practice.');
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:p-4">
      {/* Outer Card Container */}
      <div className="glass-card border border-border/40 rounded-3xl shadow-2xl overflow-hidden relative min-h-[580px] grid grid-cols-1 md:grid-cols-2">

        {/* ─── LEFT PANEL: SIGN IN FORM ─── */}
        <div
          className={`p-6 sm:p-10 flex flex-col justify-center transition-all duration-300 ${
            isSignUpMode ? 'opacity-40 md:opacity-100 pointer-events-none md:pointer-events-auto' : 'opacity-100'
          }`}
        >
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              Sign in
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              Welcome back! Please enter your credentials.
            </p>
          </div>

          <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
            <Button
              type="button"
              variant="glass"
              size="md"
              className="w-full border border-border/50 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold"
              onClick={handleGoogleLogin}
            >
              <Globe size={16} className="text-primary" /> Continue with Google
            </Button>

            <Divider label="or sign in with email" />

            <Input
              label="Email Address"
              type="email"
              placeholder="dev@example.com"
              icon={Mail}
              error={loginForm.formState.errors.email?.message}
              {...loginForm.register('email')}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              icon={Lock}
              error={loginForm.formState.errors.password?.message}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted hover:text-text-primary p-1"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
              {...loginForm.register('password')}
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-text-secondary">
                <input
                  type="checkbox"
                  {...loginForm.register('rememberMe')}
                  className="w-3.5 h-3.5 rounded border-border bg-surface accent-primary cursor-pointer"
                />
                Remember me
              </label>
              <Link to={ROUTES.FORGOT_PASSWORD} className="text-primary font-bold hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2 font-bold py-3 text-sm"
              isLoading={isLoading && !isSignUpMode}
            >
              SIGN IN
            </Button>
          </form>

          {/* Guest Mode & Mobile Toggle Link */}
          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
            <button
              onClick={handleGuestMode}
              className="text-xs text-muted hover:text-text-primary transition-colors flex items-center gap-1 font-medium"
            >
              Continue as Guest →
            </button>
            <button
              onClick={() => navigate(ROUTES.SIGNUP)}
              className="md:hidden text-xs text-primary font-bold hover:underline"
            >
              Create Account →
            </button>
          </div>
        </div>

        {/* ─── RIGHT PANEL: SIGN UP FORM ─── */}
        <div
          className={`p-6 sm:p-10 flex flex-col justify-center transition-all duration-300 ${
            !isSignUpMode ? 'opacity-40 md:opacity-100 pointer-events-none md:pointer-events-auto' : 'opacity-100'
          }`}
        >
          <div className="mb-5">
            <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              Create Account
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              Start typing code faster today — it's free!
            </p>
          </div>

          <form onSubmit={signupForm.handleSubmit(handleSignupSubmit)} className="space-y-3.5">
            <Button
              type="button"
              variant="glass"
              size="md"
              className="w-full border border-border/50 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold"
              onClick={handleGoogleLogin}
            >
              <Globe size={16} className="text-primary" /> Sign up with Google
            </Button>

            <Divider label="or sign up with details" />

            <Input
              label="Username"
              placeholder="johndoe"
              icon={User}
              error={signupForm.formState.errors.username?.message}
              {...signupForm.register('username')}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="dev@example.com"
              icon={Mail}
              error={signupForm.formState.errors.email?.message}
              {...signupForm.register('email')}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              icon={Lock}
              error={signupForm.formState.errors.password?.message}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted hover:text-text-primary p-1"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
              {...signupForm.register('password')}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Repeat password"
              icon={Lock}
              error={signupForm.formState.errors.confirmPassword?.message}
              {...signupForm.register('confirmPassword')}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2 font-bold py-3 text-sm"
              isLoading={isLoading && isSignUpMode}
            >
              CREATE ACCOUNT
            </Button>
          </form>

          {/* Mobile Toggle Link */}
          <div className="mt-3 pt-2 md:hidden text-center">
            <button
              onClick={() => navigate(ROUTES.LOGIN)}
              className="text-xs text-primary font-bold hover:underline"
            >
              Already have an account? Sign In →
            </button>
          </div>
        </div>

        {/* ─── ANIMATED SLIDING OVERLAY BANNER (Desktop Only) ─── */}
        <motion.div
          initial={false}
          animate={{ x: isSignUpMode ? '0%' : '100%' }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="hidden md:flex absolute top-0 bottom-0 left-0 w-1/2 z-30 flex-col items-center justify-center p-10 text-white text-center shadow-2xl rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)',
          }}
        >
          {/* Animated Background Mesh & Floating Particles */}
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Glow spots */}
          <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-purple-400/20 blur-2xl pointer-events-none" />

          {/* Content Cross-Fade Animation */}
          <AnimatePresence mode="wait">
            {!isSignUpMode ? (
              /* Mode = SIGN IN -> Banner sits on Right (x: 100%). Prompts SIGN UP */
              <motion.div
                key="signin-banner"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6 relative z-10 max-w-xs"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto shadow-inner">
                  <Sparkles size={28} className="text-yellow-300 animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-3xl font-black tracking-tight leading-tight">
                    Create, Account! 🚀
                  </h3>
                  <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-medium">
                    Sign up if you still don't have an account to track your typing speed, unlock achievements & challenge developer friends!
                  </p>
                </div>

                <button
                  onClick={() => navigate(ROUTES.SIGNUP)}
                  className="px-8 py-3 rounded-full border-2 border-white/80 bg-white/10 backdrop-blur-md hover:bg-white text-white hover:text-purple-700 text-xs font-extrabold tracking-wider uppercase transition-all duration-300 shadow-lg hover:shadow-white/20 active:scale-95"
                >
                  SIGN UP
                </button>
              </motion.div>
            ) : (
              /* Mode = SIGN UP -> Banner sits on Left (x: 0%). Prompts SIGN IN */
              <motion.div
                key="signup-banner"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6 relative z-10 max-w-xs"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto shadow-inner">
                  <Code2 size={28} className="text-emerald-300" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-3xl font-black tracking-tight leading-tight">
                    Welcome Back! ⌨️
                  </h3>
                  <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-medium">
                    Already have an account? Sign in to continue your coding practice streak and access your custom templates!
                  </p>
                </div>

                <button
                  onClick={() => navigate(ROUTES.LOGIN)}
                  className="px-8 py-3 rounded-full border-2 border-white/80 bg-white/10 backdrop-blur-md hover:bg-white text-white hover:text-purple-700 text-xs font-extrabold tracking-wider uppercase transition-all duration-300 shadow-lg hover:shadow-white/20 active:scale-95"
                >
                  SIGN IN
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
