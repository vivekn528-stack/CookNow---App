import {
  Cook,
  MenuItem,
  Order,
  OrderStatus,
  Review,
  PlatformSettings,
  Address,
  PartnerApplication,
  DeliveryPartner,
  MealPlan,
  CustomerSubscription,
  Promotion,
  Complaint,
  OperatingExpense,
} from '../types';

import {
  MENU_ITEM_IMAGES,
  KITCHEN_IMAGES,
  HERO_BANNER_IMAGE,
  getMenuItemImage,
  getKitchenBanner,
  getKitchenAvatar,
} from './image-registry';

export const OWNER_PROFILE = {
  fullName: 'Vivek Singh Negi',
  businessName: 'CookNow',
  designation: 'Founder & Owner / Super Admin',
  email: 'vivekn528@gmail.com',
  phone: '6398389019',
  role: 'admin' as const,
  launchMarket: 'Nalapani Chowk, Dehradun, Uttarakhand',
};

export const INITIAL_SETTINGS: PlatformSettings = {
  commissionRatePercent: 15,
  standardDeliveryFee: 25,
  freeDeliveryThreshold: 250,
  platformServiceFee: 5,
  packagingFee: 10,
  launchLocality: 'Nalapani Chowk, Dehradun, Uttarakhand',
  supportPhone: '+91 94120 44556',
  supportEmail: 'support@cooknow-dehradun.in',
};

