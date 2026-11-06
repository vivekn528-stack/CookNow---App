/**
 * CookNow Centralized Image Asset Registry
 *
 * Single Source of Truth for all culinary photography, kitchen covers,
 * category banners, and meal visual assets across the CookNow platform.
 *
 * Grounded in authentic Uttarakhand (Pahadi) and North Indian cuisine.
 * Guaranteed consistent mapping across Homepage, Search, Kitchen Detail,
 * Cart, Checkout, Order Tracker, Cook Dashboard, and Admin Dashboard.
 */

// Canonical Menu Photography Imports
import imgStudentMini from '../assets/images/mini_student_thali_1793813376258.jpg';
import imgStudentRegular from '../assets/images/regular_student_thali_1793813389451.jpg';
import imgStudentFull from '../assets/images/full_student_thali_1793813402529.jpg';
import imgPahadiThali from '../assets/images/meal_pahadi_thali_1793299532669.jpg';
import imgAlooGutke from '../assets/images/pahadi_aloo_gutke_1793813416914.jpg';
import imgGahatDal from '../assets/images/gahat_dal_phulka_1793813431582.jpg';
import imgRajmaChawal from '../assets/images/meal_rajma_chawal_1793299532575.jpg';
import imgStudentTiffin from '../assets/images/student_comfort_tiffin_1793813445440.jpg';
import imgAlooParatha from '../assets/images/meal_aloo_paratha_1793299533480.jpg';
import imgJhangoraKheer from '../assets/images/jhangora_ki_kheer_1793813459025.jpg';

// Canonical Kitchen Cover Photography Imports
import imgKitchenSunita from '../assets/images/cook_sunita_kitchen_1793299534647.jpg';
import imgKitchenAuntys from '../assets/images/kitchen_auntys_ghar_1793813474021.jpg';
import imgKitchenPunjabi from '../assets/images/kitchen_doon_punjabi_1793813487798.jpg';
import imgKitchenGarhwal from '../assets/images/kitchen_garhwal_bhojanalaya_1793813501437.jpg';
import imgKitchenPahadiZaika from '../assets/images/kitchen_pahadi_zaika_1793813516130.jpg';

// Homepage Hero Asset
import imgHeroMain from '../assets/images/hero_cooknow_homestyle_1793299531693.jpg';

/**
 * 1. CANONICAL MENU ITEM IMAGE MAPPING
 * Strict 1-to-1 mapping matching dish recipes and descriptions
 */
export interface ImageAssetMeta {
  src: string;
  alt: string;
  title: string;
  category: string;
}

