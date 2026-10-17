import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, Key, ArrowRight, MoreHorizontal, AlertTriangle,
  X, Lock, ShieldAlert, LogOut, CheckCircle2, ChevronRight, Globe
} from 'lucide-react';

import toast from 'react-hot-toast';
import { AppLayout } from '@layouts/AppLayout';
import { Button } from '@components/common/Button';
import { useAuthStore } from '@store/auth.store';
import { userApi } from '@api/user.api';
import { ROUTES } from '@constants';

// Helper to mask email for security display (e.g. amanydv1****@gmail.com)
const maskEmail = (email = '') => {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 4) return `${local[0]}****@${domain}`;
  return `${local.slice(0, 4)}****@${domain}`;
};

// ─── Multi-Step Delete Account Confirmation Modal ─────────────────────────────
const DeleteAccountModal = ({ user, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Text confirmation, 2: Password confirmation
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleTextStepSubmit = (e) => {
    e.preventDefault();
    if (confirmText.trim() !== 'DELETE ACCOUNT') {
      toast.error('Please type "DELETE ACCOUNT" exactly as shown');
      return;
    }
    setStep(2);
  };

  const handleFinalDelete = async (e) => {
    e.preventDefault();
    if (!password) {
      toast.error('Password is required');
      return;
    }
    setIsDeleting(true);
    try {
      await userApi.deleteAccount(password);
      toast.success('Your account has been deleted. Email locked for 30 days.');
      onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Incorrect password. Deletion failed.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card p-6 border border-error/40 max-w-md w-full space-y-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <h3 className="font-bold text-base text-error flex items-center gap-2">
            <ShieldAlert size={18} /> Delete Account
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        {step === 1 && (
          <form onSubmit={handleTextStepSubmit} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-error/10 border border-error/30 text-xs text-error space-y-1">
              <p className="font-bold">⚠️ Warning: Account Deletion</p>
              <p>
                Deleting your account will permanently remove your progress, XP, stats, and achievements.
                Your email <strong className="underline">{user?.email}</strong> and username will be locked in the database for 30 days and cannot be reused during this period.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-text-secondary block mb-1">
                Type <span className="text-error font-mono font-bold">DELETE ACCOUNT</span> to confirm:
              </label>
              <input
                autoFocus
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value.toUpperCase())}
                placeholder="DELETE ACCOUNT"
                className="w-full px-3.5 py-2.5 bg-surface-2 border border-border/50 rounded-xl text-sm font-mono uppercase text-text-primary placeholder:text-muted outline-none focus:border-error/60"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                disabled={confirmText.trim() !== 'DELETE ACCOUNT'}
                className="text-xs px-4"
              >
                Proceed to Password →
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleFinalDelete} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-surface-2/60 border border-border/40 space-y-1">
              <p className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <Lock size={14} className="text-primary" /> Password Verification Required
              </p>
              <p className="text-[11px] text-muted">
                Please enter your account password to verify database identity before deletion.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-text-secondary block mb-1">
                Account Password
              </label>
              <input
                autoFocus
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full px-3.5 py-2.5 bg-surface-2 border border-border/50 rounded-xl text-sm text-text-primary placeholder:text-muted outline-none focus:border-error/60"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setStep(1)} className="text-xs">
                Back
              </Button>
              <Button
                type="submit"
                variant="danger"
                isLoading={isDeleting}
                className="text-xs px-5"
              >
                Confirm Delete Account
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
};

// ─── Main Settings Component ──────────────────────────────────────────────────
const Settings = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const maskedEmail = useMemo(() => maskEmail(user?.email || 'user@devtype.com'), [user?.email]);

  const [isUpdatingTz, setIsUpdatingTz] = useState(false);

  const TIMEZONES = [
    { id: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { id: 'America/New_York', label: 'Eastern Time (US & Canada)' },
    { id: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { id: 'America/Denver', label: 'Mountain Time (US & Canada)' },
    { id: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
    { id: 'Europe/London', label: 'London, Edinburgh, Dublin' },
    { id: 'Europe/Paris', label: 'Paris, Berlin, Rome, Madrid' },
    { id: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
    { id: 'Asia/Tokyo', label: 'Tokyo, Osaka, Sapporo' },
    { id: 'Asia/Singapore', label: 'Singapore, Kuala Lumpur' },
    { id: 'Asia/Dubai', label: 'Dubai, Abu Dhabi' },
    { id: 'Australia/Sydney', label: 'Sydney, Melbourne, Canberra' },
  ];

  const handleTimezoneChange = async (e) => {
    const newTz = e.target.value;
    setIsUpdatingTz(true);
    try {
      const res = await userApi.updateMe({ timezone: newTz });
      useAuthStore.getState().setUser(res.data);
      toast.success(`Timezone updated to ${newTz}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update timezone');
    } finally {
      setIsUpdatingTz(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
    toast.success('Signed out successfully');
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8 py-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          <p className="text-text-secondary text-sm mt-1">
            Manage your account credentials and personal preferences
          </p>
        </div>

        {/* ── Preferences & Timezone Section (FEAT-M06) ── */}
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Timezone & Streaks</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Daily challenges and streak reset boundaries align with your chosen local day.
            </p>
          </div>

          <div className="rounded-2xl border border-border/40 bg-surface-2/40 p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <Globe size={18} className="text-text-secondary shrink-0" />
              <div>
                <span className="text-sm font-bold text-text-primary block">IANA Timezone</span>
                <span className="text-xs text-text-muted">Active: {user?.timezone || 'UTC'}</span>
              </div>
            </div>

            <select
              value={user?.timezone || 'UTC'}
              onChange={handleTimezoneChange}
              disabled={isUpdatingTz}
              className="bg-surface border border-border rounded-xl px-3.5 py-2 text-xs font-medium text-text-primary focus:outline-none focus:border-accent"
            >
              {TIMEZONES.map(tz => (
                <option key={tz.id} value={tz.id}>
                  {tz.label} ({tz.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── General Account Card (Matching User Screenshot Layout) ── */}
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-text-primary">General</h2>
            <p className="text-xs text-text-muted mt-0.5">
              You can log in using your email, username, or DevType ID.
            </p>
          </div>

          <div className="rounded-2xl border border-border/40 bg-surface-2/40 overflow-hidden divide-y divide-border/30 shadow-md">
            {/* DevType ID / Username Row */}
            <div
              onClick={() => navigate(ROUTES.PROFILE)}
              className="p-4 flex items-center justify-between gap-4 hover:bg-surface-2/80 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <User size={18} className="text-text-secondary shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm font-bold text-text-primary mr-2">DevType ID</span>
                  <span className="text-sm text-text-secondary font-mono">{user?.username || 'Developer'}</span>
                </div>
              </div>
              <ArrowRight size={16} className="text-muted group-hover:text-text-primary group-hover:translate-x-1 transition-all" />
            </div>

            {/* Email Row */}
            <div
              onClick={() => navigate(ROUTES.PROFILE)}
              className="p-4 flex items-center justify-between gap-4 hover:bg-surface-2/80 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <Mail size={18} className="text-text-secondary shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm font-bold text-text-primary mr-2">Email</span>
                  <span className="text-sm text-text-secondary font-mono">{maskedEmail}</span>
                </div>
              </div>
              <ArrowRight size={16} className="text-muted group-hover:text-text-primary group-hover:translate-x-1 transition-all" />
            </div>


            {/* Password Row */}
            <div
              onClick={() => navigate(ROUTES.PROFILE)}
              className="p-4 flex items-center justify-between gap-4 hover:bg-surface-2/80 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <Key size={18} className="text-text-secondary shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm font-bold text-text-primary mr-2">Password</span>
                  <span className="text-sm text-text-secondary font-mono font-bold">••••••••</span>
                </div>
              </div>
              <ArrowRight size={16} className="text-muted group-hover:text-text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </div>


        {/* ── Danger Zone: Delete Account ── */}
        <div className="glass-card p-6 border border-error/30 bg-error/5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-base text-error flex items-center gap-2">
                <AlertTriangle size={18} /> Delete Account
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                Permanently remove your profile and data. Your email/username will be locked for 30 days.
              </p>
            </div>

            <Button
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
              className="text-xs px-4 font-bold"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* ── Delete Account Confirmation Modal ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <DeleteAccountModal
            user={user}
            onClose={() => setShowDeleteModal(false)}
            onSuccess={() => {
              setShowDeleteModal(false);
              handleLogout();
            }}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

export default Settings;