export const INITIAL_COOKS: Cook[] = [
  {
    id: 'cook-1',
    userId: 'user-cook-1',
    kitchenName: "Sunita's Pahadi Rasoi",
    ownerName: 'Sunita Rawat',
    phone: '+91 98971 23450',
    bio: 'Proud home cook from Pauri Garhwal now living in Nalapani Chowk. Cooking traditional Uttarakhand delicacies with hand-ground spices and organic millets from our family village.',
    address: 'House 42, Near Shiv Mandir, Upper Nalapani Road',
    locality: 'Nalapani Chowk',
    city: 'Dehradun',
    state: 'Uttarakhand',
    fssaiNumber: '22623001000492',
    isVerified: true,
    verificationStatus: 'approved',
    verificationNotes: 'Kitchen cleanliness inspected. FSSAI registration verified on 15 Feb 2026.',
    partnerType: 'home_cook',
    avatarUrl: KITCHEN_IMAGES['cook-1'].avatarSrc,
    bannerUrl: KITCHEN_IMAGES['cook-1'].bannerSrc,
    rating: 4.9,
    reviewCount: 112,
    specialty: 'Authentic Garhwali Thali & Mandua Rotis',
    deliveryTimeMin: 25,
    deliveryTimeMax: 40,
    isAcceptingOrders: true,
    operatingHours: '11:00 AM - 10:00 PM',
    dailyCapacity: 60,
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'cook-2',
    userId: 'user-cook-2',
    kitchenName: "Aunty's Ghar Ka Khana",
    ownerName: 'Kamla Sharma',
    phone: '+91 98370 88219',
    bio: 'Serving comforting North Indian homestyle tiffins to college students and hostelers in Dehradun for 4 years. Less oil, zero soda, pure motherly warmth.',
    address: 'Lane 3, Tapovan Enclave, Near Raipur Chowk',
    locality: 'Raipur Road',
    city: 'Dehradun',
    state: 'Uttarakhand',
    fssaiNumber: '22623001000811',
    isVerified: true,
    verificationStatus: 'approved',
    verificationNotes: 'Physical kitchen audit cleared. Water testing report verified.',
    partnerType: 'home_cook',
    avatarUrl: KITCHEN_IMAGES['cook-2'].avatarSrc,
    bannerUrl: KITCHEN_IMAGES['cook-2'].bannerSrc,
    rating: 4.8,
    reviewCount: 94,
    specialty: 'Rajma Chawal & Homestyle Daily Tiffins',
    deliveryTimeMin: 20,
    deliveryTimeMax: 35,
    isAcceptingOrders: true,
    operatingHours: '10:30 AM - 9:30 PM',
    dailyCapacity: 80,
    createdAt: '2026-01-18T10:30:00Z',
  },
  {
    id: 'cook-3',
    userId: 'user-cook-3',
    kitchenName: 'Doon Punjabi Kitchenette',
    ownerName: 'Harpreet Kaur',
    phone: '+91 97190 33412',
    bio: 'Crispy stuffed tawa parathas with fresh homemade makhan (white butter), thick curd, and slow-simmered homestyle dal makhani.',
    address: 'Flat 204, Ganga Apartments, Sahastradhara Road',
    locality: 'Sahastradhara Road',
    city: 'Dehradun',
    state: 'Uttarakhand',
    fssaiNumber: '22623001000620',
    isVerified: true,
    verificationStatus: 'approved',
    verificationNotes: 'FSSAI cert and ID proof verified.',
    partnerType: 'home_cook',
    avatarUrl: KITCHEN_IMAGES['cook-3'].avatarSrc,
    bannerUrl: KITCHEN_IMAGES['cook-3'].bannerSrc,
    rating: 4.7,
    reviewCount: 68,
    specialty: 'Stuffed Parathas & Kadhi Pakoda',
    deliveryTimeMin: 20,
    deliveryTimeMax: 30,
    isAcceptingOrders: true,
    operatingHours: '8:00 AM - 8:30 PM',
    dailyCapacity: 50,
    createdAt: '2026-02-01T12:00:00Z',
  },
  {
    id: 'cook-4',
    userId: 'user-cook-4',
    kitchenName: 'Garhwal Bhojanalaya (Restaurant Partner)',
    ownerName: 'Vikram Singh Rawat',
    phone: '+91 94111 88901',
    bio: 'Selected local restaurant partner specializing in traditional Dehradun Pahadi dishes and economical student thalis with prompt delivery to Raipur Road and Nalapani Chowk.',
    address: 'Shop 14, Main Nalapani Chowk Market',
    locality: 'Nalapani Chowk',
    city: 'Dehradun',
    state: 'Uttarakhand',
    fssaiNumber: '22623001000789',
    isVerified: true,
    verificationStatus: 'approved',
    verificationNotes: 'Commercial hygiene grade A, municipal trade license and FSSAI verified.',
    partnerType: 'restaurant',
    avatarUrl: KITCHEN_IMAGES['cook-4'].avatarSrc,
    bannerUrl: KITCHEN_IMAGES['cook-4'].bannerSrc,
    rating: 4.8,
    reviewCount: 45,
    specialty: 'Student Meals & Kumaoni Raita Combos',
    deliveryTimeMin: 15,
    deliveryTimeMax: 25,
    isAcceptingOrders: true,
    operatingHours: '11:00 AM - 11:00 PM',
    dailyCapacity: 120,
    createdAt: '2026-02-15T11:00:00Z',
  },
  {
    id: 'cook-5',
    userId: 'user-cook-5',
    kitchenName: 'Pahadi Zaika (Pending Audit)',
    ownerName: 'Manish Bhatt',
    phone: '+91 94567 12093',
    bio: 'Specialist in Garhwali festive dishes and snacks: Arsa, Roat, and Gahat ki Daal. Verification documentation currently under administrative review.',
    address: 'Near Old Post Office, Nalapani Bazar',
    locality: 'Nalapani Chowk',
    city: 'Dehradun',
    state: 'Uttarakhand',
    fssaiNumber: '22624001000102',
    isVerified: false,
    verificationStatus: 'pending',
    verificationNotes: 'Awaiting administrator kitchen hygiene report & ID proof sign-off.',
    partnerType: 'home_cook',
    avatarUrl: KITCHEN_IMAGES['cook-5'].avatarSrc,
    bannerUrl: KITCHEN_IMAGES['cook-5'].bannerSrc,
    rating: 4.5,
    reviewCount: 8,
    specialty: 'Garhwali Festive Dishes & Snacks',
    deliveryTimeMin: 35,
    deliveryTimeMax: 50,
    isAcceptingOrders: false,
    operatingHours: '12:00 PM - 8:00 PM',
    dailyCapacity: 30,
    createdAt: '2026-03-01T09:15:00Z',
  },
];

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  // Student Special Thalis (Phase 4 requirement: Mini ₹49, Regular ₹69, Full ₹79)
  {
    id: 'menu-student-mini',
    cookId: 'cook-2',
    name: 'Mini Student Comfort Meal',
    description: '2 fresh whole wheat tawa phulkas, warm bowl of yellow dal tadka, seasonal sukhi sabzi, and homemade mango pickle. Pocket-friendly daily sustenance.',
    price: 49,
    category: 'Student Thali',
    dietaryType: 'pure_veg',
    prepTimeMinutes: 15,
    isAvailable: true,
    imageUrl: MENU_ITEM_IMAGES['menu-student-mini'].src,
    portionSize: '2 Phulkas + 150ml Dal + Sabzi',
    spiceLevel: 'Mild',
    isStudentSpecial: true,
    studentMealTier: 'mini_49',
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'menu-student-regular',
    cookId: 'cook-4',
    name: 'Regular Student Thali',
    description: '4 soft phulkas, 1 cup slow-cooked dal fry, seasonal sabzi (Aloo Beans/Matar), fragrant jeera rice, and fresh onion-cucumber salad.',
    price: 69,
    category: 'Student Thali',
    dietaryType: 'pure_veg',
    prepTimeMinutes: 20,
    isAvailable: true,
    imageUrl: MENU_ITEM_IMAGES['menu-student-regular'].src,
    portionSize: '4 Phulkas + Dal + Sabzi + Rice',
    spiceLevel: 'Medium',
    isStudentSpecial: true,
    studentMealTier: 'regular_69',
    createdAt: '2026-02-01T10:30:00Z',
  },
  {
    id: 'menu-student-full',
    cookId: 'cook-1',
    name: 'Full Student Deluxe Thali',
    description: '4 ghee-smeared phulkas, special Pahadi Gahat dal or Dal Makhani, seasonal paneer sabzi, Dehradun basmati rice, Pahadi cucumber raita, and Jhangora kheer cup.',
    price: 79,
    category: 'Student Thali',
    dietaryType: 'pure_veg',
    prepTimeMinutes: 20,
    isAvailable: true,
    imageUrl: MENU_ITEM_IMAGES['menu-student-full'].src,
    portionSize: 'Full Complete Thali (Serves 1 hearty appetite)',
    spiceLevel: 'Medium',
    isStudentSpecial: true,
    studentMealTier: 'full_79',
    createdAt: '2026-02-01T11:00:00Z',
  },
  // Pahadi Khana & Regional Specialties
  {
    id: 'menu-1',
    cookId: 'cook-1',
    name: 'Special Garhwali Homestyle Thali',
    description: '3 Mandua (finger millet) rotis, hot bowl of Chainsoo (roasted black gram dal), steamed Dehradun Basmati rice, Pahadi cucumber raita, and homemade gooseberry pickle.',
    price: 160,
    category: 'Pahadi Specials',
    dietaryType: 'pure_veg',
    prepTimeMinutes: 30,
    isAvailable: true,
    imageUrl: MENU_ITEM_IMAGES['menu-1'].src,
    portionSize: '1 Complete Meal (Serves 1 hearty appetite)',
    spiceLevel: 'Medium',
    createdAt: '2026-01-12T10:00:00Z',
  },
  {
    id: 'menu-pahadi-aloo',
    cookId: 'cook-1',
    name: 'Pahadi Aloo Ke Gutke & Mandua Roti',
    description: 'Mountain potatoes tossed in roasted jakhiya seeds, coriander seed powder and jamboo tadka, served with 3 crisp Mandua rotis and mint chutney.',
    price: 120,
    category: 'Pahadi Specials',
    dietaryType: 'pure_veg',
    prepTimeMinutes: 20,
    isAvailable: true,
    imageUrl: MENU_ITEM_IMAGES['menu-pahadi-aloo'].src,
    portionSize: '3 Mandua Rotis + Gutke Bowl',
    spiceLevel: 'Medium',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'menu-2',
    cookId: 'cook-1',
    name: 'Gahat (Kulath) Ki Daal & Phulka Combo',
    description: 'Traditional Garhwali horsegram dal cooked with jakhiya tadka, served with 4 soft whole wheat tawa phulkas smeared with desi ghee, fresh green chutney and salad.',
    price: 130,
    category: 'Pahadi Specials',
    dietaryType: 'pure_veg',
    prepTimeMinutes: 25,
    isAvailable: true,
    imageUrl: MENU_ITEM_IMAGES['menu-2'].src,
    portionSize: '4 Rotis + 250ml Dal + Salad',
    spiceLevel: 'Mild',
    createdAt: '2026-01-12T10:30:00Z',
  },
  {
    id: 'menu-3',
    cookId: 'cook-2',
    name: 'Homestyle Pahadi Rajma Chawal Bowl',
    description: 'Slow-simmered Chakrata red kidney beans in a rich aromatic tomato-ginger gravy, served over fragrant steamed basmati rice with sliced red onions and a lime wedge.',
    price: 120,
    category: 'Daily Tiffin',
    dietaryType: 'pure_veg',
    prepTimeMinutes: 20,
    isAvailable: true,
    imageUrl: MENU_ITEM_IMAGES['menu-3'].src,
    portionSize: '450g bowl + side salad',
    spiceLevel: 'Medium',
    createdAt: '2026-01-20T11:00:00Z',
  },
  {
    id: 'menu-4',
    cookId: 'cook-2',
    name: 'Daily Student Comfort Tiffin',
    description: '4 fresh whole wheat rotis, 1 katori Yellow Moong-Arhar dal tadka, seasonal dry sabzi (Aloo Gobhi / Bhindi), jeera rice, and homemade green chili pickle.',
    price: 110,
    category: 'Daily Tiffin',
    dietaryType: 'pure_veg',
    prepTimeMinutes: 25,
    isAvailable: true,
    imageUrl: MENU_ITEM_IMAGES['menu-4'].src,
    portionSize: 'Standard Tiffin Box (Serves 1)',
    spiceLevel: 'Mild',
    createdAt: '2026-01-20T11:15:00Z',
  },
  {
    id: 'menu-5',
    cookId: 'cook-3',
    name: 'Makhan Aloo Paratha (2 Pcs)',
    description: '2 large tawa parathas stuffed generously with spiced mashed potatoes, fresh green chilies and coriander, topped with pure homemade white butter. Served with chilled curd and mango pickle.',
    price: 95,
    category: 'Parathas',
    dietaryType: 'pure_veg',
    prepTimeMinutes: 20,
    isAvailable: true,
    imageUrl: MENU_ITEM_IMAGES['menu-5'].src,
    portionSize: '2 Parathas + 100g Curd + Makhan',
    spiceLevel: 'Medium',
    createdAt: '2026-02-05T09:00:00Z',
  },
  {
    id: 'menu-8',
    cookId: 'cook-1',
    name: 'Jhangora Ki Kheer (Barnyard Millet Pudding)',
    description: 'Nutritious Uttarakhand dessert made from mountain barnyard millet, slow-cooked in full cream milk and flavored with green cardamom and toasted almonds.',
    price: 80,
    category: 'Desserts',
    dietaryType: 'pure_veg',
    prepTimeMinutes: 15,
    isAvailable: true,
    imageUrl: MENU_ITEM_IMAGES['menu-8'].src,
    portionSize: '150ml bowl',
    spiceLevel: 'Mild',
    createdAt: '2026-02-15T14:00:00Z',
  },
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    orderId: 'ORD-9821',
    customerId: 'cust-1',
    customerName: 'Aman Negi (UPES Student)',
    isAnonymous: true,
    cookId: 'cook-1',
    rating: 5,
    comment: 'Living in a PG at Nalapani Chowk, I missed home food so much. Sunita Aunty’s Mandua roti and Chainsoo dal taste exactly like home in Pauri Garhwal!',
    isReported: false,
    createdAt: '2026-03-10T14:30:00Z',
  },
  {
    id: 'rev-2',
    orderId: 'ORD-9755',
    customerId: 'cust-2',
    customerName: 'Priya Joshi (DIT Student)',
    isAnonymous: true,
    cookId: 'cook-2',
    rating: 5,
    comment: 'The Rajma Chawal is absolute comfort food after long lectures. Portions are generous, not oily at all, and arrived hot within 25 minutes.',
    isReported: false,
    createdAt: '2026-03-12T13:10:00Z',
  },
  {
    id: 'rev-3',
    orderId: 'ord-seed-3',
    customerId: 'cust-3',
    customerName: 'Rohan Sharma',
    isAnonymous: true,
    cookId: 'cook-3',
    rating: 4,
    comment: 'Proper Punjabi parathas with real white butter! Very filling and satisfying.',
    isReported: false,
    createdAt: '2026-03-14T10:45:00Z',
  },
];

