import React from 'react';
import { ShoppingBag, ChefHat, ShieldCheck, User, Store, Bike, Calendar, Sparkles, LogOut } from 'lucide-react';
import { UserRole } from '../types';

export type NavTabType =
  | 'explore'
  | 'student-thalis'
  | 'meal-plans'
  | 'cooks'
  | 'my-orders'
  | 'cook-dashboard'
  | 'delivery-dashboard'
  | 'admin-dashboard'
  | 'how-it-works';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  cartCount: number;
  onOpenCart: () => void;
  activeTab: NavTabType;
  onNavigate: (tab: NavTabType) => void;
  onOpenPartnerModal: () => void;
  onOpenDeliveryModal: () => void;
  onOpenDbGuide: () => void;
  isOwnerLoggedIn: boolean;
  currentUser?: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null } | null;
  onCustomerSignIn?: () => void;
  onCustomerSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  cartCount,
  onOpenCart,
  activeTab,
  onNavigate,
  onOpenPartnerModal,
  onOpenDeliveryModal,
  onOpenDbGuide,
  isOwnerLoggedIn,
  currentUser,
  onCustomerSignIn,
  onCustomerSignOut,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16">
          {/* Zone 1: Single text element Brand wordmark */}
          <button
            onClick={() => onNavigate('explore')}
            className="flex items-center gap-2 text-left group focus:outline-none"
          >
            <span className="w-8 h-8 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center font-bold text-lg shadow-sm">
              C
            </span>
            <div className="leading-none">
              <span className="text-xl font-bold tracking-tight text-stone-900 group-hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0">
                CookNow
              </span>
              <span className="block text-[10px] text-emerald-800 font-semibold tracking-wide">
                Nalapani Chowk
              </span>
            </div>
          </button>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-stone-600">
            <button
              onClick={() => onNavigate('explore')}
              className={`hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'explore'
                  ? 'text-emerald-900 font-bold underline underline-offset-8 decoration-2 decoration-emerald-700'
                  : ''
              }`}
            >
              Explore Meals
            </button>

            <button
              onClick={() => onNavigate('student-thalis')}
              className={`hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1 ${
                activeTab === 'student-thalis'
                  ? 'text-emerald-900 font-bold underline underline-offset-8 decoration-2 decoration-emerald-700'
                  : ''
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Student Thali (From ₹49)</span>
            </button>

            <button
              onClick={() => onNavigate('meal-plans')}
              className={`hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1 ${
                activeTab === 'meal-plans'
                  ? 'text-emerald-900 font-bold underline underline-offset-8 decoration-2 decoration-emerald-700'
                  : ''
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>Monthly Tiffin Plans</span>
            </button>

            <button
              onClick={() => onNavigate('cooks')}
              className={`hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'cooks'
                  ? 'text-emerald-900 font-bold underline underline-offset-8 decoration-2 decoration-emerald-700'
                  : ''
              }`}
            >
              Home Cooks
            </button>

            <button
              onClick={() => onNavigate('my-orders')}
              className={`hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'my-orders'
                  ? 'text-emerald-900 font-bold underline underline-offset-8 decoration-2 decoration-emerald-700'
                  : ''
              }`}
            >
              My Orders
            </button>
          </nav>

          {/* Zone 3: 1 primary action & portal controls zone */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Quick Onboarding triggers */}
            <button
              onClick={onOpenPartnerModal}
              className="hidden xl:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Partner With Us</span>
            </button>

            <button
              onClick={onOpenDeliveryModal}
              className="hidden xl:inline-flex items-center gap-1 text-[11px] font-semibold text-stone-700 hover:text-stone-900 px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Bike className="w-3 h-3" />
              <span>Deliver</span>
            </button>

            {/* View Switcher Controls */}
            <div className="relative inline-flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200/80">
              <button
                onClick={() => {
                  onRoleChange('customer');
                  if (activeTab === 'cook-dashboard' || activeTab === 'admin-dashboard' || activeTab === 'delivery-dashboard') {
                    onNavigate('explore');
                  }
                }}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  currentRole === 'customer'
                    ? 'bg-white text-emerald-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Customer Ordering View"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Customer</span>
              </button>

              <button
                onClick={() => {
                  onRoleChange('cook');
                  onNavigate('cook-dashboard');
                }}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  currentRole === 'cook'
                    ? 'bg-white text-emerald-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Home Cook & Restaurant Kitchen Portal"
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cook</span>
              </button>

              <button
                onClick={() => {
                  onRoleChange('delivery');
                  onNavigate('delivery-dashboard');
                }}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  currentRole === 'delivery'
                    ? 'bg-white text-emerald-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Delivery Partner Operations Portal"
              >
                <Bike className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rider</span>
              </button>

              <button
                onClick={() => {
                  onRoleChange('admin');
                  onNavigate('admin-dashboard');
                }}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  currentRole === 'admin'
                    ? 'bg-stone-900 text-white shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Owner Control Centre (Vivek Singh Negi)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline font-bold">Owner</span>
              </button>
            </div>

            {/* Architecture / DB Guide */}
            <button
              onClick={onOpenDbGuide}
              className="hidden md:flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-stone-600 hover:text-emerald-800 bg-stone-50 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors"
              title="Database Architecture, RLS & Deployment"
            >
              <span>Setup Guide</span>
            </button>

            {/* Customer Authentication Control */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 pl-2 pr-1 py-1 bg-stone-100 hover:bg-stone-200/70 rounded-lg border border-stone-200 text-xs transition-colors">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Customer'}
                    className="w-5 h-5 rounded-full object-cover border border-emerald-700"
                  />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-emerald-800 text-white font-bold text-[10px] flex items-center justify-center">
                    {(currentUser.displayName || currentUser.email || 'C')[0].toUpperCase()}
                  </span>
                )}
                <span
                  className="hidden sm:inline font-semibold text-stone-800 text-[11px] max-w-[80px] truncate"
                  title={currentUser.email || ''}
                >
                  {currentUser.displayName?.split(' ')[0] || 'Customer'}
                </span>
                <button
                  type="button"
                  onClick={onCustomerSignOut}
                  title={`Sign Out (${currentUser.email || ''})`}
                  className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded transition-colors cursor-pointer"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onCustomerSignIn}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:text-emerald-950 bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-200 transition-colors cursor-pointer shadow-2xs"
                title="Sign in with Google as Customer"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
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
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative flex items-center justify-center p-2 rounded-lg bg-emerald-800 text-white hover:bg-emerald-900 transition-colors shadow-xs cursor-pointer"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-stone-950 text-[11px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
