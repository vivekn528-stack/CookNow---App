import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Cook,
  MenuItem,
  Order,
  OrderStatus,
  Review,
  PlatformSettings,
  PartnerApplication,
  DeliveryPartner,
  MealPlan,
  CustomerSubscription,
  Promotion,
  Complaint,
  OperatingExpense,
  VerificationStatus,
} from '../types';

// Supabase Configuration Management & Dynamic Diagnostics
function resolveConfig() {
  const localUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('cooknow_supabase_url') : null;
  const localKey = typeof localStorage !== 'undefined' ? localStorage.getItem('cooknow_supabase_anon_key') : null;

  let url = (localUrl || import.meta.env.VITE_SUPABASE_URL || '').trim();
  let anonKey = (localKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  // If user entered only project ref e.g. "xyzabcdefghij"
  if (
    url &&
    !url.startsWith('http://') &&
    !url.startsWith('https://') &&
    !url.startsWith('sb_') &&
    !url.startsWith('eyJ')
  ) {
    url = `https://${url}.supabase.co`;
  }
  url = url.replace(/\/+$/, '');

  return { url, anonKey };
}

let activeConfig = resolveConfig();

export interface SupabaseDiagnostics {
  isConfigured: boolean;
  status: 'connected' | 'unconfigured' | 'publishable_key_in_url' | 'malformed_url';
  url: string;
  anonKey: string;
  message: string;
}

export const getSupabaseDiagnostics = (customUrl?: string, customKey?: string): SupabaseDiagnostics => {
  const url = (customUrl !== undefined ? customUrl : activeConfig.url).trim();
  const anonKey = (customKey !== undefined ? customKey : activeConfig.anonKey).trim();

  if (url.startsWith('sb_') || url.startsWith('eyJ')) {
    return {
      isConfigured: false,
      status: 'publishable_key_in_url',
      url,
      anonKey,
      message: `API Key ('${url.slice(0, 15)}...') found in VITE_SUPABASE_URL instead of your Supabase Project URL ('https://<project-ref>.supabase.co').`,
    };
  }

  if (!url) {
    return {
      isConfigured: false,
      status: 'unconfigured',
      url,
      anonKey,
      message: 'VITE_SUPABASE_URL is unconfigured in .env.',
    };
  }

  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    return {
      isConfigured: false,
      status: 'malformed_url',
      url,
      anonKey,
      message: 'VITE_SUPABASE_URL must be a valid HTTPS URL (format: https://<project-ref>.supabase.co).',
    };
  }

  if (url.includes('your-project') || anonKey === 'your-anon-public-key') {
    return {
      isConfigured: false,
      status: 'unconfigured',
      url,
      anonKey,
      message: 'Supabase credentials contain template placeholder values.',
    };
  }

  if (!anonKey || anonKey.length < 20) {
    return {
      isConfigured: false,
      status: 'unconfigured',
      url,
      anonKey,
      message: 'VITE_SUPABASE_ANON_KEY is missing or too short.',
    };
  }

  return {
    isConfigured: true,
    status: 'connected',
    url,
    anonKey,
    message: 'Supabase configuration is valid.',
  };
};

export const isSupabaseConfigured = (): boolean => {
  return getSupabaseDiagnostics().isConfigured;
};

export const getSupabaseConfig = () => ({ ...activeConfig });

export let supabase: SupabaseClient | null = null;

export const initSupabaseClient = (url?: string, anonKey?: string): SupabaseClient | null => {
  if (url !== undefined && anonKey !== undefined) {
    let cleanUrl = url.trim();
    if (
      cleanUrl &&
      !cleanUrl.startsWith('http://') &&
      !cleanUrl.startsWith('https://') &&
      !cleanUrl.startsWith('sb_') &&
      !cleanUrl.startsWith('eyJ')
    ) {
      cleanUrl = `https://${cleanUrl}.supabase.co`;
    }
    cleanUrl = cleanUrl.replace(/\/+$/, '');
    activeConfig = { url: cleanUrl, anonKey: anonKey.trim() };

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cooknow_supabase_url', cleanUrl);
      localStorage.setItem('cooknow_supabase_anon_key', anonKey.trim());
    }
  } else {
    activeConfig = resolveConfig();
  }

  const diag = getSupabaseDiagnostics();
  if (diag.isConfigured) {
    try {
      supabase = createClient(activeConfig.url, activeConfig.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      return supabase;
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      supabase = null;
      return null;
    }
  } else {
    supabase = null;
    return null;
  }
};

// Auto-initialize on module load
initSupabaseClient();

export const hydrateSupabaseFromPublicApi = async (): Promise<boolean> => {
  try {
    const res = await fetch('/api/config/public-client');
    if (!res.ok) return isSupabaseConfigured();
    const data = await res.json();
    if (data?.supabase?.url && data?.supabase?.anonKey && data?.supabase?.isValidConfig) {
      initSupabaseClient(data.supabase.url, data.supabase.anonKey);
      return true;
    }
  } catch {
    // Non-fatal
  }
  return isSupabaseConfigured();
};