export const INITIAL_DELIVERY_PARTNERS: DeliveryPartner[] = [
  {
    id: 'dp-1',
    userId: 'user-dp-1',
    fullName: 'Suresh Semwal',
    phone: '+91 94101 22334',
    email: 'suresh.semwal@cooknow-partner.in',
    serviceArea: 'Nalapani Chowk & Raipur Road',
    workingHours: '11:00 AM - 10:00 PM',
    vehicleType: 'Motorcycle',
    vehicleNumber: 'UK-07-CB-4491',
    drivingLicenseNumber: 'UK0720210049210',
    aadhaarNumber: 'XXXX-XXXX-9012',
    status: 'approved',
    reviewerNotes: 'Document verified, background checked, thermal delivery box issued.',
    isAvailable: true,
    rating: 4.9,
    totalDeliveries: 148,
    earningsBalance: 1250,
    bankAccountMasked: 'HDFC Bank ending in **4910',
    activeOrderId: 'ORD-9821',
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 'dp-2',
    userId: 'user-dp-2',
    fullName: 'Deepak Panwar',
    phone: '+91 97200 88712',
    email: 'deepak.panwar@cooknow-partner.in',
    serviceArea: 'Sahastradhara Road & Tapovan',
    workingHours: '12:00 PM - 9:00 PM',
    vehicleType: 'Electric Vehicle',
    vehicleNumber: 'UK-07-EA-1102',
    drivingLicenseNumber: 'UK0720230011892',
    aadhaarNumber: 'XXXX-XXXX-5521',
    status: 'approved',
    reviewerNotes: 'Verified EV delivery partner.',
    isAvailable: true,
    rating: 4.8,
    totalDeliveries: 86,
    earningsBalance: 750,
    bankAccountMasked: 'SBI ending in **8821',
    createdAt: '2026-02-10T11:00:00Z',
  },
  {
    id: 'dp-3',
    userId: 'user-dp-3',
    fullName: 'Rahul Rawat (Pending Onboarding)',
    phone: '+91 98970 11442',
    email: 'rahul.rawat@gmail.com',
    serviceArea: 'Karanpur & Raipur Corridor',
    workingHours: '5:00 PM - 11:00 PM (Student part-time)',
    vehicleType: 'Scooter',
    vehicleNumber: 'UK-07-AQ-7712',
    drivingLicenseNumber: 'UK0720240033190',
    aadhaarNumber: 'XXXX-XXXX-3341',
    status: 'pending',
    reviewerNotes: 'Awaiting driving license cross-verification on Sarathi portal.',
    isAvailable: false,
    rating: 5.0,
    totalDeliveries: 0,
    earningsBalance: 0,
    createdAt: '2026-03-01T14:00:00Z',
  },
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-9821',
    customerId: 'cust-1',
    customerName: 'Aman Negi',
    customerPhone: '9876543210',
    cookId: 'cook-1',
    kitchenName: "Sunita's Pahadi Rasoi",
    status: 'out_for_delivery',
    items: [
      {
        id: 'oi-1',
        orderId: 'ORD-9821',
        menuItemId: 'menu-1',
        itemName: 'Special Garhwali Homestyle Thali',
        unitPrice: 160,
        quantity: 1,
        subtotal: 160,
        dietaryType: 'pure_veg',
      },
      {
        id: 'oi-2',
        orderId: 'ORD-9821',
        menuItemId: 'menu-8',
        itemName: 'Jhangora Ki Kheer',
        unitPrice: 80,
        quantity: 1,
        subtotal: 80,
        dietaryType: 'pure_veg',
      },
    ],
    itemsSubtotal: 240,
    deliveryFee: 25,
    platformFee: 5,
    packagingFee: 10,
    discount: 24, // 10% student coupon
    discountCode: 'STUDENT10',
    discountFunding: 'cooknow_funded',
    finalPayableAmount: 256,
    platformCommission: 36, // 15% of 240 items subtotal
    cookEarnings: 204, // 85% of 240 items subtotal
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    deliveryPartnerId: 'dp-1',
    deliveryPartnerName: 'Suresh Semwal',
    deliveryStatus: 'out_for_delivery',
    deliveryAddress: {
      fullName: 'Aman Negi',
      phone: '9876543210',
      locality: 'Nalapani Chowk',
      addressLine: 'Room 302, Shivalik Boys PG, Main Raipur Road',
      landmark: 'Near SBI ATM & Nalapani Chowk',
      hostelOrPgName: 'Shivalik Boys PG',
    },
    deliveryInstructions: 'Please call before entering the gate.',
    events: [
      {
        status: 'pending',
        timestamp: '2026-03-15T12:30:00Z',
        note: 'Order placed by customer via Cash on Delivery.',
      },
      {
        status: 'accepted',
        timestamp: '2026-03-15T12:33:00Z',
        note: 'Order accepted by Sunita Rawat. Fresh prep started.',
      },
      {
        status: 'preparing',
        timestamp: '2026-03-15T12:35:00Z',
        note: 'Tawa rotis and Chainsoo being freshly cooked.',
      },
      {
        status: 'ready',
        timestamp: '2026-03-15T12:55:00Z',
        note: 'Packed in thermal container. Ready for courier pickup.',
      },
      {
        status: 'out_for_delivery',
        timestamp: '2026-03-15T13:00:00Z',
        note: 'Picked up by delivery partner Suresh Semwal.',
      },
    ],
    createdAt: '2026-03-15T12:30:00Z',
    updatedAt: '2026-03-15T13:00:00Z',
  },
  {
    id: 'ORD-9755',
    customerId: 'cust-2',
    customerName: 'Priya Joshi',
    customerPhone: '9812345678',
    cookId: 'cook-2',
    kitchenName: "Aunty's Ghar Ka Khana",
    status: 'delivered',
    items: [
      {
        id: 'oi-3',
        orderId: 'ORD-9755',
        menuItemId: 'menu-3',
        itemName: 'Homestyle Pahadi Rajma Chawal Bowl',
        unitPrice: 120,
        quantity: 2,
        subtotal: 240,
        dietaryType: 'pure_veg',
      },
    ],
    itemsSubtotal: 240,
    deliveryFee: 25,
    platformFee: 5,
    packagingFee: 10,
    discount: 0,
    finalPayableAmount: 280,
    platformCommission: 36,
    cookEarnings: 204,
    paymentMethod: 'cod',
    paymentStatus: 'paid',
    deliveryPartnerId: 'dp-2',
    deliveryPartnerName: 'Deepak Panwar',
    deliveryStatus: 'delivered',
    deliveryAddress: {
      fullName: 'Priya Joshi',
      phone: '9812345678',
      locality: 'Nalapani Chowk',
      addressLine: 'Flat 12B, Devbhoomi Girls Hostel',
      landmark: 'Behind Nalapani Post Office',
      hostelOrPgName: 'Devbhoomi Girls Hostel',
    },
    events: [
      { status: 'pending', timestamp: '2026-03-14T19:00:00Z', note: 'Order placed.' },
      { status: 'accepted', timestamp: '2026-03-14T19:02:00Z', note: 'Accepted by cook.' },
      { status: 'preparing', timestamp: '2026-03-14T19:05:00Z', note: 'Meal prepared.' },
      { status: 'ready', timestamp: '2026-03-14T19:25:00Z', note: 'Packed in thermal container.' },
      { status: 'out_for_delivery', timestamp: '2026-03-14T19:30:00Z', note: 'Dispatched with Deepak Panwar.' },
      { status: 'delivered', timestamp: '2026-03-14T19:48:00Z', note: 'Delivered. Cash ₹280 collected.' },
    ],
    createdAt: '2026-03-14T19:00:00Z',
    updatedAt: '2026-03-14T19:48:00Z',
  },
];

