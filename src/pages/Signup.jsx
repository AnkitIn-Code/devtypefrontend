import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Lock, Eye, EyeOff, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@layouts/AuthLayout';
import { Input } from '@components/common/Input';
import { Button } from '@components/common/Button';
import { Divider } from '@components/common/Badge';
import { useAuthStore } from '@store/auth.store';
import { authApi } from '@api/auth.api';
import { ROUTES } from '@constants';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const res = await authApi.signup(data);
      const { user, accessToken, refreshToken } = res.data;
      login(user, accessToken, refreshToken);
      toast.success(`Welcome to CodeType AI, ${user.name}! 🚀`);
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start typing code faster today — it's free">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Button type="button" variant="glass" size="lg" className="w-full border border-border">
          <Globe size={18} />
          Sign up with Google
        </Button>

        <Divider label="or sign up with email" />

        <Input label="Full Name" placeholder="John Doe" icon={User} error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" placeholder="dev@example.com" icon={Mail} error={errors.email?.message} {...register('email')} />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min. 8 characters"
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

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Repeat your password"
          icon={Lock}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <p className="text-xs text-muted">
          By signing up, you agree to our{' '}
          <a href="#" className="text-primary hover:underline">Terms of Service</a> and{' '}
          <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
        </p>

        <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
          Create Account
        </Button>
      </form>

      <p className="text-center text-sm text-text-secondary mt-5">
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN} className="text-primary hover:text-yellow-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Signup;
