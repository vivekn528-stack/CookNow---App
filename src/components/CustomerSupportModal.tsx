import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Headphones,
  Plus,
  Send,
  Star,
  AlertCircle,
  CheckCircle2,
  Clock,
  LogIn,
  MessageSquare,
  IndianRupee,
  RefreshCw,
} from 'lucide-react';
import {
  Order,
  SUPPORT_TICKET_CATEGORIES,
  SupportMessage,
  SupportTicket,
  SupportTicketCategory,
  SupportTicketPriority,
} from '../types';
import { supportService } from '../lib/support-service';

interface CustomerSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  initialOrder?: Order | null;
  currentUser?: { uid: string; email?: string | null; displayName?: string | null } | null;
  onSignIn?: () => void;
  onNotify?: (message: string) => void;
}

function formatShortDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString(
    'en-IN',
    { hour: '2-digit', minute: '2-digit' }
  )}`;
}

export const CustomerSupportModal: React.FC<CustomerSupportModalProps> = ({
  isOpen,
  onClose,
  orders,
  initialOrder,
  currentUser,
  onSignIn,
  onNotify,
}) => {
  const [mode, setMode] = useState<'my-tickets' | 'new-ticket'>('my-tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected ticket conversation
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // CSAT rating state
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // New Ticket Form state
  const [selectedOrderId, setSelectedOrderId] = useState<string>(initialOrder?.id || '');
  const [category, setCategory] = useState<SupportTicketCategory>('Late Delivery');
  const [priority, setPriority] = useState<SupportTicketPriority>('Medium');
  const [customerPhone, setCustomerPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [requestRefund, setRequestRefund] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const loadMyTickets = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const list = await supportService.fetchMyTickets();
      setTickets(list);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load your support tickets.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialOrder) {
      setSelectedOrderId(initialOrder.id);
      setCustomerPhone(initialOrder.customerPhone || '');
      setMode('new-ticket');
    } else {
      setMode('my-tickets');
    }
    setActiveTicket(null);
    setErrorMsg(null);
    if (currentUser) {
      loadMyTickets();
    }
  }, [isOpen, initialOrder, currentUser, loadMyTickets]);

  const handleOpenTicket = async (ticketId: string) => {
    setErrorMsg(null);
    try {
      const detail = await supportService.fetchTicketDetail(ticketId, {
        markRead: true,
        isOwnerView: false,
      });
      setActiveTicket(detail.ticket);
      setMessages(detail.messages);
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, unreadForCustomer: false } : t))
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to open ticket thread.');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMsg(null);

    if (subject.trim().length < 3) {
      setErrorMsg('Please enter a short summary subject (at least 3 characters).');
      return;
    }
    if (description.trim().length < 5) {
      setErrorMsg('Please describe your issue (at least 5 characters).');
      return;
    }

    const linkedOrd = selectedOrderId ? orders.find((o) => o.id === selectedOrderId) : undefined;
    setIsSubmittingTicket(true);
    try {
      const created = await supportService.createTicket({
        category,
        priority,
        subject: subject.trim(),
        description: description.trim(),
        orderId: selectedOrderId || null,
        customerPhone: customerPhone.trim() || linkedOrd?.customerPhone || 'Not provided',
        customerName: currentUser.displayName || linkedOrd?.customerName || 'CookNow Customer',
        requestRefund,
        orderSnapshot: linkedOrd
          ? {
              orderId: linkedOrd.id,
              kitchenId: linkedOrd.cookId,
              kitchenName: linkedOrd.kitchenName,
              riderId: linkedOrd.deliveryPartnerId,
              riderName: linkedOrd.deliveryPartnerName,
              orderAmount: linkedOrd.finalPayableAmount,
              paymentMethod: linkedOrd.paymentMethod,
              paymentStatus: linkedOrd.paymentStatus,
              orderStatus: linkedOrd.status,
              itemsSummary: linkedOrd.items.map((it) => ({
                itemName: it.itemName,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                subtotal: it.subtotal,
              })),
            }
          : null,
      });

      setSubject('');
      setDescription('');
      setRequestRefund(false);
      setMode('my-tickets');
      await loadMyTickets();
      await handleOpenTicket(created.id);
      onNotify?.(`Support ticket ${created.id} submitted to CookNow Customer Care.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create support ticket.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const handleSendCustomerReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim()) return;
    setIsSendingReply(true);
    setErrorMsg(null);
    try {
      const res = await supportService.sendReply(activeTicket.id, replyText.trim(), {
        senderRole: 'customer',
        senderName: activeTicket.customerName,
        existingTicket: activeTicket,
      });
      setMessages((prev) => [...prev, res.message]);
      setActiveTicket(res.ticket);
      setReplyText('');
      onNotify?.('Your reply has been sent to the CookNow Support team.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send reply.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket) return;
    setIsSubmittingRating(true);
    setErrorMsg(null);
    try {
      const updated = await supportService.submitCustomerRating(
        activeTicket.id,
        ratingValue,
        ratingFeedback.trim(),
        activeTicket
      );
      setActiveTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setRatingFeedback('');
      onNotify?.('Thank you for rating your support experience!');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to submit rating.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  if (!isOpen) return null;

  const customerOrders = currentUser
    ? orders.filter((o) => o.customerId === currentUser.uid)
    : [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Headphones className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="text-sm font-bold">CookNow Customer Care &amp; Help Desk</h2>
              <p className="text-[11px] text-emerald-200">
                Raise order complaints, track refund status, and message support directly.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-emerald-200 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Gate */}
        {!currentUser ? (
          <div className="p-8 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-stone-900">Sign in to access Customer Care</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Your support tickets and order complaints are tied securely to your verified Google account.
              </p>
            </div>
            {onSignIn && (
              <button
                type="button"
                onClick={onSignIn}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-lg inline-flex items-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Navigation Tabs inside Modal */}
            <div className="px-4 py-2.5 border-b border-stone-200 bg-stone-50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('my-tickets');
                    setActiveTicket(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs cursor-pointer ${
                    mode === 'my-tickets'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  My Support Tickets ({tickets.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('new-ticket');
                    setActiveTicket(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1 cursor-pointer ${
                    mode === 'new-ticket'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Raise New Complaint</span>
                </button>
              </div>

              <button
                type="button"
                onClick={loadMyTickets}
                disabled={isLoading}
                className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg cursor-pointer"
                title="Refresh tickets"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Create New Ticket Form */}
              {mode === 'new-ticket' && (
                <form onSubmit={handleCreateTicket} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Related Order (Optional)
                      </label>
                      <select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                      >
                        <option value="">General Inquiry / No Specific Order</option>
                        {customerOrders.map((ord) => (
                          <option key={ord.id} value={ord.id}>
                            {ord.id} · {ord.kitchenName} · ₹{ord.finalPayableAmount}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Complaint Category *
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                      >
                        {SUPPORT_TICKET_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Urgency Level *
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as SupportTicketPriority)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Issue Summary Subject *
                    </label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Missing mandua roti from my lunch thali"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Describe What Happened *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Share exact details so Vivek and the CookNow support desk can resolve this quickly..."
                      className="w-full p-3 border border-stone-300 rounded-lg"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requestRefund}
                      onChange={(e) => setRequestRefund(e.target.checked)}
                      className="rounded border-stone-300"
                    />
                    <span>I would like to request a refund review for this issue</span>
                  </label>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setMode('my-tickets')}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingTicket}
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold rounded-lg cursor-pointer"
                    >
                      {isSubmittingTicket ? 'Submitting...' : 'Submit Support Ticket'}
                    </button>
                  </div>
                </form>
              )}

              {/* Customer Ticket List */}
              {mode === 'my-tickets' && !activeTicket && (
                <>
                  {isLoading ? (
                    <div className="py-10 text-center text-stone-500">
                      Loading your support tickets...
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="py-10 text-center space-y-3">
                      <MessageSquare className="w-8 h-8 text-stone-300 mx-auto" />
                      <div className="space-y-1">
                        <h3 className="font-bold text-stone-800 text-sm">No support tickets yet</h3>
                        <p className="text-xs text-stone-500">
                          Need help with an order, missing item, or refund? Raise a ticket and track replies right here.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMode('new-ticket')}
                        className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg cursor-pointer"
                      >
                        Raise a Support Ticket
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tickets.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleOpenTicket(t.id)}
                          className="w-full text-left p-4 rounded-xl border border-stone-200 hover:border-emerald-400 bg-white space-y-2 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {t.unreadForCustomer && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded">
                                  New Reply
                                </span>
                              )}
                              <span className="font-mono font-bold text-stone-900">{t.id}</span>
                              <span className="text-[11px] text-emerald-800 font-semibold">
                                {t.category}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-stone-100 text-stone-800 rounded border border-stone-200">
                              {t.status}
                            </span>
                          </div>
                          <div className="font-semibold text-stone-900">{t.subject}</div>
                          <div className="flex items-center justify-between text-[11px] text-stone-500">
                            <span>{t.orderId ? `Order ${t.orderId}` : 'General Inquiry'}</span>
                            <span className="font-mono">Updated {formatShortDate(t.updatedAt)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Customer Single Ticket Thread + Refund Status + CSAT */}
              {mode === 'my-tickets' && activeTicket && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-stone-900">
                          {activeTicket.id}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-900 rounded">
                          {activeTicket.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-stone-900 mt-0.5">
                        {activeTicket.subject}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTicket(null)}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-lg cursor-pointer"
                    >
                      All Tickets
                    </button>
                  </div>

                  {/* Refund Status Indicator if applicable */}
                  {activeTicket.refund && activeTicket.refund.status !== 'None' && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <IndianRupee className="w-4 h-4 text-emerald-800 shrink-0" />
                        <div>
                          <span className="font-bold text-emerald-950 block">
                            Refund Status: {activeTicket.refund.status}
                            {activeTicket.refund.amount > 0
                              ? ` (₹${activeTicket.refund.amount})`
                              : ''}
                          </span>
                          {activeTicket.refund.reason && (
                            <span className="text-[11px] text-stone-600">
                              {activeTicket.refund.reason}
                            </span>
                          )}
                        </div>
                      </div>
                      {activeTicket.refund.settlementReference && (
                        <span className="font-mono text-[10px] text-emerald-900 bg-white px-2 py-1 rounded border border-emerald-200">
                          Ref: {activeTicket.refund.settlementReference}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Messages Thread */}
                  <div className="space-y-2.5 max-h-60 overflow-y-auto">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl border ${
                          m.senderRole === 'owner'
                            ? 'bg-emerald-50 border-emerald-200 mr-4'
                            : 'bg-stone-50 border-stone-200 ml-4'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-stone-900">{m.senderName}</span>
                          <span className="font-mono text-[10px] text-stone-400">
                            {formatShortDate(m.createdAt)}
                          </span>
                        </div>
                        <p className="text-stone-700 whitespace-pre-wrap leading-relaxed">
                          {m.body}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Reply Input (unless Closed) */}
                  {activeTicket.status !== 'Closed' && (
                    <form onSubmit={handleSendCustomerReply} className="flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a follow-up message..."
                        className="flex-1 px-3 py-2 border border-stone-300 rounded-lg"
                      />
                      <button
                        type="submit"
                        disabled={isSendingReply || !replyText.trim()}
                        className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>
                    </form>
                  )}

                  {/* CSAT Feedback Form when Resolved / Closed */}
                  {(activeTicket.status === 'Resolved' || activeTicket.status === 'Closed') && (
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
                      {activeTicket.satisfactionRating ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                            <span>
                              You rated this resolution {activeTicket.satisfactionRating}/5 stars
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-stone-500">
                            {formatShortDate(activeTicket.ratedAt)}
                          </span>
                        </div>
                      ) : (
                        <form onSubmit={handleSubmitRating} className="space-y-2">
                          <span className="font-bold text-stone-900 block">
                            How satisfied are you with this resolution?
                          </span>
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setRatingValue(star)}
                                className="p-1 cursor-pointer"
                                aria-label={`Rate ${star} stars`}
                              >
                                <Star
                                  className={`w-5 h-5 ${
                                    star <= ratingValue
                                      ? 'text-amber-500 fill-amber-400'
                                      : 'text-stone-300'
                                  }`}
                                />
                              </button>
                            ))}
                            <span className="font-mono font-bold text-stone-800 ml-1">
                              {ratingValue}/5
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={ratingFeedback}
                              onChange={(e) => setRatingFeedback(e.target.value)}
                              placeholder="Optional feedback comment..."
                              className="flex-1 px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white"
                            />
                            <button
                              type="submit"
                              disabled={isSubmittingRating}
                              className="px-3 py-1.5 bg-stone-900 text-white font-semibold rounded-lg cursor-pointer"
                            >
                              {isSubmittingRating ? 'Saving...' : 'Submit Rating'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
