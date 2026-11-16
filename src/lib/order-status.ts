import type { Order, OrderEvent, OrderStatus } from '../types';

export const ACTIVE_FULFILLMENT_STATUSES: readonly OrderStatus[] = [
  'preparing',
  'ready',
  'out_for_delivery',
];

export const AWAITING_KITCHEN_STATUSES: readonly OrderStatus[] = ['pending', 'accepted'];

export const ALL_IN_FLIGHT_STATUSES: readonly OrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'out_for_delivery',
];

const VALID_ORDER_STATUSES = new Set<OrderStatus>([
  'pending',
  'accepted',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
]);

const STATUS_LIFECYCLE_RANK: Record<OrderStatus, number> = {
  pending: 1,
  accepted: 2,
  preparing: 3,
  ready: 4,
  out_for_delivery: 5,
  delivered: 6,
  cancelled: 7,
};

/**
 * Safely convert ISO strings, epoch numbers, Date objects, or Firestore Timestamps
 * into epoch milliseconds (returns 0 on invalid/missing values, never NaN).
 */
export function parseTimestampMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : 0;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, any>;
    if (typeof obj.toDate === 'function') {
      const d = obj.toDate();
      const ms = d instanceof Date ? d.getTime() : NaN;
      return Number.isFinite(ms) ? ms : 0;
    }
    const seconds =
      typeof obj.seconds === 'number'
        ? obj.seconds
        : typeof obj._seconds === 'number'
        ? obj._seconds
        : null;
    if (seconds !== null) {
      const nanos =
        typeof obj.nanoseconds === 'number'
          ? obj.nanoseconds
          : typeof obj._nanoseconds === 'number'
          ? obj._nanoseconds
          : 0;
      return Math.round(seconds * 1000 + nanos / 1e6);
    }
  }
  return 0;
}

/**
 * Normalize timestamp-like values into a valid ISO-8601 string.
 */
export function normalizeTimestampToIso(value: unknown, fallbackIso?: string): string {
  const ms = parseTimestampMs(value);
  if (ms > 0) {
    return new Date(ms).toISOString();
  }
  if (fallbackIso) {
    const fbMs = parseTimestampMs(fallbackIso);
    if (fbMs > 0) return new Date(fbMs).toISOString();
  }
  return new Date(0).toISOString();
}

/**
 * Canonicalize an order status string (e.g. "PREPARING", "out-for-delivery", "out for delivery")
 * strictly into one of CookNow's canonical lowercase OrderStatus values.
 */
export function normalizeOrderStatus(rawStatus: unknown): OrderStatus {
  if (typeof rawStatus !== 'string') return 'pending';
  const cleaned = rawStatus
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (VALID_ORDER_STATUSES.has(cleaned as OrderStatus)) {
    return cleaned as OrderStatus;
  }
  return 'pending';
}

/**
 * Always calculate an order's current status directly from the latest order document's
 * `status` field — never from historical `events[]` entries.
 */
export function getLatestOrderStatus(order: Pick<Order, 'status'> | null | undefined): OrderStatus {
  if (!order) return 'pending';
  return normalizeOrderStatus(order.status);
}

/**
 * Normalize an entire Order document (Firestore Timestamp conversion, canonical `status`,
 * and preserved historical `events[]`).
 */
export function normalizeOrderDocument(id: string, raw: any): Order {
  const createdAt = normalizeTimestampToIso(raw?.createdAt, new Date().toISOString());
  const updatedAt = normalizeTimestampToIso(raw?.updatedAt || createdAt, createdAt);
  const currentStatus = normalizeOrderStatus(raw?.status);

  const normalizedEvents: OrderEvent[] = Array.isArray(raw?.events)
    ? raw.events.map((evt: any) => ({
        status: normalizeOrderStatus(evt?.status ?? currentStatus),
        timestamp: normalizeTimestampToIso(evt?.timestamp || createdAt, createdAt),
        note: typeof evt?.note === 'string' && evt.note.trim() ? evt.note : `Status: ${normalizeOrderStatus(evt?.status ?? currentStatus)}`,
      }))
    : [
        {
          status: currentStatus,
          timestamp: createdAt,
          note: `Order recorded with status ${currentStatus}.`,
        },
      ];

  return {
    ...(raw || {}),
    id: raw?.id || id,
    status: currentStatus,
    createdAt,
    updatedAt,
    ...(raw?.reconciledAt ? { reconciledAt: normalizeTimestampToIso(raw.reconciledAt, updatedAt) } : {}),
    events: normalizedEvents,
  } as Order;
}

