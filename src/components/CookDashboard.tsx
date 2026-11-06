import React, { useState } from 'react';
import {
  ChefHat,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  IndianRupee,
  Package,
  AlertCircle,
  FileText,
  Upload,
  Camera,
  Loader2,
  Image as ImageIcon,
  User,
} from 'lucide-react';
import { Cook, MenuItem, Order, OrderStatus, DietaryType, CookVerificationRequest } from '../types';
import { StorageManager } from '../lib/storage';
import { storageService, validateImageFile, validateDocumentFile } from '../lib/storage-service';
import { getMenuItemImage, getMenuItemAlt, FALLBACK_MEAL_IMAGE } from '../lib/image-registry';

interface CookDashboardProps {
  cooks: Cook[];
  menuItems: MenuItem[];
  orders: Order[];
  currentCook: Cook;
  onSelectCurrentCook: (cook: Cook) => void;
  onUpdateCookProfile: (updatedCook: Cook) => void;
  onSaveMenuItem: (item: MenuItem) => void;
  onDeleteMenuItem: (itemId: string) => void;
  onUpdateOrderStatus: (orderId: string, nextStatus: OrderStatus, reason?: string) => void;
  onSubmitVerificationRequest: (req: CookVerificationRequest) => void;
}

export const CookDashboard: React.FC<CookDashboardProps> = ({
  cooks,
  menuItems,
  orders,
  currentCook,
  onSelectCurrentCook,
  onUpdateCookProfile,
  onSaveMenuItem,
  onDeleteMenuItem,
  onUpdateOrderStatus,
  onSubmitVerificationRequest,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'profile' | 'earnings' | 'verification'>('orders');

  // New / Edit menu item modal state
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [menuFormError, setMenuFormError] = useState<string | null>(null);

  // Storage upload states
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docUploadedUrl, setDocUploadedUrl] = useState<string | null>(null);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const [brandingUploading, setBrandingUploading] = useState(false);

  // Verification request state
  const [fssaiInput, setFssaiInput] = useState(currentCook.fssaiNumber || '');
  const [idType, setIdType] = useState<'Aadhaar' | 'PAN' | 'Voter ID'>('Aadhaar');
  const [idNumber, setIdNumber] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  // Filter items and orders for this cook
  const cookMenuItems = menuItems.filter((i) => i.cookId === currentCook.id);
  const cookOrders = orders.filter((o) => o.cookId === currentCook.id);

  // Financial calculations
  const deliveredOrders = cookOrders.filter((o) => o.status === 'delivered');
  const grossSales = deliveredOrders.reduce((sum, o) => sum + o.itemsSubtotal, 0);
  const platformCommissionRate = 15;
  const platformCommissionDeducted = Math.round((grossSales * platformCommissionRate) / 100);
  const netCookEarnings = grossSales - platformCommissionDeducted;

  // Active incoming orders
  const pendingOrders = cookOrders.filter((o) => o.status === 'pending');
  const activeOrders = cookOrders.filter(
    (o) => !['delivered', 'cancelled', 'pending'].includes(o.status)
  );

  const handleSaveItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMenuFormError(null);

    if (!editingItem?.name?.trim()) {
      setMenuFormError('Meal name is required.');
      return;
    }
    if (!editingItem.price || editingItem.price <= 0) {
      setMenuFormError('Please enter a valid price in INR.');
      return;
    }

    const itemToSave: MenuItem = {
      id: editingItem.id || `menu-${Date.now()}`,
      cookId: currentCook.id,
      name: editingItem.name.trim(),
      description: editingItem.description?.trim() || 'Delicious homestyle preparation with fresh ingredients.',
      price: Number(editingItem.price),
      category: editingItem.category || 'Daily Tiffin',
      dietaryType: editingItem.dietaryType || 'pure_veg',
      prepTimeMinutes: Number(editingItem.prepTimeMinutes) || 25,
      isAvailable: editingItem.isAvailable !== false,
      imageUrl: editingItem.imageUrl || FALLBACK_MEAL_IMAGE,
      portionSize: editingItem.portionSize?.trim() || '1 Standard Serving (Serves 1)',
      spiceLevel: editingItem.spiceLevel || 'Medium',
      createdAt: editingItem.createdAt || new Date().toISOString(),
    };

    onSaveMenuItem(itemToSave);
    setEditingItem(null);
  };

  const handleVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumber.trim()) return;

    const request: CookVerificationRequest = {
      id: `cvr-${Date.now()}`,
      cookId: currentCook.id,
      applicantName: currentCook.ownerName,
      kitchenName: currentCook.kitchenName,
      phone: currentCook.phone,
      locality: currentCook.locality,
      fssaiNumber: fssaiInput.trim(),
      idProofType: idType,
      idProofNumber: idNumber.trim(),
      kitchenPhotos: [currentCook.avatarUrl],
      status: 'pending',
      reviewerNotes: 'Application submitted via cook portal. Pending admin review.',
      submittedAt: new Date().toISOString(),
    };

    onSubmitVerificationRequest(request);
    setVerificationSuccess(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar: Kitchen Identity & Cook Selector (for testing multi-cook experience) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={currentCook.avatarUrl}
            alt={currentCook.ownerName}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-stone-200 shadow-xs"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-stone-900">{currentCook.kitchenName}</h1>
              {/* Verification status (Requirement: Do not allow unverified cooks to appear as verified) */}
              {currentCook.isVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-md border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Verified Kitchen
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-amber-800 bg-amber-50 rounded-md border border-amber-200">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  Pending Verification
                </span>
              )}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              <span>{currentCook.ownerName}</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>{currentCook.locality}, Dehradun</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>{currentCook.phone}</span>
            </div>
          </div>
        </div>

        {/* Cook Switcher (Simulates different cooks in the Nalapani network) */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400 font-medium">Switch Kitchen:</span>
          <select
            value={currentCook.id}
            onChange={(e) => {
              const selected = cooks.find((c) => c.id === e.target.value);
              if (selected) onSelectCurrentCook(selected);
            }}
            className="text-xs font-semibold text-stone-800 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none"
          >
            {cooks.map((c) => (
              <option key={c.id} value={c.id}>
                {c.kitchenName} ({c.isVerified ? 'Verified' : 'Unverified'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Verification Action Banner if Unverified */}
      {!currentCook.isVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-amber-950">
                Kitchen Verification Pending Administrative Review
              </div>
              <p className="text-amber-800 mt-0.5">
                Per CookNow safety regulations, dishes will only be publicly listed to Nalapani customers after kitchen audit and FSSAI check.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('verification')}
            className="px-3.5 py-1.5 bg-amber-800 text-white font-semibold rounded-lg hover:bg-amber-900 transition-colors shrink-0 cursor-pointer"
          >
            Submit Documents
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 bg-stone-100'
          }`}
        >
          Live Orders ({pendingOrders.length + activeOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'menu'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 bg-stone-100'
          }`}
        >
          Manage Menu ({cookMenuItems.length})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 bg-stone-100'
          }`}
        >
          Kitchen Profile & Photos
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'earnings'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 bg-stone-100'
          }`}
        >
          Earnings & Ledger
        </button>
        <button
          onClick={() => setActiveTab('verification')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'verification'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 bg-stone-100'
          }`}
        >
          Verification Audit
        </button>
      </div>

      {/* Tab 1: Live Orders & Lifecycle Management */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Pending Approval Section */}
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Incoming Orders Requiring Acceptance ({pendingOrders.length})
            </h2>

            {pendingOrders.length === 0 ? (
              <div className="bg-white rounded-xl p-6 border border-stone-200 text-center text-xs text-stone-500">
                No new pending orders right now. Kitchen is ready to receive orders!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl border-2 border-amber-300 p-5 shadow-xs space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-black text-stone-900">
                          Order #{order.id}
                        </span>
                        <div className="text-xs text-stone-500">
                          {order.customerName} ({order.customerPhone})
                        </div>
                        <div className="text-[11px] text-stone-400">
                          {order.deliveryAddress.hostelOrPgName || order.deliveryAddress.locality}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-stone-400 block font-medium">Food Subtotal</span>
                        <span className="text-base font-black font-mono text-emerald-900 tabular-nums">
                          ₹{order.itemsSubtotal}
                        </span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="bg-stone-50 p-2.5 rounded-lg text-xs space-y-1">
                      {order.items.map((it) => (
                        <div key={it.id} className="flex justify-between">
                          <span>
                            {it.quantity} × {it.itemName}
                          </span>
                          <span className="font-mono text-stone-600">₹{it.subtotal}</span>
                        </div>
                      ))}
                    </div>

                    {order.deliveryInstructions && (
                      <p className="text-xs text-amber-800 bg-amber-50/80 p-2 rounded">
                        Note: "{order.deliveryInstructions}"
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'accepted')}
                        className="flex-1 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Accept & Start Prep</span>
                      </button>
                      <button
                        onClick={() =>
                          onUpdateOrderStatus(order.id, 'cancelled', 'Rejected by kitchen: Daily quota reached.')
                        }
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg transition-colors border border-rose-200 cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Orders In-Progress */}
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              Kitchen Work-In-Progress ({activeOrders.length})
            </h2>

            {activeOrders.length === 0 ? (
              <div className="bg-white rounded-xl p-6 border border-stone-200 text-center text-xs text-stone-500">
                No orders currently in the cooking or delivery phase.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeOrders.map((order) => {
                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-stone-900">
                              Order #{order.id}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              {order.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-stone-500 mt-1">
                            {order.customerName} · {order.customerPhone}
                          </div>
                        </div>

                        <span className="font-black font-mono text-base text-stone-900 tabular-nums">
                          ₹{order.itemsSubtotal}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="text-xs text-stone-600 space-y-1 bg-stone-50 p-2.5 rounded-lg">
                        {order.items.map((it) => (
                          <div key={it.id} className="flex justify-between">
                            <span>
                              {it.quantity} × {it.itemName}
                            </span>
                            <span className="font-mono">₹{it.subtotal}</span>
                          </div>
                        ))}
                      </div>

                      {/* State transition progress triggers */}
                      <div className="space-y-2 pt-2 border-t border-stone-100">
                        <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                          Next Lifecycle Step
                        </span>

                        <div className="flex flex-wrap items-center gap-2">
                          {order.status === 'accepted' && (
                            <button
                              onClick={() => onUpdateOrderStatus(order.id, 'preparing')}
                              className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                            >
                              Mark as Cooking (Preparing)
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button
                              onClick={() => onUpdateOrderStatus(order.id, 'ready')}
                              className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                            >
                              Mark Ready & Packed
                            </button>
                          )}
                          {order.status === 'ready' && (
                            <button
                              onClick={() => onUpdateOrderStatus(order.id, 'out_for_delivery')}
                              className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                            >
                              Dispatch with Delivery Partner
                            </button>
                          )}
                          {order.status === 'out_for_delivery' && (
                            <button
                              onClick={() => onUpdateOrderStatus(order.id, 'delivered')}
                              className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                            >
                              Confirm Customer Delivery (₹ Collected)
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Menu Management */}
      {activeTab === 'menu' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-900">Your Homestyle Dishes</h2>
              <p className="text-xs text-stone-500">
                Add, adjust pricing, or mark dishes out-of-stock when batches sell out.
              </p>
            </div>
            <button
              onClick={() =>
                setEditingItem({
                  name: '',
                  description: '',
                  price: 120,
                  category: 'Daily Tiffin',
                  dietaryType: 'pure_veg',
                  prepTimeMinutes: 25,
                  isAvailable: true,
                  portionSize: '1 Standard Serving',
                  spiceLevel: 'Medium',
                  imageUrl: FALLBACK_MEAL_IMAGE,
                })
              }
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Dish</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cookMenuItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-36 bg-stone-100">
                    <img
                      src={getMenuItemImage(item.id) || item.imageUrl}
                      alt={getMenuItemAlt(item.id, item.name)}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={() =>
                          onSaveMenuItem({ ...item, isAvailable: !item.isAvailable })
                        }
                        className={`px-2 py-0.5 text-[10px] font-bold rounded shadow-xs cursor-pointer ${
                          item.isAvailable
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}
                      >
                        {item.isAvailable ? 'In Stock' : 'Sold Out'}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 space-y-1.5">
                    <h3 className="text-sm font-bold text-stone-900 truncate">{item.name}</h3>
                    <p className="text-xs text-stone-500 line-clamp-2">{item.description}</p>
                    <div className="text-xs text-stone-400 flex items-center gap-2 pt-1">
                      <span>{item.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums font-bold text-stone-800">
                        ₹{item.price}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-stone-100 flex items-center justify-between gap-2 mt-2">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="text-xs font-semibold text-stone-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => onDeleteMenuItem(item.id)}
                    className="text-xs font-medium text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Kitchen Profile & Photos (Firebase Storage) */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6 max-w-2xl shadow-xs">
          <div>
            <h2 className="text-base font-bold text-stone-900">Kitchen Profile & Availability</h2>
            <p className="text-xs text-stone-500">
              Manage your Nalapani Chowk home kitchen identity, availability, and showcase photos.
            </p>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${currentCook.isAcceptingOrders ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
              <div>
                <span className="text-xs font-bold text-stone-800">
                  Kitchen Status: {currentCook.isAcceptingOrders ? 'Accepting Orders' : 'Currently Offline / Closed'}
                </span>
                <p className="text-[11px] text-stone-500">
                  {currentCook.isAcceptingOrders
                    ? 'Customers in Nalapani Chowk can browse your meals and order.'
                    : 'Dishes are marked temporarily unavailable for incoming orders.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onUpdateCookProfile({
                  ...currentCook,
                  isAcceptingOrders: !currentCook.isAcceptingOrders,
                });
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                currentCook.isAcceptingOrders
                  ? 'bg-rose-100 hover:bg-rose-200 text-rose-800'
                  : 'bg-emerald-800 hover:bg-emerald-900 text-white'
              }`}
            >
              {currentCook.isAcceptingOrders ? 'Close Kitchen' : 'Open Kitchen'}
            </button>
          </div>

          {/* Kitchen Photo Upload via Firebase Storage */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-stone-700">Kitchen Branding Photo (Firebase Storage)</label>
            <div className="flex items-center gap-4">
              <img
                src={currentCook.avatarUrl}
                alt={currentCook.kitchenName}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-stone-200 shadow-xs"
              />
              <div className="space-y-1.5">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-lg text-xs border border-stone-300">
                  {brandingUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  <span>{brandingUploading ? 'Uploading to Firebase Storage...' : 'Upload New Photo'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={brandingUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setBrandingUploading(true);
                      try {
                        validateImageFile(file);
                        const res = await storageService.uploadKitchenBrandingImage(currentCook.userId, file, 'avatar');
                        onUpdateCookProfile({ ...currentCook, avatarUrl: res.url });
                      } catch (err: any) {
                        alert(err.message || 'Failed to upload kitchen photo.');
                      } finally {
                        setBrandingUploading(false);
                      }
                    }}
                  />
                </label>
                <p className="text-[10px] text-stone-400">
                  Saved under Firebase Storage: kitchens/{currentCook.userId}/branding/
                </p>
              </div>
            </div>
          </div>

          {/* Kitchen Edit Form */}
          <div className="space-y-3 text-xs pt-2 border-t border-stone-100">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Kitchen / Business Name</label>
              <input
                type="text"
                value={currentCook.kitchenName}
                onChange={(e) => onUpdateCookProfile({ ...currentCook, kitchenName: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Kitchen Bio / Cooking Specialty</label>
              <textarea
                rows={3}
                value={currentCook.bio}
                onChange={(e) => onUpdateCookProfile({ ...currentCook, bio: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Operating Hours</label>
                <input
                  type="text"
                  value={currentCook.operatingHours || '11:00 AM - 9:30 PM'}
                  onChange={(e) => onUpdateCookProfile({ ...currentCook, operatingHours: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Daily Meal Capacity</label>
                <input
                  type="number"
                  value={currentCook.dailyCapacity || 50}
                  onChange={(e) => onUpdateCookProfile({ ...currentCook, dailyCapacity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Earnings & Commission Ledger */}
      {activeTab === 'earnings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-1 shadow-xs">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Gross Food Sales (Delivered)
              </span>
              <div className="text-2xl font-black text-stone-900 font-mono tabular-nums">
                ₹{grossSales}
              </div>
              <span className="text-[11px] text-stone-400">
                {deliveredOrders.length} completed homestyle orders
              </span>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-1 shadow-xs">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                CookNow Platform Fee (15%)
              </span>
              <div className="text-2xl font-black text-amber-700 font-mono tabular-nums">
                - ₹{platformCommissionDeducted}
              </div>
              <span className="text-[11px] text-stone-400">
                Platform maintenance & dispatch operations
              </span>
            </div>

            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5 space-y-1 shadow-xs">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Net Cook Payout (85%)
              </span>
              <div className="text-2xl font-black text-emerald-900 font-mono tabular-nums">
                ₹{netCookEarnings}
              </div>
              <span className="text-[11px] text-emerald-700">
                Direct bank transfer / UPI settlement
              </span>
            </div>
          </div>

          {/* Delivered Orders Table */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-stone-200 font-bold text-sm text-stone-800">
              Completed Orders Settlement History
            </div>

            {deliveredOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                No delivered orders in history yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                    <tr>
                      <th className="p-3">Order Code</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Gross Subtotal</th>
                      <th className="p-3">15% Commission</th>
                      <th className="p-3">Net Cook Payout</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono tabular-nums">
                    {deliveredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-stone-50/60">
                        <td className="p-3 font-bold text-stone-800">{ord.id}</td>
                        <td className="p-3 font-sans font-medium text-stone-700">
                          {ord.customerName}
                        </td>
                        <td className="p-3">₹{ord.itemsSubtotal}</td>
                        <td className="p-3 text-amber-700">-₹{ord.platformCommission}</td>
                        <td className="p-3 font-bold text-emerald-900">₹{ord.cookEarnings}</td>
                        <td className="p-3 font-sans text-stone-400">
                          {new Date(ord.createdAt).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Verification Application */}
      {activeTab === 'verification' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6 max-w-2xl">
          <div>
            <h2 className="text-base font-bold text-stone-900">Kitchen Verification Audit</h2>
            <p className="text-xs text-stone-500">
              Every home cook in Nalapani Chowk is vetted for hygiene and basic government food safety standards.
            </p>
          </div>

          {verificationSuccess ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
              <div className="font-bold text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Audit Documents Submitted Successfully!
              </div>
              <p>
                The CookNow Dehradun operations team has received your FSSAI and ID documentation. Physical kitchen inspection will be scheduled within 24–48 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleVerificationSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  FSSAI Registration / Certificate Number
                </label>
                <input
                  type="text"
                  required
                  value={fssaiInput}
                  onChange={(e) => setFssaiInput(e.target.value)}
                  placeholder="e.g. 22623001000492"
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700 font-mono"
                />
                <span className="text-[11px] text-stone-400 mt-0.5 block">
                  Mandatory 14-digit FSSAI number for Indian food business operators.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    ID Proof Type
                  </label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="Aadhaar">Aadhaar Card</option>
                    <option value="PAN">PAN Card</option>
                    <option value="Voter ID">Voter ID Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    ID Document Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="e.g. XXXX-XXXX-4512"
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Upload ID Proof / FSSAI Document (PDF or Photo, Max 15MB)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-lg text-xs border border-stone-300">
                    {docUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{docUploading ? 'Uploading to Firebase Storage...' : (docUploadedUrl ? 'Document Attached ✓' : 'Select Document File')}</span>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={docUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setDocUploading(true);
                        setDocUploadError(null);
                        try {
                          validateDocumentFile(file);
                          const res = await storageService.uploadVerificationDocument(currentCook.userId, file, 'id_proof');
                          setDocUploadedUrl(res.url);
                        } catch (err: any) {
                          setDocUploadError(err.message || 'Failed to upload document');
                        } finally {
                          setDocUploading(false);
                        }
                      }}
                    />
                  </label>
                  {docUploadedUrl && (
                    <span className="text-[11px] text-emerald-800 font-medium">
                      ✓ Document secured in Firebase Storage
                    </span>
                  )}
                </div>
                {docUploadError && <p className="text-[11px] text-rose-600 mt-1">{docUploadError}</p>}
                <p className="text-[10px] text-stone-400 mt-1">
                  Protected under Firebase Storage rules: verifications/{currentCook.userId}/
                </p>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-xs text-stone-600 space-y-1">
                <div className="font-semibold text-stone-800">Verification Steps:</div>
                <div>1. Online document submission (FSSAI + Govt ID proof).</div>
                <div>2. Kitchen hygiene inspection (Water filtration, food storage, clean utensils).</div>
                <div>3. Taste & packaging test before listing on the student marketplace.</div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Submit Verification Audit Request</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* Edit/Add Menu Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">
                {editingItem.id ? 'Edit Dish Details' : 'Add New Homestyle Dish'}
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {menuFormError && (
              <p className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg">{menuFormError}</p>
            )}

            <form onSubmit={handleSaveItemSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Dish Name *</label>
                <input
                  type="text"
                  required
                  value={editingItem.name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  placeholder="e.g. Pahadi Rajma Chawal with Desi Ghee"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={10}
                    value={editingItem.price || ''}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, price: Number(e.target.value) })
                    }
                    placeholder="120"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Category</label>
                  <select
                    value={editingItem.category || 'Daily Tiffin'}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, category: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                  >
                    <option value="Daily Tiffin">Daily Tiffin</option>
                    <option value="Pahadi Specials">Pahadi Specials</option>
                    <option value="North Indian">North Indian</option>
                    <option value="Parathas">Parathas</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingItem.description || ''}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, description: e.target.value })
                  }
                  placeholder="Detail ingredients, tawa roti count, salad, pickles..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Prep Time (mins)</label>
                  <input
                    type="number"
                    value={editingItem.prepTimeMinutes || 25}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, prepTimeMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Dietary Type</label>
                  <select
                    value={editingItem.dietaryType || 'pure_veg'}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, dietaryType: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                  >
                    <option value="pure_veg">Pure Veg</option>
                    <option value="egg">Eggitarian</option>
                    <option value="non_veg">Non-Veg</option>
                  </select>
                </div>
              </div>

              {/* Dish Photo Upload to Firebase Storage */}
              <div className="pt-1">
                <label className="block font-semibold text-stone-700 mb-1">
                  Dish Image (Firebase Storage)
                </label>
                <div className="flex items-center gap-3">
                  {editingItem.imageUrl && (
                    <img
                      src={editingItem.imageUrl}
                      alt="Preview"
                      className="w-14 h-14 rounded-lg object-cover border border-stone-200 shrink-0"
                    />
                  )}
                  <div className="flex-1 space-y-1">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-lg text-xs border border-stone-300">
                      {isUploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      <span>{isUploadingImage ? 'Uploading to Firebase Storage...' : 'Upload Dish Photo (Max 10MB)'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={isUploadingImage}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploadingImage(true);
                          setUploadError(null);
                          try {
                            validateImageFile(file);
                            const res = await storageService.uploadMenuItemImage(
                              currentCook.userId,
                              file,
                              editingItem.name || 'dish'
                            );
                            setEditingItem((prev) => ({ ...prev, imageUrl: res.url }));
                          } catch (err: any) {
                            setUploadError(err.message || 'Image upload failed');
                          } finally {
                            setIsUploadingImage(false);
                          }
                        }}
                      />
                    </label>
                    {uploadError && <p className="text-[11px] text-rose-600">{uploadError}</p>}
                    <p className="text-[10px] text-stone-400">
                      Stored under kitchens/{currentCook.userId}/menu-items/
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={editingItem.isAvailable !== false}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, isAvailable: e.target.checked })
                  }
                  className="rounded text-emerald-800"
                />
                <label htmlFor="isAvailable" className="font-semibold text-stone-800 cursor-pointer">
                  Available for orders today
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg cursor-pointer"
                >
                  Save Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
