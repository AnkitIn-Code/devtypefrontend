import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  AlertTriangle,
  Ban,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  Zap,
  Clock,
  Target,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@api/admin.api';
import AppLayout from '@layouts/AppLayout';
import { Button } from '@components/common/Button';
import { Badge, Spinner } from '@components/common/Badge';

export default function AdminSuspiciousSessions() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize] = useState(15);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const {
    data,
    isLoading,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['admin-suspicious-sessions', page, pageSize, fromDate, toDate],
    queryFn: () =>
      adminApi.getSuspiciousSessions({
        page,
        size: pageSize,
        from: fromDate ? new Date(fromDate).toISOString() : undefined,
        to: toDate ? new Date(toDate).toISOString() : undefined,
      }),
    select: (res) => res.data,
  });

  const invalidateMutation = useMutation({
    mutationFn: (sessionId) => adminApi.invalidateSession(sessionId),
    onSuccess: (res, sessionId) => {
      toast.success(res.data?.message || 'Session invalidated successfully');
      queryClient.invalidateQueries(['admin-suspicious-sessions']);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to invalidate session');
    },
  });

  const sessions = data?.content || [];
  const totalPages = data?.totalPages || 0;
  const totalElements = data?.totalElements || 0;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-error/10 border border-error/20 text-error">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-text tracking-tight">
                  Audit: Flagged Sessions
                </h1>
                <p className="text-sm text-text-muted mt-0.5">
                  Review suspicious typing runs and invalidate cheated scores (FEAT-S04)
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats & Refresh */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-surface border border-border flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-text-muted">Flagged:</span>
              <span className="font-bold text-text">{totalElements}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              icon={<RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="p-4 rounded-2xl bg-surface border border-border mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Filter Date:</span>
            </div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(0);
              }}
              className="px-3 py-1.5 rounded-xl bg-surface-2 border border-border text-sm text-text focus:outline-none focus:border-primary"
            />
            <span className="text-text-muted">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(0);
              }}
              className="px-3 py-1.5 rounded-xl bg-surface-2 border border-border text-sm text-text focus:outline-none focus:border-primary"
            />
            {(fromDate || toDate) && (
              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setPage(0);
                }}
                className="text-xs text-primary hover:underline ml-1"
              >
                Clear
              </button>
            )}
          </div>
          <div className="text-xs text-text-muted">
            Page {page + 1} of {Math.max(1, totalPages)}
          </div>
        </div>

        {/* Content Table / Cards */}
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-4 bg-surface rounded-2xl border border-border">
            <Spinner size="lg" />
            <p className="text-sm text-text-muted">Loading suspicious sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-16 text-center bg-surface rounded-2xl border border-border">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
            <h3 className="text-lg font-bold text-text">No Flagged Sessions Found</h3>
            <p className="text-sm text-text-muted mt-1">
              All recent typing runs passed anti-cheat validation thresholds.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-surface border border-border hover:border-border/80 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-base text-text flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      {s.username || 'Anonymous'}
                    </span>
                    <span className="text-xs text-text-muted">({s.email})</span>
                    <Badge variant="error" size="sm">
                      Suspicious
                    </Badge>
                    {s.xpEarned === 0 && (
                      <Badge variant="outline" size="sm">
                        0 XP
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
                    <span className="flex items-center gap-1 font-mono text-warning font-semibold">
                      <Zap className="w-3.5 h-3.5" />
                      {s.wpm} WPM (Raw: {s.rawWpm || s.wpm})
                    </span>
                    <span className="flex items-center gap-1 font-mono text-text">
                      <Target className="w-3.5 h-3.5 text-primary" />
                      {s.accuracy}% Acc
                    </span>
                    <span className="flex items-center gap-1 font-mono text-text">
                      <Clock className="w-3.5 h-3.5 text-text-muted" />
                      {(s.durationMs / 1000).toFixed(2)}s
                    </span>
                    <span className="text-text-muted">
                      Language: <span className="font-semibold text-text">{s.language || 'generic'}</span>
                    </span>
                    <span className="text-text-muted">
                      Snippet: <span className="text-text">{s.snippetTitle || 'Practice'}</span>
                    </span>
                  </div>

                  <div className="text-[11px] text-text-muted/70">
                    Recorded: {new Date(s.createdAt).toLocaleString()} • ID: {s.id}
                  </div>
                </div>

                {/* Right Action */}
                <div className="flex items-center gap-3 self-end lg:self-center">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(`Invalidate session for ${s.username || 'user'}? Any awarded XP/credits will be revoked.`)) {
                        invalidateMutation.mutate(s.id);
                      }
                    }}
                    loading={invalidateMutation.isPending && invalidateMutation.variables === s.id}
                    icon={<Ban className="w-4 h-4" />}
                  >
                    Invalidate
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              icon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
            <span className="text-xs text-text-muted">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              icon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
