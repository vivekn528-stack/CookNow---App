import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Settings,
  TrendingUp,
  Store,
  DollarSign,
  FileCheck,
  Search,
  Users,
  Eye,
  EyeOff,
  RefreshCw,
  Bike,
  Calendar,
  Tag,
  MessageSquare,
  HelpCircle,
  Download,
  Plus,
  Trash2,
  Lock,
  LogOut,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import {
  Cook,
  MenuItem,
  Order,
  Review,
  PlatformSettings,
  PartnerApplication,
  DeliveryPartner,
  MealPlan,
  CustomerSubscription,
  Promotion,
  Complaint,
  OperatingExpense,
} from '../types';
import { OWNER_PROFILE, StorageManager } from '../lib/storage';
import {
  supabaseService,
  isSupabaseConfigured,
  getSupabaseDiagnostics,
  getSupabaseConfig,
} from '../lib/supabase';
import { firestoreService } from '../lib/firestore';
import { getFirebaseAuth } from '../lib/firebase';
import {
  executeStage1PublicImport,
  STAGE1_PLANNED_DOCUMENTS,
  Stage1ImportResult,
} from '../lib/catalog-importer';

interface AdminDashboardProps {
  cooks: Cook[];
  menuItems: MenuItem[];
  orders: Order[];
  reviews: Review[];
  partnerApplications: PartnerApplication[];
  deliveryPartners: DeliveryPartner[];
  mealPlans: MealPlan[];
  subscriptions: CustomerSubscription[];
  promotions: Promotion[];
  complaints: Complaint[];
  expenses: OperatingExpense[];
  settings: PlatformSettings;
  onApprovePartner: (appId: string, reason: string) => void;
  onRejectPartner: (appId: string, reason: string) => void;
  onApproveDeliveryPartner: (partnerId: string, notes: string) => void;
  onRejectDeliveryPartner: (partnerId: string, reason: string) => void;
  onAssignDeliveryPartner: (orderId: string, partnerId: string, partnerName: string) => void;
  onResolveComplaint: (complaintId: string, notes: string, refundAmount: number) => void;
  onSavePromotion: (promo: Promotion) => void;
  onTogglePromotion: (promoId: string) => void;
  onAddExpense: (expense: OperatingExpense) => void;
  onToggleMenuItemAvailability: (itemId: string) => void;
  onUpdateSettings: (newSettings: PlatformSettings) => void;
  onAdminCancelOrder: (orderId: string, reason: string) => void;
  onResetDatabase: () => void;
  onSignOutOwner: () => void;
  onOpenSupabaseConfig?: () => void;
  onOpenDbGuide?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  cooks,
  menuItems,
  orders,
  reviews,
  partnerApplications,
  deliveryPartners,
  mealPlans,
  subscriptions,
  promotions,
  complaints,
  expenses,
  settings,
  onApprovePartner,
  onRejectPartner,
  onApproveDeliveryPartner,
  onRejectDeliveryPartner,
  onAssignDeliveryPartner,
  onResolveComplaint,
  onSavePromotion,
  onTogglePromotion,
  onAddExpense,
  onToggleMenuItemAvailability,
  onUpdateSettings,
  onAdminCancelOrder,
  onResetDatabase,
  onSignOutOwner,
  onOpenSupabaseConfig,
  onOpenDbGuide,
}) => {
  const [firestoreTestStatus, setFirestoreTestStatus] = useState<{
    text: string;
    isSuccess: boolean;
  } | null>(null);
  const [isFirestoreTesting, setIsFirestoreTesting] = useState(false);
  const [adminTestStatus, setAdminTestStatus] = useState<{
    text: string;
    isSuccess: boolean;
    dashboardUrl?: string;
  } | null>(null);
  const [isAdminTesting, setIsAdminTesting] = useState(false);

  // Stage 1 Catalog Migration State
  const [isStage1ModalOpen, setIsStage1ModalOpen] = useState(false);
  const [isStage1Importing, setIsStage1Importing] = useState(false);
  const [stage1Progress, setStage1Progress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [stage1Result, setStage1Result] = useState<Stage1ImportResult | null>(null);
  const [stage1Error, setStage1Error] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    | 'finance'
    | 'performance'
    | 'partner-apps'
    | 'delivery-ops'
    | 'orders-complaints'
    | 'discounts'
    | 'meal-plans'
    | 'settings'
  >('finance');

  // Contact privacy state (Default masked per requirements)
  const [revealOwnerContact, setRevealOwnerContact] = useState(false);

  // Time range filter for Financial & Performance dashboards
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('30d');

  // Recorded reasons modals
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Complaint resolution state
  const [resolvingComplaintId, setResolvingComplaintId] = useState<string | null>(null);
  const [complaintResolutionNotes, setComplaintResolutionNotes] = useState('');
  const [complaintRefundAmount, setComplaintRefundAmount] = useState('0');

  // New Promotion Modal
  const [isAddingPromo, setIsAddingPromo] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoName, setPromoName] = useState('');
  const [promoType, setPromoType] = useState<'percentage' | 'fixed'>('fixed');
  const [promoValue, setPromoValue] = useState('20');
  const [promoMinOrder, setPromoMinOrder] = useState('79');
  const [promoFunding, setPromoFunding] = useState<'cooknow_funded' | 'restaurant_funded' | 'shared_funded'>('cooknow_funded');
  const [promoCategory, setPromoCategory] = useState('Student Thali');

  // New Expense modal
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState<OperatingExpense['category']>('packaging_subsidies');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  // Settings form
  const [commissionInput, setCommissionInput] = useState(settings.commissionRatePercent.toString());
  const [deliveryFeeInput, setDeliveryFeeInput] = useState(settings.standardDeliveryFee.toString());
  const [freeThresholdInput, setFreeThresholdInput] = useState(settings.freeDeliveryThreshold.toString());
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // Filtered orders by time range
  const filteredOrders = useMemo(() => {
    if (timeRange === 'all') return orders;
    const now = new Date().getTime();
    const days = timeRange === 'today' ? 1 : timeRange === '7d' ? 7 : 30;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return orders.filter((o) => new Date(o.createdAt).getTime() >= cutoff);
  }, [orders, timeRange]);

  // Financial Calculations (Phase 5: Transparent separation of GMV, revenue, payouts, discounts, refunds, expenses)
  const deliveredOrders = filteredOrders.filter((o) => o.status === 'delivered');
  const cancelledOrders = filteredOrders.filter((o) => o.status === 'cancelled');

  const grossMerchandiseValue = deliveredOrders.reduce((sum, o) => sum + o.finalPayableAmount, 0);
  const foodSubtotalSales = deliveredOrders.reduce((sum, o) => sum + o.itemsSubtotal, 0);
  const platformCommissionRevenue = deliveredOrders.reduce((sum, o) => sum + o.platformCommission, 0);
  const platformFeesRevenue = deliveredOrders.reduce((sum, o) => sum + o.platformFee, 0);
  const totalCookNowPlatformRevenue = platformCommissionRevenue + platformFeesRevenue;

  // Partner payouts (85% of food subtotal)
  const cookRestaurantPayouts = deliveredOrders.reduce((sum, o) => sum + o.cookEarnings, 0);

  // Delivery costs and fleet payouts (₹25 per completed drop vs customer delivery fees collected)
  const deliveryExpenses = deliveredOrders.length * settings.standardDeliveryFee;
  const deliveryFeesCollected = deliveredOrders.reduce((sum, o) => sum + o.deliveryFee, 0);
  const deliverySubsidyDeficit = Math.max(0, deliveryExpenses - deliveryFeesCollected);

  // Discounts breakdown (CookNow-funded vs Partner-funded vs Shared 50/50)
  const cooknowFundedDiscounts = deliveredOrders.reduce((sum, o) => {
    if (o.discountFunding === 'cooknow_funded') return sum + o.discount;
    if (o.discountFunding === 'shared_funded') return sum + Math.round(o.discount / 2);
    return sum;
  }, 0);

  const partnerFundedDiscounts = deliveredOrders.reduce((sum, o) => {
    if (o.discountFunding === 'restaurant_funded') return sum + o.discount;
    if (o.discountFunding === 'shared_funded') return sum + (o.discount - Math.round(o.discount / 2));
    return sum;
  }, 0);

  const sharedDiscounts = deliveredOrders
    .filter((o) => o.discountFunding === 'shared_funded')
    .reduce((sum, o) => sum + o.discount, 0);

  // Estimated payment gateway fees (2% on online payments or cash reconciliation cost)
  const paymentProcessingFees = Math.round(grossMerchandiseValue * 0.02);

  // Refunds & cancellations
  const refundsValue = cancelledOrders.reduce((sum, o) => sum + o.finalPayableAmount, 0);

  // Operating Expenses Total
  const totalOperatingExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Contribution after variable costs = Platform Revenue - CookNow Funded Discounts - Delivery Subsidy Deficit - Gateway Fees
  const contributionAfterVariableCosts =
    totalCookNowPlatformRevenue - cooknowFundedDiscounts - deliverySubsidyDeficit - paymentProcessingFees;

  // Estimated Net Operating Result
  const estimatedNetOperatingResult =
    contributionAfterVariableCosts - totalOperatingExpenses;

  // Root-cause performance analytics (Phase 6)
  const performanceInsights = useMemo(() => {
    const totalOrderCount = filteredOrders.length;
    const cancelCount = cancelledOrders.length;
    const cancelRate = totalOrderCount > 0 ? (cancelCount / totalOrderCount) * 100 : 0;

    const complaintsFoodCount = complaints.filter((c) => c.category === 'food_quality').length;
    const complaintsDeliveryCount = complaints.filter((c) => c.category === 'late_delivery').length;

    const insights = [];

    // Check cancellation threshold
    if (cancelRate > 10) {
      insights.push({
        metric: 'Order Cancellation Rate',
        current: `${cancelRate.toFixed(1)}%`,
        previous: '4.2%',
        status: 'deteriorated',
        contributingFactors: 'Concentrated in dinner hours at Raipur Road due to courier transit bottleneck during peak rain.',
        recommendation: 'Temporarily narrow delivery radiuses during adverse weather and add 1 backup delivery partner.',
        evidenceLevel: 'high_evidence',
      });
    }

    // Check food complaints
    if (complaintsFoodCount >= 1) {
      insights.push({
        metric: 'Food Quality Complaints',
        current: `${complaintsFoodCount} reported`,
        previous: '0 reported',
        status: 'attention',
        contributingFactors: 'Packaging temperature loss during transit over 30 minutes in winter evenings.',
        recommendation: 'Ensure thermal foil insulation bags are utilized for all Pahadi thalis and rotis.',
        evidenceLevel: 'medium_evidence',
      });
    } else {
      insights.push({
        metric: 'Food Preparation & Taste Feedback',
        current: '4.8/5.0 Customer Rating',
        previous: '4.7/5.0',
        status: 'improving',
        contributingFactors: 'High student satisfaction with authentic Garhwali Mandua rotis and Rajma Chawal combos.',
        recommendation: 'Maintain current FSSAI audit checklist and expand student thali marketing.',
        evidenceLevel: 'high_evidence',
      });
    }

    return insights;
  }, [filteredOrders, cancelledOrders, complaints]);

  // Pending counts
  const pendingPartnerApps = partnerApplications.filter((a) => a.status === 'pending' || a.status === 'under_review');
  const pendingDeliveryPartners = deliveryPartners.filter((d) => d.status === 'pending');
  const openComplaints = complaints.filter((c) => c.status === 'open' || c.status === 'investigating');
  const unassignedOrders = orders.filter((o) => o.status === 'ready' && !o.deliveryPartnerId);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Order Code', 'Date', 'Kitchen', 'Customer', 'Items Subtotal', 'Commission (15%)', 'Delivery Fee', 'Discount', 'Payable Amount', 'Payment Status', 'Delivery Partner'];
    const rows = filteredOrders.map((o) => [
      o.id,
      new Date(o.createdAt).toLocaleDateString('en-IN'),
      `"${o.kitchenName}"`,
      `"${o.customerName}"`,
      o.itemsSubtotal,
      o.platformCommission,
      o.deliveryFee,
      o.discount,
      o.finalPayableAmount,
      o.paymentStatus,
      `"${o.deliveryPartnerName || 'Unassigned'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cooknow_ledger_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;

    const newPromo: Promotion = {
      id: `promo-${Date.now()}`,
      code: promoCode.trim().toUpperCase(),
      name: promoName.trim() || `${promoCode.trim().toUpperCase()} Offer`,
      description: `Special discount for CookNow Dehradun students.`,
      discountType: promoType,
      discountValue: Number(promoValue),
      minOrderValue: Number(promoMinOrder),
      maxDiscountCap: promoType === 'percentage' ? 50 : Number(promoValue),
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2026-12-31',
      fundingSource: promoFunding,
      eligibleCategory: promoCategory !== 'all' ? promoCategory : undefined,
      usageLimit: 500,
      currentUsageCount: 0,
      perCustomerLimit: 2,
      budgetLimit: 10000,
      spentBudget: 0,
      isActive: true,
    };

    onSavePromotion(newPromo);
    setIsAddingPromo(false);
    setPromoCode('');
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || !expenseDesc.trim()) return;

    const newExp: OperatingExpense = {
      id: `exp-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      category: expenseCategory,
      description: expenseDesc.trim(),
      amount: Number(expenseAmount),
      recordedBy: OWNER_PROFILE.fullName,
    };

    onAddExpense(newExp);
    setIsAddingExpense(false);
    setExpenseDesc('');
    setExpenseAmount('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Executive Command Header */}
      <div className="bg-stone-900 text-white rounded-2xl p-6 shadow-md border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-mono uppercase tracking-wider text-stone-400">
              Executive Command Center
            </span>
            <span aria-hidden="true" className="text-stone-600">·</span>
            <span className="text-xs text-amber-300 font-medium">
              {OWNER_PROFILE.launchMarket}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-2xl font-black">{OWNER_PROFILE.fullName}</h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800">
              {OWNER_PROFILE.designation}
            </span>
          </div>

          {/* Masked Contact Info with Toggle (Requirements 5 & 8) */}
          <div className="flex items-center gap-3 text-xs text-stone-400 pt-0.5">
            <span>
              Email:{' '}
              <strong className="text-stone-200 font-mono">
                {revealOwnerContact ? OWNER_PROFILE.email : 'vi****@gmail.com'}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Phone:{' '}
              <strong className="text-stone-200 font-mono">
                {revealOwnerContact ? OWNER_PROFILE.phone : '+91 ******9019'}
              </strong>
            </span>
            <button
              onClick={() => setRevealOwnerContact(!revealOwnerContact)}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer underline underline-offset-2 ml-1"
            >
              {revealOwnerContact ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{revealOwnerContact ? 'Hide' : 'Reveal Confidential'}</span>
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              onResetDatabase();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors cursor-pointer border border-stone-700"
            title="Reload initial seed records"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo DB</span>
          </button>

          <button
            onClick={onSignOutOwner}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-950 hover:bg-rose-900 text-rose-200 rounded-lg transition-colors cursor-pointer border border-rose-800"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock Session</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('finance')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'finance'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 bg-stone-100'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Financial Dashboard & Expenses</span>
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'performance'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 bg-stone-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Performance & Root-Cause</span>
        </button>

        <button
          onClick={() => setActiveTab('partner-apps')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'partner-apps'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 bg-stone-100'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Partner Applications ({pendingPartnerApps.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('delivery-ops')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'delivery-ops'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 bg-stone-100'
          }`}
        >
          <Bike className="w-3.5 h-3.5" />
          <span>Delivery Fleet ({deliveryPartners.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders-complaints')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'orders-complaints'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 bg-stone-100'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Disputes & Reviews ({complaints.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('discounts')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'discounts'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 bg-stone-100'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Discounts & Promotions ({promotions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 bg-stone-100'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
      </div>

      {/* TAB 1: ADVANCED FINANCIAL DASHBOARD (Phase 5) */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          {/* Filter Bar & Export */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-stone-500 mr-1">Time Period:</span>
              {(['today', '7d', '30d', 'all'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors ${
                    timeRange === r
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : r}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddingExpense(true)}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Expense</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV Report</span>
              </button>
            </div>
          </div>

          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-1 shadow-xs">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Gross Merchandise Value (GMV)
              </span>
              <div className="text-2xl font-black text-stone-900 font-mono tabular-nums">
                ₹{grossMerchandiseValue}
              </div>
              <span className="text-[11px] text-stone-400">
                {deliveredOrders.length} completed transactions
              </span>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-1 shadow-xs">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                CookNow Platform Revenue
              </span>
              <div className="text-2xl font-black text-emerald-800 font-mono tabular-nums">
                ₹{totalCookNowPlatformRevenue}
              </div>
              <span className="text-[11px] text-emerald-700">
                15% Commission (₹{platformCommissionRevenue}) + Fees (₹{platformFeesRevenue})
              </span>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-1 shadow-xs">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Disbursed to Cooks & Rest.
              </span>
              <div className="text-2xl font-black text-stone-800 font-mono tabular-nums">
                ₹{cookRestaurantPayouts}
              </div>
              <span className="text-[11px] text-stone-400">
                85% of completed food subtotal
              </span>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-1 shadow-xs">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Discounts Funded
              </span>
              <div className="text-2xl font-black text-amber-700 font-mono tabular-nums">
                ₹{cooknowFundedDiscounts + partnerFundedDiscounts + sharedDiscounts}
              </div>
              <span className="text-[11px] text-amber-800">
                CookNow: ₹{cooknowFundedDiscounts} · Partners: ₹{partnerFundedDiscounts}
              </span>
            </div>
          </div>

          {/* Secondary Financial Ledger Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-1">
              <span className="text-xs font-semibold text-stone-500 uppercase">
                Delivery Fleet Payouts (₹25/order)
              </span>
              <div className="text-xl font-bold font-mono text-stone-800">
                ₹{deliveryExpenses}
              </div>
              <span className="text-[11px] text-stone-400">
                Directly earned by local delivery riders
              </span>
            </div>

            <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-1">
              <span className="text-xs font-semibold text-stone-500 uppercase">
                Recorded Operating Expenses
              </span>
              <div className="text-xl font-bold font-mono text-stone-800">
                ₹{totalOperatingExpenses}
              </div>
              <span className="text-[11px] text-stone-400">
                {expenses.length} expense items (packaging, water testing, ops)
              </span>
            </div>

            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 space-y-1">
              <span className="text-xs font-bold text-emerald-900 uppercase">
                Contribution After Variable Costs
              </span>
              <div className="text-xl font-black font-mono text-emerald-950">
                ₹{contributionAfterVariableCosts}
              </div>
              <span className="text-[11px] text-emerald-700">
                Revenue minus CookNow discount costs & gateway fees
              </span>
            </div>
          </div>

          {/* Recorded Operating Expenses Table */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-stone-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-stone-900">Recorded Operating Expenses</h3>
                <p className="text-xs text-stone-500">Track packaging subsidies and kitchen inspection costs</p>
              </div>
              <button
                onClick={() => setIsAddingExpense(true)}
                className="px-3 py-1 bg-stone-900 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                + Add Expense
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono tabular-nums">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-stone-50/60">
                      <td className="p-3 font-sans text-stone-600">{exp.date}</td>
                      <td className="p-3 font-sans">
                        <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-[11px] font-medium">
                          {exp.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3 font-sans text-stone-800">{exp.description}</td>
                      <td className="p-3 font-bold text-stone-900">₹{exp.amount}</td>
                      <td className="p-3 font-sans text-stone-500">{exp.recordedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BUSINESS PERFORMANCE & ROOT-CAUSE ANALYSIS (Phase 6) */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              Operational Performance & Root-Cause Analysis
            </h2>
            <p className="text-xs text-stone-500">
              Automated diagnostics comparing actual service metrics to identify operational bottlenecks in Nalapani Chowk.
            </p>
          </div>

          <div className="space-y-4">
            {performanceInsights.map((insight, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                      Metric Diagnostic #{idx + 1}
                    </span>
                    <h3 className="text-base font-bold text-stone-900">{insight.metric}</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 block font-medium">Current vs Previous</span>
                      <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-stone-900">
                        <span>{insight.current}</span>
                        <span className="text-stone-400 text-xs font-normal">vs {insight.previous}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md ${
                        insight.status === 'improving'
                          ? 'bg-emerald-100 text-emerald-800'
                          : insight.status === 'attention'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {insight.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
                    <span className="font-bold text-stone-800 block text-[11px] uppercase tracking-wider">
                      Possible Contributing Factors (Data Evidence)
                    </span>
                    <p className="text-stone-600 leading-relaxed">{insight.contributingFactors}</p>
                  </div>

                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 text-xs space-y-1">
                    <span className="font-bold text-emerald-950 block text-[11px] uppercase tracking-wider">
                      Recommended Action
                    </span>
                    <p className="text-emerald-900 leading-relaxed">{insight.recommendation}</p>
                    <div className="text-[11px] text-emerald-700 pt-1 font-medium">
                      Confidence Level: <strong className="uppercase">{insight.evidenceLevel.replace('_', ' ')}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PARTNER ONBOARDING APPLICATIONS (Phase 1) */}
      {activeTab === 'partner-apps' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Home Cook & Restaurant Partner Applications
              </h2>
              <p className="text-xs text-stone-500">
                Review submitted business applications, FSSAI numbers, and recorded audit approvals.
              </p>
            </div>
          </div>

          {partnerApplications.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-stone-200 text-center text-xs text-stone-500">
              No partner applications in queue.
            </div>
          ) : (
            <div className="space-y-4">
              {partnerApplications.map((app) => (
                <div
                  key={app.id}
                  className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-stone-900">{app.businessName}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                          {app.partnerType.replace('_', ' ')}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            app.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : app.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {app.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 mt-1">
                        Owner: <strong>{app.ownerName}</strong> · Phone: {app.phone} · Locality: {app.locality}
                      </div>
                      <div className="text-xs text-stone-400 font-mono mt-0.5">
                        FSSAI Reg: {app.fssaiNumber} · Capacity: {app.dailyCapacity} orders/day · {app.operatingHours}
                      </div>
                    </div>

                    {/* Action buttons if pending */}
                    {app.status !== 'approved' && app.status !== 'rejected' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            onApprovePartner(
                              app.id,
                              'Passed hygiene inspection & FSSAI validation by Vivek Singh Negi.'
                            )
                          }
                          className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve Partner</span>
                        </button>

                        <button
                          onClick={() => setRejectingAppId(app.id)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg transition-colors border border-rose-200 cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-xs bg-stone-50 p-3 rounded-lg border border-stone-200 space-y-1">
                    <div>
                      <strong>Menu Highlights:</strong> {app.sampleMenu}
                    </div>
                    <div>
                      <strong>Recorded Audit Notes:</strong> {app.reviewerReason || 'Awaiting audit.'}
                    </div>
                  </div>

                  {/* Rejection input */}
                  {rejectingAppId === app.id && (
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-2">
                      <div className="text-xs font-bold text-rose-900">
                        Record Reason for Rejection *
                      </div>
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="e.g. Inadequate hygiene measures; lack of water filtration..."
                        className="w-full px-3 py-1.5 text-xs bg-white border border-rose-300 rounded-lg"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setRejectingAppId(null)}
                          className="px-3 py-1 text-xs text-stone-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (!rejectReason.trim()) return;
                            onRejectPartner(app.id, rejectReason.trim());
                            setRejectingAppId(null);
                            setRejectReason('');
                          }}
                          className="px-3 py-1 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg"
                        >
                          Confirm Rejection
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DELIVERY FLEET & MANUAL ASSIGNMENT (Phase 2) */}
      {activeTab === 'delivery-ops' && (
        <div className="space-y-6">
          {/* Unassigned orders waiting for manual dispatch */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Orders Ready for Dispatch ({unassignedOrders.length})
            </h2>

            {unassignedOrders.length === 0 ? (
              <div className="bg-white rounded-xl p-5 border border-stone-200 text-center text-xs text-stone-500">
                All ready orders are currently assigned to active delivery partners.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {unassignedOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-sm text-stone-900">Order #{ord.id}</span>
                        <div className="text-xs text-stone-500">From: {ord.kitchenName}</div>
                        <div className="text-xs text-emerald-800 font-semibold">
                          To: {ord.deliveryAddress.hostelOrPgName || ord.deliveryAddress.locality}
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold bg-amber-50 text-amber-900 px-2 py-0.5 rounded">
                        Ready & Packed
                      </span>
                    </div>

                    {/* Manual Assign Dropdown */}
                    <div className="flex items-center gap-2">
                      <select
                        id={`assign-${ord.id}`}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-stone-50"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select delivery rider...
                        </option>
                        {deliveryPartners
                          .filter((dp) => dp.status === 'approved')
                          .map((dp) => (
                            <option key={dp.id} value={dp.id}>
                              {dp.fullName} ({dp.vehicleType})
                            </option>
                          ))}
                      </select>

                      <button
                        onClick={() => {
                          const select = document.getElementById(
                            `assign-${ord.id}`
                          ) as HTMLSelectElement;
                          const partnerId = select?.value;
                          const partner = deliveryPartners.find((d) => d.id === partnerId);
                          if (partner) {
                            onAssignDeliveryPartner(ord.id, partner.id, partner.fullName);
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delivery Partners Fleet List */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs space-y-4 p-5">
            <h2 className="text-base font-bold text-stone-900">Registered Delivery Partners</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                  <tr>
                    <th className="p-3">Rider Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Vehicle</th>
                    <th className="p-3">Service Hub</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Deliveries</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {deliveryPartners.map((dp) => (
                    <tr key={dp.id} className="hover:bg-stone-50/60">
                      <td className="p-3 font-bold text-stone-800">{dp.fullName}</td>
                      <td className="p-3 font-mono">{dp.phone}</td>
                      <td className="p-3">
                        {dp.vehicleType} {dp.vehicleNumber ? `(${dp.vehicleNumber})` : ''}
                      </td>
                      <td className="p-3 text-stone-600">{dp.serviceArea}</td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            dp.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {dp.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold">{dp.totalDeliveries}</td>
                      <td className="p-3">
                        {dp.status !== 'approved' && (
                          <button
                            onClick={() =>
                              onApproveDeliveryPartner(
                                dp.id,
                                'Verified driving license & Aadhaar by Vivek Singh Negi.'
                              )
                            }
                            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline"
                          >
                            Approve Rider
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ORDERS, ANONYMOUS REVIEWS & PRIVATE DISPUTES (Phase 7) */}
      {activeTab === 'orders-complaints' && (
        <div className="space-y-6">
          {/* Complaints Queue with Private Customer Details for Owner Investigation */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-800" />
              <span>Customer Complaints & Private Dispute Resolution</span>
            </h2>
            <p className="text-xs text-stone-500">
              Per strict privacy rules, customer identities are masked from public/partner screens. Only authorized owner Vivek Singh Negi has access to confidential customer contact info for dispute settlement.
            </p>

            {complaints.length === 0 ? (
              <div className="bg-white rounded-xl p-6 border border-stone-200 text-center text-xs text-stone-500">
                No active complaints filed by customers.
              </div>
            ) : (
              <div className="space-y-4">
                {complaints.map((comp) => (
                  <div
                    key={comp.id}
                    className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-stone-900">
                            Complaint #{comp.id} on Order #{comp.orderId}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              comp.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {comp.status}
                          </span>
                        </div>
                        <div className="text-xs text-stone-500 mt-1">
                          Category: <strong>{comp.category.replace(/_/g, ' ')}</strong> · Provider: {comp.providerName}
                        </div>
                      </div>

                      {comp.status !== 'resolved' && (
                        <button
                          onClick={() => setResolvingComplaintId(comp.id)}
                          className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Resolve & Issue Refund
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-100">
                      "{comp.description}"
                    </p>

                    {/* Owner-Only Confidential Customer Record */}
                    <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 text-xs space-y-1">
                      <div className="font-bold text-amber-950 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-700" />
                        <span>Confidential Customer Record (Owner Only):</span>
                      </div>
                      <div className="text-amber-900 font-mono">
                        Real Name: <strong>{comp.customerRealNamePrivate}</strong> · Contact: <strong>{comp.customerPhonePrivate}</strong>
                      </div>
                      <div className="text-[11px] text-amber-800">
                        Public Display Alias: <em>"{comp.customerAnonymousTag}"</em>
                      </div>
                    </div>

                    {comp.resolutionNotes && (
                      <div className="text-xs bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-emerald-900">
                        <strong>Resolution Note:</strong> {comp.resolutionNotes} (Refund: ₹{comp.refundIssued})
                      </div>
                    )}

                    {/* Resolve Form Modal */}
                    {resolvingComplaintId === comp.id && (
                      <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                        <div className="font-bold text-xs text-stone-800">
                          Resolve Dispute with Customer
                        </div>
                        <input
                          type="text"
                          value={complaintResolutionNotes}
                          onChange={(e) => setComplaintResolutionNotes(e.target.value)}
                          placeholder="e.g. Owner called customer; apology offered and meal voucher credited."
                          className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
                        />
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-stone-600 font-medium">Refund Amount (₹):</label>
                          <input
                            type="number"
                            value={complaintRefundAmount}
                            onChange={(e) => setComplaintRefundAmount(e.target.value)}
                            className="w-24 px-2 py-1 text-xs border border-stone-300 rounded-lg font-mono"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setResolvingComplaintId(null)}
                            className="px-3 py-1 text-xs text-stone-600"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              onResolveComplaint(
                                comp.id,
                                complaintResolutionNotes.trim() || 'Resolved by owner Vivek Singh Negi.',
                                Number(complaintRefundAmount) || 0
                              );
                              setResolvingComplaintId(null);
                            }}
                            className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg"
                          >
                            Confirm Resolution
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Anonymous Customer Reviews Display */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-stone-900">Public Reviews Moderation</h3>
            <div className="space-y-3 text-xs">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-stone-800">
                      {rev.isAnonymous ? 'Anonymous Student / Customer' : rev.customerName}
                    </span>
                    <span className="text-amber-500 font-mono font-bold">★ {rev.rating}/5</span>
                  </div>
                  <p className="text-stone-600">"{rev.comment}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: DISCOUNTS & PROMOTIONS ENGINE (Phase 4) */}
      {activeTab === 'discounts' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Discount & Promotions Engine
              </h2>
              <p className="text-xs text-stone-500">
                Manage student meal discounts, coupons, and funding responsibility.
              </p>
            </div>
            <button
              onClick={() => setIsAddingPromo(true)}
              className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Coupon</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-base font-black font-mono tracking-wider text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      {promo.code}
                    </span>
                    <button
                      onClick={() => onTogglePromotion(promo.id)}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                        promo.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {promo.isActive ? 'Active' : 'Paused'}
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-stone-900">{promo.name}</h3>
                  <p className="text-xs text-stone-500">{promo.description}</p>

                  <div className="text-xs text-stone-600 space-y-1 pt-2 border-t border-stone-100">
                    <div>
                      Discount:{' '}
                      <strong className="font-mono">
                        {promo.discountType === 'percentage'
                          ? `${promo.discountValue}%`
                          : `₹${promo.discountValue}`}
                      </strong>{' '}
                      (Min Order: ₹{promo.minOrderValue})
                    </div>
                    <div>
                      Funding:{' '}
                      <span className="font-medium capitalize text-stone-700">
                        {promo.fundingSource.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      Budget Used:{' '}
                      <span className="font-mono">
                        ₹{promo.spentBudget} / ₹{promo.budgetLimit} ({promo.currentUsageCount} orders)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-stone-400 border-t border-stone-100 pt-2">
                  Valid until {promo.endDate}
                </div>
              </div>
            ))}
          </div>

          {/* New Promotion Modal */}
          {isAddingPromo && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200 text-xs">
                <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                  <h3 className="text-base font-bold text-stone-900">Create New Promotion</h3>
                  <button onClick={() => setIsAddingPromo(false)}>✕</button>
                </div>

                <form onSubmit={handleCreatePromo} className="space-y-3">
                  <div>
                    <label className="block font-semibold mb-1">Coupon Code *</label>
                    <input
                      type="text"
                      required
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="e.g. STUDENT49"
                      className="w-full px-3 py-2 border rounded-lg font-mono uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Discount Value *</label>
                      <input
                        type="number"
                        required
                        value={promoValue}
                        onChange={(e) => setPromoValue(e.target.value)}
                        placeholder="20"
                        className="w-full px-3 py-2 border rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Type</label>
                      <select
                        value={promoType}
                        onChange={(e) => setPromoType(e.target.value as any)}
                        className="w-full px-3 py-2 border rounded-lg bg-white"
                      >
                        <option value="fixed">Fixed (₹)</option>
                        <option value="percentage">Percentage (%)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Min Order (₹)</label>
                      <input
                        type="number"
                        value={promoMinOrder}
                        onChange={(e) => setPromoMinOrder(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Funding Responsibility</label>
                      <select
                        value={promoFunding}
                        onChange={(e) => setPromoFunding(e.target.value as any)}
                        className="w-full px-3 py-2 border rounded-lg bg-white"
                      >
                        <option value="cooknow_funded">CookNow Funded</option>
                        <option value="restaurant_funded">Restaurant Funded</option>
                        <option value="shared_funded">Shared 50/50</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingPromo(false)}
                      className="px-3 py-1.5 text-stone-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-800 text-white font-bold rounded-lg"
                    >
                      Save Promotion
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: PLATFORM SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6 max-w-xl shadow-xs text-xs">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              Platform Commission & Logistics Rules
            </h2>
            <p className="text-stone-500">
              Adjust marketplace economics, delivery rates, and Nalapani hub parameters.
            </p>
          </div>

          {settingsSavedToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Platform settings updated!</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block font-semibold mb-1">Commission Rate (%)</label>
              <input
                type="number"
                value={commissionInput}
                onChange={(e) => setCommissionInput(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg font-mono"
              />
              <span className="text-stone-400 text-[11px] mt-0.5 block">
                Standard proposed take-rate is 15%.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Standard Delivery Fee (₹)</label>
                <input
                  type="number"
                  value={deliveryFeeInput}
                  onChange={(e) => setDeliveryFeeInput(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Free Delivery Threshold (₹)</label>
                <input
                  type="number"
                  value={freeThresholdInput}
                  onChange={(e) => setFreeThresholdInput(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
              </div>
            </div>

            <button
              onClick={() => {
                onUpdateSettings({
                  ...settings,
                  commissionRatePercent: Number(commissionInput),
                  standardDeliveryFee: Number(deliveryFeeInput),
                  freeDeliveryThreshold: Number(freeThresholdInput),
                });
                setSettingsSavedToast(true);
                setTimeout(() => setSettingsSavedToast(false), 3000);
              }}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg cursor-pointer"
            >
              Save Platform Settings
            </button>
          </div>

          {/* Primary: Google Cloud Firestore & Firebase Storage Integration Status */}
          <div className="pt-6 border-t border-stone-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  Primary Backend: Google Cloud Firestore & Storage
                </h3>
                <p className="text-stone-500 text-[11px]">
                  Cloud Firestore database & Firebase Storage bucket for CookNow Dehradun operations.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Firestore Active
              </span>
            </div>

            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-2 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Firebase Project:</span>
                <span className="font-mono font-bold text-stone-900">cooknow-9444c</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Firestore Database ID:</span>
                <span className="font-mono font-bold text-emerald-900">
                  ai-studio-cooknowhomestyle-7c8332e7-39bc-4862-8a92-262d83edb331
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Firebase Storage Bucket:</span>
                <span className="font-mono text-stone-800">cooknow-9444c.firebasestorage.app</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Super Admin (Zero-Trust):</span>
                <span className="font-mono font-semibold text-emerald-900">vivekn528@gmail.com (Founder)</span>
              </div>
              <div className="text-stone-600 pt-1.5 border-t border-emerald-200/60">
                <strong>Security Rules:</strong> Role escalation protection, strict field allowlists, order immutability, and cook ownership validation active.
              </div>
            </div>

            {firestoreTestStatus && (
              <div
                className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  firestoreTestStatus.isSuccess
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                <div className="font-mono">{firestoreTestStatus.text}</div>
              </div>
            )}

            <button
              type="button"
              disabled={isFirestoreTesting}
              onClick={async () => {
                setIsFirestoreTesting(true);
                setFirestoreTestStatus(null);
                try {
                  const res = await firestoreService.testConnection();
                  setIsFirestoreTesting(false);
                  setFirestoreTestStatus({
                    text: res.connected
                      ? `✅ Cloud Firestore Test Passed: ${res.message}`
                      : `❌ Cloud Firestore Notice: ${res.message}`,
                    isSuccess: res.connected,
                  });
                } catch (e: any) {
                  setIsFirestoreTesting(false);
                  setFirestoreTestStatus({
                    text: `❌ Connection Error: ${e.message || String(e)}`,
                    isSuccess: false,
                  });
                }
              }}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 text-xs shadow-xs"
            >
              {isFirestoreTesting ? 'Testing Cloud Firestore...' : 'Test Cloud Firestore & Storage Connection'}
            </button>

            {/* Stage 1: Public Business & Catalog Data Migration Tool */}
            <div className="mt-4 pt-4 border-t border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    Stage 1: Public Business & Catalog Migration
                  </h4>
                  <p className="text-[11px] text-stone-600">
                    Migrate 22 canonical catalog records into Cloud Firestore using verified Super Admin credentials.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  22 Catalog Docs
                </span>
              </div>

              {(() => {
                const authUser = getFirebaseAuth()?.currentUser;
                const isSuperAdminUser = Boolean(
                  authUser &&
                    authUser.email?.toLowerCase().trim() === 'vivekn528@gmail.com' &&
                    authUser.emailVerified
                );

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-[11px]">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={`w-4 h-4 ${isSuperAdminUser ? 'text-emerald-600' : 'text-amber-600'}`} />
                        <div>
                          <span className="font-semibold text-stone-800">
                            {isSuperAdminUser
                              ? `Authenticated as Super Admin: ${authUser?.email}`
                              : authUser
                              ? `Signed in as ${authUser.email} (Non-Admin)`
                              : 'Super Admin Google Sign-In Required'}
                          </span>
                          <p className="text-[10px] text-stone-500">
                            {isSuperAdminUser
                              ? 'Security rules: verified owner identity grants write permissions.'
                              : 'Sign in with vivekn528@gmail.com via the Owner Sign-In modal to enable import.'}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isSuperAdminUser
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isSuperAdminUser ? 'Authorized' : 'Action Locked'}
                      </span>
                    </div>

                    {stage1Result && (
                      <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs space-y-1">
                        <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Stage 1 Catalog Migration Completed!
                        </div>
                        <div className="text-[11px] text-emerald-800">
                          {stage1Result.createdCount} created, {stage1Result.skippedCount} skipped,{' '}
                          {stage1Result.errorCount} errors.
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setStage1Error(null);
                          setIsStage1ModalOpen(true);
                        }}
                        className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs shadow-xs flex items-center gap-1.5"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        Review & Seed Stage 1 Catalog (22 Docs)
                      </button>

                      {stage1Result && (
                        <button
                          type="button"
                          onClick={() => {
                            const blob = new Blob(
                              [JSON.stringify(stage1Result, null, 2)],
                              { type: 'application/json' }
                            );
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `cooknow-stage1-audit-${Date.now()}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Audit Log
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Secondary / Migration: Supabase PostgreSQL Integration Status & Diagnostics */}
          <div className="pt-6 border-t border-stone-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isSupabaseConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  Supabase PostgreSQL Database Status
                </h3>
                <p className="text-stone-500 text-[11px]">
                  Production database for home cooks, thalis, orders, and audits.
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  isSupabaseConfigured()
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isSupabaseConfigured() ? 'Live Supabase' : 'Offline Local Storage'}
              </span>
            </div>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-stone-500">Configured URL:</span>
                <span className="font-mono font-semibold text-stone-800">
                  {getSupabaseConfig().url ? (
                    getSupabaseConfig().url.startsWith('sb_') ? (
                      <span className="text-amber-700">
                        ⚠️ Key in URL ({getSupabaseConfig().url.slice(0, 15)}...)
                      </span>
                    ) : (
                      getSupabaseConfig().url
                    )
                  ) : (
                    <span className="text-stone-400">Not configured</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-stone-500">Publishable Key:</span>
                <span className="font-mono text-stone-800">
                  {getSupabaseConfig().anonKey ? 'Active (Configured)' : 'Missing'}
                </span>
              </div>
              <div className="text-[11px] text-stone-600 pt-1 border-t border-stone-200/70">
                <strong>Status:</strong> {getSupabaseDiagnostics().message}
              </div>
            </div>

            {adminTestStatus && (
              <div
                className={`p-3 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
                  adminTestStatus.isSuccess
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50 border-amber-200 text-amber-950'
                }`}
              >
                <div className="font-mono">{adminTestStatus.text}</div>
                {adminTestStatus.dashboardUrl && (
                  <div className="pt-1">
                    <a
                      href={adminTestStatus.dashboardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-md text-[11px] transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Supabase Dashboard (tphoggbtizpzudbhgtjo) ↗
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  setIsAdminTesting(true);
                  setAdminTestStatus(null);
                  try {
                    const res = await supabaseService.testConnection();
                    setIsAdminTesting(false);
                    setAdminTestStatus({
                      text: res.connected
                        ? `✅ Connection Successful: ${res.message}`
                        : `❌ Connection Notice: ${res.message}`,
                      isSuccess: res.connected,
                      dashboardUrl: res.dashboardUrl,
                    });
                  } catch (e: any) {
                    setIsAdminTesting(false);
                    setAdminTestStatus({
                      text: `❌ Connection Error: ${e.message || String(e)}`,
                      isSuccess: false,
                      dashboardUrl: 'https://supabase.com/dashboard/project/tphoggbtizpzudbhgtjo',
                    });
                  }
                }}
                disabled={isAdminTesting}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isAdminTesting ? 'Testing Connection...' : 'Test Database Connection'}
              </button>

              {onOpenSupabaseConfig && (
                <button
                  type="button"
                  onClick={onOpenSupabaseConfig}
                  className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Configure Supabase Project URL →
                </button>
              )}

              {onOpenDbGuide && (
                <button
                  type="button"
                  onClick={onOpenDbGuide}
                  className="px-3 py-2 text-stone-600 hover:text-stone-900 font-semibold cursor-pointer underline text-[11px]"
                >
                  SQL Migrations Guide
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isAddingExpense && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-stone-200 text-xs">
            <h3 className="text-base font-bold text-stone-900">Record Operating Expense</h3>
            <form onSubmit={handleCreateExpense} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Category</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="packaging_subsidies">Packaging Subsidies</option>
                  <option value="ops_hygiene_inspection">Kitchen Hygiene & Water Testing</option>
                  <option value="marketing_student_camps">Student Outreach / Campuses</option>
                  <option value="logistics_partner_payout">Logistics Fleet Subsidy</option>
                  <option value="software_platform">Software & Server Hosting</option>
                  <option value="other">Other Operations</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="e.g. 500 thermal containers for Nalapani cooks"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="1500"
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingExpense(false)}
                  className="px-3 py-1.5 text-stone-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-stone-900 text-white font-bold rounded-lg"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stage 1 Catalog Migration Confirmation & Execution Modal */}
      {isStage1ModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 bg-stone-50/80 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-stone-900 text-base">
                    Stage 1: Public Business & Catalog Migration
                  </h3>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Cloud Firestore: <span className="font-mono text-emerald-900 font-semibold">ai-studio-cooknowhomestyle-7c8332e7-39bc-4862-8a92-262d83edb331</span>
                </p>
              </div>
              <button
                type="button"
                disabled={isStage1Importing}
                onClick={() => setIsStage1ModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Authenticated Identity Check Banner */}
              {(() => {
                const authUser = getFirebaseAuth()?.currentUser;
                const isSuperAdminUser = Boolean(
                  authUser &&
                    authUser.email?.toLowerCase().trim() === 'vivekn528@gmail.com' &&
                    authUser.emailVerified
                );

                if (isSuperAdminUser) {
                  return (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-900">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold text-xs">Authorized Super Admin Session Active</div>
                        <div className="text-[11px] text-emerald-800 font-mono">
                          {authUser?.email} (Google Verified) • Writing via Firebase Web SDK
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-amber-950">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-xs">Super Admin Authentication Required</div>
                        <div className="text-[11px] text-amber-900">
                          Execution requires active Google Sign-In with verified email{' '}
                          <code className="font-bold">vivekn528@gmail.com</code>. Please sign in via the Owner Sign-In modal first.
                        </div>
                      </div>
                    </div>
                  );
                }
              })()}

              {/* Scope & Item Count Badge */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="text-[10px] text-stone-500 font-semibold uppercase">Settings</div>
                  <div className="text-base font-bold text-stone-900 font-mono">1</div>
                  <div className="text-[9px] text-stone-400">global</div>
                </div>
                <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="text-[10px] text-stone-500 font-semibold uppercase">Cooks</div>
                  <div className="text-base font-bold text-stone-900 font-mono">5</div>
                  <div className="text-[9px] text-stone-400">Kitchens</div>
                </div>
                <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="text-[10px] text-stone-500 font-semibold uppercase">Menu Items</div>
                  <div className="text-base font-bold text-stone-900 font-mono">10</div>
                  <div className="text-[9px] text-stone-400">Thalis & Dishes</div>
                </div>
                <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="text-[10px] text-stone-500 font-semibold uppercase">Meal Plans</div>
                  <div className="text-base font-bold text-stone-900 font-mono">3</div>
                  <div className="text-[9px] text-stone-400">Monthly Tiffins</div>
                </div>
                <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="text-[10px] text-stone-500 font-semibold uppercase">Promotions</div>
                  <div className="text-base font-bold text-stone-900 font-mono">3</div>
                  <div className="text-[9px] text-stone-400">Discount Codes</div>
                </div>
              </div>

              {/* Data Safety & Identity Handling Guarantees */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5 text-[11px] text-stone-600">
                <div className="font-bold text-stone-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-700" />
                  Safety & Cook Identity Standards:
                </div>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <strong>Atomic Create-Only:</strong> Uses Firestore transactions (<code className="font-mono text-stone-800">runTransaction</code>) to guarantee atomic create-only protection. Any existing document is skipped without overwrite.
                  </li>
                  <li>
                    <strong>Cook Identity:</strong> Legacy identifiers (<code className="font-mono">user-cook-1</code>) are preserved strictly as <code className="font-mono text-emerald-800">legacyCookUserId</code> metadata. No artificial UIDs are invented; true ownership is deferred until cooks authenticate.
                  </li>
                  <li>
                    <strong>Public Cleanliness:</strong> Internal verification notes, super admin email tags, bank accounts, and private verification documents are strictly omitted from public collections.
                  </li>
                  <li>
                    <strong>Post-Write Readback:</strong> Every created document is read back immediately to verify successful persistence.
                  </li>
                </ul>
              </div>

              {/* Planned Documents List */}
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <div className="px-3.5 py-2 bg-stone-100 font-bold text-stone-800 flex justify-between items-center text-xs">
                  <span>Planned Documents (Exactly 22 Records)</span>
                  <span className="text-[10px] text-stone-500 font-mono">Read-Only Preview</span>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-stone-100 text-[11px]">
                  {STAGE1_PLANNED_DOCUMENTS.map((doc, idx) => (
                    <div key={`${doc.collection}-${doc.id}`} className="px-3 py-1.5 flex items-center justify-between hover:bg-stone-50">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-stone-400 w-5">{idx + 1}.</span>
                        <span className="font-mono text-stone-600">{doc.collection}/{doc.id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-stone-700 truncate max-w-[220px]">{doc.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">{doc.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Execution Progress & Status */}
              {isStage1Importing && stage1Progress && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-900">
                    <span>Migrating Catalog...</span>
                    <span>
                      {stage1Progress.current} / {stage1Progress.total} ({Math.round((stage1Progress.current / stage1Progress.total) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-300"
                      style={{ width: `${(stage1Progress.current / stage1Progress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-emerald-800 font-mono truncate">{stage1Progress.message}</p>
                </div>
              )}

              {/* Error Message */}
              {stage1Error && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-950 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Migration Stopped on Error:</div>
                    <div className="text-[11px] font-mono mt-0.5">{stage1Error}</div>
                  </div>
                </div>
              )}

              {/* Success Result Summary */}
              {stage1Result && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Stage 1 Public Catalog Import Completed
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                    <div className="p-2 bg-white rounded-lg border border-emerald-200">
                      <div className="text-[10px] text-stone-500">Created</div>
                      <div className="text-base font-bold text-emerald-700 font-mono">{stage1Result.createdCount}</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-emerald-200">
                      <div className="text-[10px] text-stone-500">Skipped (Existed)</div>
                      <div className="text-base font-bold text-amber-700 font-mono">{stage1Result.skippedCount}</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-emerald-200">
                      <div className="text-[10px] text-stone-500">Errors</div>
                      <div className="text-base font-bold text-rose-700 font-mono">{stage1Result.errorCount}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-emerald-800 pt-1">
                    All {stage1Result.verifiedDocsCount} created documents were read back and verified in Cloud Firestore.
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50/80 flex items-center justify-between">
              <button
                type="button"
                disabled={isStage1Importing}
                onClick={() => setIsStage1ModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {stage1Result ? 'Close' : 'Cancel'}
              </button>

              <div className="flex items-center gap-2">
                {stage1Result && (
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(stage1Result, null, 2)], {
                        type: 'application/json',
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `cooknow-stage1-audit-${Date.now()}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Audit Log
                  </button>
                )}

                {(() => {
                  const authUser = getFirebaseAuth()?.currentUser;
                  const isSuperAdminUser = Boolean(
                    authUser &&
                      authUser.email?.toLowerCase().trim() === 'vivekn528@gmail.com' &&
                      authUser.emailVerified
                  );

                  return (
                    <button
                      type="button"
                      disabled={!isSuperAdminUser || isStage1Importing || Boolean(stage1Result)}
                      onClick={async () => {
                        setIsStage1Importing(true);
                        setStage1Error(null);
                        setStage1Result(null);
                        try {
                          const res = await executeStage1PublicImport((curr, tot, msg) => {
                            setStage1Progress({ current: curr, total: tot, message: msg });
                          });
                          setStage1Result(res);
                          setIsStage1Importing(false);
                        } catch (err: any) {
                          setStage1Error(err.message || String(err));
                          setIsStage1Importing(false);
                        }
                      }}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-300 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isStage1Importing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Importing Catalog ({stage1Progress?.current || 0}/22)...
                        </>
                      ) : stage1Result ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Catalog Seeded
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirm & Execute Stage 1 Import (22 Records)
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
