export type UserRole = 'customer' | 'cook' | 'delivery' | 'admin';

export type DietaryType = 'pure_veg' | 'egg' | 'non_veg';

export type VerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended';

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cod' | 'upi_online';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';

export type PartnerType = 'home_cook' | 'restaurant';

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  createdAt: string;
}

export interface Cook {
  id: string;
  userId: string;
  kitchenName: string;
  ownerName: string;
  phone: string;
  bio: string;
  address: string;
  locality: string;
  city: string;
  state: string;
  fssaiNumber?: string;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  partnerType: PartnerType;
  avatarUrl: string;
  bannerUrl?: string;
  rating: number;
  reviewCount: number;
  specialty: string;
  deliveryTimeMin: number;
  deliveryTimeMax: number;
  isAcceptingOrders: boolean;
  operatingHours?: string;
  dailyCapacity?: number;
  createdAt: string;
}

export interface MenuItem {
  id: string;
  cookId: string;
  name: string;
  description: string;
  price: number;
  category:
    | 'Daily Tiffin'
    | 'Pahadi Specials'
    | 'North Indian'
    | 'Parathas'
    | 'Student Thali'
    | 'Snacks'
    | 'Desserts';
  dietaryType: DietaryType;
  prepTimeMinutes: number;
  isAvailable: boolean;
  imageUrl: string;
  portionSize: string;
  spiceLevel?: 'Mild' | 'Medium' | 'Spicy';
  isStudentSpecial?: boolean;
  studentMealTier?: 'mini_49' | 'regular_69' | 'full_79';
  createdAt: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  instructions?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  dietaryType: DietaryType;
}

export interface OrderEvent {
  status: OrderStatus;
  timestamp: string;
  note: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  cookId: string;
  kitchenName: string;
  status: OrderStatus;
  items: OrderItem[];
  itemsSubtotal: number;
  deliveryFee: number;
  platformFee: number;
  packagingFee: number;
  discount: number;
  discountCode?: string;
  discountFunding?: 'cooknow_funded' | 'restaurant_funded' | 'shared_funded';
  finalPayableAmount: number;
  platformCommission: number;
  cookEarnings: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryPartnerId?: string;
  deliveryPartnerName?: string;
  deliveryStatus?: 'unassigned' | 'assigned' | 'picked_up' | 'out_for_delivery' | 'delivered';
  deliveryAddress: {
    fullName: string;
    phone: string;
    locality: string;
    addressLine: string;
    landmark?: string;
    hostelOrPgName?: string;
  };
  deliveryInstructions?: string;
  cancellationReason?: string;
  events: OrderEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string; // Internal record
  isAnonymous: boolean; // Displayed as Anonymous Customer to public/partners
  cookId: string;
  rating: number; // 1 - 5
  comment: string;
  isReported: boolean;
  createdAt: string;
}

export interface CookVerificationRequest {
  id: string;
  cookId: string;
  applicantName: string;
  kitchenName: string;
  phone: string;
  locality: string;
  fssaiNumber: string;
  idProofType: 'Aadhaar' | 'PAN' | 'Voter ID' | 'FSSAI Certificate';
  idProofNumber: string;
  kitchenPhotos?: string[];
  status: VerificationStatus;
  reviewerNotes?: string;
  submittedAt: string;
}