export const saveSupabaseConfigToServer = async (
  url: string,
  anonKey: string
): Promise<{
  success: boolean;
  connected: boolean;
  message: string;
  tableNeedsMigration?: boolean;
  stage?: string;
  code?: string;
  diagnosis?: string;
  solution?: string;
  dashboardUrl?: string;
}> => {
  try {
    const res = await fetch('/api/config/supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, anonKey }),
    });
    const result = await res.json();
    if (res.ok && result.success) {
      initSupabaseClient(result.url, result.anonKey);
      return {
        success: true,
        connected: Boolean(result.connected),
        message: result.message,
        tableNeedsMigration: result.tableNeedsMigration,
        stage: result.stage,
        code: result.code,
        diagnosis: result.diagnosis,
        solution: result.solution,
        dashboardUrl: result.dashboardUrl,
      };
    }
    return {
      success: false,
      connected: false,
      message: result.message || result.error || 'Failed to save configuration to server.',
      stage: result.stage,
      code: result.code,
      diagnosis: result.diagnosis,
      solution: result.solution,
      dashboardUrl: result.dashboardUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      connected: false,
      message: err.message || 'Network error saving Supabase config.',
    };
  }
};

// Helper to sanitize or generate valid UUID format for PostgreSQL
export const toValidUUID = (id: string, prefix = '00000000-0000-0000-0000'): string => {
  // Check if string is already a valid UUID regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;

  // Convert legacy IDs like 'cook-1', 'cust-1234', 'ORD-5432' to deterministic 36-char UUID format
  const clean = id.toLowerCase().replace(/[^a-z0-9]/g, '');
  const padded = (clean + '00000000000000000000000000000000').slice(0, 32);
  return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-4${padded.slice(13, 16)}-a${padded.slice(17, 20)}-${padded.slice(20, 32)}`;
};

export interface DatabaseOperationResult<T> {
  data: T | null;
  error: string | null;
  fromLiveBackend: boolean;
}

export const supabaseService = {
  // Test backend connectivity (runs server-side DNS, HTTP, and DB diagnostics with client fallback)
  async testConnection(
    customUrl?: string,
    customKey?: string
  ): Promise<{
    connected: boolean;
    message: string;
    tableNeedsMigration?: boolean;
    stage?: string;
    code?: string;
    diagnosis?: string;
    solution?: string;
    dashboardUrl?: string;
    projectRef?: string;
    details?: any;
  }> {
    // 1. Try server-side diagnostic endpoint first (gives detailed DNS, network, and HTTP diagnostics)
    try {
      const res = await fetch('/api/config/test-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: customUrl, anonKey: customKey }),
      });
      if (res.ok) {
        const serverResult = await res.json();
        return serverResult;
      }
    } catch {
      // Non-fatal, fall through to client test
    }

    // 2. Direct client-side probe with user-friendly error wrapping
    let clientToTest = supabase;
    let urlToTest = customUrl || activeConfig.url;
    let keyToTest = customKey || activeConfig.anonKey;

    if (customUrl !== undefined && customKey !== undefined) {
      const diag = getSupabaseDiagnostics(customUrl, customKey);
      if (!diag.isConfigured) {
        return {
          connected: false,
          message: diag.message,
        };
      }
      try {
        let cleanUrl = customUrl.trim();
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
          cleanUrl = `https://${cleanUrl}.supabase.co`;
        }
        cleanUrl = cleanUrl.replace(/\/+$/, '');
        urlToTest = cleanUrl;
        clientToTest = createClient(cleanUrl, customKey.trim(), {
          auth: { persistSession: false },
        });
      } catch (err: any) {
        return {
          connected: false,
          message: `Supabase client error: ${err.message}`,
        };
      }
    }

    if (!clientToTest) {
      const diag = getSupabaseDiagnostics(urlToTest, keyToTest);
      return {
        connected: false,
        message: diag.message,
      };
    }

    try {
      const { data, error } = await clientToTest.from('platform_settings').select('key').limit(1);
      if (error) {
        // Code 42P01 / PGRST204 / PGRST205 means table does not exist yet (database reached and authenticated, but migrations need to be applied)
        if (
          error.code === '42P01' ||
          error.code === 'PGRST204' ||
          error.code === 'PGRST205' ||
          error.message?.toLowerCase().includes('does not exist') ||
          error.message?.toLowerCase().includes('could not find the table')
        ) {
          return {
            connected: true,
            tableNeedsMigration: true,
            message:
              'Connected to Supabase PostgreSQL! Connection verified, but tables are not yet created. Please run supabase/migrations/001_initial_schema.sql in your Supabase SQL editor.',
            details: error,
          };
        }

        // Diagnostic detection for browser fetch failures
        const errStr = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase();
        const isFetchOrNetwork =
          errStr.includes('fetch') ||
          errStr.includes('failed to fetch') ||
          errStr.includes('load failed') ||
          errStr.includes('networkerror') ||
          errStr.includes('network error') ||
          errStr.includes('enotfound');

        if (isFetchOrNetwork) {
          const match = urlToTest.match(/https:\/\/([^.]+)\.supabase\.co/);
          const projectRef = match ? match[1] : '';
          return {
            connected: false,
            stage: 'dns_or_paused',
            code: 'FAILED_TO_FETCH',
            projectRef,
            message: `Could not reach ${urlToTest} (Host Unreachable / DNS Resolution Failed).`,
            diagnosis:
              'The Supabase subdomain does not exist in public DNS. Supabase automatically PAUSES inactive free-tier projects after 7 days, which completely de-registers their Route53 DNS records until unpaused.',
            solution: projectRef
              ? `Open your Supabase Project Dashboard at https://supabase.com/dashboard/project/${projectRef} and click "Restore Project" to reactivate the database.`
              : 'Log in to Supabase Dashboard and click "Restore Project" to unpause your database.',
            dashboardUrl: projectRef ? `https://supabase.com/dashboard/project/${projectRef}` : undefined,
            details: error,
          };
        }

        return {
          connected: false,
          message: `Supabase returned an error: ${error.message} (Code: ${error.code})`,
          details: error,
        };
      }
      return {
        connected: true,
        message: 'Successfully connected to live Supabase PostgreSQL backend.',
        details: data,
      };
    } catch (err: any) {
      const match = urlToTest.match(/https:\/\/([^.]+)\.supabase\.co/);
      const projectRef = match ? match[1] : '';
      const errStr = `${err?.name || ''} ${err?.message || ''} ${String(err)}`.toLowerCase();
      const isFetchOrNetwork =
        errStr.includes('fetch') ||
        errStr.includes('failed to fetch') ||
        errStr.includes('load failed') ||
        errStr.includes('networkerror') ||
        errStr.includes('network error') ||
        errStr.includes('enotfound');

      return {
        connected: false,
        stage: isFetchOrNetwork ? 'dns_or_paused' : 'network',
        code: isFetchOrNetwork ? 'FAILED_TO_FETCH' : 'NETWORK_EXCEPTION',
        projectRef,
        message: isFetchOrNetwork
          ? `Could not reach ${urlToTest} (Host Unreachable / DNS Resolution Failed).`
          : `Network error connecting to Supabase: ${err.message || String(err)}`,
        diagnosis:
          'The Supabase subdomain does not exist in public DNS. Supabase automatically PAUSES inactive free-tier projects after 7 days, which completely de-registers their Route53 DNS records until unpaused.',
        solution: projectRef
          ? `Open your Supabase Project Dashboard at https://supabase.com/dashboard/project/${projectRef} and click "Restore Project" to reactivate the database.`
          : 'Log in to Supabase Dashboard and click "Restore Project" to unpause your database.',
        dashboardUrl: projectRef ? `https://supabase.com/dashboard/project/${projectRef}` : undefined,
        details: err,
      };
    }
  },

  // Cooks / Kitchens
  async fetchCooks(): Promise<DatabaseOperationResult<Cook[]>> {
    if (!supabase) return { data: null, error: 'Supabase client unconfigured', fromLiveBackend: false };
    try {
      const { data, error } = await supabase.from('cooks').select('*').order('created_at', { ascending: false });
      if (error) return { data: null, error: error.message, fromLiveBackend: false };
      
      const mapped: Cook[] = (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id || `user-${row.id}`,
        kitchenName: row.kitchen_name,
        ownerName: row.owner_name,
        phone: row.phone,
        bio: row.bio || '',
        address: row.address,
        locality: row.locality || 'Nalapani Chowk',
        city: row.city || 'Dehradun',
        state: row.state || 'Uttarakhand',
        fssaiNumber: row.fssai_number,
        isVerified: row.is_verified,
        verificationStatus: row.verification_status,
        verificationNotes: row.verification_notes,
        partnerType: row.partner_type || 'home_cook',
        avatarUrl: row.avatar_url || '',
        bannerUrl: row.banner_url || '',
        rating: Number(row.rating) || 5.0,
        reviewCount: Number(row.review_count) || 0,
        specialty: row.specialty || '',
        deliveryTimeMin: Number(row.delivery_time_min) || 20,
        deliveryTimeMax: Number(row.delivery_time_max) || 35,
        isAcceptingOrders: row.is_accepting_orders,
        operatingHours: row.operating_hours,
        dailyCapacity: row.daily_capacity,
        createdAt: row.created_at,
      }));
      return { data: mapped, error: null, fromLiveBackend: true };
    } catch (e: any) {
      return { data: null, error: e.message || 'Failed to fetch cooks', fromLiveBackend: false };
    }
  },

  async insertCook(cook: Cook): Promise<DatabaseOperationResult<Cook>> {
    if (!supabase) return { data: null, error: 'Supabase client unconfigured', fromLiveBackend: false };
    try {
      const dbPayload = {
        id: toValidUUID(cook.id),
        kitchen_name: cook.kitchenName,
        owner_name: cook.ownerName,
        phone: cook.phone,
        bio: cook.bio,
        address: cook.address,
        locality: cook.locality,
        city: cook.city,
        state: cook.state,
        fssai_number: cook.fssaiNumber,
        is_verified: cook.isVerified,
        verification_status: cook.verificationStatus,
        verification_notes: cook.verificationNotes,
        partner_type: cook.partnerType,
        avatar_url: cook.avatarUrl,
        banner_url: cook.bannerUrl,
        rating: cook.rating,
        review_count: cook.reviewCount,
        specialty: cook.specialty,
        delivery_time_min: cook.deliveryTimeMin,
        delivery_time_max: cook.deliveryTimeMax,
        is_accepting_orders: cook.isAcceptingOrders,
        operating_hours: cook.operatingHours,
        daily_capacity: cook.dailyCapacity,
        created_at: cook.createdAt,
      };
      const { data, error } = await supabase.from('cooks').upsert(dbPayload).select().single();
      if (error) return { data: null, error: error.message, fromLiveBackend: false };
      return { data: cook, error: null, fromLiveBackend: true };
    } catch (e: any) {
      return { data: null, error: e.message || 'Failed to insert cook', fromLiveBackend: false };
    }
  },

  // Menu Items
  async fetchMenuItems(): Promise<DatabaseOperationResult<MenuItem[]>> {
    if (!supabase) return { data: null, error: 'Supabase client unconfigured', fromLiveBackend: false };
    try {
      const { data, error } = await supabase.from('menu_items').select('*').order('created_at', { ascending: false });
      if (error) return { data: null, error: error.message, fromLiveBackend: false };

      const mapped: MenuItem[] = (data || []).map((row) => ({
        id: row.id,
        cookId: row.cook_id,
        name: row.name,
        description: row.description || '',
        price: Number(row.price),
        category: row.category,
        dietaryType: row.dietary_type,
        prepTimeMinutes: Number(row.prep_time_minutes) || 20,
        isAvailable: row.is_available,
        imageUrl: row.image_url || '',
        portionSize: row.portion_size || '1 Serving',
        spiceLevel: row.spice_level || 'Medium',
        isStudentSpecial: row.is_student_special,
        studentMealTier: row.student_meal_tier,
        createdAt: row.created_at,
      }));
      return { data: mapped, error: null, fromLiveBackend: true };
    } catch (e: any) {
      return { data: null, error: e.message || 'Failed to fetch menu items', fromLiveBackend: false };
    }
  },

  async saveMenuItem(item: MenuItem): Promise<DatabaseOperationResult<MenuItem>> {
    if (!supabase) return { data: null, error: 'Supabase client unconfigured', fromLiveBackend: false };
    try {
      const dbPayload = {
        id: toValidUUID(item.id),
        cook_id: toValidUUID(item.cookId),
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        dietary_type: item.dietaryType,
        prep_time_minutes: item.prepTimeMinutes,
        is_available: item.isAvailable,
        image_url: item.imageUrl,
        portion_size: item.portionSize,
        spice_level: item.spiceLevel,
        is_student_special: item.isStudentSpecial || false,
        student_meal_tier: item.studentMealTier,
      };
      const { data, error } = await supabase.from('menu_items').upsert(dbPayload).select().single();
      if (error) return { data: null, error: error.message, fromLiveBackend: false };
      return { data: item, error: null, fromLiveBackend: true };
    } catch (e: any) {
      return { data: null, error: e.message || 'Failed to save menu item', fromLiveBackend: false };
    }
  },

  async deleteMenuItem(itemId: string): Promise<{ success: boolean; error: string | null }> {
    if (!supabase) return { success: false, error: 'Supabase client unconfigured' };
    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', toValidUUID(itemId));
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Orders
  async fetchOrders(): Promise<DatabaseOperationResult<Order[]>> {
    if (!supabase) return { data: null, error: 'Supabase client unconfigured', fromLiveBackend: false };
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) return { data: null, error: error.message, fromLiveBackend: false };

      const mapped: Order[] = (data || []).map((row) => ({
        id: row.order_code || row.id,
        customerId: row.customer_id,
        customerName: row.delivery_address?.fullName || 'Customer',
        customerPhone: row.delivery_address?.phone || '',
        cookId: row.cook_id,
        kitchenName: row.kitchen_name || 'Kitchen Partner',
        status: row.status,
        items: (row.order_items || []).map((oi: any) => ({
          id: oi.id,
          orderId: row.order_code || row.id,
          menuItemId: oi.menu_item_id,
          itemName: oi.item_name,
          unitPrice: Number(oi.unit_price),
          quantity: Number(oi.quantity),
          subtotal: Number(oi.subtotal),
          dietaryType: oi.dietary_type,
        })),
        itemsSubtotal: Number(row.items_subtotal),
        deliveryFee: Number(row.delivery_fee),
        platformFee: Number(row.platform_fee),
        packagingFee: Number(row.packaging_fee),
        discount: Number(row.discount),
        discountCode: row.discount_code,
        discountFunding: row.discount_funding,
        finalPayableAmount: Number(row.final_payable_amount),
        platformCommission: Number(row.platform_commission),
        cookEarnings: Number(row.cook_earnings),
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        deliveryPartnerId: row.delivery_partner_id,
        deliveryPartnerName: row.delivery_partner_name,
        deliveryStatus: row.delivery_status,
        deliveryAddress: row.delivery_address || {},
        deliveryInstructions: row.delivery_instructions,
        cancellationReason: row.cancellation_reason,
        events: row.events || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      return { data: mapped, error: null, fromLiveBackend: true };
    } catch (e: any) {
      return { data: null, error: e.message || 'Failed to fetch orders', fromLiveBackend: false };
    }
  },

  async insertOrder(order: Order): Promise<DatabaseOperationResult<Order>> {
    if (!supabase) return { data: null, error: 'Supabase client unconfigured', fromLiveBackend: false };
    try {
      const orderUuid = toValidUUID(order.id);
      const dbPayload = {
        id: orderUuid,
        order_code: order.id,
        customer_id: toValidUUID(order.customerId),
        cook_id: toValidUUID(order.cookId),
        status: order.status,
        items_subtotal: order.itemsSubtotal,
        delivery_fee: order.deliveryFee,
        platform_fee: order.platformFee,
        packaging_fee: order.packagingFee,
        discount: order.discount,
        discount_funding: order.discountFunding || 'cooknow_funded',
        final_payable_amount: order.finalPayableAmount,
        platform_commission: order.platformCommission,
        cook_earnings: order.cookEarnings,
        payment_method: order.paymentMethod,
        payment_status: order.paymentStatus,
        delivery_address: order.deliveryAddress,
        delivery_instructions: order.deliveryInstructions,
        cancellation_reason: order.cancellationReason,
        delivery_partner_id: order.deliveryPartnerId ? toValidUUID(order.deliveryPartnerId) : null,
        delivery_status: order.deliveryStatus || 'unassigned',
        created_at: order.createdAt,
        updated_at: order.updatedAt,
      };

      const { error: orderError } = await supabase.from('orders').upsert(dbPayload);
      if (orderError) return { data: null, error: orderError.message, fromLiveBackend: false };

      // Insert line items
      if (order.items && order.items.length > 0) {
        const itemsPayload = order.items.map((it) => ({
          id: toValidUUID(it.id),
          order_id: orderUuid,
          menu_item_id: toValidUUID(it.menuItemId),
          item_name: it.itemName,
          unit_price: it.unitPrice,
          quantity: it.quantity,
          subtotal: it.subtotal,
          dietary_type: it.dietaryType,
        }));
        await supabase.from('order_items').upsert(itemsPayload);
      }

      return { data: order, error: null, fromLiveBackend: true };
    } catch (e: any) {
      return { data: null, error: e.message || 'Failed to insert order', fromLiveBackend: false };
    }
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, reason?: string): Promise<{ success: boolean; error: string | null }> {
    if (!supabase) return { success: false, error: 'Supabase client unconfigured' };
    try {
      const now = new Date().toISOString();
      const updatePayload: any = {
        status,
        updated_at: now,
      };
      if (status === 'cancelled') updatePayload.cancellation_reason = reason;
      if (status === 'delivered') updatePayload.payment_status = 'paid';

      const { error } = await supabase
        .from('orders')
        .update(updatePayload)
        .or(`order_code.eq.${orderId},id.eq.${toValidUUID(orderId)}`);

      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Partner Applications
  async fetchPartnerApplications(): Promise<DatabaseOperationResult<PartnerApplication[]>> {
    if (!supabase) return { data: null, error: 'Supabase client unconfigured', fromLiveBackend: false };
    try {
      const { data, error } = await supabase.from('partner_applications').select('*').order('submitted_at', { ascending: false });
      if (error) return { data: null, error: error.message, fromLiveBackend: false };

      const mapped: PartnerApplication[] = (data || []).map((row) => ({
        id: row.id,
        businessName: row.business_name,
        ownerName: row.owner_name,
        phone: row.phone,
        email: row.email,
        address: row.address,
        locality: row.locality || 'Nalapani Chowk',
        partnerType: row.partner_type,
        foodCategories: row.food_categories || [],
        sampleMenu: row.sample_menu || '',
        expectedPriceRange: row.expected_price_range || '₹80-₹150',
        operatingHours: row.operating_hours || '11:00 AM - 10:00 PM',
        dailyCapacity: Number(row.daily_capacity) || 30,
        fssaiNumber: row.fssai_number,
        idProofType: row.id_proof_type,
        idProofNumber: row.id_proof_number,
        kitchenPhotos: row.kitchen_photos || [],
        status: row.status,
        reviewerReason: row.reviewer_reason,
        reviewedBy: row.reviewed_by,
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at,
      }));
      return { data: mapped, error: null, fromLiveBackend: true };
    } catch (e: any) {
      return { data: null, error: e.message || 'Failed to fetch partner applications', fromLiveBackend: false };
    }
  },

  async insertPartnerApplication(app: PartnerApplication): Promise<DatabaseOperationResult<PartnerApplication>> {
    if (!supabase) return { data: null, error: 'Supabase client unconfigured', fromLiveBackend: false };
    try {
      const dbPayload = {
        id: toValidUUID(app.id),
        business_name: app.businessName,
        owner_name: app.ownerName,
        phone: app.phone,
        email: app.email,
        address: app.address,
        locality: app.locality,
        partner_type: app.partnerType,
        food_categories: app.foodCategories,
        sample_menu: app.sampleMenu,
        expected_price_range: app.expectedPriceRange,
        operating_hours: app.operatingHours,
        daily_capacity: app.dailyCapacity,
        fssai_number: app.fssaiNumber,
        id_proof_type: app.idProofType,
        id_proof_number: app.idProofNumber,
        kitchen_photos: app.kitchenPhotos,
        status: app.status,
        submitted_at: app.submittedAt,
      };
      const { error } = await supabase.from('partner_applications').upsert(dbPayload);
      if (error) return { data: null, error: error.message, fromLiveBackend: false };
      return { data: app, error: null, fromLiveBackend: true };
    } catch (e: any) {
      return { data: null, error: e.message, fromLiveBackend: false };
    }
  },

  async updatePartnerApplicationStatus(
    appId: string,
    status: VerificationStatus,
    reason: string,
    reviewedBy: string
  ): Promise<{ success: boolean; error: string | null }> {
    if (!supabase) return { success: false, error: 'Supabase client unconfigured' };
    try {
      const { error } = await supabase
        .from('partner_applications')
        .update({
          status,
          reviewer_reason: reason,
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', toValidUUID(appId));

      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Delivery Partners
  async fetchDeliveryPartners(): Promise<DatabaseOperationResult<DeliveryPartner[]>> {
    if (!supabase) return { data: null, error: 'Supabase client unconfigured', fromLiveBackend: false };
    try {
      const { data, error } = await supabase.from('delivery_partners').select('*').order('created_at', { ascending: false });
      if (error) return { data: null, error: error.message, fromLiveBackend: false };

      const mapped: DeliveryPartner[] = (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id || `user-dp-${row.id}`,
        fullName: row.full_name,
        phone: row.phone,
        email: row.email,
        serviceArea: row.service_area || 'Nalapani Chowk',
        workingHours: row.working_hours || '11:00 AM - 10:00 PM',
        vehicleType: row.vehicle_type || 'Motorcycle',
        vehicleNumber: row.vehicle_number,
        drivingLicenseNumber: row.driving_license_number,
        aadhaarNumber: row.aadhaar_number,
        status: row.status,
        reviewerNotes: row.reviewer_notes,
        isAvailable: row.is_available,
        rating: Number(row.rating) || 5.0,
        totalDeliveries: Number(row.total_deliveries) || 0,
        earningsBalance: Number(row.earnings_balance) || 0,
        createdAt: row.created_at,
      }));
      return { data: mapped, error: null, fromLiveBackend: true };
    } catch (e: any) {
      return { data: null, error: e.message || 'Failed to fetch delivery partners', fromLiveBackend: false };
    }
  },

  async insertDeliveryPartner(partner: DeliveryPartner): Promise<DatabaseOperationResult<DeliveryPartner>> {
    if (!supabase) return { data: null, error: 'Supabase client unconfigured', fromLiveBackend: false };
    try {
      const dbPayload = {
        id: toValidUUID(partner.id),
        full_name: partner.fullName,
        phone: partner.phone,
        email: partner.email,
        service_area: partner.serviceArea,
        working_hours: partner.workingHours,
        vehicle_type: partner.vehicleType,
        vehicle_number: partner.vehicleNumber,
        driving_license_number: partner.drivingLicenseNumber,
        aadhaar_number: partner.aadhaarNumber,
        status: partner.status,
        reviewer_notes: partner.reviewerNotes,
        is_available: partner.isAvailable,
        rating: partner.rating,
        total_deliveries: partner.totalDeliveries,
        earnings_balance: partner.earningsBalance,
        created_at: partner.createdAt,
      };
      const { error } = await supabase.from('delivery_partners').upsert(dbPayload);
      if (error) return { data: null, error: error.message, fromLiveBackend: false };
      return { data: partner, error: null, fromLiveBackend: true };
    } catch (e: any) {
      return { data: null, error: e.message, fromLiveBackend: false };
    }
  },

  async updateDeliveryPartnerStatus(
    partnerId: string,
    status: 'approved' | 'rejected',
    reviewerNotes: string
  ): Promise<{ success: boolean; error: string | null }> {
    if (!supabase) return { success: false, error: 'Supabase client unconfigured' };
    try {
      const { error } = await supabase
        .from('delivery_partners')
        .update({
          status,
          reviewer_notes: reviewerNotes,
          is_available: status === 'approved',
        })
        .eq('id', toValidUUID(partnerId));
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to update partner status' };
    }
  },

  // Reviews
  async fetchReviews(): Promise<DatabaseOperationResult<Review[]>> {
    if (!supabase) return { data: null, error: 'Supabase client unconfigured', fromLiveBackend: false };
    try {
      const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
      if (error) return { data: null, error: error.message, fromLiveBackend: false };

      const mapped: Review[] = (data || []).map((row) => ({
        id: row.id,
        orderId: row.order_id,
        customerId: row.customer_id,
        customerName: row.is_anonymous ? 'Anonymous Student (Nalapani)' : (row.customer_name || 'Customer'),
        isAnonymous: row.is_anonymous !== false,
        cookId: row.cook_id,
        rating: Number(row.rating),
        comment: row.comment || '',
        isReported: row.is_reported || false,
        createdAt: row.created_at,
      }));
      return { data: mapped, error: null, fromLiveBackend: true };
    } catch (e: any) {
      return { data: null, error: e.message || 'Failed to fetch reviews', fromLiveBackend: false };
    }
  },

  async insertReview(review: Review): Promise<DatabaseOperationResult<Review>> {
    if (!supabase) return { data: null, error: 'Supabase client unconfigured', fromLiveBackend: false };
    try {
      const dbPayload = {
        id: toValidUUID(review.id),
        order_id: toValidUUID(review.orderId),
        customer_id: toValidUUID(review.customerId),
        cook_id: toValidUUID(review.cookId),
        rating: review.rating,
        comment: review.comment,
        is_reported: review.isReported,
        created_at: review.createdAt,
      };
      const { error } = await supabase.from('reviews').upsert(dbPayload);
      if (error) return { data: null, error: error.message, fromLiveBackend: false };
      return { data: review, error: null, fromLiveBackend: true };
    } catch (e: any) {
      return { data: null, error: e.message, fromLiveBackend: false };
    }
  },

  // Meal Plans & Subscriptions
  async fetchMealPlans(): Promise<DatabaseOperationResult<MealPlan[]>> {
    if (!supabase) return { data: null, error: 'Supabase client unconfigured', fromLiveBackend: false };
    try {
      const { data, error } = await supabase.from('meal_plans').select('*').order('created_at', { ascending: false });
      if (error) return { data: null, error: error.message, fromLiveBackend: false };

      const mapped: MealPlan[] = (data || []).map((row) => ({
        id: row.id,
        providerId: row.provider_id,
        providerName: row.provider_name,
        title: row.title,
        description: row.description,
        planType: row.plan_type,
        pricePerMonth: Number(row.price_per_month),
        mealsCount: Number(row.meals_count),
        durationDays: Number(row.duration_days),
        mealSchedule: row.meal_schedule,
        serviceArea: row.service_area,
        isAvailable: row.is_available,
        sampleMenuHighlights: row.sample_menu_highlights || [],
        pausesAllowed: Number(row.pauses_allowed) || 4,
        createdAt: row.created_at,
      }));
      return { data: mapped, error: null, fromLiveBackend: true };
    } catch (e: any) {
      return { data: null, error: e.message || 'Failed to fetch meal plans', fromLiveBackend: false };
    }
  },

  async fetchSubscriptions(): Promise<DatabaseOperationResult<CustomerSubscription[]>> {
    if (!supabase) return { data: null, error: 'Supabase client unconfigured', fromLiveBackend: false };
    try {
      const { data, error } = await supabase.from('customer_subscriptions').select('*').order('created_at', { ascending: false });
      if (error) return { data: null, error: error.message, fromLiveBackend: false };

      const mapped: CustomerSubscription[] = (data || []).map((row) => ({
        id: row.id,
        customerId: row.customer_id,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        planId: row.plan_id,
        planTitle: row.plan_title,
        providerId: row.provider_id,
        providerName: row.provider_name,
        startDate: row.start_date,
        endDate: row.end_date,
        totalMeals: Number(row.total_meals),
        mealsDelivered: Number(row.meals_delivered),
        mealsRemaining: Number(row.meals_remaining),
        status: row.status,
        deliveryAddress: row.delivery_address || {},
        pauseDates: row.pause_dates || [],
        pausesRemaining: Number(row.pauses_remaining),
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        paidAmount: Number(row.paid_amount),
        createdAt: row.created_at,
      }));
      return { data: mapped, error: null, fromLiveBackend: true };
    } catch (e: any) {
      return { data: null, error: e.message || 'Failed to fetch subscriptions', fromLiveBackend: false };
    }
  },

  async insertSubscription(sub: CustomerSubscription): Promise<DatabaseOperationResult<CustomerSubscription>> {
    if (!supabase) return { data: null, error: 'Supabase client unconfigured', fromLiveBackend: false };
    try {
      const dbPayload = {
        id: toValidUUID(sub.id),
        customer_id: toValidUUID(sub.customerId),
        customer_name: sub.customerName,
        customer_phone: sub.customerPhone,
        plan_id: toValidUUID(sub.planId),
        plan_title: sub.planTitle,
        provider_id: toValidUUID(sub.providerId),
        provider_name: sub.providerName,
        start_date: sub.startDate,
        end_date: sub.endDate,
        total_meals: sub.totalMeals,
        meals_delivered: sub.mealsDelivered,
        meals_remaining: sub.mealsRemaining,
        status: sub.status,
        delivery_address: sub.deliveryAddress,
        pause_dates: sub.pauseDates,
        pauses_remaining: sub.pausesRemaining,
        payment_method: sub.paymentMethod,
        payment_status: sub.paymentStatus,
        paid_amount: sub.paidAmount,
        created_at: sub.createdAt,
      };
      const { error } = await supabase.from('customer_subscriptions').upsert(dbPayload);
      if (error) return { data: null, error: error.message, fromLiveBackend: false };
      return { data: sub, error: null, fromLiveBackend: true };
    } catch (e: any) {
      return { data: null, error: e.message, fromLiveBackend: false };
    }
  },

  // Safe Data Migration from local cache to Supabase with Duplicate Prevention
  async migrateLocalDataToSupabase(localData: {
    cooks: Cook[];
    menuItems: MenuItem[];
    promotions: Promotion[];
    mealPlans: MealPlan[];
    deliveryPartners: DeliveryPartner[];
  }): Promise<{ success: boolean; insertedCounts: Record<string, number>; errors: string[] }> {
    if (!supabase) {
      return {
        success: false,
        insertedCounts: {},
        errors: ['Cannot migrate: Supabase client is not configured with live credentials.'],
      };
    }

    const counts: Record<string, number> = {
      cooks: 0,
      menuItems: 0,
      promotions: 0,
      mealPlans: 0,
      deliveryPartners: 0,
    };
    const errors: string[] = [];

    // 1. Cooks
    try {
      for (const cook of localData.cooks) {
        const { error } = await supabase.from('cooks').upsert({
          id: toValidUUID(cook.id),
          kitchen_name: cook.kitchenName,
          owner_name: cook.ownerName,
          phone: cook.phone,
          bio: cook.bio,
          address: cook.address,
          locality: cook.locality,
          city: cook.city,
          state: cook.state,
          fssai_number: cook.fssaiNumber,
          is_verified: cook.isVerified,
          verification_status: cook.verificationStatus,
          verification_notes: cook.verificationNotes,
          partner_type: cook.partnerType,
          avatar_url: cook.avatarUrl,
          banner_url: cook.bannerUrl,
          rating: cook.rating,
          review_count: cook.reviewCount,
          specialty: cook.specialty,
          delivery_time_min: cook.deliveryTimeMin,
          delivery_time_max: cook.deliveryTimeMax,
          is_accepting_orders: cook.isAcceptingOrders,
          operating_hours: cook.operatingHours,
          daily_capacity: cook.dailyCapacity,
        });
        if (error) errors.push(`Cook ${cook.kitchenName}: ${error.message}`);
        else counts.cooks++;
      }
    } catch (e: any) {
      errors.push(`Cooks batch error: ${e.message}`);
    }

    // 2. Menu Items
    try {
      for (const item of localData.menuItems) {
        const { error } = await supabase.from('menu_items').upsert({
          id: toValidUUID(item.id),
          cook_id: toValidUUID(item.cookId),
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          dietary_type: item.dietaryType,
          prep_time_minutes: item.prepTimeMinutes,
          is_available: item.isAvailable,
          image_url: item.imageUrl,
          portion_size: item.portionSize,
          spice_level: item.spiceLevel,
          is_student_special: item.isStudentSpecial || false,
          student_meal_tier: item.studentMealTier,
        });
        if (error) errors.push(`Menu item ${item.name}: ${error.message}`);
        else counts.menuItems++;
      }
    } catch (e: any) {
      errors.push(`Menu items batch error: ${e.message}`);
    }

    // 3. Delivery Partners
    try {
      for (const dp of localData.deliveryPartners) {
        const { error } = await supabase.from('delivery_partners').upsert({
          id: toValidUUID(dp.id),
          full_name: dp.fullName,
          phone: dp.phone,
          email: dp.email,
          service_area: dp.serviceArea,
          working_hours: dp.workingHours,
          vehicle_type: dp.vehicleType,
          vehicle_number: dp.vehicleNumber,
          driving_license_number: dp.drivingLicenseNumber,
          aadhaar_number: dp.aadhaarNumber,
          status: dp.status,
          reviewer_notes: dp.reviewerNotes,
          is_available: dp.isAvailable,
          rating: dp.rating,
          total_deliveries: dp.totalDeliveries,
          earnings_balance: dp.earningsBalance,
        });
        if (error) errors.push(`Rider ${dp.fullName}: ${error.message}`);
        else counts.deliveryPartners++;
      }
    } catch (e: any) {
      errors.push(`Delivery partners batch error: ${e.message}`);
    }

    // 4. Meal Plans
    try {
      for (const mp of localData.mealPlans) {
        const { error } = await supabase.from('meal_plans').upsert({
          id: toValidUUID(mp.id),
          provider_id: toValidUUID(mp.providerId),
          provider_name: mp.providerName,
          title: mp.title,
          description: mp.description,
          plan_type: mp.planType,
          price_per_month: mp.pricePerMonth,
          meals_count: mp.mealsCount,
          duration_days: mp.durationDays,
          meal_schedule: mp.mealSchedule,
          service_area: mp.serviceArea,
          is_available: mp.isAvailable,
          sample_menu_highlights: mp.sampleMenuHighlights,
          pauses_allowed: mp.pausesAllowed,
        });
        if (error) errors.push(`Meal plan ${mp.title}: ${error.message}`);
        else counts.mealPlans++;
      }
    } catch (e: any) {
      errors.push(`Meal plans batch error: ${e.message}`);
    }

    return {
      success: errors.length === 0,
      insertedCounts: counts,
      errors,
    };
  },
};
