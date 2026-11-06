-- CookNow Marketplace Initial Supabase/PostgreSQL Migration
-- Target launch market: Nalapani Chowk, Dehradun, Uttarakhand, India

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Supabase Auth integration)
CREATE TYPE user_role AS ENUM ('customer', 'cook', 'admin');

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'customer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. COOKS TABLE
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected', 'not_applied');

CREATE TABLE IF NOT EXISTS public.cooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    kitchen_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    bio TEXT NOT NULL,
    address TEXT NOT NULL,
    locality TEXT NOT NULL DEFAULT 'Nalapani Chowk',
    city TEXT NOT NULL DEFAULT 'Dehradun',
    state TEXT NOT NULL DEFAULT 'Uttarakhand',
    fssai_number TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verification_status verification_status NOT NULL DEFAULT 'pending',
    verification_notes TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    rating NUMERIC(2, 1) NOT NULL DEFAULT 5.0,
    review_count INTEGER NOT NULL DEFAULT 0,
    specialty TEXT,
    delivery_time_min INTEGER NOT NULL DEFAULT 20,
    delivery_time_max INTEGER NOT NULL DEFAULT 35,
    is_accepting_orders BOOLEAN NOT NULL DEFAULT true,
    commission_rate_percent NUMERIC(4, 2) NOT NULL DEFAULT 15.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT 'Hostel/PG',
    hostel_or_pg_name TEXT,
    room_or_flat TEXT,
    address_line TEXT NOT NULL,
    landmark TEXT,
    locality TEXT NOT NULL DEFAULT 'Nalapani Chowk',
    city TEXT NOT NULL DEFAULT 'Dehradun',
    pincode TEXT NOT NULL DEFAULT '248008',
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. MENU ITEMS TABLE
CREATE TYPE dietary_type AS ENUM ('pure_veg', 'egg', 'non_veg');

CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cook_id UUID NOT NULL REFERENCES public.cooks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(8, 2) NOT NULL CHECK (price >= 0),
    category TEXT NOT NULL,
    dietary_type dietary_type NOT NULL DEFAULT 'pure_veg',
    prep_time_minutes INTEGER NOT NULL DEFAULT 20 CHECK (prep_time_minutes > 0),
    is_available BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    portion_size TEXT,
    spice_level TEXT DEFAULT 'Medium',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. ORDERS TABLE
CREATE TYPE order_status AS ENUM (
    'pending',
    'accepted',
    'preparing',
    'ready',
    'out_for_delivery',
    'delivered',
    'cancelled'
);

CREATE TYPE payment_method AS ENUM ('cod', 'upi_online');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded');

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code TEXT UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.profiles(id),
    cook_id UUID NOT NULL REFERENCES public.cooks(id),
    status order_status NOT NULL DEFAULT 'pending',
    items_subtotal NUMERIC(10, 2) NOT NULL CHECK (items_subtotal >= 0),
    delivery_fee NUMERIC(6, 2) NOT NULL DEFAULT 25.00,
    platform_fee NUMERIC(6, 2) NOT NULL DEFAULT 5.00,
    packaging_fee NUMERIC(6, 2) NOT NULL DEFAULT 10.00,
    discount NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    final_payable_amount NUMERIC(10, 2) NOT NULL CHECK (final_payable_amount >= 0),
    platform_commission NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cook_earnings NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method payment_method NOT NULL DEFAULT 'cod',
    payment_status payment_status NOT NULL DEFAULT 'pending',
    delivery_address JSONB NOT NULL,
    delivery_instructions TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    unit_price NUMERIC(8, 2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(10, 2) NOT NULL,
    dietary_type dietary_type NOT NULL DEFAULT 'pure_veg'
);

-- 7. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id),
    cook_id UUID NOT NULL REFERENCES public.cooks(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_reported BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. COOK VERIFICATION REQUESTS
CREATE TABLE IF NOT EXISTS public.cook_verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cook_id UUID NOT NULL REFERENCES public.cooks(id) ON DELETE CASCADE,
    applicant_name TEXT NOT NULL,
    kitchen_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    locality TEXT NOT NULL,
    fssai_number TEXT,
    id_proof_type TEXT NOT NULL,
    id_proof_number TEXT NOT NULL,
    kitchen_photos JSONB DEFAULT '[]'::jsonb,
    status verification_status NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewer_notes TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reviewed_at TIMESTAMPTZ
);

-- 9. PLATFORM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_cooks_locality ON public.cooks(locality);
CREATE INDEX IF NOT EXISTS idx_cooks_verified ON public.cooks(is_verified);
CREATE INDEX IF NOT EXISTS idx_menu_items_cook ON public.menu_items(cook_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_cook ON public.orders(cook_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_reviews_cook ON public.reviews(cook_id);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cook_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current authenticated user is an administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can select/update their own profile. Admins can view all.
CREATE POLICY "Public profile view" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Cooks: Approved verified cooks are public. Cooks can view/update their own record. Admins full access.
CREATE POLICY "Public view approved cooks" ON public.cooks FOR SELECT
USING (is_verified = true OR user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Cooks update own kitchen" ON public.cooks FOR UPDATE
USING (user_id = auth.uid() OR public.is_admin());

-- Menu Items: Public can view available items of verified cooks. Cooks can manage their own.
CREATE POLICY "Public view menu items" ON public.menu_items FOR SELECT
USING (true);

CREATE POLICY "Cooks manage menu items" ON public.menu_items FOR ALL
USING (
    cook_id IN (SELECT id FROM public.cooks WHERE user_id = auth.uid())
    OR public.is_admin()
);

-- Orders: Customers access own orders. Cooks access orders for their kitchen. Admins full access.
CREATE POLICY "Customer order access" ON public.orders FOR SELECT
USING (customer_id = auth.uid() OR cook_id IN (SELECT id FROM public.cooks WHERE user_id = auth.uid()) OR public.is_admin());

CREATE POLICY "Customer create orders" ON public.orders FOR INSERT
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Cook update order status" ON public.orders FOR UPDATE
USING (
    cook_id IN (SELECT id FROM public.cooks WHERE user_id = auth.uid())
    OR customer_id = auth.uid()
    OR public.is_admin()
);

-- Order Items
CREATE POLICY "Order items access" ON public.order_items FOR SELECT
USING (
    order_id IN (
        SELECT id FROM public.orders
        WHERE customer_id = auth.uid()
        OR cook_id IN (SELECT id FROM public.cooks WHERE user_id = auth.uid())
        OR public.is_admin()
    )
);

-- Reviews
CREATE POLICY "Public view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Customer create reviews" ON public.reviews FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Admin manage reviews" ON public.reviews FOR ALL USING (public.is_admin());

-- Verification Requests: Cook sees own, Admin manages
CREATE POLICY "Cook manage verification" ON public.cook_verification_requests FOR SELECT
USING (
    cook_id IN (SELECT id FROM public.cooks WHERE user_id = auth.uid())
    OR public.is_admin()
);

CREATE POLICY "Admin update verification" ON public.cook_verification_requests FOR UPDATE
USING (public.is_admin());

-- Platform Settings: Public can read, only admin can write
CREATE POLICY "Public read platform settings" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Admin manage platform settings" ON public.platform_settings FOR ALL USING (public.is_admin());
