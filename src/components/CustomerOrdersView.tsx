import React, { useState } from 'react';
import { Clock, Eye, Star, RotateCcw, AlertCircle, ShoppingBag, CheckCircle2, LogIn, Headphones } from 'lucide-react';
import { Order, MenuItem } from '../types';
import { getMenuItemImage, getMenuItemAlt, FALLBACK_MEAL_IMAGE } from '../lib/image-registry';
import { getLatestOrderStatus } from '../lib/order-status';

interface CustomerOrdersViewProps {
  orders: Order[];
  onTrackOrder: (order: Order) => void;
  onOpenReview: (order: Order) => void;
  onReorder: (order: Order) => void;
  onBrowseMeals: () => void;
  onOpenSupport?: (order?: Order) => void;
  currentUser?: { uid: string; email?: string | null; displayName?: string | null } | null;
  onSignIn?: () => void;
}

export const CustomerOrdersView: React.FC<CustomerOrdersViewProps> = ({
  orders,
  onTrackOrder,
  onOpenReview,
  onReorder,
  onBrowseMeals,
  onOpenSupport,
  currentUser,
  onSignIn,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Customer-scoped orders: If authenticated, prioritize orders placed under currentUser.uid
  const scopedOrders = currentUser
    ? orders.filter((o) => o.customerId === currentUser.uid || o.customerId?.startsWith('cust-demo'))
    : orders;

  const filteredOrders = scopedOrders.filter((o) => {
    const status = getLatestOrderStatus(o);
    if (filter === 'active') {
      return !['delivered', 'cancelled'].includes(status);
    }
    if (filter === 'completed') {
      return ['delivered', 'cancelled'].includes(status);
    }
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Customer Authentication Status Header */}
      {currentUser ? (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-stone-800">
              Authenticated Customer Account: <strong>{currentUser.displayName || currentUser.email}</strong> ({currentUser.email})
            </span>
          </div>
          <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded self-start sm:self-auto">
            UID: {currentUser.uid}
          </span>
        </div>
      ) : (
        <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-amber-950 block">Browsing in Anonymous Mode</span>
              <p className="text-[11px] text-stone-600">
                Sign in with Google to synchronize your active orders, access past meals, and manage deliveries.
              </p>
            </div>
          </div>
          {onSignIn && (
            <button
              onClick={onSignIn}
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      )}

      {/* Title & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900">Your Meal Orders</h1>
          <p className="text-xs text-stone-500">
            Track active deliveries to Nalapani Chowk and view past homestyle meals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          {onOpenSupport && (
            <button
              type="button"
              onClick={() => onOpenSupport()}
              className="px-3 py-1.5 bg-white hover:bg-stone-50 text-emerald-900 border border-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Headphones className="w-3.5 h-3.5 text-emerald-800" />
              <span>Support &amp; Help</span>
            </button>
          )}

          {/* Filter Segmented Buttons */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg border border-stone-200/80">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All ({scopedOrders.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              filter === 'active'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Active ({scopedOrders.filter((o) => !['delivered', 'cancelled'].includes(getLatestOrderStatus(o))).length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              filter === 'completed'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Completed
          </button>
        </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-stone-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-800">No orders found</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            You don't have any {filter !== 'all' ? filter : ''} orders yet. Experience wholesome home cooking prepared right here in Dehradun.
          </p>
          <button
            onClick={onBrowseMeals}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Explore Dehradun Menus
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const currentStatus = getLatestOrderStatus(order);
            const isDelivered = currentStatus === 'delivered';
            const isCancelled = currentStatus === 'cancelled';
            const isActive = !isDelivered && !isCancelled;

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-stone-200/90 p-5 shadow-xs hover:shadow-sm transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-stone-900">
                        Order #{order.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isCancelled
                            ? 'bg-rose-100 text-rose-800'
                            : isDelivered
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {currentStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      <span>Kitchen: <strong className="text-stone-800">{order.kitchenName}</strong></span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span>
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right sm:text-right">
                    <span className="text-xs text-stone-400 block font-medium">Final Amount</span>
                    <span className="font-black font-mono text-base text-stone-900 tabular-nums">
                      ₹{order.finalPayableAmount}
                    </span>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="text-xs text-stone-700 space-y-2">
                  {order.items.map((it) => (
                    <div key={it.id} className="flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={getMenuItemImage(it.menuItemId)}
                          alt={getMenuItemAlt(it.menuItemId, it.itemName)}
                          className="w-8 h-8 rounded-lg object-cover bg-stone-100 shrink-0 border border-stone-200"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_MEAL_IMAGE;
                          }}
                        />
                        <span className="font-medium text-stone-900">
                          {it.quantity} × {it.itemName}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums text-stone-600 font-semibold">₹{it.subtotal}</span>
                    </div>
                  ))}
                </div>

                {/* Destination & Action Buttons */}
                <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-stone-500">
                    Deliver to: <span className="font-medium text-stone-700">{order.deliveryAddress.hostelOrPgName || order.deliveryAddress.locality}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onTrackOrder(order)}
                      className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isActive ? 'Track Live Status' : 'View Order Details'}</span>
                    </button>

                    {isDelivered && (
                      <button
                        onClick={() => onOpenReview(order)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>Leave Review</span>
                      </button>
                    )}

                    {onOpenSupport && (
                      <button
                        type="button"
                        onClick={() => onOpenSupport(order)}
                        className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        title="Raise a complaint or refund request for this order"
                      >
                        <Headphones className="w-3.5 h-3.5" />
                        <span>Need Help</span>
                      </button>
                    )}

                    <button
                      onClick={() => onReorder(order)}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      title="Reorder same items"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reorder</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
