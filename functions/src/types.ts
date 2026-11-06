export type DietaryType = 'pure_veg' | 'egg' | 'non_veg';
export type PaymentMethod = 'cod' | 'upi_online';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';
export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface ClientOrderItem {
  menuItemId: string;
  quantity: number;
}

export interface PlaceOrderRequest {
  items: ClientOrderItem[];
  cookId: string;
  promoCode?: string;
  paymentMethod: PaymentMethod;
  idempotencyKey?: string;
  deliveryAddress: {
    fullName: string;
    phone: string;
    locality: string;
    addressLine: string;
    landmark?: string;
    hostelOrPgName?: string;
    postalCode?: string;
  };
  deliveryInstructions?: string;
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

export interface CanonicalOrder {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  cookId: string;
  cookUserId?: string;
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
  deliveryStatus: 'unassigned' | 'assigned' | 'picked_up' | 'out_for_delivery' | 'delivered';
  deliveryAddress: {
    fullName: string;
    phone: string;
    locality: string;
    addressLine: string;
    landmark?: string;
    hostelOrPgName?: string;
  };
  deliveryInstructions?: string;
  idempotencyKey?: string;
  events: OrderEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface Promotion {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  maxDiscountCap: number;
  startDate: string;
  endDate: string;
  eligibleCategory?: string;
  fundingSource: 'cooknow_funded' | 'restaurant_funded' | 'shared_funded';
  partnerSharePercent?: number;
  usageLimit: number;
  currentUsageCount: number;
  perCustomerLimit: number;
  budgetLimit: number;
  spentBudget: number;
  isActive: boolean;
}

export interface PlatformSettings {
  freeDeliveryThreshold: number;
  standardDeliveryFee: number;
  platformServiceFee: number;
  packagingFee: number;
  commissionRatePercent: number;
}
