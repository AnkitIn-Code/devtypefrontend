import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
        {/* Google Login */}
        <Button
          type="button"
          variant="glass"
          size="lg"
          className="w-full border border-border flex items-center justify-center gap-2 py-3"
          onClick={handleGoogleLogin}
        >
          <Globe size={18} className="text-primary" />
          <span>Continue with Google</span>
        </Button>

        <Divider label="or sign in with email" />

        <Input
          label="Email Address"
          type="email"
          placeholder="dev@example.com"
          icon={Mail}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          icon={Lock}
          error={errors.password?.message}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted hover:text-text-primary transition-colors p-1"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          {...register('password')}
        />

        {/* Remember Me + Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register('rememberMe')}
              className="w-4 h-4 rounded border-border bg-surface accent-primary cursor-pointer"
            />
            <span className="text-xs sm:text-sm text-text-secondary">Remember me</span>
          </label>
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="text-xs sm:text-sm text-primary hover:text-yellow-300 font-medium transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full mt-2 font-bold py-3" isLoading={isLoading}>
          Sign In
        </Button>
      </form>

      {/* Guest mode */}
      <div className="mt-4 pt-3 border-t border-border/40">
        <button
          onClick={handleGuestMode}
          className="w-full py-2.5 text-xs sm:text-sm text-muted hover:text-text-primary transition-colors flex items-center justify-center gap-1 font-medium"
        >
          <span>Continue as Guest</span>
          <span>→</span>
        </button>
      </div>

      <p className="text-center text-xs sm:text-sm text-text-secondary mt-5">
        Don't have an account?{' '}
        <Link to={ROUTES.SIGNUP} className="text-primary hover:text-yellow-300 font-bold transition-colors">
          Sign up for free
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
