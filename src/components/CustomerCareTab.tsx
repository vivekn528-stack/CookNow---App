import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Headphones,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  MessageSquare,
  Lock,
  Send,
  IndianRupee,
  ShoppingBag,
  User,
  ChefHat,
  Bike,
  Star,
  History,
  ExternalLink,
  MailWarning,
  X,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';
import {
  Order,
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
  SupportInternalNote,
  SupportMessage,
  SupportRefundStatus,
  SupportTicket,
  SupportTicketPriority,
  SupportTicketStats,
  SupportTicketStatus,
} from '../types';
import { supportService, SupportTicketFilter } from '../lib/support-service';

interface CustomerCareTabProps {
  orders: Order[];
  onInspectOrder: (order: Order) => void;
  onNotify?: (message: string) => void;
  onStatsChange?: (stats: SupportTicketStats) => void;
}

const EMPTY_STATS: SupportTicketStats = {
  totalTickets: 0,
  openTickets: 0,
  inProgressTickets: 0,
  waitingForCustomerTickets: 0,
  resolvedTickets: 0,
  closedTickets: 0,
  urgentActiveTickets: 0,
  unreadForOwnerCount: 0,
  avgResolutionMinutes: null,
  avgSatisfactionRating: null,
  satisfactionResponseCount: 0,
};

