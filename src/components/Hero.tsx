import React from 'react';
import { Search, MapPin, Sparkles, Clock, CheckCircle2 } from 'lucide-react';

import { HERO_BANNER_IMAGE } from '../lib/image-registry';

interface HeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  localityFilter: string;
  onLocalityChange: (locality: string) => void;
}

const CATEGORIES = [
  'All Meals',
  'Daily Tiffin',
  'Pahadi Specials',
  'North Indian',
  'Parathas',
  'Desserts',
];

export const Hero: React.FC<HeroProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  localityFilter,
  onLocalityChange,
}) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-stone-100/70 via-[#FDFBF7] to-[#FDFBF7] pt-8 pb-10 border-b border-stone-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Mission, Value proposition & Search */}
          <div className="lg:col-span-7 space-y-6">
            {/* Unboxed regional locator & kicker */}
            <div className="flex items-center gap-2 text-xs font-medium text-stone-500 tracking-wide uppercase">
              <span className="flex items-center gap-1 text-emerald-800 font-semibold">
                <MapPin className="w-3.5 h-3.5" />
                Nalapani Chowk, Dehradun
              </span>
              <span aria-hidden="true">·</span>
              <span>Initial Uttarakhand Pilot</span>
              <span aria-hidden="true">·</span>
              <span>Hostel & PG Friendly</span>
            </div>

            {/* Balanced Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-stone-900 leading-[1.15]" style={{ textWrap: 'balance' }}>
              Fresh home-cooked meals by verified neighborhood mothers & cooks.
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-stone-600 max-w-2xl leading-relaxed">
              Wholesome, low-oil, motherly food cooked in clean residential kitchens. Specially tailored for college students, PG residents, and working professionals in Nalapani Chowk and Raipur Road.
            </p>

            {/* Search and Locality Bar */}
            <div className="bg-white rounded-xl shadow-xs border border-stone-200/90 p-2 sm:p-2.5 flex flex-col sm:flex-row gap-2 max-w-2xl">
              <div className="relative flex-1 flex items-center">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search Mandua roti, Rajma Chawal, Parathas, cook..."
                  className="w-full pl-9 pr-3 py-2 text-sm text-stone-900 placeholder-stone-400 bg-transparent focus:outline-none"
                />
              </div>

              <div className="h-px sm:h-auto sm:w-px bg-stone-200" />

              <div className="flex items-center px-2">
                <select
                  value={localityFilter}
                  onChange={(e) => onLocalityChange(e.target.value)}
                  aria-label="Filter by locality"
                  className="text-xs font-medium text-stone-700 bg-transparent focus:outline-none cursor-pointer py-1.5"
                >
                  <option value="all">All Dehradun Hubs</option>
                  <option value="Nalapani Chowk">Nalapani Chowk</option>
                  <option value="Raipur Road">Raipur Road / Tapovan</option>
                  <option value="Sahastradhara Road">Sahastradhara Road</option>
                </select>
              </div>
            </div>

            {/* Category Filter Buttons (Functional Segmented Tabs) */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-stone-500">Popular Categories</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => onSelectCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Unboxed Trust Points */}
            <div className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-stone-600">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Physical Kitchen & Hygiene Inspected
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                100% Home Cooked (No commercial preservatives)
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-700" />
                Prepared fresh on order (20–35 min)
              </span>
            </div>
          </div>

          {/* Right Column: Hero Visual Asset Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-stone-200 bg-stone-900 group">
              <img
                src={HERO_BANNER_IMAGE}
                alt="Fresh authentic Indian homestyle meal prepared by local cooks in Dehradun"
                className="w-full h-[320px] sm:h-[380px] object-cover group-hover:scale-102 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
              
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <div className="flex items-center gap-2 text-xs text-amber-300 font-medium mb-1">
                  <span>Sunita Rawat's Kitchen</span>
                  <span aria-hidden="true">·</span>
                  <span>Nalapani Chowk</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold">
                  "Pure Pahadi Thali with Mandua Roti & Chainsoo Dal"
                </h3>
                <p className="text-xs text-stone-300 mt-1">
                  Cooked in small batches with cold-pressed mustard oil and hand-crushed mountain spices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