export const INITIAL_PARTNER_APPLICATIONS: PartnerApplication[] = [
  {
    id: 'papp-101',
    businessName: 'Nalapani Desi Rasoi',
    ownerName: 'Urmila Devi',
    phone: '+91 94120 77123',
    email: 'urmila.devi@gmail.com',
    address: 'Near Water Tank, Nalapani Chowk',
    locality: 'Nalapani Chowk',
    partnerType: 'home_cook',
    foodCategories: ['Daily Tiffin', 'Pahadi Specials'],
    sampleMenu: 'Bhatt ki Churkani, Kumaoni Raita, Mandua Roti, Mix Veg',
    expectedPriceRange: '₹80 - ₹150 per thali',
    operatingHours: '11:30 AM - 9:00 PM',
    dailyCapacity: 40,
    fssaiNumber: '22624001000912',
    idProofType: 'Aadhaar',
    idProofNumber: 'XXXX-XXXX-1190',
    status: 'under_review',
    reviewerReason: 'Physical kitchen audit scheduled for tomorrow morning.',
    submittedAt: '2026-03-12T10:00:00Z',
  },
  {
    id: 'papp-102',
    businessName: 'Shree Krishna Cafe & Thali',
    ownerName: 'Rameshwar Prasad',
    phone: '+91 98371 44510',
    email: 'rameshwar.cafe@gmail.com',
    address: 'Plot 4, Raipur Main Road',
    locality: 'Raipur Road',
    partnerType: 'restaurant',
    foodCategories: ['Student Thali', 'North Indian'],
    sampleMenu: 'Pocket Student Thalis, Rajma Rice, Paneer Paratha',
    expectedPriceRange: '₹49 - ₹120',
    operatingHours: '9:00 AM - 10:30 PM',
    dailyCapacity: 150,
    fssaiNumber: '22623001000994',
    idProofType: 'FSSAI Certificate',
    idProofNumber: 'FSSAI-22623001000994',
    status: 'pending',
    reviewerReason: 'Pending food safety verification & GST cert validation.',
    submittedAt: '2026-03-14T14:30:00Z',
  },
];