const STAFF_ASSIGNEES = [
  { id: '', name: '' },
  { id: 'owner-vivek', name: 'Vivek Singh Negi (Owner · Super Admin)' },
  { id: 'support-desk-nalapani', name: 'Nalapani Support Desk (Owner Supervised)' },
];

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}, ${d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function formatDurationMinutes(mins: number | null): string {
  if (mins === null || Number.isNaN(mins)) return '—';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function getStatusBadgeClass(status: SupportTicketStatus): string {
  switch (status) {
    case 'Open':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'In Progress':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Waiting for Customer':
      return 'bg-sky-100 text-sky-800 border-sky-200';
    case 'Resolved':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Closed':
      return 'bg-slate-200 text-slate-700 border-slate-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function getPriorityBadgeClass(priority: SupportTicketPriority): string {
  switch (priority) {
    case 'Urgent':
      return 'bg-rose-600 text-white border-rose-700';
    case 'High':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'Medium':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Low':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function getRefundBadgeClass(status: SupportRefundStatus): string {
  switch (status) {
    case 'Requested':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Approved':
      return 'bg-sky-100 text-sky-800 border-sky-200';
    case 'Rejected':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'Processed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-500 border-slate-200';
  }
}

export const CustomerCareTab: React.FC<CustomerCareTabProps> = ({
  orders,
  onInspectOrder,
  onNotify,
  onStatsChange,
}) => {
  // List & Stats state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<SupportTicketStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adminPersisted, setAdminPersisted] = useState<boolean>(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Selected Ticket Detail state
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [internalNotes, setInternalNotes] = useState<SupportInternalNote[]>([]);
  const [linkedOrderFromServer, setLinkedOrderFromServer] = useState<Order | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Reply & Note composers
  const [replyText, setReplyText] = useState('');
  const [replyNextStatus, setReplyNextStatus] = useState<string>('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const [internalNoteText, setInternalNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Meta & Assignment state
  const [customAssigneeInput, setCustomAssigneeInput] = useState('');
  const [isUpdatingMeta, setIsUpdatingMeta] = useState(false);

  // Refund management state
  const [refundStatusInput, setRefundStatusInput] = useState<Exclude<SupportRefundStatus, 'None'>>('Approved');
  const [refundAmountInput, setRefundAmountInput] = useState('');
  const [refundReasonInput, setRefundReasonInput] = useState('');
  const [refundRefInput, setRefundRefInput] = useState('');
  const [refundConfirmedCheck, setRefundConfirmedCheck] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [isSavingRefund, setIsSavingRefund] = useState(false);

  const currentFilters: SupportTicketFilter = useMemo(
    () => ({
      search: searchQuery.trim() || undefined,
      status: statusFilter,
      priority: priorityFilter,
      category: categoryFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      unreadOnly,
    }),
    [searchQuery, statusFilter, priorityFilter, categoryFilter, dateFrom, dateTo, unreadOnly]
  );

  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await supportService.fetchOwnerTickets(currentFilters);
      setTickets(res.tickets);
      setStats(res.stats);
      setAdminPersisted(res.adminPersisted);
      onStatsChange?.(res.stats);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed loading support tickets from Firestore.');
    } finally {
      setIsLoading(false);
    }
  }, [currentFilters, onStatsChange]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const openTicketDetail = useCallback(
    async (ticketId: string) => {
      setSelectedTicketId(ticketId);
      setIsDetailLoading(true);
      setDetailError(null);
      setRefundError(null);
      try {
        const detail = await supportService.fetchTicketDetail(ticketId, {
          markRead: true,
          isOwnerView: true,
        });
        setSelectedTicket(detail.ticket);
        setMessages(detail.messages);
        setInternalNotes(detail.internalNotes || []);
        setLinkedOrderFromServer(detail.linkedOrder || null);

        // Pre-populate refund inputs safely from ticket record
        const rf = detail.ticket.refund;
        if (rf && rf.status !== 'None') {
          setRefundStatusInput(rf.status);
          setRefundAmountInput(rf.amount > 0 ? String(rf.amount) : '');
          setRefundReasonInput(rf.reason || '');
          setRefundRefInput(rf.settlementReference || '');
          setRefundConfirmedCheck(Boolean(rf.manualConfirmationChecked));
        } else {
          setRefundStatusInput('Approved');
          setRefundAmountInput('');
          setRefundReasonInput('');
          setRefundRefInput('');
          setRefundConfirmedCheck(false);
        }

        // Update unread flag in list locally without unnecessary full reload
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, unreadForOwner: false } : t))
        );
      } catch (err: any) {
        setDetailError(err?.message || 'Unable to inspect ticket details.');
      } finally {
        setIsDetailLoading(false);
      }
    },
    []
  );

  const resolvedLinkedOrder: Order | null = useMemo(() => {
    if (linkedOrderFromServer) return linkedOrderFromServer;
    if (selectedTicket?.orderId) {
      return orders.find((o) => o.id === selectedTicket.orderId) || null;
    }
    return null;
  }, [linkedOrderFromServer, selectedTicket, orders]);

  const handleMetaUpdate = async (updates: {
    status?: SupportTicketStatus;
    priority?: SupportTicketPriority;
    assignedAgentId?: string | null;
    assignedAgentName?: string | null;
  }) => {
    if (!selectedTicket) return;
    setIsUpdatingMeta(true);
    setDetailError(null);
    try {
      const updated = await supportService.updateTicketMeta(
        selectedTicket.id,
        updates,
        selectedTicket
      );
      setSelectedTicket(updated);
      await loadTickets();
      onNotify?.(`Ticket ${updated.id} updated.`);
    } catch (err: any) {
      setDetailError(err?.message || 'Failed updating ticket properties.');
    } finally {
      setIsUpdatingMeta(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    setIsSendingReply(true);
    setDetailError(null);
    try {
      const res = await supportService.sendReply(selectedTicket.id, replyText.trim(), {
        nextStatus: (replyNextStatus || undefined) as SupportTicketStatus | undefined,
        senderRole: 'owner',
        senderName: 'Vivek Singh Negi (Owner · Support)',
        existingTicket: selectedTicket,
      });
      setMessages((prev) => [...prev, res.message]);
      setSelectedTicket(res.ticket);
      setReplyText('');
      setReplyNextStatus('');
      await loadTickets();
      onNotify?.('Customer reply saved to Firestore support thread.');
    } catch (err: any) {
      setDetailError(err?.message || 'Failed sending reply.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !internalNoteText.trim()) return;
    setIsSavingNote(true);
    setDetailError(null);
    try {
      const res = await supportService.addInternalNote(
        selectedTicket.id,
        internalNoteText.trim(),
        selectedTicket
      );
      setInternalNotes((prev) => [...prev, res.note]);
      setSelectedTicket(res.ticket);
      setInternalNoteText('');
      onNotify?.('Staff-only internal note recorded.');
    } catch (err: any) {
      setDetailError(err?.message || 'Failed saving staff internal note.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleSaveRefundDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setRefundError(null);

    const amountVal = refundStatusInput === 'Rejected' ? 0 : Number(refundAmountInput || 0);
    if (refundStatusInput !== 'Rejected' && (!Number.isFinite(amountVal) || amountVal <= 0)) {
      setRefundError('Enter a valid refund amount greater than ₹0.');
      return;
    }
    if (!refundReasonInput.trim() || refundReasonInput.trim().length < 3) {
      setRefundError('Provide a clear reason (at least 3 characters) for audit records.');
      return;
    }
    if (refundStatusInput === 'Processed') {
      if (!refundConfirmedCheck || refundRefInput.trim().length < 3) {
        setRefundError(
          'To mark a refund Processed, you must confirm manual settlement completion and enter a valid UPI/Cash reference note.'
        );
        return;
      }
    }

    setIsSavingRefund(true);
    try {
      const updated = await supportService.updateRefundDecision(
        selectedTicket.id,
        {
          status: refundStatusInput,
          amount: amountVal,
          reason: refundReasonInput.trim(),
          settlementReference: refundRefInput.trim() || undefined,
          manualConfirmationChecked: refundConfirmedCheck,
        },
        selectedTicket
      );
      setSelectedTicket(updated);
      await loadTickets();
      onNotify?.(`Refund status updated to "${refundStatusInput}" with audit trail.`);
    } catch (err: any) {
      setRefundError(err?.message || 'Failed updating refund decision.');
    } finally {
      setIsSavingRefund(false);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setDateFrom('');
    setDateTo('');
    setUnreadOnly(false);
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      statusFilter !== 'all' ||
      priorityFilter !== 'all' ||
      categoryFilter !== 'all' ||
      dateFrom ||
      dateTo ||
      unreadOnly
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-900 text-amber-300 flex items-center justify-center shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Customer Care &amp; Support Centre
              </h2>
              {stats.unreadForOwnerCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 rounded-md">
                  {stats.unreadForOwnerCount} Unread
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live Firestore complaint resolution, order inspection, staff notes, and audited refund decisions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
            {adminPersisted ? 'Server Admin + Firestore Active' : 'Authenticated Client Firestore Sync'}
          </span>
          <button
            onClick={loadTickets}
            disabled={isLoading}
            className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* A. Support Overview KPIs (Strictly from live Firestore records) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Total Tickets
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {stats.totalTickets}
          </div>
          <span className="text-[11px] text-slate-400 block">Firestore records</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wide">
            Open Tickets
          </span>
          <div className="text-2xl font-bold font-mono text-rose-700 tabular-nums">
            {stats.openTickets}
          </div>
          <span className="text-[11px] text-slate-400 block">Awaiting triage</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
            In Progress
          </span>
          <div className="text-2xl font-bold font-mono text-amber-700 tabular-nums">
            {stats.inProgressTickets}
          </div>
          <span className="text-[11px] text-slate-500 block">
            +{stats.waitingForCustomerTickets} waiting reply
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">
            Resolved
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-800 tabular-nums">
            {stats.resolvedTickets}
          </div>
          <span className="text-[11px] text-slate-500 block">
            {stats.closedTickets} closed
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wide">
            Urgent Active
          </span>
          <div className="text-2xl font-bold font-mono text-rose-800 tabular-nums">
            {stats.urgentActiveTickets}
          </div>
          <span className="text-[11px] text-slate-400 block">High-priority queue</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Avg Resolution
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {formatDurationMinutes(stats.avgResolutionMinutes)}
          </div>
          <span className="text-[11px] text-slate-400 block">Created to resolved</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            CSAT Rating
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-900 tabular-nums">
            {stats.avgSatisfactionRating !== null
              ? `${stats.avgSatisfactionRating.toFixed(1)}/5`
              : '—'}
          </div>
          <span className="text-[11px] text-slate-500 block">
            {stats.satisfactionResponseCount > 0
              ? `${stats.satisfactionResponseCount} customer ratings`
              : 'No ratings yet'}
          </span>
        </div>
      </div>

      {/* B. Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Search Ticket ID, Customer Name, Mobile or Order ID
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. TKT-..., Aman, 9876..., ORD-..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Statuses</option>
              {SUPPORT_TICKET_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Priorities</option>
              {SUPPORT_TICKET_PRIORITIES.map((pr) => (
                <option key={pr} value={pr}>
                  {pr}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Categories</option>
              {SUPPORT_TICKET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUnreadOnly((prev) => !prev)}
              className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                unreadOnly
                  ? 'bg-emerald-900 text-white border-emerald-900'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              Unread ({stats.unreadForOwnerCount})
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">Created Date:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white"
              aria-label="Filter from date"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white"
              aria-label="Filter to date"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 font-mono tabular-nums">
              Showing {tickets.length} ticket{tickets.length === 1 ? '' : 's'}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 underline cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error State */}
      {loadError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={loadTickets}
            className="px-3 py-1 bg-rose-800 text-white rounded-lg font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content Area: Ticket Queue Table + Selected Complaint Inspector */}
      <div className={`grid grid-cols-1 ${selectedTicketId ? 'xl:grid-cols-12' : ''} gap-5 items-start`}>
        {/* Ticket Table / List */}
        <div
          className={`${
            selectedTicketId ? 'xl:col-span-6 hidden xl:block' : 'col-span-1'
          } bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden`}
        >
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-800" />
              <p>Loading live support tickets from Cloud Firestore...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Headphones className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">
                {hasActiveFilters ? 'No tickets match your filters' : 'No support tickets in Firestore yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {hasActiveFilters
                  ? 'Try clearing or widening your search query, status, category, or date range.'
                  : 'All metrics above reflect live Firestore data. Real tickets submitted by customers from My Orders or Customer Support will appear here automatically.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="mt-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="py-3 px-4">Ticket</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Category &amp; Subject</th>
                      <th className="py-3 px-3">Order</th>
                      <th className="py-3 px-3">Priority</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Refund</th>
                      <th className="py-3 px-4 text-right">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tickets.map((t) => {
                      const isSelected = t.id === selectedTicketId;
                      return (
                        <tr
                          key={t.id}
                          onClick={() => openTicketDetail(t.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-emerald-50/80'
                              : t.unreadForOwner
                              ? 'bg-amber-50/40 hover:bg-slate-50'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3 px-4 align-top whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {t.unreadForOwner && (
                                <span
                                  className="w-2 h-2 rounded-full bg-rose-600 shrink-0"
                                  title="Unread customer activity"
                                />
                              )}
                              <span className="font-mono font-bold text-slate-900">
                                {t.id}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {t.messageCount || 1} msg{(t.messageCount || 1) === 1 ? '' : 's'}
                            </span>
                          </td>

                          <td className="py-3 px-3 align-top">
                            <div className="font-semibold text-slate-900">{t.customerName}</div>
                            <div className="text-[11px] font-mono text-slate-500">{t.customerPhone}</div>
                          </td>

                          <td className="py-3 px-3 align-top max-w-[220px]">
                            <div className="text-[10px] font-semibold text-emerald-900 uppercase tracking-wide">
                              {t.category}
                            </div>
                            <div className="font-medium text-slate-800 truncate">{t.subject}</div>
                          </td>

                          <td className="py-3 px-3 align-top whitespace-nowrap">
                            {t.orderId ? (
                              <span className="font-mono text-[11px] font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                                {t.orderId}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">General</span>
                            )}
                          </td>

                          <td className="py-3 px-3 align-top whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded border ${getPriorityBadgeClass(
                                t.priority
                              )}`}
                            >
                              {t.priority}
                            </span>
                          </td>

                          <td className="py-3 px-3 align-top whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded border ${getStatusBadgeClass(
                                t.status
                              )}`}
                            >
                              {t.status}
                            </span>
                          </td>

                          <td className="py-3 px-3 align-top whitespace-nowrap">
                            {t.refund && t.refund.status !== 'None' ? (
                              <span
                                className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded border ${getRefundBadgeClass(
                                  t.refund.status
                                )}`}
                              >
                                {t.refund.status}
                                {t.refund.amount > 0 ? ` · ₹${t.refund.amount}` : ''}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 align-top text-right whitespace-nowrap text-[11px] text-slate-500 font-mono tabular-nums">
                            {formatDateTime(t.updatedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openTicketDetail(t.id)}
                    className="w-full text-left p-4 space-y-2 hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {t.unreadForOwner && (
                          <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                        )}
                        <span className="font-mono font-bold text-xs text-slate-900">{t.id}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getStatusBadgeClass(
                          t.status
                        )}`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-slate-900">{t.subject}</div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                      <span>{t.customerName}</span>
                      <span>·</span>
                      <span className="font-mono">{t.customerPhone}</span>
                      {t.orderId && (
                        <>
                          <span>·</span>
                          <span className="font-mono font-semibold">{t.orderId}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getPriorityBadgeClass(
                          t.priority
                        )}`}
                      >
                        {t.priority}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {formatDateTime(t.updatedAt)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Complaint Detail & Resolution Workspace */}
        {selectedTicketId && (
          <div className="xl:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Inspector Top Bar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTicketId(null);
                    setSelectedTicket(null);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                  title="Back to ticket queue"
                >
                  <ArrowLeft className="w-4 h-4 xl:hidden" />
                  <X className="w-4 h-4 hidden xl:block" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-300">
                      {selectedTicketId}
                    </span>
                    {selectedTicket && (
                      <span className="text-[11px] text-slate-300 truncate">
                        · {selectedTicket.category}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold truncate">
                    {selectedTicket?.subject || 'Loading complaint details...'}
                  </h3>
                </div>
              </div>
            </div>

            {isDetailLoading ? (
              <div className="p-10 text-center text-xs text-slate-500 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-800" />
                <p>Loading ticket thread, order link, and staff notes...</p>
              </div>
            ) : detailError && !selectedTicket ? (
              <div className="p-6 text-xs text-rose-700">{detailError}</div>
            ) : selectedTicket ? (
              <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
                {detailError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{detailError}</span>
                  </div>
                )}

                {/* Ticket Meta Controls: Status, Priority, Assignee */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Ticket Status
                    </label>
                    <select
                      disabled={isUpdatingMeta}
                      value={selectedTicket.status}
                      onChange={(e) =>
                        handleMetaUpdate({ status: e.target.value as SupportTicketStatus })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                    >
                      {SUPPORT_TICKET_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Priority Level
                    </label>
                    <select
                      disabled={isUpdatingMeta}
                      value={selectedTicket.priority}
                      onChange={(e) =>
                        handleMetaUpdate({ priority: e.target.value as SupportTicketPriority })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                    >
                      {SUPPORT_TICKET_PRIORITIES.map((pr) => (
                        <option key={pr} value={pr}>
                          {pr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Assigned Support Handler
                    </label>
                    <select
                      disabled={isUpdatingMeta}
                      value={selectedTicket.assignedAgentName || ''}
                      onChange={(e) => {
                        const chosen = STAFF_ASSIGNEES.find((a) => a.name === e.target.value);
                        handleMetaUpdate({
                          assignedAgentId: chosen?.id || null,
                          assignedAgentName: chosen?.name || null,
                        });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Unassigned</option>
                      {STAFF_ASSIGNEES.filter((a) => a.name).map((a) => (
                        <option key={a.id} value={a.name}>
                          {a.name}
                        </option>
                      ))}
                      {selectedTicket.assignedAgentName &&
                        !STAFF_ASSIGNEES.some((a) => a.name === selectedTicket.assignedAgentName) && (
                          <option value={selectedTicket.assignedAgentName}>
                            {selectedTicket.assignedAgentName}
                          </option>
                        )}
                    </select>
                  </div>

                  <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
                    <div className="flex flex-wrap items-center gap-3">
                      <span>
                        <strong>Created:</strong> {formatDateTime(selectedTicket.createdAt)}
                      </span>
                      <span>
                        <strong>Updated:</strong> {formatDateTime(selectedTicket.updatedAt)}
                      </span>
                      {selectedTicket.resolvedAt && (
                        <span className="text-emerald-800 font-semibold">
                          Resolved: {formatDateTime(selectedTicket.resolvedAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={customAssigneeInput}
                        onChange={(e) => setCustomAssigneeInput(e.target.value)}
                        placeholder="Custom staff handler..."
                        className="px-2 py-1 text-[11px] border border-slate-300 rounded bg-white w-36"
                      />
                      <button
                        type="button"
                        disabled={!customAssigneeInput.trim() || isUpdatingMeta}
                        onClick={() => {
                          handleMetaUpdate({
                            assignedAgentId: 'staff-manual',
                            assignedAgentName: customAssigneeInput.trim(),
                          });
                          setCustomAssigneeInput('');
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-[11px] font-semibold rounded cursor-pointer"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                </div>

                {/* Customer Details Summary */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-800" />
                      Customer Profile &amp; Initial Complaint
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      UID: {selectedTicket.customerId}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400 block">Name</span>
                      <strong className="text-slate-900">{selectedTicket.customerName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Mobile</span>
                      <strong className="font-mono text-slate-900">{selectedTicket.customerPhone}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Email</span>
                      <strong className="text-slate-900 truncate block">{selectedTicket.customerEmail || '—'}</strong>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.description}
                  </div>
                </div>

                {/* D. Order-Linked Customer Support Card */}
                {selectedTicket.orderId && (
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-emerald-800" />
                        <span className="font-bold text-emerald-950">
                          Linked Order · <span className="font-mono">{selectedTicket.orderId}</span>
                        </span>
                      </div>

                      {resolvedLinkedOrder && (
                        <button
                          type="button"
                          onClick={() => onInspectOrder(resolvedLinkedOrder)}
                          className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Inspect Full Order</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                      <div className="bg-white p-2 rounded-lg border border-emerald-100">
                        <span className="text-slate-400 flex items-center gap-1">
                          <ChefHat className="w-3 h-3" /> Kitchen
                        </span>
                        <strong className="text-slate-900 block mt-0.5">
                          {resolvedLinkedOrder?.kitchenName ||
                            selectedTicket.orderSnapshot?.kitchenName ||
                            '—'}
                        </strong>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-emerald-100">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Bike className="w-3 h-3" /> Rider
                        </span>
                        <strong className="text-slate-900 block mt-0.5">
                          {resolvedLinkedOrder?.deliveryPartnerName ||
                            selectedTicket.orderSnapshot?.riderName ||
                            'Unassigned'}
                        </strong>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-emerald-100">
                        <span className="text-slate-400 block">Amount &amp; Payment</span>
                        <strong className="font-mono text-slate-900 block mt-0.5">
                          ₹
                          {resolvedLinkedOrder?.finalPayableAmount ??
                            selectedTicket.orderSnapshot?.orderAmount ??
                            0}{' '}
                          ({(
                            resolvedLinkedOrder?.paymentMethod ||
                            selectedTicket.orderSnapshot?.paymentMethod ||
                            'cod'
                          ).toUpperCase()}{' '}
                          ·{' '}
                          {resolvedLinkedOrder?.paymentStatus ||
                            selectedTicket.orderSnapshot?.paymentStatus ||
                            'pending'}
                          )
                        </strong>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-emerald-100">
                        <span className="text-slate-400 block">Order Status</span>
                        <strong className="text-emerald-900 uppercase block mt-0.5">
                          {(
                            resolvedLinkedOrder?.status ||
                            selectedTicket.orderSnapshot?.orderStatus ||
                            'pending'
                          ).replace(/_/g, ' ')}
                        </strong>
                      </div>
                    </div>

                    {/* Order Items */}
                    {((resolvedLinkedOrder?.items && resolvedLinkedOrder.items.length > 0) ||
                      (selectedTicket.orderSnapshot?.itemsSummary &&
                        selectedTicket.orderSnapshot.itemsSummary.length > 0)) && (
                      <div className="bg-white rounded-lg border border-emerald-100 divide-y divide-slate-100">
                        {(resolvedLinkedOrder?.items || selectedTicket.orderSnapshot?.itemsSummary || []).map(
                          (it: any, idx: number) => (
                            <div key={idx} className="px-3 py-1.5 flex justify-between text-[11px]">
                              <span className="text-slate-700">
                                {it.quantity} × {it.itemName}
                              </span>
                              <span className="font-mono font-semibold text-slate-900">
                                ₹{it.subtotal}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {/* Order Timeline */}
                    {resolvedLinkedOrder?.events && resolvedLinkedOrder.events.length > 0 && (
                      <div className="bg-white rounded-lg border border-emerald-100 p-2.5 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">
                          Order Fulfillment Timeline
                        </span>
                        {resolvedLinkedOrder.events.map((ev, i) => (
                          <div key={i} className="flex items-start justify-between gap-2 text-[11px]">
                            <span className="text-slate-700">
                              <strong className="uppercase text-[10px] text-emerald-900 mr-1">
                                [{ev.status.replace(/_/g, ' ')}]
                              </strong>
                              {ev.note}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 shrink-0">
                              {formatDateTime(ev.timestamp)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* E. Refund & Resolution Management */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <IndianRupee className="w-4 h-4 text-emerald-800" />
                      Refund &amp; Resolution Management
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getRefundBadgeClass(
                        selectedTicket.refund?.status || 'None'
                      )}`}
                    >
                      Status: {selectedTicket.refund?.status || 'None'}
                      {selectedTicket.refund?.amount > 0
                        ? ` · ₹${selectedTicket.refund.amount}`
                        : ''}
                    </span>
                  </div>

                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                    <span>
                      CookNow operates on Cash on Delivery (COD) with no automated payment gateway.
                      Never mark a refund <strong>Processed</strong> unless manual cash/UPI settlement has been completed and documented.
                    </span>
                  </div>

                  {selectedTicket.refund && selectedTicket.refund.status !== 'None' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-600">
                      <div>
                        <span className="text-slate-400">Reason:</span>{' '}
                        <strong className="text-slate-800">{selectedTicket.refund.reason || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Responsible Admin:</span>{' '}
                        <strong className="text-slate-800">
                          {selectedTicket.refund.responsibleAdmin || '—'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Decision Date:</span>{' '}
                        <strong className="font-mono text-slate-800">
                          {formatDateTime(selectedTicket.refund.decidedAt || selectedTicket.refund.requestedAt)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Settlement Ref / Processed At:</span>{' '}
                        <strong className="font-mono text-slate-800">
                          {selectedTicket.refund.settlementReference || '—'}
                          {selectedTicket.refund.processedAt
                            ? ` (${formatDateTime(selectedTicket.refund.processedAt)})`
                            : ''}
                        </strong>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSaveRefundDecision} className="space-y-2.5">
                    {refundError && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800">
                        {refundError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Refund Status
                        </label>
                        <select
                          value={refundStatusInput}
                          onChange={(e) =>
                            setRefundStatusInput(e.target.value as Exclude<SupportRefundStatus, 'None'>)
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="Requested">Requested</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Processed">Processed (Manual Completed)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Refund Amount (₹)
                          {resolvedLinkedOrder ? ` · Max ₹${resolvedLinkedOrder.finalPayableAmount}` : ''}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={resolvedLinkedOrder?.finalPayableAmount}
                          disabled={refundStatusInput === 'Rejected'}
                          value={refundStatusInput === 'Rejected' ? '0' : refundAmountInput}
                          onChange={(e) => setRefundAmountInput(e.target.value)}
                          placeholder="e.g. 120"
                          className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Refund Decision Reason (Audit Logged) *
                      </label>
                      <input
                        type="text"
                        value={refundReasonInput}
                        onChange={(e) => setRefundReasonInput(e.target.value)}
                        placeholder="e.g. Verified missing item in kitchen thermal pack"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>

                    {refundStatusInput === 'Processed' && (
                      <div className="p-3 bg-white border border-emerald-300 rounded-lg space-y-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-emerald-950 mb-1">
                            Manual UPI / Cash Settlement Reference *
                          </label>
                          <input
                            type="text"
                            value={refundRefInput}
                            onChange={(e) => setRefundRefInput(e.target.value)}
                            placeholder="e.g. UPI-REF-884210 or Cash voucher #14"
                            className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <label className="flex items-start gap-2 text-[11px] text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={refundConfirmedCheck}
                            onChange={(e) => setRefundConfirmedCheck(e.target.checked)}
                            className="mt-0.5 rounded border-slate-300"
                          />
                          <span>
                            I confirm that this refund has actually been settled manually with the customer and is not a test transaction.
                          </span>
                        </label>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSavingRefund}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        {isSavingRefund ? 'Recording...' : 'Save Refund Decision'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* F. Customer Communication Thread */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-emerald-800" />
                      Customer Communication Thread ({messages.length})
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Visible to customer &amp; owner
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 flex items-start gap-2">
                    <MailWarning className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <span>
                      Replies are persisted in Cloud Firestore and shown inside the customer’s account. External WhatsApp, SMS, email, and push channels are not integrated.
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {messages.map((m) => {
                      const isOwnerMsg = m.senderRole === 'owner';
                      return (
                        <div
                          key={m.id}
                          className={`p-3 rounded-xl border text-xs ${
                            isOwnerMsg
                              ? 'bg-emerald-50 border-emerald-200 ml-4'
                              : 'bg-slate-50 border-slate-200 mr-4'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-slate-900">
                              {m.senderName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {formatDateTime(m.createdAt)}
                            </span>
                          </div>
                          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {m.body}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <form onSubmit={handleSendReply} className="space-y-2 pt-2 border-t border-slate-100">
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a clear, helpful response to the customer..."
                      className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <select
                        value={replyNextStatus}
                        onChange={(e) => setReplyNextStatus(e.target.value)}
                        className="px-2.5 py-1.5 text-[11px] border border-slate-300 rounded-lg bg-white text-slate-700"
                      >
                        <option value="">Auto-update status (Open → In Progress)</option>
                        {SUPPORT_TICKET_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            Also set status: {st}
                          </option>
                        ))}
                      </select>

                      <button
                        type="submit"
                        disabled={isSendingReply || !replyText.trim()}
                        className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSendingReply ? 'Sending...' : 'Send Customer Reply'}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Staff-Only Internal Notes (Isolated from Customer Access) */}
                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-950 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-amber-800" />
                      Staff-Only Internal Notes ({internalNotes.length})
                    </span>
                    <span className="text-[10px] font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                      Hidden from Customer
                    </span>
                  </div>

                  {internalNotes.length === 0 ? (
                    <p className="text-[11px] text-amber-900/70 italic">
                      No internal investigation notes recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {internalNotes.map((note) => (
                        <div
                          key={note.id}
                          className="p-2.5 bg-white rounded-lg border border-amber-200 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span className="font-bold text-slate-800">
                              {note.authorName} ({note.authorEmail})
                            </span>
                            <span className="font-mono">{formatDateTime(note.createdAt)}</span>
                          </div>
                          <p className="text-slate-700 whitespace-pre-wrap">{note.body}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleAddInternalNote} className="flex gap-2">
                    <input
                      type="text"
                      value={internalNoteText}
                      onChange={(e) => setInternalNoteText(e.target.value)}
                      placeholder="Add private cook/rider verification or internal note..."
                      className="flex-1 px-3 py-1.5 text-xs border border-amber-300 rounded-lg bg-white"
                    />
                    <button
                      type="submit"
                      disabled={isSavingNote || !internalNoteText.trim()}
                      className="px-3 py-1.5 bg-amber-900 hover:bg-amber-950 disabled:opacity-50 text-white text-xs font-semibold rounded-lg cursor-pointer shrink-0"
                    >
                      {isSavingNote ? 'Saving...' : 'Add Note'}
                    </button>
                  </form>
                </div>

                {/* CSAT Rating Display */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                    <div>
                      <span className="font-bold text-slate-900 block">
                        Customer Satisfaction (CSAT)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {selectedTicket.satisfactionFeedback
                          ? `"${selectedTicket.satisfactionFeedback}"`
                          : selectedTicket.satisfactionRating
                          ? `Rated on ${formatDateTime(selectedTicket.ratedAt)}`
                          : 'Submitted by customer after ticket is Resolved or Closed'}
                      </span>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-sm text-slate-900">
                    {selectedTicket.satisfactionRating
                      ? `${selectedTicket.satisfactionRating} / 5`
                      : 'Not rated'}
                  </div>
                </div>

                {/* Complete Audit History & Timestamps */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-600" />
                    Ticket Audit History ({selectedTicket.history?.length || 0})
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {(selectedTicket.history || []).map((ev) => (
                      <div
                        key={ev.id}
                        className="p-2 bg-white rounded-lg border border-slate-200 flex items-start justify-between gap-2 text-[11px]"
                      >
                        <div>
                          <span className="font-bold text-slate-900 mr-1.5">{ev.actorName}:</span>
                          <span className="text-slate-700">{ev.details}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          {formatDateTime(ev.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
