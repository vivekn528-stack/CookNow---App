-- CookNow Marketplace Extended Supabase/PostgreSQL Migration (Migration 002)
-- Includes: Partner Applications, Delivery Fleet, Monthly Meal Plans & Subscriptions,
-- Smart Discounts & Funding, Private Complaints, Operating Expenses Ledger, and Admin Audit Trail.

-- 1. UPDATE USER_ROLE AND VERIFICATION_STATUS ENUMS IF NEEDED
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'delivery';
ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'suspended';

CREATE TYPE partner_type AS ENUM ('home_cook', 'restaurant');
CREATE TYPE discount_funding_source AS ENUM ('cooknow_funded', 'restaurant_funded', 'shared_funded');
CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'completed', 'cancelled');
CREATE TYPE complaint_status AS ENUM ('open', 'investigating', 'resolved', 'dismissed');

-- 2. EXTEND EXISTING TABLES
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS is_student_special BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS student_meal_tier TEXT;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS discount_funding discount_funding_source DEFAULT 'cooknow_funded',
ADD COLUMN IF NOT EXISTS delivery_partner_id UUID,
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'unassigned';

-- 3. PARTNER ONBOARDING APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.partner_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    locality TEXT NOT NULL DEFAULT 'Nalapani Chowk',
    partner_type partner_type NOT NULL DEFAULT 'home_cook',
    food_categories TEXT[] NOT NULL DEFAULT '{}',
    sample_menu TEXT NOT NULL,
    expected_price_range TEXT NOT NULL,
    operating_hours TEXT NOT NULL,
    daily_capacity INTEGER NOT NULL DEFAULT 30,
    fssai_number TEXT NOT NULL,
    id_proof_type TEXT NOT NULL,
    id_proof_number TEXT NOT NULL,
    kitchen_photos TEXT[] DEFAULT '{}',
    status verification_status NOT NULL DEFAULT 'pending',
    reviewer_reason TEXT,
    reviewed_by TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reviewed_at TIMESTAMPTZ
);

-- 4. DELIVERY PARTNERS TABLE
CREATE TABLE IF NOT EXISTS public.delivery_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    service_area TEXT NOT NULL DEFAULT 'Nalapani Chowk & Neighboring Colleges',
    working_hours TEXT NOT NULL DEFAULT '11:30 AM - 10:30 PM',
    vehicle_type TEXT NOT NULL DEFAULT 'Motorcycle',
    vehicle_number TEXT,
    driving_license_number TEXT,
    aadhaar_number TEXT NOT NULL,
    status verification_status NOT NULL DEFAULT 'approved',
    reviewer_notes TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    rating NUMERIC(2, 1) NOT NULL DEFAULT 5.0,
    total_deliveries INTEGER NOT NULL DEFAULT 0,
    earnings_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. MONTHLY MEAL PLANS TABLE
