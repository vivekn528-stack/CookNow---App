-- ==============================================================================
-- CookNow Marketplace - Supabase PostgreSQL Migration 003
-- Title: Transactional Order Placement Backend & Security Hardening
-- Launch Market: Nalapani Chowk, Dehradun, Uttarakhand, India
-- ==============================================================================

-- 1. EXTEND EXISTING TABLES SAFELY
-- Add compatibility columns without affecting existing live queries
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS discount_code TEXT,
ADD COLUMN IF NOT EXISTS events JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_firebase_uid ON public.profiles(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_orders_discount_code ON public.orders(discount_code);

-- 2. DECOUPLE PROFILES FROM auth.users
-- Allows Firebase Authentication customers to persist profile records in Supabase
-- Preserves all other 8 foreign-key relationships referencing public.profiles(id)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. CREATE IDEMPOTENCY TABLE
-- Prevents duplicate orders from client network retries or double-clicks
CREATE TABLE IF NOT EXISTS public.order_idempotency (
    idempotency_key TEXT PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    payload_signature TEXT NOT NULL,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    response_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_order_idempotency_customer ON public.order_idempotency(customer_id);

-- 4. CREATE COUPON REDEMPTIONS TABLE
-- Enforces per-customer and global usage limits atomically
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    discount_amount NUMERIC(8, 2) NOT NULL CHECK (discount_amount > 0),
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_lookup
ON public.coupon_redemptions(promo_id, customer_id);

-- 5. HARDEN ROW LEVEL SECURITY
-- Revoke direct client-side order creation.
-- Only server-authoritative transactions (service_role / SECURITY DEFINER) can insert orders.
DROP POLICY IF EXISTS "Customer create orders" ON public.orders;

-- 6. SERVER-AUTHORITATIVE CHECKOUT FUNCTION
CREATE OR REPLACE FUNCTION public.place_order_secure(
    p_customer_uid TEXT,
    p_customer_email TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_email_verified BOOLEAN,
    p_idempotency_key TEXT,
    p_payload_signature TEXT,
    p_cook_id UUID,
    p_items JSONB,
    p_promo_code TEXT,
    p_delivery_address JSONB,
    p_delivery_instructions TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_customer_uuid UUID;
    v_is_suspended BOOLEAN := false;
    v_existing_profile_by_email RECORD;
    v_order_id UUID;
    v_order_code TEXT;
    v_existing_idempotency RECORD;
    v_cook RECORD;
    v_item RECORD;
    v_menu_row RECORD;
    v_promo RECORD;
    v_existing_redemptions_count INT;
    v_items_subtotal NUMERIC(10, 2) := 0.00;
    v_delivery_fee NUMERIC(6, 2) := 25.00;
    v_platform_fee NUMERIC(6, 2) := 5.00;
    v_packaging_fee NUMERIC(6, 2) := 10.00;
    v_discount NUMERIC(6, 2) := 0.00;
    v_final_payable_amount NUMERIC(10, 2);
    v_platform_commission NUMERIC(10, 2);
    v_cook_earnings NUMERIC(10, 2);
    v_commission_rate NUMERIC(4, 2) := 15.00;
    v_discount_funding public.discount_funding_source := 'cooknow_funded';
    v_applied_promo_code TEXT := NULL;
    v_promo_id UUID := NULL;
    v_current_ist_date DATE;
    v_returned_items JSONB := '[]'::jsonb;
    v_response JSONB;
BEGIN
    -- 1. Validate mandatory parameters
    IF p_customer_uid IS NULL OR TRIM(p_customer_uid) = '' THEN
        RAISE EXCEPTION 'Customer UID is required from verified token' USING ERRCODE = '28000';
    END IF;

    IF p_idempotency_key IS NULL OR TRIM(p_idempotency_key) = '' THEN
        RAISE EXCEPTION 'idempotencyKey is required' USING ERRCODE = '22023';
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one item' USING ERRCODE = '22023';
    END IF;

    -- 2. ACQUIRE 64-BIT TRANSACTION-LEVEL ADVISORY LOCK (IDEMPOTENCY CONCURRENCY)
    -- Serializes simultaneous identical-key checkouts; automatically released at transaction end
    PERFORM pg_advisory_xact_lock(
        hashtext('cooknow:order:lock:k1:' || p_idempotency_key),
        hashtext('cooknow:order:lock:k2:' || p_idempotency_key)
    );

    -- 3. RESOLVE OR CREATE CUSTOMER PROFILE SAFELY (RACE-SAFE IDENTITY LINKING)
    -- Acquire transaction advisory locks for customer UID and verified email
    PERFORM pg_advisory_xact_lock(
        hashtext('cooknow:profile:uid:' || p_customer_uid),
        hashtext('cooknow:profile:salt')
    );

    IF p_email_verified IS TRUE AND p_customer_email IS NOT NULL AND TRIM(p_customer_email) != '' THEN
        PERFORM pg_advisory_xact_lock(
            hashtext('cooknow:profile:link:email:k1:' || LOWER(TRIM(p_customer_email))),
            hashtext('cooknow:profile:link:email:k2:' || LOWER(TRIM(p_customer_email)))
        );
    END IF;

    -- 3.1 Look up by verified Firebase UID
    SELECT id, is_suspended INTO v_customer_uuid, v_is_suspended
    FROM public.profiles
    WHERE firebase_uid = p_customer_uid;

    -- 3.2 If not found by UID, but email is verified, attempt atomic link
    IF v_customer_uuid IS NULL AND p_email_verified IS TRUE AND p_customer_email IS NOT NULL AND TRIM(p_customer_email) != '' THEN
        UPDATE public.profiles
        SET firebase_uid = p_customer_uid,
            full_name = COALESCE(NULLIF(TRIM(p_customer_name), ''), full_name),
            phone = COALESCE(NULLIF(TRIM(p_customer_phone), ''), phone),
            updated_at = timezone('utc'::text, now())
        WHERE email = LOWER(TRIM(p_customer_email))
          AND firebase_uid IS NULL
        RETURNING id, is_suspended INTO v_customer_uuid, v_is_suspended;

        -- Check if email was already claimed by another Firebase UID
        IF v_customer_uuid IS NULL THEN
            SELECT id INTO v_existing_profile_by_email
            FROM public.profiles
            WHERE email = LOWER(TRIM(p_customer_email));

            IF FOUND THEN
                RAISE EXCEPTION 'Email % is already linked to another registered account', p_customer_email USING ERRCODE = '23505';
            END IF;
        END IF;
    END IF;

    -- 3.3 If still not found, insert new profile atomically with ON CONFLICT resolution
    IF v_customer_uuid IS NULL THEN
        v_customer_uuid := gen_random_uuid();
        INSERT INTO public.profiles (
            id,
            firebase_uid,
            email,
            full_name,
            phone,
            role,
            is_suspended,
            created_at,
            updated_at
        ) VALUES (
            v_customer_uuid,
            p_customer_uid,
            COALESCE(LOWER(TRIM(p_customer_email)), p_customer_uid || '@cooknow.internal'),
            COALESCE(NULLIF(TRIM(p_customer_name), ''), 'CookNow Customer'),
            NULLIF(TRIM(p_customer_phone), ''),
            'customer',
            false,
            timezone('utc'::text, now()),
            timezone('utc'::text, now())
        )
        ON CONFLICT (firebase_uid) DO UPDATE
        SET updated_at = timezone('utc'::text, now())
        RETURNING id, is_suspended INTO v_customer_uuid, v_is_suspended;
    END IF;

    IF v_is_suspended THEN
        RAISE EXCEPTION 'Customer account is suspended' USING ERRCODE = '42501';
    END IF;

    -- 4. CHECK IDEMPOTENCY RECORD
    SELECT * INTO v_existing_idempotency
    FROM public.order_idempotency
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        IF v_existing_idempotency.customer_id != v_customer_uuid THEN
            RAISE EXCEPTION 'Idempotency key belongs to another customer' USING ERRCODE = '42501';
        END IF;

        IF v_existing_idempotency.payload_signature != p_payload_signature THEN
            RAISE EXCEPTION 'Idempotency key was reused with a different payload' USING ERRCODE = '23505';
        END IF;

        -- Return existing order without modifying coupon counters
        RETURN v_existing_idempotency.response_payload;
    END IF;

    -- 5. VALIDATE COOK KITCHEN
    SELECT id, kitchen_name, is_verified, is_accepting_orders, commission_rate_percent
    INTO v_cook
    FROM public.cooks
    WHERE id = p_cook_id
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cook kitchen was not found' USING ERRCODE = 'P0002';
    END IF;

    IF NOT v_cook.is_verified THEN
        RAISE EXCEPTION 'Kitchen "%" is not verified to accept orders', v_cook.kitchen_name USING ERRCODE = '55000';
    END IF;

    IF NOT v_cook.is_accepting_orders THEN
        RAISE EXCEPTION 'Kitchen "%" is currently not accepting orders', v_cook.kitchen_name USING ERRCODE = '55000';
    END IF;

    v_commission_rate := COALESCE(v_cook.commission_rate_percent, 15.00);

    -- 6. VALIDATE MENU ITEMS & COMPUTE SUBTOTAL (SORTED ASCENDING FOR DEADLOCK-FREE LOCKING)
    FOR v_item IN
        SELECT
            (x->>'menuItemId')::uuid AS menu_item_id,
            (x->>'quantity')::int AS quantity
        FROM jsonb_array_elements(p_items) AS x
        ORDER BY (x->>'menuItemId')::uuid ASC
    LOOP
        IF v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Quantity for item % must be positive', v_item.menu_item_id USING ERRCODE = '22023';
        END IF;

        -- Freeze catalog price and availability during checkout
        SELECT id, cook_id, name, price, is_available, dietary_type
        INTO v_menu_row
        FROM public.menu_items
        WHERE id = v_item.menu_item_id
        FOR SHARE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Meal item % was not found in catalog', v_item.menu_item_id USING ERRCODE = 'P0002';
        END IF;

        IF NOT v_menu_row.is_available THEN
            RAISE EXCEPTION 'Dish "%" is currently sold out or unavailable', v_menu_row.name USING ERRCODE = '55000';
        END IF;

        IF v_menu_row.cook_id != p_cook_id THEN
            RAISE EXCEPTION 'Dish "%" does not belong to the selected kitchen', v_menu_row.name USING ERRCODE = '22023';
        END IF;

        v_items_subtotal := v_items_subtotal + (v_menu_row.price * v_item.quantity);

        v_returned_items := v_returned_items || jsonb_build_object(
            'menuItemId', v_menu_row.id,
            'itemName', v_menu_row.name,
            'unitPrice', v_menu_row.price,
            'quantity', v_item.quantity,
            'subtotal', (v_menu_row.price * v_item.quantity),
            'dietaryType', v_menu_row.dietary_type
        );
    END LOOP;

    -- 7. COMPUTE STANDARD FEES
    -- Delivery Fee: ₹25 standard; waived if subtotal >= ₹250
    IF v_items_subtotal >= 250.00 THEN
        v_delivery_fee := 0.00;
    ELSE
        v_delivery_fee := 25.00;
    END IF;

    -- 8. ATOMIC COUPON VALIDATION
    IF p_promo_code IS NOT NULL AND TRIM(p_promo_code) != '' THEN
        v_current_ist_date := (timezone('Asia/Kolkata', now()))::date;

        SELECT * INTO v_promo
        FROM public.promotions
        WHERE code = UPPER(TRIM(p_promo_code))
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Coupon "%" is invalid', p_promo_code USING ERRCODE = 'P0002';
        END IF;

        IF NOT v_promo.is_active THEN
            RAISE EXCEPTION 'Coupon "%" is no longer active', p_promo_code USING ERRCODE = '55000';
        END IF;

        IF v_current_ist_date < v_promo.start_date THEN
            RAISE EXCEPTION 'Coupon "%" is not active yet', p_promo_code USING ERRCODE = '55000';
        END IF;

        IF v_current_ist_date > v_promo.end_date THEN
            RAISE EXCEPTION 'Coupon "%" has expired', p_promo_code USING ERRCODE = '55000';
        END IF;

        IF v_items_subtotal < v_promo.min_order_value THEN
            RAISE EXCEPTION 'Coupon "%" requires a minimum subtotal of ₹%', p_promo_code, v_promo.min_order_value USING ERRCODE = '55000';
        END IF;

        IF v_promo.current_usage_count >= v_promo.usage_limit THEN
            RAISE EXCEPTION 'Coupon "%" has reached its global redemption limit', p_promo_code USING ERRCODE = '55000';
        END IF;

        SELECT COUNT(*) INTO v_existing_redemptions_count
        FROM public.coupon_redemptions
        WHERE promo_id = v_promo.id AND customer_id = v_customer_uuid;

        IF v_existing_redemptions_count >= v_promo.per_customer_limit THEN
            RAISE EXCEPTION 'You have already used coupon "%" the maximum allowed times', p_promo_code USING ERRCODE = '55000';
        END IF;

        IF v_promo.discount_type = 'percentage' THEN
            v_discount := ROUND((v_items_subtotal * (v_promo.discount_value / 100.0)), 2);
        ELSE
            v_discount := v_promo.discount_value;
        END IF;

        IF v_discount > v_promo.max_discount_cap THEN
            v_discount := v_promo.max_discount_cap;
        END IF;

        IF v_discount > v_items_subtotal THEN
            v_discount := v_items_subtotal;
        END IF;

        IF (v_promo.spent_budget + v_discount) > v_promo.budget_limit THEN
            RAISE EXCEPTION 'Coupon "%" has reached its maximum total promotional budget', p_promo_code USING ERRCODE = '55000';
        END IF;

        IF v_discount > 0.00 THEN
            v_applied_promo_code := v_promo.code;
            v_promo_id := v_promo.id;
            v_discount_funding := v_promo.funding_source;
        ELSE
            v_discount := 0.00;
        END IF;
    END IF;

    -- 9. TOTALS & COMMISSIONS
    v_final_payable_amount := v_items_subtotal + v_delivery_fee + v_platform_fee + v_packaging_fee - v_discount;
    IF v_final_payable_amount < 0.00 THEN
        v_final_payable_amount := 0.00;
    END IF;

    v_platform_commission := ROUND(v_items_subtotal * (v_commission_rate / 100.0), 2);
    v_cook_earnings := v_items_subtotal - v_platform_commission;

    -- 10. INSERT ORDER
    v_order_id := gen_random_uuid();
    v_order_code := 'CN-ORD-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(md5(v_order_id::text), 1, 6));

    INSERT INTO public.orders (
        id,
        order_code,
        customer_id,
        cook_id,
        status,
        items_subtotal,
        delivery_fee,
        platform_fee,
        packaging_fee,
        discount,
        discount_code,
        discount_funding,
        final_payable_amount,
        platform_commission,
        cook_earnings,
        payment_method,
        payment_status,
        delivery_address,
        delivery_instructions,
        events,
        created_at,
        updated_at
    ) VALUES (
        v_order_id,
        v_order_code,
        v_customer_uuid,
        p_cook_id,
        'pending'::public.order_status,
        v_items_subtotal,
        v_delivery_fee,
        v_platform_fee,
        v_packaging_fee,
        v_discount,
        v_applied_promo_code,
        v_discount_funding,
        v_final_payable_amount,
        v_platform_commission,
        v_cook_earnings,
        'cod'::public.payment_method,
        'pending'::public.payment_status,
        p_delivery_address,
        p_delivery_instructions,
        jsonb_build_array(
            jsonb_build_object(
                'status', 'pending',
                'timestamp', TO_CHAR(timezone('utc'::text, now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                'note', 'Order placed successfully (Cash on Delivery)'
            )
        ),
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    );

    -- 11. INSERT ORDER ITEMS
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_returned_items) AS x(
        "menuItemId" UUID,
        "itemName" TEXT,
        "unitPrice" NUMERIC,
        "quantity" INT,
        "subtotal" NUMERIC,
        "dietaryType" public.dietary_type
    )
    LOOP
        INSERT INTO public.order_items (
            order_id,
            menu_item_id,
            item_name,
            unit_price,
            quantity,
            subtotal,
            dietary_type
        ) VALUES (
            v_order_id,
            v_item."menuItemId",
            v_item."itemName",
            v_item."unitPrice",
            v_item."quantity",
            v_item."subtotal",
            v_item."dietaryType"
        );
    END LOOP;

    -- 12. INCREMENT COUPON REDEMPTION (ONLY IF DISCOUNT > 0)
    IF v_promo_id IS NOT NULL AND v_discount > 0.00 THEN
        UPDATE public.promotions
        SET current_usage_count = current_usage_count + 1,
            spent_budget = spent_budget + v_discount
        WHERE id = v_promo_id;

        INSERT INTO public.coupon_redemptions (
            promo_id,
            customer_id,
            order_id,
            discount_amount
        ) VALUES (
            v_promo_id,
            v_customer_uuid,
            v_order_id,
            v_discount
        );
    END IF;

    -- 13. CONSTRUCT CAMELCASE RESPONSE MATCHING FRONTEND TYPES
    v_response := jsonb_build_object(
        'id', v_order_id,
        'orderCode', v_order_code,
        'customerId', v_customer_uuid,
        'customerName', COALESCE(p_customer_name, 'CookNow Customer'),
        'customerPhone', COALESCE(p_customer_phone, ''),
        'cookId', p_cook_id,
        'kitchenName', v_cook.kitchen_name,
        'status', 'pending',
        'items', v_returned_items,
        'itemsSubtotal', v_items_subtotal,
        'deliveryFee', v_delivery_fee,
        'platformFee', v_platform_fee,
        'packagingFee', v_packaging_fee,
        'discount', v_discount,
        'discountCode', v_applied_promo_code,
        'discountFunding', v_discount_funding,
        'finalPayableAmount', v_final_payable_amount,
        'platformCommission', v_platform_commission,
        'cookEarnings', v_cook_earnings,
        'paymentMethod', 'cod',
        'paymentStatus', 'pending',
        'deliveryAddress', p_delivery_address,
        'deliveryInstructions', p_delivery_instructions,
        'deliveryStatus', 'unassigned',
        'events', jsonb_build_array(
            jsonb_build_object(
                'status', 'pending',
                'timestamp', TO_CHAR(timezone('utc'::text, now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                'note', 'Order placed successfully (Cash on Delivery)'
            )
        ),
        'createdAt', TO_CHAR(timezone('utc'::text, now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'updatedAt', TO_CHAR(timezone('utc'::text, now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );

    -- 14. RECORD IDEMPOTENCY
    INSERT INTO public.order_idempotency (
        idempotency_key,
        customer_id,
        payload_signature,
        order_id,
        response_payload
    ) VALUES (
        p_idempotency_key,
        v_customer_uuid,
        p_payload_signature,
        v_order_id,
        v_response
    );

    RETURN v_response;
END;
$$;

-- 7. STRICT PERMISSIONS
REVOKE ALL ON FUNCTION public.place_order_secure(TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, UUID, JSONB, TEXT, JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.place_order_secure(TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, UUID, JSONB, TEXT, JSONB, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.place_order_secure(TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, UUID, JSONB, TEXT, JSONB, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.place_order_secure(TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, UUID, JSONB, TEXT, JSONB, TEXT) TO service_role;