export const INITIAL_MEAL_PLANS: MealPlan[] = [
  {
    id: 'plan-student-budget',
    providerId: 'cook-2',
    providerName: "Aunty's Ghar Ka Khana",
    title: 'Monthly Student Budget Tiffin Plan',
    description: '30 days of comforting homemade lunch or dinner. 4 soft rotis, dal tadka, seasonal sabzi, rice, and pickle. Zero soda, healthy & hygienic.',
    planType: 'student_budget',
    pricePerMonth: 2199, // Approx ₹73 per meal
    mealsCount: 30,
    durationDays: 30,
    mealSchedule: 'Lunch (12:30 PM - 2:00 PM)',
    serviceArea: 'Nalapani Chowk & Raipur Road',
    isAvailable: true,
    sampleMenuHighlights: [
      'Mon: Rajma Chawal + 2 Rotis + Salad',
      'Tue: Yellow Dal Fry + Aloo Gobhi + 4 Rotis',
      'Wed: Punjabi Kadhi Pakoda + Jeera Rice',
      'Thu: Mix Veg + Moong Dal + 4 Rotis',
      'Fri: Dal Makhani + Chawal + 2 Rotis',
      'Sat: Chana Dal + Bhindi Masala + 4 Rotis',
    ],
    pausesAllowed: 4,
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 'plan-pahadi-special',
    providerId: 'cook-1',
    providerName: "Sunita's Pahadi Rasoi",
    title: 'Monthly Authentic Pahadi Swad Plan',
    description: 'Experience genuine Uttarakhand mountain culinary tradition. Rotation of Mandua rotis, Chainsoo, Gahat dal, Bhatt ki Churkani, and Kumaoni raita.',
    planType: 'pahadi_special',
    pricePerMonth: 3499, // Approx ₹116 per meal
    mealsCount: 30,
    durationDays: 30,
    mealSchedule: 'Dinner (7:30 PM - 9:30 PM)',
    serviceArea: 'Nalapani Chowk & Upper Raipur',
    isAvailable: true,
    sampleMenuHighlights: [
      'Pahadi Thali with Mandua Roti & Chainsoo',
      'Gahat ki Daal with Ghee Phulkas',
      'Bhatt Ki Churkani & Rice Combo',
      'Pahadi Aloo Gutke & Kumaoni Raita',
      'Jhangora Sweet Kheer on Sundays',
    ],
    pausesAllowed: 5,
    createdAt: '2026-01-22T10:00:00Z',
  },
  {
    id: 'plan-full-day',
    providerId: 'cook-4',
    providerName: 'Garhwal Bhojanalaya',
    title: 'Monthly Full Board (Lunch + Dinner - 60 Meals)',
    description: 'Complete nutritional security for busy college students and working professionals. Hot lunch delivered to college/hostel and dinner to your room.',
    planType: 'monthly_lunch_dinner',
    pricePerMonth: 4699, // Approx ₹78 per meal
    mealsCount: 60,
    durationDays: 30,
    mealSchedule: 'Both Lunch & Dinner',
    serviceArea: 'All Dehradun Hubs (Nalapani, Raipur, Sahastradhara)',
    isAvailable: true,
    sampleMenuHighlights: [
      'Lunch: Wholesome Tiffin Combo with Rotis & Dal',
      'Dinner: Fresh Seasonal Sabzi, Phulkas, Rice & Dessert',
    ],
    pausesAllowed: 8,
    createdAt: '2026-02-01T10:00:00Z',
  },
];

