import React, { useState } from 'react';
import { X, Store, ChefHat, CheckCircle2, AlertCircle, FileText, Upload } from 'lucide-react';
import { PartnerApplication, PartnerType } from '../types';

interface PartnerWithUsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitApplication: (app: PartnerApplication) => void;
}

export const PartnerWithUsModal: React.FC<PartnerWithUsModalProps> = ({
  isOpen,
  onClose,
  onSubmitApplication,
}) => {
  const [partnerType, setPartnerType] = useState<PartnerType>('home_cook');
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [locality, setLocality] = useState('Nalapani Chowk');
  const [foodCategories, setFoodCategories] = useState<string[]>(['Daily Tiffin']);
  const [sampleMenu, setSampleMenu] = useState('');
  const [expectedPriceRange, setExpectedPriceRange] = useState('₹70 - ₹140');
  const [operatingHours, setOperatingHours] = useState('11:00 AM - 9:30 PM');
  const [dailyCapacity, setDailyCapacity] = useState('50');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [idProofType, setIdProofType] = useState<'Aadhaar' | 'PAN' | 'FSSAI Certificate'>('Aadhaar');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleCategoryToggle = (cat: string) => {
    setFoodCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!businessName.trim() || !ownerName.trim()) {
      setError('Please provide business/kitchen name and owner name.');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian phone number (e.g. 9876543210).');
      return;
    }

    if (!address.trim()) {
      setError('Please enter your kitchen/restaurant location in Dehradun.');
      return;
    }

    if (foodCategories.length === 0) {
      setError('Please select at least one food category.');
      return;
    }

    const newApp: PartnerApplication = {
      id: `papp-${Date.now()}`,
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      phone: cleanPhone,
      email: email.trim() || `${cleanPhone}@cooknow-partner.in`,
      address: address.trim(),
      locality,
      partnerType,
      foodCategories,
      sampleMenu: sampleMenu.trim() || 'Daily fresh homestyle thali and seasonal sabzi.',
      expectedPriceRange,
      operatingHours,
      dailyCapacity: Number(dailyCapacity) || 40,
      fssaiNumber: fssaiNumber.trim() || 'Pending Registration',
      idProofType,
      idProofNumber: idProofNumber.trim() || 'VERIF-PENDING',
      status: 'pending',
      reviewerReason: 'Application submitted via Partner Portal. Awaiting Dehradun Operations physical inspection.',
      submittedAt: new Date().toISOString(),
    };

    onSubmitApplication(newApp);
    setIsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs p-5 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Partner With CookNow</h2>
              <p className="text-xs text-stone-500">
                Join our verified home-cook and restaurant network in Nalapani Chowk & Dehradun
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {isSubmitted ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-stone-900">
                Partnership Application Received!
              </h3>
              <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                Thank you, <strong>{ownerName}</strong>! Your application for <strong>{businessName}</strong> has been logged with status <em>Pending Verification</em>. Founder Vivek Singh Negi and the Dehradun Operations Team will contact you within 24–48 hours for hygiene and menu inspection.
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Partner Type Selection */}
              <div>
                <label className="block font-bold text-stone-700 mb-1.5 uppercase tracking-wider text-[11px]">
                  Partner Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      partnerType === 'home_cook'
                        ? 'bg-emerald-50/70 border-emerald-700 text-emerald-950 font-bold'
                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pType"
                      checked={partnerType === 'home_cook'}
                      onChange={() => setPartnerType('home_cook')}
                      className="text-emerald-800"
                    />
                    <ChefHat className="w-4 h-4 text-emerald-700" />
                    <span>Home Cook / Mother's Kitchen</span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      partnerType === 'restaurant'
                        ? 'bg-emerald-50/70 border-emerald-700 text-emerald-950 font-bold'
                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pType"
                      checked={partnerType === 'restaurant'}
                      onChange={() => setPartnerType('restaurant')}
                      className="text-emerald-800"
                    />
                    <Store className="w-4 h-4 text-emerald-700" />
                    <span>Selected Local Restaurant</span>
                  </label>
                </div>
              </div>

              {/* Basic Business Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    {partnerType === 'home_cook' ? 'Kitchen Name *' : 'Restaurant Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder={partnerType === 'home_cook' ? "e.g. Maya's Pahadi Rasoi" : 'e.g. Doon Bhojanalaya'}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Owner / Primary Cook Name *</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Maya Devi Rawat"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Mobile Phone (10 digits) *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="partner@gmail.com"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              {/* Location & Service Hub */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-stone-700 mb-1">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. House 18, Lane 2, Upper Nalapani Road"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Service Hub *</label>
                  <select
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                  >
                    <option value="Nalapani Chowk">Nalapani Chowk (Central)</option>
                    <option value="Raipur Road">Raipur Road / Tapovan</option>
                    <option value="Sahastradhara Road">Sahastradhara Road</option>
                    <option value="Karanpur">Karanpur / DIT Corridor</option>
                  </select>
                </div>
              </div>

              {/* Categories */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1.5">
                  Food Categories Offered *
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Pahadi Specials',
                    'Daily Tiffin',
                    'Student Thali',
                    'North Indian',
                    'Parathas',
                    'Desserts',
                  ].map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => handleCategoryToggle(cat)}
                      className={`px-3 py-1.5 rounded-lg border font-medium cursor-pointer transition-colors ${
                        foodCategories.includes(cat)
                          ? 'bg-emerald-800 text-white border-emerald-900 shadow-2xs'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sample Menu & Proposed Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Sample Signature Dishes
                  </label>
                  <textarea
                    rows={2}
                    value={sampleMenu}
                    onChange={(e) => setSampleMenu(e.target.value)}
                    placeholder="e.g. Gahat dal with Mandua rotis, Rajma chawal, Mini student thali"
                    className="w-full px-3 py-1.5 border border-stone-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Expected Meal Price Range & Daily Capacity
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={expectedPriceRange}
                      onChange={(e) => setExpectedPriceRange(e.target.value)}
                      placeholder="₹60 - ₹120"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                    />
                    <input
                      type="number"
                      value={dailyCapacity}
                      onChange={(e) => setDailyCapacity(e.target.value)}
                      placeholder="Max 50 orders/day"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Verification Credentials */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-3">
                <div className="font-bold text-stone-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-800" />
                  <span>Food Safety & Identity Verification</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-stone-600 mb-1">
                      FSSAI Registration / Application No.
                    </label>
                    <input
                      type="text"
                      value={fssaiNumber}
                      onChange={(e) => setFssaiNumber(e.target.value)}
                      placeholder="e.g. 22623001000994 (or 'Need assistance')"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-stone-600 mb-1">
                      ID Proof Number (Aadhaar / PAN)
                    </label>
                    <input
                      type="text"
                      value={idProofNumber}
                      onChange={(e) => setIdProofNumber(e.target.value)}
                      placeholder="XXXX-XXXX-1234"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-stone-500">
                  CookNow assists home cooks in obtaining government FSSAI registration free of charge during onboarding.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Submit Partner Application
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
