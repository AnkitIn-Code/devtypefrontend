import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@layouts/AuthLayout';
import { Input } from '@components/common/Input';
import { Button } from '@components/common/Button';
import { authApi } from '@api/auth.api';
import { ROUTES } from '@constants';
import { motion } from 'framer-motion';

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

const resetSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [sent, setSent] = useState(false);
  const [devResetToken, setDevResetToken] = useState(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register: registerForgot,
    handleSubmit: handleSubmitForgot,
    formState: { errors: forgotErrors },
    getValues: getForgotValues,
  } = useForm({
    resolver: zodResolver(forgotSchema),
  });

  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: resetErrors },
  } = useForm({
    resolver: zodResolver(resetSchema),
  });

  const onForgotSubmit = async ({ email }) => {
    setIsLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      setSent(true);
      if (res?.data?.devResetToken) {
        setDevResetToken(res.data.devResetToken);
      }
      toast.success('Reset link sent!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async ({ newPassword }) => {
    if (!token) {
      toast.error('Reset token is missing');
      return;
    }
    setIsLoading(true);
    try {
      const res = await authApi.resetPassword(token, newPassword);
      setResetSuccess(true);
      toast.success(res?.data?.message || 'Password reset successfully!');
      setTimeout(() => navigate(ROUTES.LOGIN), 2000);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Reset token is invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  // If token is present in URL, render the Reset Password form
  if (token) {
    return (
      <AuthLayout
        title={resetSuccess ? 'Password Reset!' : 'Reset your password'}
        subtitle={resetSuccess ? undefined : 'Enter a new password for your account'}
      >
        {resetSuccess ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
            <CheckCircle size={48} className="text-success mx-auto" />
            <p className="text-text-secondary text-sm">
              Your password has been changed. Redirecting you to login...
            </p>
            <Link to={ROUTES.LOGIN} className="inline-block text-sm text-primary hover:underline">
              ← Go to login now
            </Link>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmitReset(onResetSubmit)} className="space-y-5">
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              error={resetErrors.newPassword?.message}
              {...registerReset('newPassword')}
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              error={resetErrors.confirmPassword?.message}
              {...registerReset('confirmPassword')}
            />
            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
              Set New Password
            </Button>
            <Link to={ROUTES.LOGIN} className="flex items-center justify-center gap-1 text-sm text-muted hover:text-text-primary transition-colors">
              <ArrowLeft size={14} /> Back to login
            </Link>
          </form>
        )}
      </AuthLayout>
    );
  }

  // Standard Forgot Password (email input) form
  return (
    <AuthLayout
      title={sent ? 'Check your email' : 'Forgot password?'}
      subtitle={sent ? undefined : "Enter your email and we'll send you a reset link"}
    >
      {sent ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
          <CheckCircle size={48} className="text-success mx-auto" />
          <p className="text-text-secondary text-sm">
            If an account exists for <strong className="text-text-primary">{getForgotValues('email')}</strong>,
            we sent a password reset link. Check your inbox and follow the instructions.
          </p>

          {devResetToken && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <span>🛠️ Dev Mode: Password Reset Token Generated</span>
              </div>
              <p className="text-[11px] text-muted">
                Since no external SMTP provider is configured in this environment, use the dev link below to test the reset flow:
              </p>
              <Link
                to={`/forgot-password?token=${devResetToken}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 underline"
              >
                Proceed to Reset Password Form →
              </Link>
            </div>
          )}

          <div>
            <Link to={ROUTES.LOGIN} className="inline-block text-sm text-primary hover:underline">
              ← Back to login
            </Link>
          </div>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmitForgot(onForgotSubmit)} className="space-y-5">
          <Input
            label="Email Address"
            type="email"
            placeholder="dev@example.com"
            icon={Mail}
            error={forgotErrors.email?.message}
            {...registerForgot('email')}
          />
          <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
            Send Reset Link
          </Button>
          <Link to={ROUTES.LOGIN} className="flex items-center justify-center gap-1 text-sm text-muted hover:text-text-primary transition-colors">
            <ArrowLeft size={14} /> Back to login
          </Link>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