/**
 * Active Orders strictly count live fulfillment states: PREPARING, READY, and OUT_FOR_DELIVERY.
 */
export function isActiveFulfillmentStatus(status: unknown): boolean {
  const normalized = normalizeOrderStatus(status);
  return (ACTIVE_FULFILLMENT_STATUSES as readonly string[]).includes(normalized);
}

export function isAwaitingKitchenStatus(status: unknown): boolean {
  const normalized = normalizeOrderStatus(status);
  return (AWAITING_KITCHEN_STATUSES as readonly string[]).includes(normalized);
}

export function isInFlightOrderStatus(status: unknown): boolean {
  const normalized = normalizeOrderStatus(status);
  return (ALL_IN_FLIGHT_STATUSES as readonly string[]).includes(normalized);
}

export function computeActiveOrders(orders: Order[]): Order[] {
  return orders.filter((order) => isActiveFulfillmentStatus(getLatestOrderStatus(order)));
}

export function computeAwaitingKitchenOrders(orders: Order[]): Order[] {
  return orders.filter((order) => isAwaitingKitchenStatus(getLatestOrderStatus(order)));
}

export interface ActivityStreamEventItem {
  key: string;
  orderId: string;
  kitchenName: string;
  customerName: string;
  currentOrderStatus: OrderStatus;
  eventStatus: OrderStatus;
  timestampIso: string;
  timestampMs: number;
  note: string;
  eventIndex: number;
}

/**
 * Build a flattened, newest-first Activity Stream across orders while preserving all historical
 * events (PENDING, ACCEPTED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, CANCELLED) and
 * exposing the order's current live status from the latest Firestore document alongside each event.
 */
export function buildActivityStreamEvents(orders: Order[]): ActivityStreamEventItem[] {
  const items: ActivityStreamEventItem[] = [];

  for (const order of orders) {
    const currentOrderStatus = getLatestOrderStatus(order);
    const events = Array.isArray(order.events) ? order.events : [];

    events.forEach((evt, idx) => {
      const eventStatus = normalizeOrderStatus(evt.status);
      const timestampIso = normalizeTimestampToIso(evt.timestamp || order.updatedAt || order.createdAt);
      const timestampMs = parseTimestampMs(timestampIso);

      items.push({
        key: `${order.id}-${idx}-${timestampIso}-${eventStatus}`,
        orderId: order.id,
        kitchenName: order.kitchenName || 'Home Kitchen',
        customerName: order.customerName || 'Customer',
        currentOrderStatus,
        eventStatus,
        timestampIso,
        timestampMs,
        note: evt.note || `Status updated to ${eventStatus}`,
        eventIndex: idx,
      });
    });
  }

  items.sort((a, b) => {
    if (b.timestampMs !== a.timestampMs) {
      return b.timestampMs - a.timestampMs;
    }
    if (a.orderId === b.orderId) {
      if (b.eventIndex !== a.eventIndex) {
        return b.eventIndex - a.eventIndex;
      }
      return (STATUS_LIFECYCLE_RANK[b.eventStatus] || 0) - (STATUS_LIFECYCLE_RANK[a.eventStatus] || 0);
    }
    return b.orderId.localeCompare(a.orderId);
  });

  return items;
}

export function formatOrderStatusLabel(status: unknown): string {
  return normalizeOrderStatus(status).replace(/_/g, ' ').toUpperCase();
}
