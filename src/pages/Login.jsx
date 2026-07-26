import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@layouts/AuthLayout';
import { Input } from '@components/common/Input';
import { Button } from '@components/common/Button';
import { Divider } from '@components/common/Badge';
import { useAuthStore } from '@store/auth.store';
import { authApi } from '@api/auth.api';
import { ROUTES } from '@constants';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginAsGuest } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(data);
      const { user, accessToken, refreshToken } = res.data;
      login(user, accessToken, refreshToken);
      toast.success(`Welcome back, ${user.name}! 🎉`);
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    toast('Google OAuth requires configuration.', { icon: '🔧' });
  };

  const handleGuestMode = () => {
    loginAsGuest();
    navigate(ROUTES.TYPING);
    toast.success('Welcome, Guest! Practice mode enabled.');
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account to continue">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Google Login */}
        <Button
          type="button"
          variant="glass"
          size="lg"
          className="w-full border border-border"
          onClick={handleGoogleLogin}
        >
          <Globe size={18} />
          Continue with Google
        </Button>

        <Divider label="or sign in with email" />

        <Input
          label="Email"
          type="email"
          placeholder="dev@example.com"
          icon={Mail}
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            icon={Lock}
            error={errors.password?.message}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-muted hover:text-text-primary transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Remember Me + Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('rememberMe')}
              className="w-4 h-4 rounded border-border bg-surface accent-primary"
            />
            <span className="text-sm text-text-secondary">Remember me</span>
          </label>
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="text-sm text-primary hover:text-yellow-300 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
          Sign In
        </Button>
      </form>

      {/* Guest mode */}
      <div className="mt-4">
        <button
          onClick={handleGuestMode}
          className="w-full py-2.5 text-sm text-muted hover:text-text-secondary transition-colors"
        >
          Continue as Guest →
        </button>
      </div>

      <p className="text-center text-sm text-text-secondary mt-5">
        Don't have an account?{' '}
        <Link to={ROUTES.SIGNUP} className="text-primary hover:text-yellow-300 font-medium transition-colors">
          Sign up for free
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
