import React from 'react';
import { X, ShieldCheck, ShieldAlert, Star, MapPin, Clock, Phone, MessageSquare } from 'lucide-react';
import { Cook, MenuItem, Review } from '../types';
import { MealCard } from './MealCard';
import {
  getKitchenBanner,
  getKitchenAvatar,
  FALLBACK_KITCHEN_BANNER,
  FALLBACK_KITCHEN_AVATAR,
} from '../lib/image-registry';

interface CookProfileModalProps {
  cook: Cook | null;
  menuItems: MenuItem[];
  reviews: Review[];
  cartItemQuantities: Record<string, number>;
  onClose: () => void;
  onAddToCart: (item: MenuItem) => void;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onViewMealDetails: (item: MenuItem) => void;
}

export const CookProfileModal: React.FC<CookProfileModalProps> = ({
  cook,
  menuItems,
  reviews,
  cartItemQuantities,
  onClose,
  onAddToCart,
  onUpdateQuantity,
  onViewMealDetails,
}) => {
  if (!cook) return null;

  const cookMenuItems = menuItems.filter((item) => item.cookId === cook.id);
  const cookReviews = reviews.filter((r) => r.cookId === cook.id);

  const bannerSrc = getKitchenBanner(cook.id) || cook.bannerUrl;
  const avatarSrc = getKitchenAvatar(cook.id) || cook.avatarUrl;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="sticky top-3 float-right mr-3 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs text-stone-700 hover:text-stone-950 flex items-center justify-center shadow-md cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cook Banner */}
        <div className="relative h-44 sm:h-52 bg-stone-900 overflow-hidden">
          <img
            src={bannerSrc}
            alt={cook.kitchenName}
            className="w-full h-full object-cover opacity-85"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_KITCHEN_BANNER;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />

          {/* Verification Badge */}
          <div className="absolute top-4 left-4">
            {cook.isVerified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-900 bg-white/95 rounded-md shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Verified FSSAI Home Kitchen
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-amber-900 bg-amber-100/95 rounded-md border border-amber-300 shadow-sm">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                Under Administrative Review
              </span>
            )}
          </div>
        </div>

        {/* Cook Header Info */}
        <div className="px-6 pt-0 pb-6 relative border-b border-stone-200">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
            <div className="flex items-end gap-4">
              <img
                src={avatarSrc}
                alt={cook.kitchenName}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white shadow-lg bg-stone-100"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_KITCHEN_AVATAR;
                }}
              />
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-black text-stone-900">
                  {cook.kitchenName}
                </h1>
                <div className="flex items-center gap-2 text-xs text-stone-600">
                  <span>Prepared by {cook.ownerName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1 font-bold text-stone-900">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {cook.rating.toFixed(1)} ({cook.reviewCount} customer reviews)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-stone-600">
              <span className="flex items-center gap-1 bg-stone-100 px-3 py-1.5 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-stone-500" />
                {cook.deliveryTimeMin}-{cook.deliveryTimeMax} min delivery
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="md:col-span-2 space-y-2">
              <p className="text-sm text-stone-700 leading-relaxed">{cook.bio}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  {cook.address}, {cook.locality}, Dehradun
                </span>
                {cook.fssaiNumber && (
                  <span className="font-mono text-stone-600">
                    FSSAI: {cook.fssaiNumber}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 text-xs space-y-2">
              <div className="font-bold text-stone-800">Kitchen Hygiene Standards</div>
              <ul className="text-stone-600 space-y-1">
                <li>• Pure filtered RO water used in all cooking</li>
                <li>• Daily fresh produce from local Dehradun Mandi</li>
                <li>• No artificial food colors or MSG</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Menu Section */}
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">
              Today's Homestyle Menu ({cookMenuItems.length})
            </h2>
            <span className="text-xs text-stone-500">Freshly cooked to order</span>
          </div>

          {cookMenuItems.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-sm bg-stone-50 rounded-xl">
              No menu items currently listed by this kitchen.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cookMenuItems.map((item) => (
                <MealCard
                  key={item.id}
                  item={item}
                  cook={cook}
                  quantityInCart={cartItemQuantities[item.id] || 0}
                  onAddToCart={onAddToCart}
                  onUpdateQuantity={onUpdateQuantity}
                  onViewDetails={onViewMealDetails}
                />
              ))}
            </div>
          )}

          {/* Customer Reviews Section */}
          <div className="pt-6 border-t border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-800" />
                Customer Reviews from Dehradun
              </h3>
              <span className="text-xs text-stone-500">
                Verified hostelers & residents
              </span>
            </div>

            {cookReviews.length === 0 ? (
              <p className="text-xs text-stone-500 italic">
                No customer reviews yet. Be the first to order and review!
              </p>
            ) : (
              <div className="space-y-3">
                {cookReviews.map((rev) => (
                  <div key={rev.id} className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-800">{rev.customerName}</span>
                        <span className="text-[11px] text-stone-400">
                          {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < rev.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-stone-200 text-stone-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
