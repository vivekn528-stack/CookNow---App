-- CookNow Seed Data for Nalapani Chowk, Dehradun Launch
-- Run this in your Supabase SQL editor after applying 001_initial_schema.sql

-- Platform Settings
INSERT INTO public.platform_settings (key, value)
VALUES (
    'general',
    json_build_object(
        'commissionRatePercent', 15,
        'standardDeliveryFee', 25,
        'freeDeliveryThreshold', 250,
        'platformServiceFee', 5,
        'packagingFee', 10,
        'launchLocality', 'Nalapani Chowk, Dehradun, Uttarakhand',
        'supportPhone', '+91 94120 44556',
        'supportEmail', 'support@cooknow-dehradun.in'
    )
) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Sample profile seeds (in real Supabase, users are created through Auth)
-- Note: Replace UUIDs with real Supabase Auth user IDs when testing live Auth
INSERT INTO public.profiles (id, email, full_name, phone, role)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin@cooknow.in', 'Dehradun Ops Admin', '+91 94120 44556', 'admin'),
    ('a0000000-0000-0000-0000-000000000002', 'sunita.rawat@gmail.com', 'Sunita Rawat', '+91 98971 23450', 'cook'),
    ('a0000000-0000-0000-0000-000000000003', 'kamla.sharma@gmail.com', 'Kamla Sharma', '+91 98370 88219', 'cook'),
    ('a0000000-0000-0000-0000-000000000004', 'student.aman@upes.ac.in', 'Aman Negi', '+91 98765 43210', 'customer')
ON CONFLICT (id) DO NOTHING;

-- Seed verified home cooks
INSERT INTO public.cooks (
    id, user_id, kitchen_name, owner_name, phone, bio, address, locality, city, state, fssai_number, is_verified, verification_status, rating, review_count, specialty
) VALUES
(
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'Sunita''s Pahadi Rasoi',
    'Sunita Rawat',
    '+91 98971 23450',
    'Proud home cook from Pauri Garhwal now living in Nalapani Chowk. Cooking traditional Uttarakhand delicacies with hand-ground spices and organic millets.',
    'House 42, Near Shiv Mandir, Upper Nalapani Road',
    'Nalapani Chowk',
    'Dehradun',
    'Uttarakhand',
    '22623001000492',
    true,
    'approved',
    4.9,
    112,
    'Authentic Garhwali Thali & Mandua Rotis'
),
(
    'c0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003',
    'Aunty''s Ghar Ka Khana',
    'Kamla Sharma',
    '+91 98370 88219',
    'Serving comforting North Indian homestyle tiffins to college students and hostelers in Dehradun. Less oil, zero soda, pure motherly warmth.',
    'Lane 3, Tapovan Enclave, Near Raipur Chowk',
    'Raipur Road',
    'Dehradun',
    'Uttarakhand',
    '22623001000811',
    true,
    'approved',
    4.8,
    94,
    'Rajma Chawal & Homestyle Daily Tiffins'
)
ON CONFLICT (id) DO NOTHING;
