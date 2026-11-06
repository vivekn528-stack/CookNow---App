import React, { useState, useEffect } from 'react';
import { X, MapPin, Phone, User, Home, AlertCircle, ShieldCheck, CheckCircle2, Tag, LogIn } from 'lucide-react';
import { CartItem, Cook, Order, PaymentMethod, PlatformSettings, Promotion } from '../types';
import { getMenuItemImage, getMenuItemAlt } from '../lib/image-registry';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  cooks: Cook[];
  promotions: Promotion[];
  settings: PlatformSettings;
  onOrderPlaced: (order: Order) => Promise<void> | void;
  currentUser?: { uid: string; email?: string | null; displayName?: string | null } | null;
  onSignInWithGoogle?: () => Promise<boolean>;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  cooks,
  promotions,
  settings,
  onOrderPlaced,
  currentUser,
  onSignInWithGoogle,
}) => {
  const [fullName, setFullName] = useState(currentUser?.displayName || '');
  const [phone, setPhone] = useState('');
  const [hostelOrPgName, setHostelOrPgName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [locality, setLocality] = useState('Nalapani Chowk');
  const [landmark, setLandmark] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (currentUser?.displayName && !fullName) {
      setFullName(currentUser.displayName);
    }
  }, [currentUser]);

  if (!isOpen || items.length === 0) return null;

  // Find the primary cook for this order
  const primaryCookId = items[0]?.menuItem.cookId;
  const cook = cooks.find((c) => c.id === primaryCookId);

  const itemsSubtotal = items.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );

  // Delivery fee logic
  const deliveryFee =
    itemsSubtotal >= settings.freeDeliveryThreshold ? 0 : settings.standardDeliveryFee;
  const platformFee = settings.platformServiceFee;
  const packagingFee = settings.packagingFee;

  // Calculate discount if promo applied
  let discountAmount = 0;
  if (appliedPromo) {
    if (appliedPromo.discountType === 'percentage') {
      const calculated = Math.round((itemsSubtotal * appliedPromo.discountValue) / 100);
      discountAmount = Math.min(calculated, appliedPromo.maxDiscountCap);
    } else {
      discountAmount = Math.min(appliedPromo.discountValue, itemsSubtotal);
    }
  }

  const finalPayable = Math.max(10, itemsSubtotal + deliveryFee + platformFee + packagingFee - discountAmount);

  // Platform commission (15% on items subtotal)
  const platformCommission = Math.round((itemsSubtotal * settings.commissionRatePercent) / 100);
  let partnerDiscountShare = 0;
  if (appliedPromo) {
    if (appliedPromo.fundingSource === 'restaurant_funded') {
      partnerDiscountShare = discountAmount;
    } else if (appliedPromo.fundingSource === 'shared_funded') {
      partnerDiscountShare = Math.round(discountAmount / 2);
    }
  }
  const cookEarnings = Math.max(0, itemsSubtotal - platformCommission - partnerDiscountShare);

  const handleApplyCoupon = () => {
    setCouponError(null);
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) return;

    const matched = promotions.find((p) => p.code.toUpperCase() === code && p.isActive);
    if (!matched) {
      setCouponError('Invalid coupon code or promotion is inactive.');
      return;
    }

    if (itemsSubtotal < matched.minOrderValue) {
      setCouponError(`Coupon requires minimum order value of ₹${matched.minOrderValue}.`);
      return;
    }

    setAppliedPromo(matched);
  };

  const handleCheckoutGoogleSignIn = async () => {
    if (!onSignInWithGoogle) return;
    setIsSigningIn(true);
    setError(null);
    try {
      const success = await onSignInWithGoogle();
      if (!success) {
        setError('Google sign-in was cancelled. Your delivery details and meal bag are preserved.');
      }
    } catch (err: any) {
      setError(err?.message || 'Sign-in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form Validations
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please provide your full name.');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number (e.g., 9876543210).');
      return;
    }

    if (!addressLine.trim() || addressLine.trim().length < 5) {
      setError('Please enter complete delivery address or room/flat details.');
      return;
    }

    if (paymentMethod === 'upi_online') {
      setError(
        'Online UPI Gateway is in Sandbox/Integration Boundary mode. Please select "Cash / Pay on Delivery" for this initial pilot, or configure RAZORPAY_KEY in your server environment.'
      );
      return;
    }

    // STRICT AUTHENTICATION REQUIREMENT: Real Firebase Auth UID strictly required
    if (!currentUser) {
      setError('Google Sign-In is required to secure your order and track delivery. Please click "Sign in with Google" below.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const now = new Date().toISOString();

      const newOrder: Order = {
        id: orderId,
        customerId: currentUser.uid, // Canonical Firebase Auth UID (Zero synthetic customer IDs)
        customerName: fullName.trim(),
        customerPhone: cleanPhone,
        cookId: primaryCookId,
        kitchenName: cook?.kitchenName || 'Local Home Kitchen',
        status: 'pending',
        items: items.map((cartItem) => ({
          id: `oi-${Math.random().toString(36).substring(2, 9)}`,
          orderId: orderId,
          menuItemId: cartItem.menuItem.id,
          itemName: cartItem.menuItem.name,
          unitPrice: cartItem.menuItem.price,
          quantity: cartItem.quantity,
          subtotal: cartItem.menuItem.price * cartItem.quantity,
          dietaryType: cartItem.menuItem.dietaryType,
        })),
        itemsSubtotal,
        deliveryFee,
        platformFee,
        packagingFee,
        discount: discountAmount,
        discountCode: appliedPromo?.code,
        discountFunding: appliedPromo?.fundingSource,
        finalPayableAmount: finalPayable,
        platformCommission,
        cookEarnings,
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        deliveryStatus: 'unassigned',
        deliveryAddress: {
          fullName: fullName.trim(),
          phone: cleanPhone,
          locality,
          addressLine: addressLine.trim(),
          landmark: landmark.trim() || undefined,
          hostelOrPgName: hostelOrPgName.trim() || undefined,
        },
        deliveryInstructions: deliveryInstructions.trim() || undefined,
        events: [
          {
            status: 'pending',
            timestamp: now,
            note: 'Order submitted by customer via Cash on Delivery. Awaiting kitchen acceptance.',
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      await onOrderPlaced(newOrder);
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to place order in Cloud Firestore. Please retry.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900">Confirm Nalapani Delivery</h2>
            <p className="text-xs text-stone-500">
              Fresh meal by {cook?.kitchenName || 'Local Cook'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Customer Google Authentication Status Banner */}
          {currentUser ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {(currentUser.displayName || currentUser.email || 'C')[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-900">
                      {currentUser.displayName || 'Customer'}
                    </span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.2 rounded">
                      Google Verified
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-600 block">{currentUser.email}</span>
                </div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            </div>
          ) : (
            <div className="p-4 bg-amber-50/80 border-2 border-amber-300 rounded-xl space-y-2.5 text-xs">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-amber-950 block">Customer Google Sign-In Required</span>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Sign in with Google to protect your delivery, link orders to your account, and track live updates. Your entered delivery address and cart will stay saved.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCheckoutGoogleSignIn}
                disabled={isSigningIn}
                className="w-full py-2.5 px-3 bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs rounded-lg border border-stone-300 hover:border-stone-400 flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27a7.17 7.17 0 0 1 0-4.54V6.58H1.26a11.96 11.96 0 0 0 0 10.84l4.02-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>{isSigningIn ? 'Signing in with Google...' : 'Sign in with Google to Continue'}</span>
              </button>
            </div>
          )}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Contact Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Customer Contact Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Aman Negi"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Mobile Number (10 digits) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Location in Dehradun */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Hostel / PG / Delivery Address
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Hostel / PG / Apartment Name
                </label>
                <div className="relative">
                  <Home className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={hostelOrPgName}
                    onChange={(e) => setHostelOrPgName(e.target.value)}
                    placeholder="e.g. Shivalik Boys PG, Room 302"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Locality *
                </label>
                <select
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700 bg-white"
                >
                  <option value="Nalapani Chowk">Nalapani Chowk (Pilot Hub)</option>
                  <option value="Raipur Road">Raipur Road / Tapovan</option>
                  <option value="Sahastradhara Road">Sahastradhara Road</option>
                  <option value="Karanpur">Karanpur / DIT Corridor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Street Address / Lane *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="e.g. Lane 2, Near Shiv Mandir, Upper Nalapani"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Nearby Landmark
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Opp. Reliance Fresh / Post Office"
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Cooking / Delivery Instructions
                </label>
                <input
                  type="text"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder="e.g. Keep less spicy, leave at gate"
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700"
                />
              </div>
            </div>
          </div>

          {/* Coupon Code Section (Phase 4) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span>Apply Student Promo / Coupon</span>
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={couponCodeInput}
                onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                placeholder="Try STUDENT49 or FIRSTCOOK"
                className="flex-1 px-3 py-2 text-xs border border-stone-300 rounded-lg font-mono uppercase focus:outline-none focus:border-emerald-700"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>

            {couponError && <p className="text-xs text-rose-600">{couponError}</p>}

            {appliedPromo && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex justify-between items-center">
                <span>
                  Coupon <strong>{appliedPromo.code}</strong> applied! You save ₹{discountAmount}.
                </span>
                <button
                  type="button"
                  onClick={() => setAppliedPromo(null)}
                  className="text-stone-400 hover:text-stone-700 font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Payment Method
            </h3>

            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-emerald-700 bg-emerald-50/50'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-0.5 text-emerald-800 focus:ring-emerald-800"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-stone-900">
                      Cash / Pay on Delivery (Verified Active)
                    </span>
                    <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-1.5 py-0.5 rounded">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Pay in cash or directly scan cook/delivery agent UPI QR code when your warm meal reaches your doorstep.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'upi_online'
                    ? 'border-emerald-700 bg-emerald-50/50'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'upi_online'}
                  onChange={() => setPaymentMethod('upi_online')}
                  className="mt-0.5 text-emerald-800 focus:ring-emerald-800"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-stone-900">
                    Online Payment (UPI, Cards, Net Banking)
                  </span>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Prepared external gateway integration boundary (Razorpay/Cashfree webhook). In demo sandbox mode.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Order Bag Items Preview with Canonical Images */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Order Bag ({items.reduce((acc, it) => acc + it.quantity, 0)} Items)
            </h3>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {items.map((cartItem) => (
                <div
                  key={cartItem.menuItem.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-200/60 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={getMenuItemImage(cartItem.menuItem.id)}
                      alt={getMenuItemAlt(cartItem.menuItem.id, cartItem.menuItem.name)}
                      className="w-10 h-10 rounded-md object-cover shrink-0 border border-stone-200"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-900 truncate">{cartItem.menuItem.name}</p>
                      <p className="text-[11px] text-stone-500 font-mono">
                        ₹{cartItem.menuItem.price} × {cartItem.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold font-mono text-stone-900 tabular-nums shrink-0 ml-2">
                    ₹{cartItem.menuItem.price * cartItem.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Transparent Order Summary Strip */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80 space-y-2 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>{items.length} dishes subtotal:</span>
              <span className="font-mono tabular-nums">₹{itemsSubtotal}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Delivery Partner fee:</span>
              <span className="font-mono tabular-nums">{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Packaging & Service:</span>
              <span className="font-mono tabular-nums">₹{platformFee + packagingFee}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Promotional Discount:</span>
                <span className="font-mono tabular-nums">-₹{discountAmount}</span>
              </div>
            )}
            <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-black text-stone-900">
              <span>Payable Total:</span>
              <span className="font-mono text-emerald-900 text-base">₹{finalPayable}</span>
            </div>
          </div>

          {/* Submit Button */}
          {currentUser ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Securing Order in Cloud Firestore...' : `Confirm & Place Order (₹${finalPayable})`}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCheckoutGoogleSignIn}
              disabled={isSigningIn}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSigningIn ? 'Signing in with Google...' : `Sign in with Google to Place Order (₹${finalPayable})`}</span>
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
