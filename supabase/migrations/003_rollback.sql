-- ==============================================================================
-- CookNow Marketplace - Supabase PostgreSQL Migration 003 Rollback Script
-- Safe administrative reversal of Migration 003 components
-- ==============================================================================

-- 1. DROP RPC FUNCTION
DROP FUNCTION IF EXISTS public.place_order_secure(TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, UUID, JSONB, TEXT, JSONB, TEXT);

-- 2. DROP AUXILIARY TABLES (Preserves public.orders, public.order_items, and public.profiles)
DROP TABLE IF EXISTS public.order_idempotency;
DROP TABLE IF EXISTS public.coupon_redemptions;

-- 3. DROP NON-ESSENTIAL INDEXES
DROP INDEX IF EXISTS public.idx_profiles_firebase_uid;
DROP INDEX IF EXISTS public.idx_orders_discount_code;

-- CRITICAL SAFETY INVARIANTS:
-- A. DO NOT RESTORE 'CREATE POLICY "Customer create orders" ON public.orders;'.
--    Client-side order insertion allows client price tampering.
-- B. DO NOT RE-ADD 'ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);'.
--    Once Firebase users exist in public.profiles, re-adding this constraint will abort with Foreign Key Violations.