export const INITIAL_SUBSCRIPTIONS: CustomerSubscription[] = [
  {
    id: 'sub-801',
    customerId: 'cust-1',
    customerName: 'Aman Negi',
    customerPhone: '9876543210',
    planId: 'plan-student-budget',
    planTitle: 'Monthly Student Budget Tiffin Plan',
    providerId: 'cook-2',
    providerName: "Aunty's Ghar Ka Khana",
    startDate: '2026-03-01',
    endDate: '2026-03-30',
    totalMeals: 30,
    mealsDelivered: 14,
    mealsRemaining: 16,
    status: 'active',
    deliveryAddress: {
      hostelOrPgName: 'Shivalik Boys PG',
      addressLine: 'Room 302, Main Raipur Road',
      locality: 'Nalapani Chowk',
    },
    pauseDates: ['2026-03-08'],
    pausesRemaining: 3,
    paymentMethod: 'cod',
    paymentStatus: 'paid',
    paidAmount: 2199,
    createdAt: '2026-02-28T10:00:00Z',
  },
];

export const INITIAL_PROMOTIONS: Promotion[] = [
  {
    id: 'promo-1',
    code: 'STUDENT49',
    name: 'Student Thali Special Offer',
    description: 'Flat ₹20 discount on all Student Thalis for college hostel residents.',
    discountType: 'fixed',
    discountValue: 20,
    minOrderValue: 69,
    maxDiscountCap: 20,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    eligibleCategory: 'Student Thali',
    fundingSource: 'cooknow_funded',
    usageLimit: 500,
    currentUsageCount: 78,
    perCustomerLimit: 3,
    budgetLimit: 10000,
    spentBudget: 1560,
    isActive: true,
  },
  {
    id: 'promo-2',
    code: 'FIRSTCOOK',
    name: 'New Customer Welcome',
    description: '20% off on your very first authentic homestyle order in Nalapani Chowk.',
    discountType: 'percentage',
    discountValue: 20,
    minOrderValue: 120,
    maxDiscountCap: 50,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    fundingSource: 'cooknow_funded',
    usageLimit: 1000,
    currentUsageCount: 142,
    perCustomerLimit: 1,
    budgetLimit: 25000,
    spentBudget: 4890,
    isActive: true,
  },
  {
    id: 'promo-3',
    code: 'PAHADI15',
    name: 'Authentic Garhwal Flavors',
    description: '15% discount on traditional Pahadi Specials, co-sponsored with local home cooks.',
    discountType: 'percentage',
    discountValue: 15,
    minOrderValue: 150,
    maxDiscountCap: 45,
    startDate: '2026-02-01',
    endDate: '2026-11-30',
    eligibleCategory: 'Pahadi Specials',
    fundingSource: 'shared_funded',
    partnerSharePercent: 50,
    usageLimit: 300,
    currentUsageCount: 41,
    perCustomerLimit: 2,
    budgetLimit: 8000,
    spentBudget: 1435,
    isActive: true,
  },
];

