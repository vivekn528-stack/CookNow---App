import React, { useState } from 'react';
import { X, Bike, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { DeliveryPartner } from '../types';

interface DeliveryPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitApplication: (partner: DeliveryPartner) => void;
}

export const DeliveryPartnerModal: React.FC<DeliveryPartnerModalProps> = ({
  isOpen,
  onClose,
  onSubmitApplication,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [serviceArea, setServiceArea] = useState('Nalapani Chowk & Raipur Road');
  const [workingHours, setWorkingHours] = useState('11:00 AM - 10:00 PM (Full Day)');
  const [vehicleType, setVehicleType] = useState<'Bicycle' | 'Motorcycle' | 'Scooter' | 'Electric Vehicle'>('Motorcycle');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [drivingLicenseNumber, setDrivingLicenseNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [bankAccountMasked, setBankAccountMasked] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Please provide your full legal name.');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!aadhaarNumber.trim() || aadhaarNumber.trim().length < 8) {
      setError('Please enter Aadhaar document number for identity verification.');
      return;
    }

    const newPartner: DeliveryPartner = {
      id: `dp-${Date.now()}`,
      userId: `user-dp-${Date.now()}`,
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: email.trim() || `${cleanPhone}@cooknow-rider.in`,
      serviceArea,
      workingHours,
      vehicleType,
      vehicleNumber: vehicleNumber.trim() || undefined,
      drivingLicenseNumber: drivingLicenseNumber.trim() || undefined,
      aadhaarNumber: aadhaarNumber.trim(),
      status: 'pending',
      reviewerNotes: 'Application submitted via Delivery Partner Portal. Pending background and vehicle check.',
      isAvailable: false,
      rating: 5.0,
      totalDeliveries: 0,
      earningsBalance: 0,
      bankAccountMasked: bankAccountMasked.trim() || 'Awaiting bank details',
      createdAt: new Date().toISOString(),
    };

    onSubmitApplication(newPartner);
    setIsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs p-5 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Become a Delivery Partner</h2>
              <p className="text-xs text-stone-500">
                Deliver wholesome meals in Nalapani Chowk & earn direct payout per delivery
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

        {/* Content */}
        <div className="p-6">
          {isSubmitted ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-stone-900">
                Rider Application Submitted!
              </h3>
              <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                Thank you, <strong>{fullName}</strong>. Your delivery partner profile is currently marked <em>Pending Verification</em>. Once the operations team verifies your identity and vehicle, your account will be activated to accept deliveries.
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
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Rawat"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700"
                  />
                </div>

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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Service Area Hub</label>
                  <select
                    value={serviceArea}
                    onChange={(e) => setServiceArea(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                  >
                    <option value="Nalapani Chowk & Raipur Road">Nalapani Chowk & Raipur Road</option>
                    <option value="Sahastradhara Road & Tapovan">Sahastradhara Road & Tapovan</option>
                    <option value="Karanpur & DIT Corridor">Karanpur & DIT Corridor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Working Hours Shift</label>
                  <select
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                  >
                    <option value="11:00 AM - 10:00 PM (Full Day)">11:00 AM - 10:00 PM (Full Day)</option>
                    <option value="12:00 PM - 3:30 PM (Lunch Shift)">12:00 PM - 3:30 PM (Lunch Shift)</option>
                    <option value="6:30 PM - 10:30 PM (Dinner Shift)">6:30 PM - 10:30 PM (Dinner Shift)</option>
                    <option value="Weekend Flexible">Weekend Flexible</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                  >
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Electric Vehicle">Electric Vehicle (EV)</option>
                    <option value="Bicycle">Bicycle</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Vehicle Reg. Number</label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="UK-07-XX-1234"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Driving License Number</label>
                  <input
                    type="text"
                    value={drivingLicenseNumber}
                    onChange={(e) => setDrivingLicenseNumber(e.target.value)}
                    placeholder="UK072023000XXXX"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Aadhaar Number (12 digits) *</label>
                  <input
                    type="text"
                    required
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value)}
                    placeholder="XXXX-XXXX-1234"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-xs space-y-1">
                <div className="font-bold text-stone-800">Partner Earnings:</div>
                <div className="text-stone-600">
                  • Flat ₹25 guaranteed payout per completed delivery directly to your UPI/bank.
                </div>
                <div className="text-stone-600">
                  • Thermal bag & ID badge provided at Nalapani operations hub upon approval.
                </div>
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
                  Submit Registration
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
