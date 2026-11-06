import React from 'react';
import { Plus, Minus, Clock, Flame } from 'lucide-react';
import { MenuItem, Cook } from '../types';
import { getMenuItemImage, getMenuItemAlt, FALLBACK_MEAL_IMAGE } from '../lib/image-registry';

interface MealCardProps {
  item: MenuItem;
  cook?: Cook;
  quantityInCart: number;
  onAddToCart: (item: MenuItem) => void;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onViewDetails: (item: MenuItem) => void;
}

export const MealCard: React.FC<MealCardProps> = ({
  item,
  cook,
  quantityInCart,
  onAddToCart,
  onUpdateQuantity,
  onViewDetails,
}) => {
  const mealImageSrc = getMenuItemImage(item.id) || item.imageUrl;
  const mealImageAlt = getMenuItemAlt(item.id, item.name);

  return (
    <div className="group bg-white rounded-xl border border-stone-200/90 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      {/* Clickable Area for modal details */}
      <div onClick={() => onViewDetails(item)} className="cursor-pointer">
        {/* Meal Photo Container */}
        <div className="relative h-48 w-full bg-stone-100 overflow-hidden">
          <img
            src={mealImageSrc}
            alt={mealImageAlt}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_MEAL_IMAGE;
            }}
          />

          {/* FSSAI Dietary Symbol (Clean Indian Standard) */}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs p-1 rounded-sm border border-stone-200 shadow-xs flex items-center justify-center">
            {item.dietaryType === 'pure_veg' ? (
              <div className="w-4 h-4 border border-emerald-700 flex items-center justify-center p-0.5" title="100% Pure Veg">
                <div className="w-2 h-2 rounded-full bg-emerald-700" />
              </div>
            ) : item.dietaryType === 'egg' ? (
              <div className="w-4 h-4 border border-amber-600 flex items-center justify-center p-0.5" title="Contains Egg">
                <div className="w-2 h-2 rounded-full bg-amber-600" />
              </div>
            ) : (
              <div className="w-4 h-4 border border-rose-700 flex items-center justify-center p-0.5" title="Non-Veg">
                <div className="w-2 h-2 rounded-full bg-rose-700" />
              </div>
            )}
          </div>

          {/* Availability notice if sold out */}
          {!item.isAvailable && (
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-[2px] flex items-center justify-center">
              <span className="text-white text-xs font-semibold px-3 py-1 bg-stone-900/90 rounded">
                Sold Out For Today
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-2">
          {/* Unboxed Metadata: Cook & Locality */}
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <span className="font-medium text-stone-700 truncate max-w-[140px]">
              {cook?.kitchenName || 'Local Home Cook'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{cook?.locality || 'Nalapani Chowk'}</span>
          </div>

          {/* Meal Title */}
          <h3 className="text-base font-bold text-stone-900 group-hover:text-emerald-800 transition-colors line-clamp-1">
            {item.name}
          </h3>

          {/* Description */}
          <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
            {item.description}
          </p>

          {/* Prep time & portion metadata */}
          <div className="flex items-center gap-3 text-xs text-stone-500 pt-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              {item.prepTimeMinutes} mins
            </span>
            {item.spiceLevel && (
              <>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-600" />
                  {item.spiceLevel}
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="truncate">{item.portionSize}</span>
          </div>
        </div>
      </div>

      {/* Card Footer: Price & Add to Cart action */}
      <div className="px-4 pb-4 pt-2 border-t border-stone-100 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-stone-400 uppercase tracking-wider font-medium">Price</div>
          <div className="text-base font-extrabold text-stone-900 font-mono tabular-nums">
            ₹{item.price}
          </div>
        </div>

        <div>
          {!item.isAvailable ? (
            <button
              disabled
              className="px-3 py-1.5 text-xs font-medium text-stone-400 bg-stone-100 rounded-lg cursor-not-allowed"
            >
              Unavailable
            </button>
          ) : quantityInCart > 0 ? (
            <div className="flex items-center bg-emerald-800 text-white rounded-lg p-0.5 shadow-xs">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQuantity(item.id, -1);
                }}
                className="w-7 h-7 flex items-center justify-center hover:bg-emerald-900 rounded cursor-pointer transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-7 text-center text-xs font-bold font-mono tabular-nums">
                {quantityInCart}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQuantity(item.id, 1);
                }}
                className="w-7 h-7 flex items-center justify-center hover:bg-emerald-900 rounded cursor-pointer transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(item);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