export interface PartnerApplication {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  locality: string;
  partnerType: PartnerType;
  foodCategories: string[];
  sampleMenu: string;
  expectedPriceRange: string;
  operatingHours: string;
  dailyCapacity: number;
  fssaiNumber: string;
  idProofType: 'Aadhaar' | 'PAN' | 'FSSAI Certificate';
  idProofNumber: string;
  kitchenPhotos?: string[];
  status: VerificationStatus;
  reviewerReason?: string;
  reviewedBy?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface DeliveryPartner {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  serviceArea: string;
  workingHours: string;
  vehicleType: 'Bicycle' | 'Motorcycle' | 'Scooter' | 'Electric Vehicle';
  vehicleNumber?: string;
  drivingLicenseNumber?: string;
  aadhaarNumber: string;
  status: VerificationStatus;
  reviewerNotes?: string;
  isAvailable: boolean;
  rating: number;
  totalDeliveries: number;
  earningsBalance: number;
  bankAccountMasked?: string;
  activeOrderId?: string;
  createdAt: string;
}

export type MealPlanType =
  | 'monthly_lunch'
  | 'monthly_dinner'
  | 'monthly_lunch_dinner'
  | 'student_budget'
  | 'pahadi_special'
  | 'weekly_flex';

export interface MealPlan {
  id: string;
  providerId: string;
  providerName: string;
  title: string;
  description: string;
  planType: MealPlanType;
  pricePerMonth: number;
  mealsCount: number;
  durationDays: number;
  mealSchedule: 'Lunch (12:30 PM - 2:00 PM)' | 'Dinner (7:30 PM - 9:30 PM)' | 'Both Lunch & Dinner';
  serviceArea: string;
  isAvailable: boolean;
  sampleMenuHighlights: string[];
  pausesAllowed: number;
  createdAt: string;
}

export interface CustomerSubscription {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  planId: string;
  planTitle: string;
  providerId: string;
  providerName: string;
  startDate: string;
  endDate: string;
  totalMeals: number;
  mealsDelivered: number;
  mealsRemaining: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  deliveryAddress: {
    hostelOrPgName?: string;
    addressLine: string;
    locality: string;
  };
  pauseDates: string[];
  pausesRemaining: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  createdAt: string;
}

export type DiscountFundingSource = 'cooknow_funded' | 'restaurant_funded' | 'shared_funded';

export interface Promotion {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number; // e.g. 15 for 15% or 50 for ₹50
  minOrderValue: number;
  maxDiscountCap: number;
  startDate: string;
  endDate: string;
  eligibleCategory?: string;
  fundingSource: DiscountFundingSource;
  partnerSharePercent?: number; // e.g. 50 for shared
  usageLimit: number;
  currentUsageCount: number;
  perCustomerLimit: number;
  budgetLimit: number;
  spentBudget: number;
  isActive: boolean;
}

export interface Complaint {
  id: string;
  orderId: string;
  customerId: string;
  customerAnonymousTag: string; // e.g. "Anonymous Student #104"
  customerRealNamePrivate: string; // Protected, accessible only by verified owner
  customerPhonePrivate: string;
  providerId: string;
  providerName: string;
  deliveryPartnerId?: string;
  category: 'food_quality' | 'missing_items' | 'late_delivery' | 'packaging_damaged' | 'other';
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  resolutionNotes?: string;
  refundIssued: number;
  createdAt: string;
  resolvedAt?: string;
}

export interface OperatingExpense {
  id: string;
  date: string;
  category:
    | 'logistics_partner_payout'
    | 'packaging_subsidies'
    | 'marketing_student_camps'
    | 'ops_hygiene_inspection'
    | 'software_platform'
    | 'payment_gateway_fees'
    | 'other';
  description: string;
  amount: number;
  recordedBy: string;
}

export interface PlatformSettings {
  commissionRatePercent: number; // default 15
  standardDeliveryFee: number; // default ₹25
  freeDeliveryThreshold: number; // default ₹250
  platformServiceFee: number; // default ₹5
  packagingFee: number; // default ₹10
  launchLocality: string; // "Nalapani Chowk, Dehradun"
  supportPhone: string;
  supportEmail: string;
}

export interface Address {
  id: string;
  userId: string;
  label: 'Hostel/PG' | 'Home' | 'Office' | 'Other';
  hostelOrPgName?: string;
  roomOrFlat?: string;
  addressLine: string;
  landmark: string;
  locality: string;
  city: string;
  pincode: string;
  isDefault: boolean;
}
