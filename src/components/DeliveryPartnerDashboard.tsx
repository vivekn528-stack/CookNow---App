import React, { useState } from 'react';
import {
  Bike,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  TrendingUp,
  Package,
  ArrowRight,
  AlertCircle,
  Star,
} from 'lucide-react';
import { DeliveryPartner, Order, OrderStatus } from '../types';

interface DeliveryPartnerDashboardProps {
  deliveryPartners: DeliveryPartner[];
  currentPartner: DeliveryPartner;
  orders: Order[];
  onSelectPartner: (partner: DeliveryPartner) => void;
  onUpdateDeliveryStatus: (orderId: string, status: OrderStatus, partnerId: string, partnerName: string) => void;
}

export const DeliveryPartnerDashboard: React.FC<DeliveryPartnerDashboardProps> = ({
  deliveryPartners,
  currentPartner,
  orders,
  onSelectPartner,
  onUpdateDeliveryStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'assigned' | 'available' | 'completed' | 'earnings'>('assigned');

  // Filter orders
  // Available: Ready orders that have no delivery partner assigned yet
  const availableOrders = orders.filter(
    (o) => o.status === 'ready' && (!o.deliveryPartnerId || o.deliveryStatus === 'unassigned')
  );

  // Assigned to current delivery partner
  const myActiveOrders = orders.filter(
    (o) =>
      o.deliveryPartnerId === currentPartner.id &&
      ['ready', 'out_for_delivery'].includes(o.status)
  );

  // Completed by current partner
  const myCompletedOrders = orders.filter(
    (o) => o.deliveryPartnerId === currentPartner.id && o.status === 'delivered'
  );

  const earningsTotal = myCompletedOrders.length * 25; // ₹25 per completed delivery

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-bold text-xl shadow-xs">
            <Bike className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-stone-900">{currentPartner.fullName}</h1>
              {currentPartner.status === 'approved' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-md border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Verified Rider
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-amber-800 bg-amber-50 rounded-md border border-amber-200">
                  Pending Verification
                </span>
              )}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              <span>{currentPartner.vehicleType} ({currentPartner.vehicleNumber || 'No reg number'})</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>Hub: {currentPartner.serviceArea}</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span className="font-mono">{currentPartner.workingHours}</span>
            </div>
          </div>
        </div>

        {/* Switch rider profile for testing */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 font-medium">Switch Rider:</span>
          <select
            value={currentPartner.id}
            onChange={(e) => {
              const p = deliveryPartners.find((item) => item.id === e.target.value);
              if (p) onSelectPartner(p);
            }}
            className="text-xs font-semibold text-stone-800 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none"
          >
            {deliveryPartners.map((dp) => (
              <option key={dp.id} value={dp.id}>
                {dp.fullName} ({dp.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('assigned')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'assigned'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 bg-stone-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>My Active Deliveries ({myActiveOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('available')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'available'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 bg-stone-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Available Orders Ready for Pickup ({availableOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'completed'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 bg-stone-100'
          }`}
        >
          <span>Delivery History ({myCompletedOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('earnings')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'earnings'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 bg-stone-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Earnings & Settlements</span>
        </button>
      </div>

      {/* Tab 1: My Active Deliveries */}
      {activeTab === 'assigned' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              Assigned Active Orders
            </h2>
            <span className="text-xs text-stone-500">
              Only authorized delivery details for your assigned orders are displayed.
            </span>
          </div>

          {myActiveOrders.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-stone-200 text-center text-xs text-stone-500 space-y-2">
              <Package className="w-8 h-8 text-stone-400 mx-auto" />
              <p>No deliveries currently assigned to you.</p>
              <button
                onClick={() => setActiveTab('available')}
                className="px-3 py-1.5 bg-emerald-800 text-white font-semibold rounded-lg hover:bg-emerald-900 transition-colors"
              >
                Check Available Orders in Nalapani Chowk
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myActiveOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-xl border-2 border-emerald-700/80 p-5 shadow-xs space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-stone-900">Order #{ord.id}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {ord.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        Cash to Collect: <strong className="font-mono text-stone-900">₹{ord.finalPayableAmount}</strong> ({ord.paymentMethod.toUpperCase()})
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-stone-400 block">Your Fee</span>
                      <span className="text-base font-black font-mono text-emerald-800 tabular-nums">
                        +₹25
                      </span>
                    </div>
                  </div>

                  {/* Pickup Kitchen Details */}
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-xs space-y-1">
                    <div className="font-bold text-stone-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-stone-500" />
                      <span>PICKUP FROM: {ord.kitchenName}</span>
                    </div>
                    <div className="text-stone-600 pl-5">
                      Near Shiv Mandir, Upper Nalapani Road, Dehradun
                    </div>
                  </div>

                  {/* Drop-off Details (Protected to authorized rider) */}
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 text-xs space-y-1">
                    <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      <span>DELIVER TO: {ord.deliveryAddress.hostelOrPgName || ord.deliveryAddress.locality}</span>
                    </div>
                    <div className="text-stone-700 pl-5">
                      {ord.deliveryAddress.addressLine}
                    </div>
                    <div className="text-stone-600 pl-5 font-medium">
                      Recipient: {ord.deliveryAddress.fullName} · {ord.deliveryAddress.phone}
                    </div>
                    {ord.deliveryInstructions && (
                      <div className="text-stone-500 italic pl-5 pt-0.5">
                        Instructions: "{ord.deliveryInstructions}"
                      </div>
                    )}
                  </div>

                  {/* Items Summary */}
                  <div className="text-xs text-stone-600 bg-stone-50 p-2 rounded-lg space-y-0.5">
                    {ord.items.map((it) => (
                      <div key={it.id} className="flex justify-between">
                        <span>{it.quantity} × {it.itemName}</span>
                        <span className="font-mono text-stone-400">₹{it.subtotal}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action transitions */}
                  <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
                    {ord.status === 'ready' && (
                      <button
                        onClick={() =>
                          onUpdateDeliveryStatus(ord.id, 'out_for_delivery', currentPartner.id, currentPartner.fullName)
                        }
                        className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Pickup & Start Delivery</span>
                      </button>
                    )}

                    {ord.status === 'out_for_delivery' && (
                      <button
                        onClick={() =>
                          onUpdateDeliveryStatus(ord.id, 'delivered', currentPartner.id, currentPartner.fullName)
                        }
                        className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Delivery (Collect ₹{ord.finalPayableAmount})</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Available Orders Ready for Pickup */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              Dishes Ready for Delivery Pickup
            </h2>
            <span className="text-xs text-stone-500">Pick orders in your service hub</span>
          </div>

          {availableOrders.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-stone-200 text-center text-xs text-stone-500">
              No orders waiting for delivery courier at this moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm font-bold text-stone-900">Order #{ord.id}</span>
                      <div className="text-xs text-stone-500">
                        Kitchen: <strong>{ord.kitchenName}</strong>
                      </div>
                      <div className="text-xs text-emerald-800 font-semibold">
                        Destination: {ord.deliveryAddress.hostelOrPgName || ord.deliveryAddress.locality}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-stone-400 block">Payout</span>
                      <span className="text-base font-black font-mono text-emerald-900 tabular-nums">
                        ₹25
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg">
                    {ord.items.length} items packed in thermal container
                  </div>

                  <button
                    onClick={() =>
                      onUpdateDeliveryStatus(ord.id, 'out_for_delivery', currentPartner.id, currentPartner.fullName)
                    }
                    className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Accept & Pickup Delivery</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Completed History */}
      {activeTab === 'completed' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-200 font-bold text-sm text-stone-900">
            Delivered Orders History
          </div>

          {myCompletedOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400">
              No completed deliveries in your history yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                  <tr>
                    <th className="p-3">Order Code</th>
                    <th className="p-3">Kitchen</th>
                    <th className="p-3">Customer Hub</th>
                    <th className="p-3">Amount Collected</th>
                    <th className="p-3">Delivery Earning</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono tabular-nums">
                  {myCompletedOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-stone-50/60">
                      <td className="p-3 font-bold text-stone-800">{ord.id}</td>
                      <td className="p-3 font-sans text-stone-700">{ord.kitchenName}</td>
                      <td className="p-3 font-sans text-stone-600">
                        {ord.deliveryAddress.hostelOrPgName || ord.deliveryAddress.locality}
                      </td>
                      <td className="p-3">₹{ord.finalPayableAmount}</td>
                      <td className="p-3 font-bold text-emerald-800">+₹25</td>
                      <td className="p-3 font-sans">
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                          Delivered
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Earnings & Settlements */}
      {activeTab === 'earnings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-1 shadow-xs">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Total Deliveries
              </span>
              <div className="text-2xl font-black text-stone-900 font-mono tabular-nums">
                {myCompletedOrders.length}
              </div>
              <span className="text-[11px] text-stone-400">Completed in Dehradun</span>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-1 shadow-xs">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Delivery Fee Rate
              </span>
              <div className="text-2xl font-black text-stone-900 font-mono tabular-nums">
                ₹25 / drop
              </div>
              <span className="text-[11px] text-stone-400">Fixed rate per order</span>
            </div>

            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5 space-y-1 shadow-xs">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Accumulated Earnings
              </span>
              <div className="text-2xl font-black text-emerald-900 font-mono tabular-nums">
                ₹{earningsTotal}
              </div>
              <span className="text-[11px] text-emerald-700">Settled via UPI weekly</span>
            </div>
          </div>

          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-1">
            <div className="font-bold text-stone-800">Direct Weekly Bank Settlement:</div>
            <p>
              Rider earnings are disbursed every Monday directly to your registered bank account or UPI ID ({currentPartner.bankAccountMasked || 'UPI linked to mobile'}). No platform commissions are deducted from your delivery fee.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