export const INITIAL_COMPLAINTS: Complaint[] = [
  {
    id: 'comp-1',
    orderId: 'ORD-9821',
    customerId: 'cust-1',
    customerAnonymousTag: 'Anonymous Student #104',
    customerRealNamePrivate: 'Aman Negi',
    customerPhonePrivate: '9876543210',
    providerId: 'cook-1',
    providerName: "Sunita's Pahadi Rasoi",
    deliveryPartnerId: 'dp-1',
    category: 'late_delivery',
    description: 'Delivery reached 15 minutes past promised 35 minute window due to heavy rain at Raipur Chowk.',
    status: 'resolved',
    resolutionNotes: 'Owner Vivek Singh Negi contacted customer privately. Issued ₹30 courtesy meal voucher.',
    refundIssued: 30,
    createdAt: '2026-03-15T13:20:00Z',
    resolvedAt: '2026-03-15T14:00:00Z',
  },
];

export const INITIAL_OPERATING_EXPENSES: OperatingExpense[] = [
  {
    id: 'exp-1',
    date: '2026-03-01',
    category: 'packaging_subsidies',
    description: '500 biodegradable thermal meal containers subsidized for Nalapani home cooks',
    amount: 3200,
    recordedBy: 'Vivek Singh Negi',
  },
  {
    id: 'exp-2',
    date: '2026-03-05',
    category: 'ops_hygiene_inspection',
    description: 'Water testing and physical kitchen audit kits for Dehradun home cooks',
    amount: 1800,
    recordedBy: 'Vivek Singh Negi',
  },
  {
    id: 'exp-3',
    date: '2026-03-10',
    category: 'marketing_student_camps',
    description: 'Pamphlet distribution at UPES/DIT hostels and PG notice boards',
    amount: 1400,
    recordedBy: 'Vivek Singh Negi',
  },
];

export const INITIAL_ADDRESSES: Address[] = [
  {
    id: 'addr-1',
    userId: 'cust-1',
    label: 'Hostel/PG',
    hostelOrPgName: 'Shivalik Boys PG',
    roomOrFlat: 'Room 302, 3rd Floor',
    addressLine: 'Main Raipur Road, Opp. Reliance Fresh',
    landmark: 'Nalapani Chowk, Dehradun',
    locality: 'Nalapani Chowk',
    city: 'Dehradun',
    pincode: '248008',
    isDefault: true,
  },
];

// Local Storage Keys
const STORAGE_KEYS = {
  COOKS: 'cooknow_cooks',
  MENU_ITEMS: 'cooknow_menu_items',
  ORDERS: 'cooknow_orders',
  REVIEWS: 'cooknow_reviews',
  SETTINGS: 'cooknow_settings',
  ADDRESSES: 'cooknow_addresses',
  PARTNER_APPLICATIONS: 'cooknow_partner_applications',
  DELIVERY_PARTNERS: 'cooknow_delivery_partners',
  MEAL_PLANS: 'cooknow_meal_plans',
  SUBSCRIPTIONS: 'cooknow_subscriptions',
  PROMOTIONS: 'cooknow_promotions',
  COMPLAINTS: 'cooknow_complaints',
  OPERATING_EXPENSES: 'cooknow_operating_expenses',
  OWNER_AUTH_STATE: 'cooknow_owner_auth_session',
};

