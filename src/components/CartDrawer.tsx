import React from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { CartItem, PlatformSettings } from '../types';
import { getMenuItemImage, getMenuItemAlt, FALLBACK_MEAL_IMAGE } from '../lib/image-registry';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  settings: PlatformSettings;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  settings,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
}) => {
  if (!isOpen) return null;

  const itemsSubtotal = items.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );

  const deliveryFee =
    itemsSubtotal >= settings.freeDeliveryThreshold || itemsSubtotal === 0
      ? 0
      : settings.standardDeliveryFee;

  const platformFee = itemsSubtotal > 0 ? settings.platformServiceFee : 0;
  const packagingFee = itemsSubtotal > 0 ? settings.packagingFee : 0;
  const finalPayable = itemsSubtotal + deliveryFee + platformFee + packagingFee;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-950/50 backdrop-blur-xs flex justify-end">
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900">Your Homestyle Meal Bag</h2>
            <p className="text-xs text-stone-500">
              {items.length} {items.length === 1 ? 'item' : 'items'} selected
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
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                <Sparkles className="w-8 h-8 text-stone-400" />
              </div>
              <h3 className="text-base font-bold text-stone-800">Your Bag is Empty</h3>
              <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
                Explore home-cooked meals by verified mothers and home cooks around Nalapani Chowk & Raipur Road.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
              >
                Browse Menu Items
              </button>
            </div>
          ) : (
            <>
              {/* Free delivery threshold indicator */}
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
                {itemsSubtotal >= settings.freeDeliveryThreshold ? (
                  <span className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    Unlocked Free Delivery to Nalapani Chowk!
                  </span>
                ) : (
                  <span>
                    Add <strong className="font-mono">₹{settings.freeDeliveryThreshold - itemsSubtotal}</strong> more for Free Delivery!
                  </span>
                )}
                <span className="text-[11px] text-emerald-700 font-medium">₹{settings.freeDeliveryThreshold} threshold</span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-stone-100">
                {items.map(({ menuItem, quantity }) => (
                  <div key={menuItem.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <img
                        src={getMenuItemImage(menuItem.id) || menuItem.imageUrl}
                        alt={getMenuItemAlt(menuItem.id, menuItem.name)}
                        className="w-12 h-12 rounded-lg object-cover bg-stone-100 shrink-0"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_MEAL_IMAGE;
                        }}
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-stone-900 truncate">{menuItem.name}</h4>
                        <div className="text-[11px] text-stone-500 font-mono tabular-nums">
                          ₹{menuItem.price} × {quantity} = ₹{menuItem.price * quantity}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                        <button
                          onClick={() => onUpdateQuantity(menuItem.id, -1)}
                          className="w-6 h-6 flex items-center justify-center hover:bg-stone-200 rounded text-stone-700 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold font-mono">{quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(menuItem.id, 1)}
                          className="w-6 h-6 flex items-center justify-center hover:bg-stone-200 rounded text-stone-700 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => onRemoveItem(menuItem.id)}
                        className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={onClearCart}
                  className="text-xs text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  Clear Bag
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer / Calculation Breakdown */}
        {items.length > 0 && (
          <div className="p-5 border-t border-stone-200 bg-stone-50/70 space-y-3">
            <div className="space-y-1.5 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-mono tabular-nums font-semibold text-stone-800">₹{itemsSubtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Partner Fee</span>
                <span className="font-mono tabular-nums">
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-700 font-bold">FREE</span>
                  ) : (
                    `₹${deliveryFee}`
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Platform Service Charge</span>
                <span className="font-mono tabular-nums">₹{platformFee}</span>
              </div>
              <div className="flex justify-between">
                <span>Eco Thermal Packaging</span>
                <span className="font-mono tabular-nums">₹{packagingFee}</span>
              </div>
              <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-extrabold text-stone-900">
                <span>To Pay</span>
                <span className="font-mono tabular-nums text-base text-emerald-900">₹{finalPayable}</span>
              </div>
            </div>

            <button
              onClick={onProceedToCheckout}
              className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
