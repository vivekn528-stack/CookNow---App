import { getFirebaseAuth } from './firebase';
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
 * - Invokes the secure Express backend (/api/orders/place) with verified Firebase ID token.
 * - Direct Web SDK client-side order creation is completely disabled.
 * - Server cryptographically validates prices, quantities, cook verification, coupon limits, and idempotency.
 * - If the server rejects the request, a clear error is returned
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

  let idToken = '';
  try {
    idToken = await currentUser.getIdToken();
  } catch (err: any) {
    return {
      success: false,
      order: null,
      error: 'Failed to retrieve authentication token. Please sign in again.',
      fromServerFunction: false,
    };
  }

  try {
    const res = await fetch('/api/orders/place', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });

    const rawText = await res.text();
    let data: any = null;
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }
    }

    if (res.ok && data?.success && data.order) {
      return {
        success: true,
        order: data.order,
        error: null,
        fromServerFunction: true,
      };
    }

    const extractedError =
      data?.error ||
      data?.message ||
      `Backend returned HTTP ${res.status}${res.statusText ? ` (${res.statusText})` : ''}. Please retry.`;

    console.error('[OrderService] Server rejected order placement:', {
      status: res.status,
      error: extractedError,
    });

    return {
      success: false,
      order: null,
      error: extractedError,
      fromServerFunction: true,
    };
  } catch (err: any) {
    const message = err?.message || 'Network error communicating with order backend.';
    console.error('[OrderService] Network error during order placement:', message);
    return {
      success: false,
      order: null,
      error: message,
      fromServerFunction: true,
    };
  }
}

/**
 * Synchronize order status transitions with the server-authoritative backend.
 */
export async function updateOrderStatusOnServer(
  orderId: string,
  status: string,
  options?: { cancellationReason?: string; partnerId?: string; partnerName?: string }
): Promise<{ success: boolean; order?: Order; error?: string }> {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    return { success: false, error: 'Authentication required.' };
  }

  try {
    const idToken = await currentUser.getIdToken();
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        status,
        cancellationReason: options?.cancellationReason,
        partnerId: options?.partnerId,
        partnerName: options?.partnerName,
      }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.success) {
      return { success: true, order: data.order };
    }
    return {
      success: false,
      error: data?.error || `Server returned HTTP ${res.status}`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error updating order status.' };
  }
}

/**
 * Fetch authenticated customer's own orders from server-authoritative backend
 */
export async function fetchCustomerOrders(): Promise<{
  success: boolean;
  orders: Order[];
  error?: string;
}> {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;

  if (!currentUser) {
    return { success: false, orders: [] };
  }

  try {
    const idToken = await currentUser.getIdToken();
    const res = await fetch('/api/orders/my-orders', {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, orders: [], error: err.error || 'Failed to fetch orders' };
    }

    const data = await res.json();
    return { success: true, orders: data.orders || [] };
  } catch (err: any) {
    return { success: false, orders: [], error: err.message };
  }
}
