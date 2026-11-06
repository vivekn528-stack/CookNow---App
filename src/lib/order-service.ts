import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions, getFirebaseAuth } from './firebase';
import type { Order, CartItem, PaymentMethod } from '../types';

export interface PlaceOrderPayload {
  cookId: string;
  items: {
    menuItemId: string;
    quantity: number;
  }[];
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
  };
  deliveryInstructions?: string;
}

export interface PlaceOrderResponse {
  success: boolean;
  order: Order | null;
  error: string | null;
  fromServerFunction: boolean;
}

/**
 * Client Order Placement Service
 *
 * Strict Server-Authoritative Architecture:
 * - Invokes the secure Firebase Callable Cloud Function (placeOrder).
 * - Direct Web SDK client-side order creation is completely disabled.
 * - If the Cloud Function is unavailable or rejects the request, a clear error is returned
 *   and the user's cart, coupon, and checkout details are safely preserved without data loss.
 */
export async function placeCustomerOrder(
  payload: PlaceOrderPayload,
  _clientOrderDraft?: Order
): Promise<PlaceOrderResponse> {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;

  if (!currentUser) {
    return {
      success: false,
      order: null,
      error: 'Google Sign-In is required to secure your order.',
      fromServerFunction: false,
    };
  }

  const functions = getFirebaseFunctions();

  if (!functions) {
    return {
      success: false,
      order: null,
      error:
        'Firebase Cloud Functions service is uninitialized. The secure order placement backend is unavailable. Your cart and checkout details have been safely preserved.',
      fromServerFunction: false,
    };
  }

  try {
    const placeOrderCallable = httpsCallable<PlaceOrderPayload, { success: boolean; order: Order }>(
      functions,
      'placeOrder'
    );

    const result = await placeOrderCallable(payload);
    if (result.data?.success && result.data.order) {
      return {
        success: true,
        order: result.data.order,
        error: null,
        fromServerFunction: true,
      };
    }

    return {
      success: false,
      order: null,
      error: 'Order could not be confirmed by the server backend. Please retry.',
      fromServerFunction: true,
    };
  } catch (err: any) {
    const isNotDeployed =
      err?.code === 'functions/not-found' ||
      err?.code === 'not-found' ||
      err?.message?.includes('not found') ||
      err?.message?.includes('404');

    if (isNotDeployed) {
      return {
        success: false,
        order: null,
        error:
          'The server-authoritative order backend (Cloud Functions "placeOrder") is currently undergoing deployment or unavailable on project cooknow-9444c. Direct Web SDK order creation is disabled for financial safety. Your cart items, coupon, and delivery address are completely preserved.',
        fromServerFunction: true,
      };
    }

    // Genuine business, validation, or authentication failure from the Cloud Function
    return {
      success: false,
      order: null,
      error: err?.message || 'Server rejected order request. Please review your order details.',
      fromServerFunction: true,
    };
  }
}

