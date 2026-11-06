import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Info,
  CreditCard,
  AlertCircle,
  X,
} from 'lucide-react';
import { MealPlan, CustomerSubscription, PaymentMethod } from '../types';
import { getMealPlanImage } from '../lib/image-registry';

interface MealPlansViewProps {
  mealPlans: MealPlan[];
  subscriptions: CustomerSubscription[];
  onSubscribe: (sub: CustomerSubscription) => void;
  onPauseSubscription: (subId: string, pauseDate: string) => void;
  onResumeSubscription: (subId: string) => void;
  onCancelSubscription: (subId: string, reason: string) => void;
}

export const MealPlansView: React.FC<MealPlansViewProps> = ({
  mealPlans,
  subscriptions,
  onSubscribe,
  onPauseSubscription,
  onResumeSubscription,
  onCancelSubscription,
}) => {
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<MealPlan | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [hostelOrPgName, setHostelOrPgName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [locality, setLocality] = useState('Nalapani Chowk');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Pause modal
  const [pauseSubId, setPauseSubId] = useState<string | null>(null);
  const [pauseDateInput, setPauseDateInput] = useState('');
  const [cancellingSubId, setCancellingSubId] = useState<string | null>(null);

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    if (!selectedPlanForCheckout) return;

    if (!customerName.trim()) {
      setCheckoutError('Please enter your full name.');
      return;
    }

    const cleanPhone = customerPhone.trim().replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setCheckoutError('Please enter a valid 10-digit Indian phone number.');
      return;
    }

    if (!addressLine.trim()) {
      setCheckoutError('Please enter your delivery address/hostel room.');
      return;
    }

    // Calculate end date (30 days from start date)
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + selectedPlanForCheckout.durationDays);

    const newSub: CustomerSubscription = {
      id: `sub-${Math.floor(100 + Math.random() * 900)}`,
      customerId: `cust-${Date.now()}`,
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      planId: selectedPlanForCheckout.id,
      planTitle: selectedPlanForCheckout.title,
      providerId: selectedPlanForCheckout.providerId,
      providerName: selectedPlanForCheckout.providerName,
      startDate: startDate,
      endDate: end.toISOString().split('T')[0],
      totalMeals: selectedPlanForCheckout.mealsCount,
      mealsDelivered: 0,
      mealsRemaining: selectedPlanForCheckout.mealsCount,
      status: 'active',
      deliveryAddress: {
        hostelOrPgName: hostelOrPgName.trim() || undefined,
        addressLine: addressLine.trim(),
        locality,
      },
      pauseDates: [],
      pausesRemaining: selectedPlanForCheckout.pausesAllowed,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'paid' : 'pending',
      paidAmount: selectedPlanForCheckout.pricePerMonth,
      createdAt: new Date().toISOString(),
    };

    onSubscribe(newSub);
    setSelectedPlanForCheckout(null);
  };

  const handlePauseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pauseSubId || !pauseDateInput) return;
    onPauseSubscription(pauseSubId, pauseDateInput);
    setPauseSubId(null);
    setPauseDateInput('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Header Banner */}
      <div className="space-y-4 max-w-3xl">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
          <Calendar className="w-4 h-4" />
          <span>Hassle-Free Daily Student & Professional Tiffins</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900 leading-tight">
          Monthly Homestyle Meal Subscriptions
        </h1>
        <p className="text-base text-stone-600 leading-relaxed">
          Never worry about PG cooking or greasy mess food again. Fresh, low-oil rotis and slow-cooked dal delivered warm to your hostel door every single day at affordable student rates.
        </p>
      </div>

      {/* Active Subscriptions Section (if any) */}
      {subscriptions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              <span>Your Active Meal Plans ({subscriptions.length})</span>
            </h2>
            <span className="text-xs text-stone-500">Track delivery entitlements & pauses</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {subscriptions.map((sub) => {
              const progressPercent = Math.round(
                (sub.mealsDelivered / sub.totalMeals) * 100
              );

              return (
                <div
                  key={sub.id}
                  className="bg-white rounded-2xl border-2 border-emerald-800/80 p-6 shadow-xs space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-stone-900">{sub.planTitle}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {sub.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 mt-1">
                        Kitchen: <strong>{sub.providerName}</strong> · Delivered to{' '}
                        {sub.deliveryAddress.hostelOrPgName || sub.deliveryAddress.locality}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-stone-400 block font-medium">Remaining</span>
                      <span className="text-xl font-black font-mono text-emerald-900 tabular-nums">
                        {sub.mealsRemaining} / {sub.totalMeals}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-800 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-stone-400">
                      <span>{sub.mealsDelivered} meals delivered</span>
                      <span>{progressPercent}% completed</span>
                    </div>
                  </div>

                  {/* Schedule & Duration details */}
                  <div className="grid grid-cols-2 gap-3 text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div>
                      <span className="text-stone-400 block font-medium">Valid Period</span>
                      <span className="font-mono text-stone-800 font-semibold">
                        {sub.startDate} to {sub.endDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block font-medium">Eligible Pauses Left</span>
                      <span className="font-mono text-emerald-800 font-bold">
                        {sub.pausesRemaining} pauses allowed
                      </span>
                    </div>
                  </div>

                  {/* Pauses List */}
                  {sub.pauseDates.length > 0 && (
                    <div className="text-xs text-stone-500 flex items-center gap-2">
                      <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Paused dates recorded: {sub.pauseDates.join(', ')}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                    {sub.pausesRemaining > 0 && sub.status === 'active' ? (
                      <button
                        onClick={() => setPauseSubId(sub.id)}
                        className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Schedule Holiday Pause
                      </button>
                    ) : (
                      <span className="text-xs text-stone-400">No pauses remaining</span>
                    )}

                    {cancellingSubId === sub.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-rose-800 font-semibold">Confirm cancellation?</span>
                        <button
                          onClick={() => {
                            onCancelSubscription(sub.id, 'Customer requested cancellation.');
                            setCancellingSubId(null);
                          }}
                          className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded transition-colors cursor-pointer"
                        >
                          Yes, Cancel
                        </button>
                        <button
                          onClick={() => setCancellingSubId(null)}
                          className="px-2 py-1 bg-stone-100 text-stone-700 text-xs rounded hover:bg-stone-200 cursor-pointer"
                        >
                          Keep Plan
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCancellingSubId(sub.id)}
                        className="text-xs text-rose-700 hover:text-rose-900 font-medium underline underline-offset-4 cursor-pointer"
                      >
                        Cancel Subscription
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Plans Catalog */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-stone-900">
            Available Monthly Plans in Nalapani Chowk
          </h2>
          <p className="text-xs text-stone-500">
            Pre-paid monthly plans with flexible delivery times and pause controls.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mealPlans.map((plan) => {
            const perMealPrice = Math.round(plan.pricePerMonth / plan.mealsCount);

            return (
              <div
                key={plan.id}
                className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="relative h-44 w-full overflow-hidden bg-stone-100">
                  <img
                    src={getMealPlanImage(plan.id)}
                    alt={plan.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent" />
                  <span className="absolute bottom-2.5 left-3 text-[11px] font-bold uppercase tracking-wider text-white bg-emerald-900/80 backdrop-blur-xs px-2.5 py-0.5 rounded-md">
                    {plan.providerName}
                  </span>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                        {plan.providerName}
                      </span>
                      <h3 className="text-lg font-bold text-stone-900 mt-0.5">{plan.title}</h3>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-stone-400">Approx</div>
                      <div className="text-xs font-bold text-emerald-800 font-mono">
                        ₹{perMealPrice}/meal
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">{plan.description}</p>

                  <div className="space-y-1.5 text-xs text-stone-500 border-t border-stone-100 pt-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>{plan.mealSchedule}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-stone-400" />
                      <span>{plan.serviceArea}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PauseCircle className="w-3.5 h-3.5 text-stone-400" />
                      <span>Up to {plan.pausesAllowed} holiday pause days</span>
                    </div>
                  </div>

                  {/* Sample Menu Highlights */}
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs space-y-1.5">
                    <span className="font-bold text-stone-800 block text-[11px] uppercase tracking-wider">
                      Weekly Meal Rotation:
                    </span>
                    <ul className="text-stone-600 space-y-1">
                      {plan.sampleMenuHighlights.slice(0, 3).map((h, i) => (
                        <li key={i} className="truncate">• {h}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-6 pt-0 border-t border-stone-100 flex items-center justify-between gap-4 mt-2">
                  <div>
                    <span className="text-[11px] text-stone-400 block font-medium">30 Days Total</span>
                    <span className="text-2xl font-black font-mono text-stone-900 tabular-nums">
                      ₹{plan.pricePerMonth}
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedPlanForCheckout(plan)}
                    className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Subscribe</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subscription Checkout Modal */}
      {selectedPlanForCheckout && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-stone-200">
            <div className="flex justify-between items-start border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">Subscribe to Meal Plan</h3>
                <p className="text-xs text-stone-500">
                  {selectedPlanForCheckout.title} by {selectedPlanForCheckout.providerName}
                </p>
              </div>
              <button
                onClick={() => setSelectedPlanForCheckout(null)}
                className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            {checkoutError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Aman Negi"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Phone Number (10 digits) *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Hostel / PG / Room Address in Dehradun *
                </label>
                <input
                  type="text"
                  required
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="e.g. Shivalik Boys PG, Room 302, Upper Nalapani"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Locality</label>
                  <select
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                  >
                    <option value="Nalapani Chowk">Nalapani Chowk</option>
                    <option value="Raipur Road">Raipur Road</option>
                    <option value="Sahastradhara Road">Sahastradhara Road</option>
                  </select>
                </div>
              </div>

              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80 space-y-2">
                <div className="flex justify-between font-bold text-stone-900">
                  <span>Monthly Subscription Amount:</span>
                  <span className="font-mono text-emerald-900 text-sm">
                    ₹{selectedPlanForCheckout.pricePerMonth}
                  </span>
                </div>
                <div className="text-[11px] text-stone-500">
                  Payment Mode: Pay at first meal delivery (Cash/UPI) or Online Gateway.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setSelectedPlanForCheckout(null)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Confirm Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pause Date Modal */}
      {pauseSubId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-stone-200 text-xs">
            <h3 className="text-base font-bold text-stone-900">Schedule Holiday Pause</h3>
            <p className="text-stone-600 leading-relaxed">
              Going home for the weekend or exams? Choose a date to pause food prep. That day's meal entitlement will roll over to extend your subscription end date.
            </p>

            <form onSubmit={handlePauseSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Select Pause Date</label>
                <input
                  type="date"
                  required
                  value={pauseDateInput}
                  onChange={(e) => setPauseDateInput(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPauseSubId(null)}
                  className="px-3 py-1.5 text-stone-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg"
                >
                  Confirm Pause
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
