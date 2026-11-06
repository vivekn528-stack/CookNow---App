# CookNow — Pahadi Swad, Ghar Jaisa Khana, Roz Ka Affordable Meal

**CookNow** is a full-stack, production-ready local food marketplace connecting college students (UPES, DIT, IMS, Law colleges), hostel and PG residents, and working professionals with verified local home cooks, regional restaurants, and dedicated delivery partners.

- **Initial Pilot Market**: Nalapani Chowk, Dehradun, Uttarakhand, India (serving Raipur Road, Tapovan, Sahastradhara Road, and Karanpur).
- **Core Brand Message**: *"Pahadi Swad, Ghar Jaisa Khana, Roz Ka Affordable Meal"*
- **Founder & Owner**: **Vivek Singh Negi**, Founder & Owner / Super Admin (`vivekn528@gmail.com`).

---

## 🏛️ Business Identity & Zero-Trust Governance

### Executive Founder Profile
- **Full Name**: Vivek Singh Negi
- **Role**: Founder & Owner / Super Admin
- **Designated Email**: `vivekn528@gmail.com`
- **Phone**: `+91 6398389019` *(Private by default; masked in UI as `+91 63983*****` with explicit owner unmask toggle)*

### Zero-Trust Access Model
- **No Client Spoofing**: Admin controls cannot be accessed by typing names or emails into frontend inputs.
- **Server Verification Gate**: Access to the Owner Control Centre requires verified authentication against `vivekn528@gmail.com` with server-side OTP token confirmation and role validation.
- **Sensitive Data Shielding**: Customer phone numbers and complaint identities are masked to prevent partner bias or retaliation. Personal contact information is private by default.

---

## 🌟 Complete Feature Matrix (Phases 1–8)

### 1. Restaurant & Home Cook Partner Onboarding (Phase 1)
- **"Partner With CookNow" Application Portal**: Dedicated modal accessible from top navigation for both home kitchens and licensed commercial restaurants.
- **Structured KYC Submission**: Kitchen/Restaurant name, owner details, contact info, service address, food categories, sample menu, proposed price ranges, operating hours, daily capacity, and FSSAI 14-digit registration number + ID proof (Aadhaar / PAN / FSSAI certificate).
- **Lifecycle Status Machine**:
  - `pending` (initial application)
  - `under_review` (inspection scheduled)
  - `approved` (live on CookNow marketplace)
  - `rejected` (with recorded rejection reason)
  - `suspended` (compliance or hygiene violation pause)
- **Owner Review Flow**: The verified owner can inspect submitted documents, set partner commission rates, and approve/reject applications with recorded reasons.

### 2. Delivery Partner Onboarding & Operations Portal (Phase 2)
- **Delivery Rider Registration**: Vehicle type (Bicycle, Motorcycle, Scooter, EV), driving license, Aadhaar number, preferred shifts, and Dehradun service hub.
- **Rider Dispatch Operations Dashboard**:
  - Live orders ready for pickup at Nalapani Chowk kitchens.
  - Strict order transitions: `Ready for Pickup` → `Assigned` → `Picked Up` → `Out for Delivery` → `Delivered`.
  - Delivery earnings ledger: ₹25 flat payout per successfully completed drop with running balance.
  - Rider simulation switcher to inspect multiple active riders across the fleet.

### 3. Monthly Tiffin & Meal Subscription Plans (Phase 3)
- **Dedicated Meal Plans Portal**: Student Budget Plan (₹1,999/month, ₹66/meal), Pahadi Special Tiffin (₹2,799/month), Executive Dual-Meal Tiffin (₹3,799/month), and Flexible Weekly Plan (₹699/week).
- **Student Features**:
  - Meal schedule selection (Lunch: 12:30 PM - 2:00 PM, Dinner: 7:30 PM - 9:30 PM, or Both).
  - Detailed 7-day homestyle rotating menu previews.
  - Subscription checkout with hostel/PG room address recording.
  - Active subscription manager: Delivered vs Remaining meals counter.
  - **Exam & Holiday Pause Mechanism**: Students can pause deliveries for specific dates (up to 4 pauses per month) without losing paid meal credits.
  - Transparent cancellation policy and refund estimations.

### 4. Student Special Budget Thalis (Phase 4)
- **Permanent Low-Cost Value Strip**:
  - **Mini Budget Meal (₹49)**: 3 Tawa Rotis, Homestyle Dal / Rajma, Pickles & Onions.
  - **Regular Student Thali (₹69)**: 4 Tawa Rotis, Seasonal Sabzi, Dal Tadka, Steamed Rice, Salad.
  - **Full Pahadi Student Thali (₹79)**: 4 Desi Ghee Phulkas, Pahadi Dal (Gahat/Bhatt), Seasonal Vegetable, Basmati Rice, Pahadi Chutney.
- **Dedicated Marketplace Filter**: One-click filter for students on tight budgets, guaranteeing fresh wholesome meals under ₹100.

### 5. Smart Discount & Promotion Engine (Phase 5)
- **Coupon Validation**: Real-time validation for coupon codes (e.g. `STUDENT49`, `FIRSTCOOK`, `PAHADISWAD`, `NALAPANI20`).
- **Discount Funding Breakdown**:
  - `cooknow_funded`: CookNow platform subsidizes the discount (0% partner deduction).
  - `restaurant_funded`: Commercial restaurant subsidizes the discount for customer acquisition.
  - `shared_funded`: 50/50 split between platform and partner.
