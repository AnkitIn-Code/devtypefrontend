import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@layouts/AuthLayout';
import { Input } from '@components/common/Input';
import { Button } from '@components/common/Button';
import { authApi } from '@api/auth.api';
import { ROUTES } from '@constants';
import { motion } from 'framer-motion';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
});

const ForgotPassword = () => {
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, getValues } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email }) => {
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
      toast.success('Reset link sent!');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={sent ? 'Check your email' : 'Forgot password?'}
      subtitle={sent ? undefined : "Enter your email and we'll send you a reset link"}
    >
      {sent ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
          <CheckCircle size={48} className="text-success mx-auto" />
          <p className="text-text-secondary text-sm">
            We sent a password reset link to <strong className="text-text-primary">{getValues('email')}</strong>.
            Check your inbox and follow the instructions.
          </p>
          <Link to={ROUTES.LOGIN} className="inline-block text-sm text-primary hover:underline">
            ← Back to login
          </Link>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Email Address"
            type="email"
            placeholder="dev@example.com"
            icon={Mail}
            error={errors.email?.message}
            {...register('email')}
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
