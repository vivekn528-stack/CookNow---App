import React, { useState } from 'react';
import { X, CheckCircle, Clock, MapPin, ChefHat, AlertTriangle, Phone, Receipt } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { getMenuItemImage, getMenuItemAlt, FALLBACK_MEAL_IMAGE } from '../lib/image-registry';

interface OrderTrackerModalProps {
  order: Order | null;
  onClose: () => void;
  onCancelOrder: (orderId: string, reason: string) => void;
}

const LIFECYCLE_STEPS: { status: OrderStatus; label: string; desc: string }[] = [
  { status: 'pending', label: 'Order Placed', desc: 'Sent to home cook' },
  { status: 'accepted', label: 'Accepted', desc: 'Ingredients prepared' },
  { status: 'preparing', label: 'Cooking', desc: 'Fresh on tawa / pot' },
  { status: 'ready', label: 'Ready & Packed', desc: 'Thermal packaging' },
  { status: 'out_for_delivery', label: 'Out for Delivery', desc: 'On the way in Dehradun' },
  { status: 'delivered', label: 'Delivered', desc: 'Enjoy your meal!' },
];

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  order,
  onClose,
  onCancelOrder,
}) => {
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  if (!order) return null;

  const currentStepIndex = LIFECYCLE_STEPS.findIndex((s) => s.status === order.status);
  const isCancelled = order.status === 'cancelled';
  const canCancel = order.status === 'pending' || order.status === 'accepted';

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim() || cancelReason.trim().length < 5) {
      setCancelError('Please provide a reason with at least 5 characters.');
      return;
    }
    onCancelOrder(order.id, cancelReason.trim());
    setShowCancelInput(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs p-5 border-b border-stone-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-stone-900">
                Order #{order.id}
              </span>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  isCancelled
                    ? 'bg-rose-100 text-rose-800'
                    : order.status === 'delivered'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {order.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Kitchen: <strong className="text-stone-700">{order.kitchenName}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Cancelled Notice */}
          {isCancelled && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                This order was cancelled
              </div>
              <p>Reason: {order.cancellationReason || 'Cancelled upon user request.'}</p>
            </div>
          )}

          {/* Stepper (Only shown if not cancelled) */}
          {!isCancelled && (
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-4">
                Order Lifecycle Progress
              </h3>

              <div className="relative">
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {LIFECYCLE_STEPS.map((step, index) => {
                    const isDone = index < currentStepIndex;
                    const isCurrent = index === currentStepIndex;

                    return (
                      <div
                        key={step.status}
                        className={`p-2.5 rounded-lg border text-center transition-all ${
                          isCurrent
                            ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                            : isDone
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : 'bg-white text-stone-400 border-stone-200'
                        }`}
                      >
                        <div className="text-[10px] uppercase font-bold tracking-wider mb-0.5">
                          Step 0{index + 1}
                        </div>
                        <div className="text-xs font-bold truncate">{step.label}</div>
                        <div
                          className={`text-[10px] truncate mt-0.5 ${
                            isCurrent ? 'text-emerald-100' : 'text-stone-500'
                          }`}
                        >
                          {step.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Event Log & Timestamps */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Order Event Timeline
            </h3>

            <div className="space-y-2 border-l-2 border-emerald-800 ml-2 pl-3">
              {order.events.map((evt, idx) => (
                <div key={idx} className="relative pb-2">
                  <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-700 ring-2 ring-white" />
                  <div className="text-xs text-stone-800 font-semibold">
                    {evt.status.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <div className="text-xs text-stone-600">{evt.note}</div>
                  <div className="text-[10px] text-stone-400 font-mono">
                    {new Date(evt.timestamp).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}{' '}
                    ·{' '}
                    {new Date(evt.timestamp).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ordered Dishes List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-stone-500" />
              Itemized Order Receipt
            </h3>

            <div className="bg-stone-50 rounded-xl border border-stone-200 divide-y divide-stone-200/80 p-3">
              {order.items.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={getMenuItemImage(item.menuItemId)}
                      alt={getMenuItemAlt(item.menuItemId, item.itemName)}
                      className="w-9 h-9 rounded-lg object-cover bg-stone-100 shrink-0 border border-stone-200"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_MEAL_IMAGE;
                      }}
                    />
                    <div>
                      <span className="font-semibold text-stone-900 block">{item.itemName}</span>
                      <span className="text-stone-400 text-[11px]">Qty: {item.quantity} × ₹{item.unitPrice}</span>
                    </div>
                  </div>
                  <span className="font-mono tabular-nums font-bold text-stone-800">
                    ₹{item.subtotal}
                  </span>
                </div>
              ))}

              <div className="pt-3 space-y-1 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Items Total</span>
                  <span className="font-mono tabular-nums">₹{order.itemsSubtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge</span>
                  <span className="font-mono tabular-nums">
                    {order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Platform & Packaging Fees</span>
                  <span className="font-mono tabular-nums">
                    ₹{order.platformFee + order.packagingFee}
                  </span>
                </div>
                <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-black text-stone-900">
                  <span>Final Payable Amount</span>
                  <span className="font-mono text-emerald-900 text-base">
                    ₹{order.finalPayableAmount}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-stone-500 pt-1">
                  <span>Payment Mode:</span>
                  <span className="font-medium text-stone-700">
                    {order.paymentMethod === 'cod' ? 'Cash / Pay on Delivery' : 'Online'} (
                    {order.paymentStatus.toUpperCase()})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs space-y-2">
            <div className="font-bold text-stone-800">Delivery Address in Dehradun</div>
            <div className="text-stone-600 space-y-0.5">
              <p className="font-medium text-stone-900">
                {order.deliveryAddress.fullName} · {order.deliveryAddress.phone}
              </p>
              {order.deliveryAddress.hostelOrPgName && (
                <p className="text-emerald-800 font-semibold">
                  {order.deliveryAddress.hostelOrPgName}
                </p>
              )}
              <p>{order.deliveryAddress.addressLine}</p>
              <p>
                {order.deliveryAddress.locality}, Dehradun, Uttarakhand
                {order.deliveryAddress.landmark && ` (Near ${order.deliveryAddress.landmark})`}
              </p>
              {order.deliveryInstructions && (
                <p className="text-stone-500 italic pt-1">
                  Note: "{order.deliveryInstructions}"
                </p>
              )}
            </div>
          </div>

          {/* Cancel Order Section (Permitted states only) */}
          {canCancel && (
            <div className="pt-2 border-t border-stone-200">
              {!showCancelInput ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-500">
                    Need to change plans? You can cancel before cooking begins.
                  </span>
                  <button
                    onClick={() => setShowCancelInput(true)}
                    className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline underline-offset-4 cursor-pointer"
                  >
                    Cancel Order
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCancelSubmit} className="space-y-2 p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <div className="text-xs font-bold text-rose-900">
                    Confirm Order Cancellation
                  </div>
                  {cancelError && <p className="text-xs text-rose-700">{cancelError}</p>}
                  <input
                    type="text"
                    required
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Provide cancellation reason (e.g., Ordered wrong meal)..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCancelInput(false)}
                      className="px-3 py-1 text-xs text-stone-600 hover:text-stone-900"
                    >
                      Dismiss
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg"
                    >
                      Confirm Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
