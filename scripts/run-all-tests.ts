process.env.NODE_ENV = 'test';
process.env.IS_TEST = 'true';

import crypto from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import app from '../server';

const TEST_PORT = 3999;
let server: http.Server;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function apiRequest(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: any;
  } = {}
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { status: res.status, ok: res.ok, data, rawText: text, contentType: res.headers.get('content-type') || '' };
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('   COOKNOW MARKETPLACE - BACKEND & ORDER WORKFLOW TEST SUITE    ');
  console.log('   Location: Nalapani Chowk, Dehradun, Uttarakhand              ');
  console.log('   Primary DB: Cloud Firestore (cooknow-9444c)                  ');
  console.log('================================================================\n');

  // Generate ephemeral RS256 keypair strictly inside test process for real jose jwtVerify testing
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = 'cooknow-test-kid-1';
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';
  process.env.COOKNOW_TEST_PUBLIC_JWK = JSON.stringify(publicJwk);

  async function mintTestJwt(claims: {
    sub: string;
    email: string;
    email_verified?: boolean;
    name?: string;
  }) {
    return await new SignJWT({
      email: claims.email,
      email_verified: claims.email_verified ?? true,
      name: claims.name || 'Test User',
      auth_time: Math.floor(Date.now() / 1000),
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'cooknow-test-kid-1' })
      .setIssuer('https://securetoken.google.com/cooknow-9444c')
      .setAudience('cooknow-9444c')
      .setSubject(claims.sub)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);
  }

  const customerToken = await mintTestJwt({
    sub: 'test-cust-101',
    email: 'student.nalapani@example.com',
    name: 'Aarav Rawat',
  });
  const secondCustomerToken = await mintTestJwt({
    sub: 'test-cust-202',
    email: 'other.student@example.com',
    name: 'Riya Bisht',
  });
  const cookToken = await mintTestJwt({
    sub: 'user-cook-1',
    email: 'sunita.rasoi@example.com',
    name: 'Sunita Rawat',
  });
  const riderToken = await mintTestJwt({
    sub: 'user-rider-1',
    email: 'suresh.rider@example.com',
    name: 'Suresh Semwal',
  });
  const ownerToken = await mintTestJwt({
    sub: 'owner-vivek-uid',
    email: 'vivekn528@gmail.com',
    email_verified: true,
    name: 'Vivek Singh Negi',
  });
  const unverifiedOwnerToken = await mintTestJwt({
    sub: 'fake-owner-uid',
    email: 'vivekn528@gmail.com',
    email_verified: false,
    name: 'Unverified Attacker',
  });

  // Start isolated test server
  server = app.listen(TEST_PORT);
  await new Promise((resolve) => setTimeout(resolve, 400));

  let passedTests = 0;
  let totalTests = 0;
  const failures: string[] = [];

  function recordResult(name: string, passed: boolean, details?: string) {
    totalTests++;
    if (passed) {
      passedTests++;
      console.log(`  [PASS] ${name}`);
    } else {
      failures.push(`${name}${details ? `: ${details}` : ''}`);
      console.error(`  [FAIL] ${name}${details ? ` -> ${details}` : ''}`);
    }
  }

  try {
    // --------------------------------------------------------------------------
    // TEST GROUP 1: VERCEL REWRITE ROUTING, HEALTH & CLIENT CONFIG
    // --------------------------------------------------------------------------
    console.log('>>> TEST GROUP 1: Vercel Rewrite Routing & Client Config');

    const rootApiRes = await apiRequest('/api');
    recordResult(
      'GET /api returns Firebase-First Single Source of Truth',
      rootApiRes.status === 200 &&
        rootApiRes.data?.architecture === 'Firebase-First Single Source of Truth' &&
        rootApiRes.data?.primaryDatabase === 'Cloud Firestore (cooknow-9444c)'
    );

    const rewriteConfigRes = await apiRequest('/api?__pathname=/api/config/public-client');
    recordResult(
      'Vercel rewrite query recovery (/api?__pathname=/api/config/public-client) resolves cleanly',
      rewriteConfigRes.status === 200 &&
        rewriteConfigRes.data?.firebase?.projectId === 'cooknow-9444c' &&
        rewriteConfigRes.data?.supabase?.optionalStandby === true
    );

    const rewriteOrderPostRes = await apiRequest('/api?__pathname=/api/orders/place', {
      method: 'POST',
      body: { cookId: 'cook-1', items: [] },
    });
    recordResult(
      'Vercel POST rewrite (/api?__pathname=/api/orders/place) reaches orders/place & returns JSON 401',
      rewriteOrderPostRes.status === 401 && rewriteOrderPostRes.contentType.includes('application/json')
    );

    const unknownApiRes = await apiRequest('/api/does-not-exist-route');
    recordResult(
      'Unknown /api route returns structured JSON 404 (never raw HTML)',
      unknownApiRes.status === 404 &&
        unknownApiRes.contentType.includes('application/json') &&
        unknownApiRes.data?.success === false
    );

    recordResult(
      'Public client config does not expose any private keys or service_role secrets',
      !JSON.stringify(rewriteConfigRes.data).includes('private_key') &&
        !JSON.stringify(rewriteConfigRes.data).includes('client_email') &&
        !JSON.stringify(rewriteConfigRes.data).includes('service_role')
    );

    // --------------------------------------------------------------------------
    // TEST GROUP 2: AUTHENTICATION & JWKS CRYPTOGRAPHIC GATES
    // --------------------------------------------------------------------------
    console.log('\n>>> TEST GROUP 2: Authentication & Role Verification');

    const ownerValidRes = await apiRequest('/api/auth/verify-owner', {
      method: 'POST',
      token: ownerToken,
    });
    recordResult(
      'POST /api/auth/verify-owner verifies owner JWT cryptographically',
      ownerValidRes.status === 200 && ownerValidRes.data?.verified === true
    );

    const ownerUnverifiedRes = await apiRequest('/api/auth/verify-owner', {
      method: 'POST',
      token: unverifiedOwnerToken,
    });
    recordResult(
      'POST /api/auth/verify-owner rejects unverified email with HTTP 403',
      ownerUnverifiedRes.status === 403 && ownerUnverifiedRes.data?.verified === false
    );

    const customerAsOwnerRes = await apiRequest('/api/orders/admin-all', {
      token: customerToken,
    });
    recordResult(
      'Customer blocked from GET /api/orders/admin-all with HTTP 403',
      customerAsOwnerRes.status === 403
    );

    const forgedRes = await apiRequest('/api/auth/verify-owner', {
      method: 'POST',
      token: 'forged.invalid.jwt',
    });
    recordResult(
      'Malformed JWT rejected with HTTP 401',
      forgedRes.status === 401 && forgedRes.data?.verified === false
    );

    // --------------------------------------------------------------------------
    // TEST GROUP 3: END-TO-END ORDER PLACEMENT, PRICING & ANTI-TAMPERING
    // --------------------------------------------------------------------------
    console.log('\n>>> TEST GROUP 3: Server-Authoritative Order Placement & COD Pricing');

    // 3a. Serverless fail-closed guard when Vercel runs without Firebase Admin credentials
    const prevVercel = process.env.VERCEL;
    process.env.VERCEL = '1';
    process.env.TEST_ENFORCE_SERVERLESS_GUARD = 'true';
    const serverlessMissingCredsRes = await apiRequest('/api/orders/place', {
      method: 'POST',
      token: customerToken,
      body: { cookId: 'cook-1', items: [{ menuItemId: 'menu-student-full', quantity: 1 }] },
    });
    process.env.VERCEL = prevVercel;
    delete process.env.TEST_ENFORCE_SERVERLESS_GUARD;
    recordResult(
      'Serverless Vercel rejects order placement with JSON 503 if Admin credentials are missing',
      serverlessMissingCredsRes.status === 503 &&
        String(serverlessMissingCredsRes.data?.error || '').includes('Firebase Admin credentials')
    );

    // 3b. Reject disabled UPI/online payment method
    const upiRejectedRes = await apiRequest('/api/orders/place', {
      method: 'POST',
      token: customerToken,
      body: {
        cookId: 'cook-1',
        items: [{ menuItemId: 'menu-student-full', quantity: 1 }],
        paymentMethod: 'upi_online',
        idempotencyKey: 'idem-upi-block-1',
        deliveryAddress: {
          fullName: 'Aarav Rawat',
          phone: '9876543210',
          locality: 'Nalapani Chowk',
          addressLine: 'Room 12, Shivalik PG',
        },
      },
    });
    recordResult(
      'UPI/online payment method rejected with HTTP 400 (COD-only enforced)',
      upiRejectedRes.status === 400 &&
        String(upiRejectedRes.data?.error || '').toLowerCase().includes('cash on delivery')
    );

    // 3c. Reject unverified cook-5
    const unverifiedCookRes = await apiRequest('/api/orders/place', {
      method: 'POST',
      token: customerToken,
      body: {
        cookId: 'cook-5',
        items: [{ menuItemId: 'menu-student-full', quantity: 1 }],
        paymentMethod: 'cod',
        idempotencyKey: 'idem-unverified-cook-1',
        deliveryAddress: {
          fullName: 'Aarav Rawat',
          phone: '9876543210',
          locality: 'Nalapani Chowk',
          addressLine: 'Room 12, Shivalik PG',
        },
      },
    });
    recordResult(
      'Unverified cook (cook-5) rejected with HTTP 400',
      unverifiedCookRes.status === 400
    );

    // 3d. Place Student Special Full Thali (₹79 x 2 = ₹158 < ₹250 -> ₹25 delivery + ₹5 platform + ₹10 packaging = ₹198)
    // Attempt price tampering via malicious fields in request body
    const idemKeySmall = `idem_small_${Date.now()}`;
    const smallOrderRes = await apiRequest('/api/orders/place', {
      method: 'POST',
      token: customerToken,
      body: {
        cookId: 'cook-1',
        items: [{ menuItemId: 'menu-student-full', quantity: 2, unitPrice: 1, price: 1 }],
        itemsSubtotal: 2,
        finalPayableAmount: 2,
        role: 'admin',
        paymentMethod: 'cod',
        idempotencyKey: idemKeySmall,
        deliveryAddress: {
          fullName: 'Aarav Rawat',
          phone: '9876543210',
          locality: 'Nalapani Chowk',
          addressLine: 'Room 12, Shivalik PG',
        },
      },
    });
    const placedSmallOrder = smallOrderRes.data?.order;
    recordResult(
      'Small order places cleanly & ignores client price tampering (₹79*2 + ₹25 + ₹5 + ₹10 = ₹198, 15% comm = ₹24)',
      smallOrderRes.status === 200 &&
        smallOrderRes.data?.success === true &&
        placedSmallOrder?.itemsSubtotal === 158 &&
        placedSmallOrder?.deliveryFee === 25 &&
        placedSmallOrder?.platformFee === 5 &&
        placedSmallOrder?.packagingFee === 10 &&
        placedSmallOrder?.finalPayableAmount === 198 &&
        placedSmallOrder?.platformCommission === 24 &&
        placedSmallOrder?.cookEarnings === 134 &&
        placedSmallOrder?.cookUserId === 'user-cook-1'
    );

    // 3e. Verify Student Special Thali exact canonical pricing Mini=₹49, Regular=₹69, Full=₹79 & ≥₹250 free delivery + PAHADI15 shared discount
    const largeOrderRes = await apiRequest('/api/orders/place', {
      method: 'POST',
      token: customerToken,
      body: {
        cookId: 'cook-1',
        items: [
          { menuItemId: 'menu-student-full', quantity: 2 }, // 158
          { menuItemId: 'menu-pahadi-aloo', quantity: 1 }, // 120 -> subtotal 278 >= 250
        ],
        promoCode: 'PAHADI15', // 15% of 278 = 42 (50% shared -> partner share = 21)
        paymentMethod: 'cod',
        idempotencyKey: `idem_large_${Date.now()}`,
        deliveryAddress: {
          fullName: 'Aarav Rawat',
          phone: '9876543210',
          locality: 'Raipur Road',
          addressLine: 'Flat 4B, Tapovan Enclave',
        },
      },
    });
    const placedLargeOrder = largeOrderRes.data?.order;
    recordResult(
      'Order >= ₹250 waives delivery fee (₹0) & computes shared promo PAHADI15 accurately (₹278 + ₹0 + ₹5 + ₹10 - ₹42 = ₹251)',
      largeOrderRes.status === 200 &&
        placedLargeOrder?.itemsSubtotal === 278 &&
        placedLargeOrder?.deliveryFee === 0 &&
        placedLargeOrder?.discount === 42 &&
        placedLargeOrder?.discountFunding === 'shared_funded' &&
        placedLargeOrder?.finalPayableAmount === 251 &&
        placedLargeOrder?.platformCommission === 42 &&
        placedLargeOrder?.cookEarnings === 215
    );

    // Mini ₹49 & Regular ₹69 orders
    const miniOrderRes = await apiRequest('/api/orders/place', {
      method: 'POST',
      token: customerToken,
      body: {
        cookId: 'cook-2',
        items: [{ menuItemId: 'menu-student-mini', quantity: 1 }],
        paymentMethod: 'cod',
        idempotencyKey: `idem_mini_${Date.now()}`,
        deliveryAddress: {
          fullName: 'Aarav Rawat',
          phone: '9876543210',
          locality: 'Nalapani Chowk',
          addressLine: 'Room 12',
        },
      },
    });
    const regularOrderRes = await apiRequest('/api/orders/place', {
      method: 'POST',
      token: customerToken,
      body: {
        cookId: 'cook-4',
        items: [{ menuItemId: 'menu-student-regular', quantity: 1 }],
        paymentMethod: 'cod',
        idempotencyKey: `idem_reg_${Date.now()}`,
        deliveryAddress: {
          fullName: 'Aarav Rawat',
          phone: '9876543210',
          locality: 'Nalapani Chowk',
          addressLine: 'Room 12',
        },
      },
    });
    recordResult(
      'Student Special Thali Mini (₹49) and Regular (₹69) prices enforced by backend',
      miniOrderRes.status === 200 &&
        miniOrderRes.data?.order?.itemsSubtotal === 49 &&
        regularOrderRes.status === 200 &&
        regularOrderRes.data?.order?.itemsSubtotal === 69
    );

    // --------------------------------------------------------------------------
    // TEST GROUP 4: DUPLICATE ORDER IDEMPOTENCY & REPLAY PROTECTION
    // --------------------------------------------------------------------------
    console.log('\n>>> TEST GROUP 4: Duplicate Order Prevention (Idempotency)');

    const replaySameRes = await apiRequest('/api/orders/place', {
      method: 'POST',
      token: customerToken,
      body: {
        cookId: 'cook-1',
        items: [{ menuItemId: 'menu-student-full', quantity: 2 }],
        paymentMethod: 'cod',
        idempotencyKey: idemKeySmall,
        deliveryAddress: {
          fullName: 'Aarav Rawat',
          phone: '9876543210',
          locality: 'Nalapani Chowk',
          addressLine: 'Room 12, Shivalik PG',
        },
      },
    });
    recordResult(
      'Repeated request with identical idempotencyKey returns original order ID without duplicating',
      replaySameRes.status === 200 && replaySameRes.data?.order?.id === placedSmallOrder?.id
    );

    const replayTamperedRes = await apiRequest('/api/orders/place', {
      method: 'POST',
      token: customerToken,
      body: {
        cookId: 'cook-1',
        items: [{ menuItemId: 'menu-student-full', quantity: 3 }],
        paymentMethod: 'cod',
        idempotencyKey: idemKeySmall,
        deliveryAddress: {
          fullName: 'Aarav Rawat',
          phone: '9876543210',
          locality: 'Nalapani Chowk',
          addressLine: 'Room 12, Shivalik PG',
        },
      },
    });
    recordResult(
      'Reusing idempotencyKey with altered order items returns HTTP 409 conflict',
      replayTamperedRes.status === 409
    );

    const replayCrossCustomerRes = await apiRequest('/api/orders/place', {
      method: 'POST',
      token: secondCustomerToken,
      body: {
        cookId: 'cook-1',
        items: [{ menuItemId: 'menu-student-full', quantity: 2 }],
        paymentMethod: 'cod',
        idempotencyKey: idemKeySmall,
        deliveryAddress: {
          fullName: 'Riya Bisht',
          phone: '9876543210',
          locality: 'Nalapani Chowk',
          addressLine: 'Room 12, Shivalik PG',
        },
      },
    });
    recordResult(
      'Cross-customer idempotencyKey reuse rejected with HTTP 403',
      replayCrossCustomerRes.status === 403
    );

    // --------------------------------------------------------------------------
    // TEST GROUP 5: END-TO-END ORDER WORKFLOW, STATUS TRANSITIONS & COD RECONCILIATION
    // --------------------------------------------------------------------------
    console.log('\n>>> TEST GROUP 5: Full Order Workflow, Status Validation & COD Settlement');

    const myOrdersRes = await apiRequest('/api/orders/my-orders', { token: customerToken });
    recordResult(
      'Customer GET /api/orders/my-orders returns customer-owned order',
      myOrdersRes.status === 200 &&
        myOrdersRes.data?.orders?.some((o: any) => o.id === placedSmallOrder?.id)
    );

    const kitchenOrdersRes = await apiRequest('/api/orders/kitchen-orders', { token: cookToken });
    recordResult(
      'Cook GET /api/orders/kitchen-orders shows eligible pending order',
      kitchenOrdersRes.status === 200 &&
        kitchenOrdersRes.data?.orders?.some((o: any) => o.id === placedSmallOrder?.id)
    );

    const customerAcceptDenied = await apiRequest(`/api/orders/${placedSmallOrder?.id}/status`, {
      method: 'PATCH',
      token: customerToken,
      body: { status: 'accepted' },
    });
    recordResult(
      'Customer denied permission to accept their own order (HTTP 403)',
      customerAcceptDenied.status === 403
    );

    const invalidSkipTransition = await apiRequest(`/api/orders/${placedSmallOrder?.id}/status`, {
      method: 'PATCH',
      token: cookToken,
      body: { status: 'delivered' },
    });
    recordResult(
      'Invalid state transition pending -> delivered rejected (HTTP 400)',
      invalidSkipTransition.status === 400
    );

    const s1 = await apiRequest(`/api/orders/${placedSmallOrder?.id}/status`, {
      method: 'PATCH',
      token: cookToken,
      body: { status: 'accepted' },
    });
    const s2 = await apiRequest(`/api/orders/${placedSmallOrder?.id}/status`, {
      method: 'PATCH',
      token: cookToken,
      body: { status: 'preparing' },
    });
    const s3 = await apiRequest(`/api/orders/${placedSmallOrder?.id}/status`, {
      method: 'PATCH',
      token: cookToken,
      body: { status: 'ready' },
    });
    recordResult(
      'Cook advances order lifecycle pending -> accepted -> preparing -> ready',
      s1.status === 200 && s2.status === 200 && s3.status === 200 && s3.data?.order?.status === 'ready'
    );

    const riderOrdersRes = await apiRequest('/api/orders/rider-orders', { token: riderToken });
    recordResult(
      'Delivery partner GET /api/orders/rider-orders views ready dispatch order',
      riderOrdersRes.status === 200 &&
        riderOrdersRes.data?.orders?.some((o: any) => o.id === placedSmallOrder?.id)
    );

    const s4 = await apiRequest(`/api/orders/${placedSmallOrder?.id}/status`, {
      method: 'PATCH',
      token: riderToken,
      body: { status: 'out_for_delivery', partnerId: 'dp-1', partnerName: 'Suresh Semwal' },
    });
    const s5 = await apiRequest(`/api/orders/${placedSmallOrder?.id}/status`, {
      method: 'PATCH',
      token: riderToken,
      body: { status: 'delivered' },
    });
    recordResult(
      'Rider advances order ready -> out_for_delivery -> delivered with pending COD remittance',
      s4.status === 200 &&
        s5.status === 200 &&
        s5.data?.order?.status === 'delivered' &&
        s5.data?.order?.paymentStatus === 'pending'
    );

    const confirmCodDeniedCustomer = await apiRequest(`/api/orders/${placedSmallOrder?.id}/confirm-cod`, {
      method: 'PATCH',
      token: customerToken,
    });
    recordResult(
      'Non-owner blocked from confirming COD remittance (HTTP 403)',
      confirmCodDeniedCustomer.status === 403
    );

    const confirmCodOwnerRes = await apiRequest(`/api/orders/${placedSmallOrder?.id}/confirm-cod`, {
      method: 'PATCH',
      token: ownerToken,
    });
    recordResult(
      'Owner reconciles COD cash collection cleanly (paymentStatus = paid)',
      confirmCodOwnerRes.status === 200 && confirmCodOwnerRes.data?.order?.paymentStatus === 'paid'
    );

    // --------------------------------------------------------------------------
    // TEST GROUP 6: OWNER ANALYTICS & EXPENSE SOFT REVERSALS
    // --------------------------------------------------------------------------
    console.log('\n>>> TEST GROUP 6: Financial Analytics & Soft Reversal Audit Trail');

    const expCreateRes = await apiRequest('/api/owner/expenses', {
      method: 'POST',
      token: ownerToken,
      body: {
        category: 'packaging_subsidies',
        description: 'Audit test biodegradable containers',
        amount: 500,
        paymentMethod: 'upi',
      },
    });
    const createdExpId = expCreateRes.data?.expense?.id;
    const expDupRes = await apiRequest('/api/owner/expenses', {
      method: 'POST',
      token: ownerToken,
      body: {
        category: 'packaging_subsidies',
        description: 'Audit test biodegradable containers',
        amount: 500,
        paymentMethod: 'upi',
      },
    });
    const expReverseRes = await apiRequest(`/api/owner/expenses/${createdExpId}/reverse`, {
      method: 'POST',
      token: ownerToken,
      body: { reason: 'Audit test cleanup reversal' },
    });
    recordResult(
      'Operating expense duplicate prevention (409) & immutable soft reversal works',
      expCreateRes.status === 200 &&
        expDupRes.status === 409 &&
        expReverseRes.status === 200 &&
        expReverseRes.data?.expense?.isReversed === true
    );

    const analyticsRes = await apiRequest('/api/owner/analytics?timeRange=30d', {
      token: ownerToken,
    });
    const metrics = analyticsRes.data?.metrics;
    recordResult(
      'Owner analytics separates GMV, commission, cook payouts, COD collected & excludes reversed expenses',
      analyticsRes.status === 200 &&
        metrics &&
        metrics.grossMerchandiseValue > metrics.totalCookNowPlatformRevenue &&
        metrics.cashCollected >= 198 &&
        metrics.reversedExpensesCount >= 1
    );

    // --------------------------------------------------------------------------
    // TEST GROUP 7: SUPABASE ARCHIVE & FIRESTORE RULES INTEGRITY
    // --------------------------------------------------------------------------
    console.log('\n>>> TEST GROUP 7: Firestore Rules, Supabase Standby & Secret Safety');

    const apiCode = fs.readFileSync('api/index.ts', 'utf8');
    recordResult(
      'Backend resolves server-only Admin credentials without VITE_ private key leakage or Supabase in /orders/place',
      apiCode.includes('FIREBASE_SERVICE_ACCOUNT_JSON') &&
        apiCode.includes('resolveFirebaseServiceAccount') &&
        !apiCode.includes('VITE_FIREBASE_PRIVATE_KEY') &&
        !apiCode.includes('@supabase/supabase-js')
    );

    const m1Exists = fs.existsSync('supabase/migrations/001_initial_schema.sql');
    const m2Exists = fs.existsSync('supabase/migrations/002_extended_features.sql');
    const m3Exists = fs.existsSync('supabase/migrations/003_transactional_order_backend.sql');
    recordResult(
      'Archived Supabase SQL migration files remain intact (non-destructive)',
      m1Exists && m2Exists && m3Exists
    );

    const rulesCode = fs.readFileSync('firestore.rules', 'utf8');
    recordResult(
      'firestore.rules protects orders, settlements, operating_expenses, audit_logs & support_tickets',
      rulesCode.includes('match /orders/{orderId}') &&
        rulesCode.includes('match /settlements/{settlementId}') &&
        rulesCode.includes('match /operating_expenses/{expenseId}') &&
        rulesCode.includes('match /audit_logs/{logId}') &&
        rulesCode.includes('match /support_tickets/{ticketId}') &&
        rulesCode.includes('match /internal_notes/{noteId}')
    );

    // --------------------------------------------------------------------------
    // TEST GROUP 8: CUSTOMER CARE & SUPPORT CENTRE (OWNER + CUSTOMER)
    // --------------------------------------------------------------------------
    console.log('\n>>> TEST GROUP 8: Customer Care & Support Centre (RBAC, Order-Link, Notes, Refunds, CSAT)');

    const unauthSupportRes = await apiRequest('/api/support/tickets');
    recordResult(
      'Unauthenticated GET /api/support/tickets rejected with HTTP 401',
      unauthSupportRes.status === 401
    );

    const customerOwnerListDenied = await apiRequest('/api/support/tickets', {
      token: customerToken,
    });
    recordResult(
      'Non-owner customer blocked from Owner support dashboard GET /api/support/tickets (HTTP 403)',
      customerOwnerListDenied.status === 403
    );

    const crossOrderTicketDenied = await apiRequest('/api/support/tickets', {
      method: 'POST',
      token: secondCustomerToken,
      body: {
        category: 'Missing Item',
        priority: 'High',
        subject: 'Attempt attaching another customer order',
        description: 'Testing cross-customer order linkage authorization check.',
        orderId: placedSmallOrder?.id,
      },
    });
    recordResult(
      'Cross-customer order linkage blocked with HTTP 403',
      crossOrderTicketDenied.status === 403
    );

    const createOrderTicketRes = await apiRequest('/api/support/tickets', {
      method: 'POST',
      token: customerToken,
      body: {
        category: 'Missing Item',
        priority: 'Urgent',
        subject: 'Sweet kheer missing in delivered dinner order',
        description: 'Received main thali items, but one side item was missing from thermal bag.',
        orderId: placedSmallOrder?.id,
        customerPhone: '9876543210',
        requestRefund: true,
      },
    });
    const orderTicket = createOrderTicketRes.data?.ticket;
    recordResult(
      'Customer creates order-linked Urgent ticket with real orderSnapshot & Requested refund',
      createOrderTicketRes.status === 201 &&
        Boolean(orderTicket?.id) &&
        orderTicket?.orderId === placedSmallOrder?.id &&
        orderTicket?.orderSnapshot?.kitchenName === "Sunita's Pahadi Rasoi" &&
        orderTicket?.refund?.status === 'Requested'
    );

    const createGeneralTicketRes = await apiRequest('/api/support/tickets', {
      method: 'POST',
      token: secondCustomerToken,
      body: {
        category: 'Account / Login Issue',
        priority: 'Low',
        subject: 'Hostel address update clarification',
        description: 'Unable to edit saved hostel room number on profile page.',
        customerPhone: '9811122233',
      },
    });
    const generalTicket = createGeneralTicketRes.data?.ticket;
    recordResult(
      'Second customer creates general Low-priority ticket cleanly',
      createGeneralTicketRes.status === 201 && Boolean(generalTicket?.id)
    );

    const customer1MyTicketsRes = await apiRequest('/api/support/my-tickets', {
      token: customerToken,
    });
    recordResult(
      'GET /api/support/my-tickets enforces strict UID isolation (customer 1 only sees own ticket)',
      customer1MyTicketsRes.status === 200 &&
        customer1MyTicketsRes.data?.tickets?.some((t: any) => t.id === orderTicket?.id) &&
        !customer1MyTicketsRes.data?.tickets?.some((t: any) => t.id === generalTicket?.id)
    );

    const crossCustomerTicketReadDenied = await apiRequest(`/api/support/tickets/${orderTicket?.id}`, {
      token: secondCustomerToken,
    });
    recordResult(
      'Cross-customer GET /api/support/tickets/:id rejected with HTTP 403',
      crossCustomerTicketReadDenied.status === 403
    );

    const ownerFilterSearchRes = await apiRequest(
      `/api/support/tickets?search=${encodeURIComponent(orderTicket?.id || '')}&priority=Urgent&status=Open`,
      { token: ownerToken }
    );
    const initialStats = ownerFilterSearchRes.data?.stats;
    recordResult(
      'Owner GET /api/support/tickets filters by search/priority/status & computes real Firestore KPI stats',
      ownerFilterSearchRes.status === 200 &&
        ownerFilterSearchRes.data?.tickets?.length === 1 &&
        initialStats?.totalTickets === 2 &&
        initialStats?.openTickets === 2 &&
        initialStats?.urgentActiveTickets === 1
    );

    const customerInternalNoteDenied = await apiRequest(
      `/api/support/tickets/${orderTicket?.id}/internal-notes`,
      {
        method: 'POST',
        token: customerToken,
        body: { body: 'Trying to inject staff internal note' },
      }
    );
    recordResult(
      'Customer blocked from adding internal staff notes (HTTP 403)',
      customerInternalNoteDenied.status === 403
    );

    const ownerInternalNoteRes = await apiRequest(
      `/api/support/tickets/${orderTicket?.id}/internal-notes`,
      {
        method: 'POST',
        token: ownerToken,
        body: { body: 'Verified with Sunita Rasoi kitchen CCTV — kheer cup left on counter.' },
      }
    );
    const ownerReplyRes = await apiRequest(`/api/support/tickets/${orderTicket?.id}/reply`, {
      method: 'POST',
      token: ownerToken,
      body: {
        body: 'Apologies Aarav! We verified this with the kitchen and approved your ₹49 partial refund.',
        nextStatus: 'Waiting for Customer',
      },
    });
    const customerReadDetailRes = await apiRequest(`/api/support/tickets/${orderTicket?.id}?markRead=true`, {
      token: customerToken,
    });
    recordResult(
      'Owner internal note is strictly isolated from Customer GET detail while public reply is visible',
      ownerInternalNoteRes.status === 201 &&
        ownerReplyRes.status === 200 &&
        customerReadDetailRes.status === 200 &&
        customerReadDetailRes.data?.messages?.length === 2 &&
        customerReadDetailRes.data?.internalNotes === undefined &&
        !JSON.stringify(customerReadDetailRes.data).includes('CCTV')
    );

    const ownerReadDetailRes = await apiRequest(`/api/support/tickets/${orderTicket?.id}`, {
      token: ownerToken,
    });
    recordResult(
      'Owner GET ticket detail receives internalNotes, messages, linkedOrder & auditLogs',
      ownerReadDetailRes.status === 200 &&
        ownerReadDetailRes.data?.internalNotes?.length === 1 &&
        ownerReadDetailRes.data?.linkedOrder?.id === placedSmallOrder?.id &&
        Array.isArray(ownerReadDetailRes.data?.auditLogs)
    );

    // Refund Validation & Audit Guards
    const overOrderRefundRes = await apiRequest(`/api/support/tickets/${orderTicket?.id}/refund`, {
      method: 'POST',
      token: ownerToken,
      body: {
        status: 'Approved',
        amount: 9999,
        reason: 'Testing order total cap enforcement',
      },
    });
    const unconfirmedProcessedRefundRes = await apiRequest(
      `/api/support/tickets/${orderTicket?.id}/refund`,
      {
        method: 'POST',
        token: ownerToken,
        body: {
          status: 'Processed',
          amount: 49,
          reason: 'Partial refund for missing item',
          manualConfirmationChecked: false,
          settlementReference: '',
        },
      }
    );
    const approvedRefundRes = await apiRequest(`/api/support/tickets/${orderTicket?.id}/refund`, {
      method: 'POST',
      token: ownerToken,
      body: {
        status: 'Approved',
        amount: 49,
        reason: 'Verified missing dessert cup',
      },
    });
    const processedRefundRes = await apiRequest(`/api/support/tickets/${orderTicket?.id}/refund`, {
      method: 'POST',
      token: ownerToken,
      body: {
        status: 'Processed',
        amount: 49,
        reason: 'Manually settled via UPI to customer mobile',
        settlementReference: 'UPI-MAN-884201',
        manualConfirmationChecked: true,
      },
    });
    recordResult(
      'Refund engine blocks over-amount & unconfirmed Processed, and audits Approved -> Processed settlement',
      overOrderRefundRes.status === 400 &&
        unconfirmedProcessedRefundRes.status === 400 &&
        approvedRefundRes.status === 200 &&
        processedRefundRes.status === 200 &&
        processedRefundRes.data?.refund?.status === 'Processed' &&
        processedRefundRes.data?.refund?.settlementReference === 'UPI-MAN-884201'
    );

    // CSAT blocked before Resolved
    const earlyCsatRes = await apiRequest(`/api/support/tickets/${orderTicket?.id}/csat`, {
      method: 'POST',
      token: customerToken,
      body: { rating: 5, feedback: 'Too early' },
    });
    const resolveTicketRes = await apiRequest(`/api/support/tickets/${orderTicket?.id}`, {
      method: 'PATCH',
      token: ownerToken,
      body: {
        status: 'Resolved',
        assignedAgentId: 'owner-vivek',
        assignedAgentName: 'Vivek Singh Negi (Owner · Super Admin)',
      },
    });
    const validCsatRes = await apiRequest(`/api/support/tickets/${orderTicket?.id}/csat`, {
      method: 'POST',
      token: customerToken,
      body: { rating: 5, feedback: 'Fast response and fair settlement.' },
    });
    const finalOwnerListRes = await apiRequest('/api/support/tickets', {
      token: ownerToken,
    });
    const finalStats = finalOwnerListRes.data?.stats;
    recordResult(
      'Status transition to Resolved sets resolvedAt, enables 1-5 CSAT rating & updates live CSAT/Resolution KPIs',
      earlyCsatRes.status === 400 &&
        resolveTicketRes.status === 200 &&
        Boolean(resolveTicketRes.data?.ticket?.resolvedAt) &&
        validCsatRes.status === 200 &&
        validCsatRes.data?.ticket?.satisfactionRating === 5 &&
        finalStats?.resolvedTickets === 1 &&
        finalStats?.avgSatisfactionRating === 5 &&
        finalStats?.satisfactionResponseCount === 1 &&
        typeof finalStats?.avgResolutionMinutes === 'number'
    );

    console.log('\n================================================================');
    console.log(
      `   TEST EXECUTION SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round(
        (passedTests / totalTests) * 100
      )}%)`
    );
    console.log('================================================================\n');

    if (failures.length > 0) {
      console.error('Failed tests:', failures);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Test suite failed with unexpected error:', err);
    process.exit(1);
  } finally {
    delete process.env.COOKNOW_TEST_PUBLIC_JWK;
    if (server) {
      server.close();
    }
  }
}

runTestSuite().catch((e) => {
  console.error(e);
  process.exit(1);
});