export const MENU_ITEM_IMAGES: Record<string, ImageAssetMeta> = {
  // Mini Student Thali ₹49
  'menu-student-mini': {
    src: imgStudentMini,
    alt: 'Mini Student Comfort Meal with 2 whole wheat phulkas, yellow dal tadka, seasonal dry sabzi, and pickle',
    title: 'Mini Student Comfort Meal (₹49)',
    category: 'Student Thali',
  },
  // Regular Student Thali ₹69
  'menu-student-regular': {
    src: imgStudentRegular,
    alt: 'Regular Student Thali with 4 soft phulkas, dal fry, aloo beans sabzi, jeera rice, and cucumber salad',
    title: 'Regular Student Thali (₹69)',
    category: 'Student Thali',
  },
  // Full Student Thali ₹79
  'menu-student-full': {
    src: imgStudentFull,
    alt: 'Full Student Deluxe Thali with 4 ghee phulkas, dal makhani, paneer sabzi, basmati rice, raita, and dessert cup',
    title: 'Full Student Deluxe Thali (₹79)',
    category: 'Student Thali',
  },
  // Special Garhwali Homestyle Thali ₹160
  'menu-1': {
    src: imgPahadiThali,
    alt: 'Authentic Special Garhwali Homestyle Thali with Mandua rotis, Chainsoo black gram dal, rice, and Pahadi raita',
    title: 'Special Garhwali Homestyle Thali (₹160)',
    category: 'Pahadi Specials',
  },
  // Pahadi Aloo Ke Gutke & Mandua Roti ₹120
  'menu-pahadi-aloo': {
    src: imgAlooGutke,
    alt: 'Traditional Pahadi Aloo Ke Gutke sauteed with jakhiya seeds served with Mandua rotis and mint chutney',
    title: 'Pahadi Aloo Ke Gutke & Mandua Roti (₹120)',
    category: 'Pahadi Specials',
  },
  // Gahat Ki Daal & Phulka Combo ₹130
  'menu-2': {
    src: imgGahatDal,
    alt: 'Warm bowl of Garhwali Gahat (Kulath) horsegram dal with jakhiya tadka, served with 4 soft phulkas and salad',
    title: 'Gahat (Kulath) Ki Daal & Phulka Combo (₹130)',
    category: 'Pahadi Specials',
  },
  // Homestyle Pahadi Rajma Chawal Bowl ₹120
  'menu-3': {
    src: imgRajmaChawal,
    alt: 'Authentic Chakrata red kidney bean Rajma curry served over fragrant steamed basmati rice with sliced onions and lime',
    title: 'Homestyle Pahadi Rajma Chawal Bowl (₹120)',
    category: 'Daily Tiffin',
  },
  // Daily Student Comfort Tiffin ₹110
  'menu-4': {
    src: imgStudentTiffin,
    alt: 'Daily Student Comfort Tiffin with 4 rotis, yellow dal tadka, seasonal dry sabzi, and steamed rice in tiered container',
    title: 'Daily Student Comfort Tiffin (₹110)',
    category: 'Daily Tiffin',
  },
  // Makhan Aloo Paratha (2 Pcs) ₹95
  'menu-5': {
    src: imgAlooParatha,
    alt: 'Two crisp tawa parathas generously stuffed with spiced potatoes, topped with fresh white homemade makhan butter, served with curd',
    title: 'Makhan Aloo Paratha (2 Pcs) (₹95)',
    category: 'Parathas',
  },
  // Jhangora Ki Kheer ₹80
  'menu-8': {
    src: imgJhangoraKheer,
    alt: 'Traditional Uttarakhand dessert Jhangora Ki Kheer barnyard millet pudding garnished with sliced almonds and pistachios',
    title: 'Jhangora Ki Kheer (₹80)',
    category: 'Desserts',
  },
};

/**
 * 2. CANONICAL KITCHEN PROFILES & COVERS
 * Neutral, authentic kitchen imagery without fabricated human portraits
 */
export interface KitchenAssetMeta {
  bannerSrc: string;
  avatarSrc: string;
  alt: string;
  isVerified: boolean;
  statusLabel: string;
}

export const KITCHEN_IMAGES: Record<string, KitchenAssetMeta> = {
  'cook-1': {
    bannerSrc: imgKitchenSunita,
    avatarSrc: imgKitchenSunita,
    alt: "Sunita's Pahadi Rasoi - Nalapani Chowk Verified Kitchen",
    isVerified: true,
    statusLabel: 'Verified FSSAI Kitchen',
  },
  'cook-2': {
    bannerSrc: imgKitchenAuntys,
    avatarSrc: imgKitchenAuntys,
    alt: "Aunty's Ghar Ka Khana - Raipur Road Verified Kitchen",
    isVerified: true,
    statusLabel: 'Verified FSSAI Kitchen',
  },
  'cook-3': {
    bannerSrc: imgKitchenPunjabi,
    avatarSrc: imgKitchenPunjabi,
    alt: 'Doon Punjabi Kitchenette - Sahastradhara Road Verified Kitchen',
    isVerified: true,
    statusLabel: 'Verified FSSAI Kitchen',
  },
  'cook-4': {
    bannerSrc: imgKitchenGarhwal,
    avatarSrc: imgKitchenGarhwal,
    alt: 'Garhwal Bhojanalaya - Nalapani Chowk Verified Restaurant Partner',
    isVerified: true,
    statusLabel: 'Verified Restaurant Partner',
  },
  'cook-5': {
    bannerSrc: imgKitchenPahadiZaika,
    avatarSrc: imgKitchenPahadiZaika,
    alt: 'Pahadi Zaika - Pending Verification / Administrative Review',
    isVerified: false,
    statusLabel: 'Pending Verification',
  },
};

/**
 * 3. CATEGORY VISUALS
 */