- **Budget Caps & Limits**: Enforces minimum order values, maximum discount caps, per-customer limits, and total promo budget tracking.

### 6. Advanced Financial Ledger & Executive Metrics (Phase 6)
- **Comprehensive Ledger View**:
  - **Gross Merchandise Value (GMV)**: Total transaction volume across the network.
  - **Platform Revenue**: Commission income (15% standard) + platform service fees (₹5).
  - **Partner Payouts**: Net earnings disbursed to home cooks and restaurants (85%).
  - **Delivery Costs**: Fleet payouts (₹25/order) vs delivery revenue collected.
  - **Discount Funding Audit**: Separate accounting for CookNow-funded vs Partner-funded promotions.
  - **Operating Expenses**: Ledger for packaging subsidies, logistics incentives, marketing, and hygiene inspections.
  - **Contribution Margin After Variable Costs**: Net bottom-line financial health indicator.
- **Export Facility**: One-click "Export Financial CSV" for accounting records.

### 7. Business Performance Root-Cause Diagnostics (Phase 7)
- **Cancellation Root-Cause Analysis**: Rejection breakdown (kitchen busy, out of ingredients, outside delivery range).
- **Quality & Late Delivery Alerts**: Flags kitchens with ratings below 4.2 or prep delays over 35 minutes.
- **Locality Heatmap**: Order density across Nalapani Chowk, Tapovan, Sahastradhara Road, and Karanpur.

### 8. Anonymous Reviews & Private Complaint Investigation (Phase 8)
- **Customer Retaliation Shielding**: Customer names and numbers are kept strictly anonymous on public reviews to prevent retaliation or pressure from local cooks.
- **Owner-Only Complaint Investigation**: Verified owner (Vivek Singh Negi) can review unmasked student contact details, inspect order issues, issue logged refunds, and communicate resolutions.

---

## 📐 Architecture & Database Decisions (Phase 9 & 10)

### Primary Relational Engine: Supabase PostgreSQL
- Relational schema, transactional integrity, multi-role access control, and Row-Level Security (RLS) are natively built on PostgreSQL via Supabase.
- Full SQL migration scripts are maintained in the repository:
  - `supabase/migrations/001_initial_schema.sql`: Initial 9 core tables (`profiles`, `cooks`, `addresses`, `menu_items`, `orders`, `order_items`, `reviews`, `cook_verification_requests`, `platform_settings`).
  - `supabase/migrations/002_extended_features.sql`: Extended tables (`partner_applications`, `delivery_partners`, `meal_plans`, `customer_subscriptions`, `promotions`, `complaints`, `operating_expenses`, `admin_audit_logs`).
  - `supabase/seed.sql`: Rich pilot seed data for Nalapani Chowk home cooks, student meals, and riders.

### Firebase Integration Evaluation (Phase 9)
- **Evaluation**: Supabase PostgreSQL is the authoritative relational source for user profiles, order lifecycle, financial ledgers, and partner payouts.
- **Recommended Firebase Usage**: Firebase Cloud Messaging (FCM) is reserved exclusively for real-time mobile push notifications to delivery riders and home cooks when orders are placed or status changes.
- **Rule**: Do not create duplicate, conflicting auth systems or fragmented Firestore collections that mirror PostgreSQL tables. Keep Supabase as the single source of truth for business data.

---

## 💳 Payment Gateway Boundary (Phase 11)

### Active Method
- **Cash on Delivery / Pay on Delivery (Active)**: Fully functional for the initial Nalapani Chowk neighborhood pilot. Orders progress smoothly through prep and delivery stages.

### Razorpay Test Mode Boundary
- Environment configuration:
  ```env
  RAZORPAY_KEY_ID="rzp_test_placeholder"
  RAZORPAY_KEY_SECRET="rzp_secret_placeholder"
  ```
- **Server Verification**: In production, orders are created on the backend (`/api/create-razorpay-order`), payment signatures are verified with `crypto.createHmac('sha256', secret)`, and order status is marked as `paid`. Secret keys are never exposed to the frontend bundle.

---

## 🛠️ Deployment Guidelines (Phases 12 & 13)

### GitHub Setup
1. Excluded files in `.gitignore`:
   - `.env`, `.env.local`
   - `node_modules/`
   - `dist/`
   - `.DS_Store`
2. Push repository:
   ```bash
   git init
   git add .
   git commit -m "feat: complete CookNow marketplace with owner governance and extended modules"
   git remote add origin https://github.com/your-org/cooknow.git
   git push -u origin main
   ```

### Vercel Deployment
1. Connect your GitHub repository to Vercel.
2. Select **Framework Preset**: `Vite`.
3. Set **Build Command**: `npm run build`.
4. Set **Output Directory**: `dist`.
5. Add Environment Variables in the Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Trigger deployment.

---

## 🔒 Security Practices Summary
- **Zero API Key Exposure**: No secret keys (`SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`) are present in client code.
- **Owner Authentication Gate**: Vivek Singh Negi's owner profile is verified through server authentication; no client-side spoofing.
- **Data Protection**: Personal phone numbers and emails are masked by default. Student identities on reviews and complaints are protected from kitchen partners.
- **Input Sanitization**: Strict 10-digit Indian mobile validation (`/^[6-9]\d{9}$/`), 14-digit FSSAI verification formatting, and positive price/quantity bounds.