// Storage helper functions
export const StorageManager = {
  getCooks(): Cook[] {
    const raw = localStorage.getItem(STORAGE_KEYS.COOKS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.COOKS, JSON.stringify(INITIAL_COOKS));
      return INITIAL_COOKS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_COOKS;
    }
  },

  saveCooks(cooks: Cook[]): void {
    localStorage.setItem(STORAGE_KEYS.COOKS, JSON.stringify(cooks));
  },

  getMenuItems(): MenuItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MENU_ITEMS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(INITIAL_MENU_ITEMS));
      return INITIAL_MENU_ITEMS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_MENU_ITEMS;
    }
  },

  saveMenuItems(items: MenuItem[]): void {
    localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(items));
  },

  getOrders(): Order[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_ORDERS;
    }
  },

  saveOrders(orders: Order[]): void {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  },

  getReviews(): Review[] {
    const raw = localStorage.getItem(STORAGE_KEYS.REVIEWS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(INITIAL_REVIEWS));
      return INITIAL_REVIEWS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_REVIEWS;
    }
  },

  saveReviews(reviews: Review[]): void {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
  },

  getPartnerApplications(): PartnerApplication[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PARTNER_APPLICATIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PARTNER_APPLICATIONS, JSON.stringify(INITIAL_PARTNER_APPLICATIONS));
      return INITIAL_PARTNER_APPLICATIONS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_PARTNER_APPLICATIONS;
    }
  },

  savePartnerApplications(apps: PartnerApplication[]): void {
    localStorage.setItem(STORAGE_KEYS.PARTNER_APPLICATIONS, JSON.stringify(apps));
  },

  getDeliveryPartners(): DeliveryPartner[] {
    const raw = localStorage.getItem(STORAGE_KEYS.DELIVERY_PARTNERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.DELIVERY_PARTNERS, JSON.stringify(INITIAL_DELIVERY_PARTNERS));
      return INITIAL_DELIVERY_PARTNERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_DELIVERY_PARTNERS;
    }
  },

  saveDeliveryPartners(partners: DeliveryPartner[]): void {
    localStorage.setItem(STORAGE_KEYS.DELIVERY_PARTNERS, JSON.stringify(partners));
  },

  getMealPlans(): MealPlan[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MEAL_PLANS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MEAL_PLANS, JSON.stringify(INITIAL_MEAL_PLANS));
      return INITIAL_MEAL_PLANS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_MEAL_PLANS;
    }
  },

  saveMealPlans(plans: MealPlan[]): void {
    localStorage.setItem(STORAGE_KEYS.MEAL_PLANS, JSON.stringify(plans));
  },

  getSubscriptions(): CustomerSubscription[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(INITIAL_SUBSCRIPTIONS));
      return INITIAL_SUBSCRIPTIONS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_SUBSCRIPTIONS;
    }
  },

  saveSubscriptions(subs: CustomerSubscription[]): void {
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(subs));
  },

  getPromotions(): Promotion[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PROMOTIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify(INITIAL_PROMOTIONS));
      return INITIAL_PROMOTIONS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_PROMOTIONS;
    }
  },

  savePromotions(promos: Promotion[]): void {
    localStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify(promos));
  },

  getComplaints(): Complaint[] {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPLAINTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.COMPLAINTS, JSON.stringify(INITIAL_COMPLAINTS));
      return INITIAL_COMPLAINTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_COMPLAINTS;
    }
  },

  saveComplaints(complaints: Complaint[]): void {
    localStorage.setItem(STORAGE_KEYS.COMPLAINTS, JSON.stringify(complaints));
  },

  getOperatingExpenses(): OperatingExpense[] {
    const raw = localStorage.getItem(STORAGE_KEYS.OPERATING_EXPENSES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.OPERATING_EXPENSES, JSON.stringify(INITIAL_OPERATING_EXPENSES));
      return INITIAL_OPERATING_EXPENSES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_OPERATING_EXPENSES;
    }
  },

  saveOperatingExpenses(expenses: OperatingExpense[]): void {
    localStorage.setItem(STORAGE_KEYS.OPERATING_EXPENSES, JSON.stringify(expenses));
  },

  reverseOperatingExpense(id: string, reason = 'Owner financial correction'): void {
    const list = this.getOperatingExpenses().map((e) =>
      e.id === id
        ? {
            ...e,
            isReversed: true,
            reversedAt: new Date().toISOString(),
            reversedBy: OWNER_PROFILE.fullName,
            reversalReason: reason,
          }
        : e
    );
    this.saveOperatingExpenses(list);
  },

  deleteOperatingExpense(id: string): void {
    this.reverseOperatingExpense(id, 'Owner administrative reversal');
  },

  getSettings(): PlatformSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
      return INITIAL_SETTINGS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_SETTINGS;
    }
  },

  saveSettings(settings: PlatformSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  getAddresses(): Address[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ADDRESSES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ADDRESSES, JSON.stringify(INITIAL_ADDRESSES));
      return INITIAL_ADDRESSES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_ADDRESSES;
    }
  },

  saveAddresses(addresses: Address[]): void {
    localStorage.setItem(STORAGE_KEYS.ADDRESSES, JSON.stringify(addresses));
  },

  // Owner Authentication Session
  isOwnerAuthenticated(): boolean {
    const session = localStorage.getItem(STORAGE_KEYS.OWNER_AUTH_STATE);
    if (!session) return false;
    try {
      const parsed = JSON.parse(session);
      return (
        parsed.verified === true &&
        parsed.email === OWNER_PROFILE.email &&
        parsed.role === 'admin'
      );
    } catch {
      return false;
    }
  },

  setOwnerAuthenticated(verified: boolean): void {
    if (verified) {
      localStorage.setItem(
        STORAGE_KEYS.OWNER_AUTH_STATE,
        JSON.stringify({
          verified: true,
          email: OWNER_PROFILE.email,
          fullName: OWNER_PROFILE.fullName,
          role: 'admin',
          authenticatedAt: new Date().toISOString(),
        })
      );
    } else {
      localStorage.removeItem(STORAGE_KEYS.OWNER_AUTH_STATE);
    }
  },

  // Reset to initial demo seed data
  resetDatabase(): void {
    localStorage.setItem(STORAGE_KEYS.COOKS, JSON.stringify(INITIAL_COOKS));
    localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(INITIAL_MENU_ITEMS));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(INITIAL_REVIEWS));
    localStorage.setItem(STORAGE_KEYS.PARTNER_APPLICATIONS, JSON.stringify(INITIAL_PARTNER_APPLICATIONS));
    localStorage.setItem(STORAGE_KEYS.DELIVERY_PARTNERS, JSON.stringify(INITIAL_DELIVERY_PARTNERS));
    localStorage.setItem(STORAGE_KEYS.MEAL_PLANS, JSON.stringify(INITIAL_MEAL_PLANS));
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(INITIAL_SUBSCRIPTIONS));
    localStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify(INITIAL_PROMOTIONS));
    localStorage.setItem(STORAGE_KEYS.COMPLAINTS, JSON.stringify(INITIAL_COMPLAINTS));
    localStorage.setItem(STORAGE_KEYS.OPERATING_EXPENSES, JSON.stringify(INITIAL_OPERATING_EXPENSES));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.ADDRESSES, JSON.stringify(INITIAL_ADDRESSES));
  },

  // Permitted order transition validator
  isValidOrderTransition(current: OrderStatus, next: OrderStatus): boolean {
    const rules: Record<OrderStatus, OrderStatus[]> = {
      pending: ['accepted', 'cancelled'],
      accepted: ['preparing', 'cancelled'],
      preparing: ['ready'],
      ready: ['out_for_delivery'],
      out_for_delivery: ['delivered'],
      delivered: [],
      cancelled: [],
    };
    return rules[current]?.includes(next) ?? false;
  },
};