export const CATEGORY_IMAGES: Record<string, ImageAssetMeta> = {
  'Student Thali': {
    src: imgStudentRegular,
    alt: 'Student Special Thalis starting at ₹49',
    title: 'Student Thalis',
    category: 'Student Thali',
  },
  'Pahadi Specials': {
    src: imgPahadiThali,
    alt: 'Authentic Garhwali & Kumaoni Mountain Delicacies',
    title: 'Pahadi Specials',
    category: 'Pahadi Specials',
  },
  'Daily Tiffin': {
    src: imgStudentTiffin,
    alt: 'Daily Homestyle Tiffins & Lunch Combos',
    title: 'Daily Tiffin',
    category: 'Daily Tiffin',
  },
  'North Indian': {
    src: imgRajmaChawal,
    alt: 'North Indian Homestyle Comfort Curries & Rice',
    title: 'North Indian',
    category: 'North Indian',
  },
  'Parathas': {
    src: imgAlooParatha,
    alt: 'Fresh Tawa Stuffed Parathas with Desi Butter',
    title: 'Parathas',
    category: 'Parathas',
  },
  'Desserts': {
    src: imgJhangoraKheer,
    alt: 'Traditional Pahadi Sweets & Desserts',
    title: 'Desserts',
    category: 'Desserts',
  },
};

/**
 * 4. MEAL PLAN SUBSCRIPTION BANNERS
 */
export const MEAL_PLAN_IMAGES: Record<string, ImageAssetMeta> = {
  'plan-student-budget': {
    src: imgStudentTiffin,
    alt: 'Monthly Student Budget Tiffin Plan - 30 wholesome meals',
    title: 'Monthly Student Budget Tiffin Plan',
    category: 'Subscription Plan',
  },
  'plan-pahadi-special': {
    src: imgPahadiThali,
    alt: 'Monthly Authentic Pahadi Swad Plan - Traditional Garhwali dinners',
    title: 'Monthly Authentic Pahadi Swad Plan',
    category: 'Subscription Plan',
  },
  'plan-full-day': {
    src: imgStudentFull,
    alt: 'Monthly Full Board Plan - 60 complete meals (Lunch + Dinner)',
    title: 'Monthly Full Board Plan',
    category: 'Subscription Plan',
  },
};

// Global Fallbacks
export const HERO_BANNER_IMAGE = imgHeroMain;
export const FALLBACK_MEAL_IMAGE = imgStudentRegular;
export const FALLBACK_KITCHEN_BANNER = imgKitchenSunita;
export const FALLBACK_KITCHEN_AVATAR = imgKitchenSunita;

/**
 * Robust image getter for any menu item id
 */
export function getMenuItemImage(menuItemId?: string | null): string {
  if (!menuItemId) return FALLBACK_MEAL_IMAGE;
  return MENU_ITEM_IMAGES[menuItemId]?.src || FALLBACK_MEAL_IMAGE;
}

/**
 * Robust alt-text getter for accessibility
 */
export function getMenuItemAlt(menuItemId?: string | null, fallbackName?: string): string {
  if (!menuItemId) return fallbackName || 'Homestyle Indian Dish';
  return MENU_ITEM_IMAGES[menuItemId]?.alt || fallbackName || 'Homestyle Indian Dish';
}

/**
 * Kitchen Banner getter
 */
export function getKitchenBanner(cookId?: string | null): string {
  if (!cookId) return FALLBACK_KITCHEN_BANNER;
  return KITCHEN_IMAGES[cookId]?.bannerSrc || FALLBACK_KITCHEN_BANNER;
}

/**
 * Kitchen Avatar getter
 */
export function getKitchenAvatar(cookId?: string | null): string {
  if (!cookId) return FALLBACK_KITCHEN_AVATAR;
  return KITCHEN_IMAGES[cookId]?.avatarSrc || FALLBACK_KITCHEN_AVATAR;
}

/**
 * Category Visual getter
 */
export function getCategoryVisual(categoryName?: string | null): string {
  if (!categoryName) return FALLBACK_MEAL_IMAGE;
  return CATEGORY_IMAGES[categoryName]?.src || FALLBACK_MEAL_IMAGE;
}

/**
 * Meal Plan Visual getter
 */
export function getMealPlanImage(planId?: string | null): string {
  if (!planId) return FALLBACK_MEAL_IMAGE;
  return MEAL_PLAN_IMAGES[planId]?.src || FALLBACK_MEAL_IMAGE;
}