CREATE TABLE IF NOT EXISTS public.meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.cooks(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    plan_type TEXT NOT NULL,
    price_per_month NUMERIC(8, 2) NOT NULL,
    meals_count INTEGER NOT NULL DEFAULT 30,
    duration_days INTEGER NOT NULL DEFAULT 30,
    meal_schedule TEXT NOT NULL DEFAULT 'Lunch (12:30 PM - 2:00 PM)',
    service_area TEXT NOT NULL DEFAULT 'Nalapani Chowk & College Hostels',
    is_available BOOLEAN NOT NULL DEFAULT true,
    sample_menu_highlights TEXT[] NOT NULL DEFAULT '{}',
    pauses_allowed INTEGER NOT NULL DEFAULT 4,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. CUSTOMER SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.customer_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE RESTRICT,
    plan_title TEXT NOT NULL,
    provider_id UUID NOT NULL REFERENCES public.cooks(id) ON DELETE RESTRICT,
    provider_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_meals INTEGER NOT NULL,
    meals_delivered INTEGER NOT NULL DEFAULT 0,
    meals_remaining INTEGER NOT NULL,
    status subscription_status NOT NULL DEFAULT 'active',
    delivery_address JSONB NOT NULL,
    pause_dates TEXT[] NOT NULL DEFAULT '{}',
    pauses_remaining INTEGER NOT NULL DEFAULT 4,
    payment_method payment_method NOT NULL DEFAULT 'cod',
    payment_status payment_status NOT NULL DEFAULT 'paid',
    paid_amount NUMERIC(8, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. PROMOTIONS & DISCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(8, 2) NOT NULL,
    min_order_value NUMERIC(8, 2) NOT NULL DEFAULT 0,
    max_discount_cap NUMERIC(8, 2) NOT NULL DEFAULT 500,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    eligible_category TEXT,
    funding_source discount_funding_source NOT NULL DEFAULT 'cooknow_funded',
    partner_share_percent NUMERIC(5, 2) DEFAULT 0,
    usage_limit INTEGER NOT NULL DEFAULT 500,
    current_usage_count INTEGER NOT NULL DEFAULT 0,
    per_customer_limit INTEGER NOT NULL DEFAULT 1,
    budget_limit NUMERIC(10, 2) NOT NULL DEFAULT 10000,
    spent_budget NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. COMPLAINTS & INVESTIGATIONS TABLE (Owner Private)
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    customer_anonymous_tag TEXT NOT NULL,
    customer_real_name_private TEXT NOT NULL,
    customer_phone_private TEXT NOT NULL,
    provider_id UUID NOT NULL REFERENCES public.cooks(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    delivery_partner_id UUID REFERENCES public.delivery_partners(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    status complaint_status NOT NULL DEFAULT 'open',
    resolution_notes TEXT,
    refund_issued NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ
);

-- 9. OPERATING EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.operating_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    recorded_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operating_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is owner or admin
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND (role = 'admin' OR email = 'vivekn528@gmail.com')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Meal Plans Policies
CREATE POLICY "Anyone can view available meal plans"
    ON public.meal_plans FOR SELECT
    USING (is_available = true OR public.is_admin_or_owner());

CREATE POLICY "Cooks and Admins can manage meal plans"
    ON public.meal_plans FOR ALL
    USING (public.is_admin_or_owner() OR provider_id IN (
        SELECT id FROM public.cooks WHERE user_id = auth.uid()
    ));

-- Customer Subscriptions Policies
CREATE POLICY "Customers can view their own subscriptions"
    ON public.customer_subscriptions FOR SELECT
    USING (customer_id = auth.uid() OR public.is_admin_or_owner());

CREATE POLICY "Customers can create subscriptions"
    ON public.customer_subscriptions FOR INSERT
    WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update their own subscriptions"
    ON public.customer_subscriptions FOR UPDATE
    USING (customer_id = auth.uid() OR public.is_admin_or_owner());

-- Promotions Policies
CREATE POLICY "Anyone can view active promotions"
    ON public.promotions FOR SELECT
    USING (is_active = true OR public.is_admin_or_owner());

CREATE POLICY "Only Admins can modify promotions"
    ON public.promotions FOR ALL
    USING (public.is_admin_or_owner());

-- Complaints Policies (Confidential)
CREATE POLICY "Customers can create complaints"
    ON public.complaints FOR INSERT
    WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can view their own complaints"
    ON public.complaints FOR SELECT
    USING (customer_id = auth.uid() OR public.is_admin_or_owner());

CREATE POLICY "Only Admins can view complaints investigation details"
    ON public.complaints FOR ALL
    USING (public.is_admin_or_owner());

-- Operating Expenses & Audit Logs (Admin only)
CREATE POLICY "Admins only for operating expenses"
    ON public.operating_expenses FOR ALL
    USING (public.is_admin_or_owner());

CREATE POLICY "Admins only for audit logs"
    ON public.admin_audit_logs FOR ALL
    USING (public.is_admin_or_owner());
