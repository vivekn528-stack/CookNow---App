import React from 'react';
import { ShieldCheck, ShieldAlert, Star, MapPin, Clock, ArrowRight } from 'lucide-react';
import { Cook } from '../types';
import {
  getKitchenBanner,
  getKitchenAvatar,
  FALLBACK_KITCHEN_BANNER,
  FALLBACK_KITCHEN_AVATAR,
} from '../lib/image-registry';

interface CookCardProps {
  cook: Cook;
  menuItemCount: number;
  onSelectCook: (cook: Cook) => void;
}

export const CookCard: React.FC<CookCardProps> = ({ cook, menuItemCount, onSelectCook }) => {
  const bannerSrc = getKitchenBanner(cook.id) || cook.bannerUrl;
  const avatarSrc = getKitchenAvatar(cook.id) || cook.avatarUrl;

  return (
    <div className="bg-white rounded-xl border border-stone-200/90 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Banner with Cook Avatar */}
        <div className="relative h-32 bg-stone-100 overflow-hidden">
          <img
            src={bannerSrc}
            alt={cook.kitchenName}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_KITCHEN_BANNER;
            }}
          />
          <div className="absolute inset-0 bg-stone-950/30" />

          {/* Verification Badge (Strictly only if cook is verified!) */}
          <div className="absolute top-3 right-3">
            {cook.isVerified ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-900 bg-white/95 backdrop-blur-xs rounded-md shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                Verified Kitchen
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-900 bg-amber-100/95 backdrop-blur-xs rounded-md border border-amber-300 shadow-xs">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                Pending Verification
              </span>
            )}
          </div>

          {/* Kitchen Avatar Seal */}
          <div className="absolute -bottom-6 left-5">
            <img
              src={avatarSrc}
              alt={cook.kitchenName}
              className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md bg-stone-100"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = FALLBACK_KITCHEN_AVATAR;
              }}
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="pt-8 px-5 pb-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-stone-900">{cook.kitchenName}</h3>
              <p className="text-xs text-stone-500 font-medium">by {cook.ownerName}</p>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 text-xs font-bold text-stone-800 font-mono tabular-nums bg-stone-100 px-2 py-1 rounded">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{cook.rating.toFixed(1)}</span>
              <span className="text-stone-400 font-normal">({cook.reviewCount})</span>
            </div>
          </div>

          {/* Locality & Prep time */}
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              {cook.locality}
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              {cook.deliveryTimeMin}-{cook.deliveryTimeMax} min
            </span>
          </div>

          {/* Bio / Specialty */}
          <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
            {cook.bio}
          </p>

          {/* FSSAI or Inspection Note */}
          {cook.fssaiNumber && (
            <div className="text-[11px] text-stone-400 font-mono">
              FSSAI Reg: {cook.fssaiNumber}
            </div>
          )}
        </div>
      </div>

      {/* Footer / CTA */}
      <div className="px-5 py-3 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between">
        <span className="text-xs text-stone-500 font-medium">
          {menuItemCount} {menuItemCount === 1 ? 'Dish' : 'Dishes'} Available
        </span>

        <button
          onClick={() => onSelectCook(cook)}
          className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition-colors cursor-pointer"
        >
          <span>View Kitchen Menu</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
