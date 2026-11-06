import React from 'react';
import { X, Clock, Flame, ShieldCheck, Plus, Minus, MapPin, Sparkles } from 'lucide-react';
import { MenuItem, Cook } from '../types';
import { getMenuItemImage, getMenuItemAlt, FALLBACK_MEAL_IMAGE } from '../lib/image-registry';

interface MealDetailsModalProps {
  item: MenuItem | null;
  cook?: Cook;
  quantityInCart: number;
  onClose: () => void;
  onAddToCart: (item: MenuItem) => void;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onViewCookProfile: (cook: Cook) => void;
}

export const MealDetailsModal: React.FC<MealDetailsModalProps> = ({
  item,
  cook,
  quantityInCart,
  onClose,
  onAddToCart,
  onUpdateQuantity,
  onViewCookProfile,
}) => {
  if (!item) return null;

  const mealImageSrc = getMenuItemImage(item.id) || item.imageUrl;
  const mealImageAlt = getMenuItemAlt(item.id, item.name);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-stone-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs text-stone-700 hover:text-stone-950 flex items-center justify-center shadow-xs cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Meal Photo */}
        <div className="relative h-60 w-full bg-stone-100">
          <img
            src={mealImageSrc}
            alt={mealImageAlt}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_MEAL_IMAGE;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" />
          
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center gap-2 text-xs text-amber-300 font-medium mb-1">
              <span>{item.category}</span>
              <span aria-hidden="true">·</span>
              <span>{item.portionSize}</span>
            </div>
            <h2 className="text-xl font-bold">{item.name}</h2>
          </div>
        </div>

        {/* Content Details */}
        <div className="p-6 space-y-5">
          {/* Unboxed Metadata Strip */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 border-b border-stone-100 pb-3">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-stone-400" />
              Cooked Fresh in {item.prepTimeMinutes} mins
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Flame className="w-4 h-4 text-amber-600" />
              {item.spiceLevel || 'Mild'} Spiciness
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-emerald-800">
              {item.dietaryType === 'pure_veg' ? '100% Pure Veg' : item.dietaryType}
            </span>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
              About This Homestyle Dish
            </h4>
            <p className="text-sm text-stone-700 leading-relaxed">{item.description}</p>
          </div>

          {/* Cook Credential Strip */}
          {cook && (
            <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={cook.avatarUrl}
                  alt={cook.ownerName}
                  className="w-11 h-11 rounded-full object-cover border border-stone-300"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-stone-900">{cook.kitchenName}</span>
                    {cook.isVerified && (
                      <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-0.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-stone-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{cook.locality}, Dehradun</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onViewCookProfile(cook);
                }}
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-4 cursor-pointer"
              >
                View Kitchen
              </button>
            </div>
          )}

          {/* Clean Hygiene & Student Friendly Notice */}
          <div className="text-xs text-stone-500 bg-amber-50/60 p-3 rounded-lg border border-amber-100 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              Packed in food-grade thermal containers. Ideal for hostel rooms, PGs, and student flats in Nalapani Chowk & Raipur Road.
            </p>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-between gap-4 border-t border-stone-100">
            <div>
              <span className="text-xs text-stone-400 block font-medium">Price per serving</span>
              <span className="text-2xl font-black text-stone-900 font-mono tabular-nums">
                ₹{item.price}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {quantityInCart > 0 ? (
                <div className="flex items-center bg-emerald-800 text-white rounded-xl p-1 shadow-xs">
                  <button
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-emerald-900 rounded cursor-pointer transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-9 text-center text-sm font-bold font-mono tabular-nums">
                    {quantityInCart}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-emerald-900 rounded cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onAddToCart(item)}
                  className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Order</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
