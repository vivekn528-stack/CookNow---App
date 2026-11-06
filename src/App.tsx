import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  MapPin,
  Clock,
  ShieldCheck,
  Star,
  ChefHat,
  ArrowRight,
  Info,
  Phone,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Flame,
  Heart,
  Calendar,
  Sparkles,
  Bike,
  Store,
  Tag,
} from 'lucide-react';
import {
  Cook,
  MenuItem,
  Order,
  OrderStatus,
  Review,
  PlatformSettings,
  UserRole,
  CartItem,
  DietaryType,
  PartnerApplication,
  DeliveryPartner,
  MealPlan,
  CustomerSubscription,
  Promotion,
  Complaint,
  OperatingExpense,
  Profile,
} from './types';
import { OWNER_PROFILE, StorageManager } from './lib/storage';
import {
  supabaseService,
  isSupabaseConfigured,
  getSupabaseDiagnostics,
  getSupabaseConfig,
  hydrateSupabaseFromPublicApi,
} from './lib/supabase';
import { firestoreService } from './lib/firestore';
import { placeCustomerOrder } from './lib/order-service';
import { FALLBACK_KITCHEN_AVATAR } from './lib/image-registry';
import {
  signOutFirebase,
  getFirebaseAuth,
  signInWithGoogle,
  onAuthUserChanged,
} from './lib/firebase';
import type { User } from 'firebase/auth';
import { Navbar, NavTabType } from './components/Navbar';
import { Hero } from './components/Hero';
import { MealCard } from './components/MealCard';
import { MealDetailsModal } from './components/MealDetailsModal';
import { CookCard } from './components/CookCard';
import { CookProfileModal } from './components/CookProfileModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderTrackerModal } from './components/OrderTrackerModal';
import { CustomerOrdersView } from './components/CustomerOrdersView';
import { ReviewModal } from './components/ReviewModal';
import { CookDashboard } from './components/CookDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { DeliveryPartnerDashboard } from './components/DeliveryPartnerDashboard';
import { MealPlansView } from './components/MealPlansView';
import { PartnerWithUsModal } from './components/PartnerWithUsModal';
import { DeliveryPartnerModal } from './components/DeliveryPartnerModal';
import { OwnerAuthModal } from './components/OwnerAuthModal';
import { DatabaseGuideModal } from './components/DatabaseGuideModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';

export default function App() {
  // Backend Integration State (Firebase Firestore primary + Supabase secondary + Local fallback)
  type BackendStatusMode = 'live_firestore' | 'offline_fallback' | 'query_error';
  const [backendStatusMode, setBackendStatusMode] = useState<BackendStatusMode>('live_firestore');
  const [backendStatusDetails, setBackendStatusDetails] = useState<string>('Syncing Cloud Firestore...');
  const [firestoreQueryError, setFirestoreQueryError] = useState<string | null>(null);
  const [isLiveFirestore, setIsLiveFirestore] = useState<boolean>(true);
  const [firestoreNotice, setFirestoreNotice] = useState<string | null>(null);
  const [isLiveSupabase, setIsLiveSupabase] = useState<boolean>(() => isSupabaseConfigured());
  const [isBackendLoading, setIsBackendLoading] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [adminCooks, setAdminCooks] = useState<Cook[]>([]);

  // Master state from StorageManager
  const [cooks, setCooks] = useState<Cook[]>(() => StorageManager.getCooks());
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => StorageManager.getMenuItems());
  const [orders, setOrders] = useState<Order[]>(() => StorageManager.getOrders());
  const [reviews, setReviews] = useState<Review[]>(() => StorageManager.getReviews());
  const [partnerApplications, setPartnerApplications] = useState<PartnerApplication[]>(() =>
    StorageManager.getPartnerApplications()
  );
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartner[]>(() =>
    StorageManager.getDeliveryPartners()
  );
  const [mealPlans, setMealPlans] = useState<MealPlan[]>(() => StorageManager.getMealPlans());
  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>(() =>
    StorageManager.getSubscriptions()
  );
  const [promotions, setPromotions] = useState<Promotion[]>(() =>
    StorageManager.getPromotions()
  );
  const [complaints, setComplaints] = useState<Complaint[]>(() =>
    StorageManager.getComplaints()
  );
  const [expenses, setExpenses] = useState<OperatingExpense[]>(() =>
    StorageManager.getOperatingExpenses()
  );
  const [settings, setSettings] = useState<PlatformSettings>(() => StorageManager.getSettings());

  // Navigation & Role states
  const [currentRole, setCurrentRole] = useState<UserRole>('customer');
  const [activeTab, setActiveTab] = useState<NavTabType>('explore');

  // Currently active cook for Cook Dashboard
  const [currentCook, setCurrentCook] = useState<Cook>(() => cooks[0] || ({} as Cook));

  // Currently active delivery rider for Rider Dashboard
  const [currentRider, setCurrentRider] = useState<DeliveryPartner>(
    () => deliveryPartners[0] || ({} as DeliveryPartner)
  );

  // Customer Firebase Authentication & Profile
  const [currentFirebaseUser, setCurrentFirebaseUser] = useState<User | null>(() => getFirebaseAuth()?.currentUser || null);
  const [customerProfile, setCustomerProfile] = useState<Profile | null>(null);
  const [isCustomerAuthLoading, setIsCustomerAuthLoading] = useState<boolean>(false);

  // Owner authentication session
  const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState<boolean>(() =>
    StorageManager.isOwnerAuthenticated()
  );
  const [isOwnerAuthModalOpen, setIsOwnerAuthModalOpen] = useState(false);

  // Partner & Delivery registration modals
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Modals state
  const [selectedMeal, setSelectedMeal] = useState<MenuItem | null>(null);
  const [selectedCookProfile, setSelectedCookProfile] = useState<Cook | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [isDbGuideOpen, setIsDbGuideOpen] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Meals');
  const [localityFilter, setLocalityFilter] = useState('all');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | DietaryType>('all');
  const [maxPrice, setMaxPrice] = useState<number>(200);

  // Toast notice
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadLiveBackendData = async () => {
    setIsBackendLoading(true);
    setBackendError(null);
    setFirestoreQueryError(null);
    setFirestoreNotice(null);

    try {
      const auth = getFirebaseAuth();
      const currentUser = auth?.currentUser;
      const isSuperAdminSession = Boolean(
        isOwnerAuthenticated ||
        (currentUser && currentUser.email?.toLowerCase().trim() === 'vivekn528@gmail.com' && currentUser.emailVerified)
      );

      // 1. Primary: Cloud Firestore
      // Public customer query: strictly verified cooks (where isVerified == true)
      // Super Admin: also fetches unverified cooks for the administrative dashboard
      const [
        cooksRes,
        adminCooksRes,
        menuRes,
        ordersRes,
        reviewsRes,
        partnerRes,
        ridersRes,
        plansRes,
        subsRes,
        promosRes,
        complaintsRes,
        expensesRes,
        settingsRes,
      ] = await Promise.all([
        firestoreService.fetchCooks(), // Customer query: strictly where isVerified == true
        isSuperAdminSession ? firestoreService.fetchCooks({ includeUnverified: true }) : Promise.resolve({ data: null, error: null, fromLiveBackend: false }),
        firestoreService.fetchMenuItems(),
        firestoreService.fetchOrders(),
        firestoreService.fetchReviews(),
        firestoreService.fetchPartnerApplications(),
        firestoreService.fetchDeliveryPartners(),
        firestoreService.fetchMealPlans(),
        firestoreService.fetchSubscriptions(),
        firestoreService.fetchPromotions(),
        firestoreService.fetchComplaints(),
        firestoreService.fetchOperatingExpenses(),
        firestoreService.fetchPlatformSettings(),
      ]);

      let liveEntitiesCount = 0;
      const queryErrors: string[] = [];

      if (cooksRes.data && cooksRes.fromLiveBackend) {
        setCooks(cooksRes.data);
        if (cooksRes.data.length > 0) {
          setCurrentCook(cooksRes.data[0]);
        }
        liveEntitiesCount++;
      } else if (cooksRes.error) {
        queryErrors.push(`Cooks query: ${cooksRes.error}`);
      }

      if (adminCooksRes.data && adminCooksRes.fromLiveBackend) {
        setAdminCooks(adminCooksRes.data);
      }

      if (menuRes.data && menuRes.fromLiveBackend) {
        setMenuItems(menuRes.data);
        liveEntitiesCount++;
      } else if (menuRes.error) {
        queryErrors.push(`Menu items query: ${menuRes.error}`);
      }

      if (ordersRes.data && ordersRes.fromLiveBackend && ordersRes.data.length > 0) {
        setOrders(ordersRes.data);
        liveEntitiesCount++;
      }
      if (reviewsRes.data && reviewsRes.fromLiveBackend && reviewsRes.data.length > 0) {
        setReviews(reviewsRes.data);
      }
      if (partnerRes.data && partnerRes.fromLiveBackend && partnerRes.data.length > 0) {
        setPartnerApplications(partnerRes.data);
      }
      if (ridersRes.data && ridersRes.fromLiveBackend && ridersRes.data.length > 0) {
        setDeliveryPartners(ridersRes.data);
        setCurrentRider(ridersRes.data[0]);
        liveEntitiesCount++;
      }
      if (plansRes.data && plansRes.fromLiveBackend && plansRes.data.length > 0) {
        setMealPlans(plansRes.data);
        liveEntitiesCount++;
      }
      if (subsRes.data && subsRes.fromLiveBackend && subsRes.data.length > 0) {
        setSubscriptions(subsRes.data);
      }
      if (promosRes.data && promosRes.fromLiveBackend && promosRes.data.length > 0) {
        setPromotions(promosRes.data);
        liveEntitiesCount++;
      }
      if (complaintsRes.data && complaintsRes.fromLiveBackend && complaintsRes.data.length > 0) {
        setComplaints(complaintsRes.data);
      }
      if (expensesRes.data && expensesRes.fromLiveBackend && expensesRes.data.length > 0) {
        setExpenses(expensesRes.data);
      }
      if (settingsRes.data && settingsRes.fromLiveBackend) {
        setSettings(settingsRes.data);
        liveEntitiesCount++;
      }

      if (queryErrors.length > 0) {
        setBackendStatusMode('query_error');
        setFirestoreQueryError(queryErrors.join('; '));
        setBackendStatusDetails(`Query notice: ${queryErrors.join('; ')}`);
        setIsLiveFirestore(false);
      } else if (liveEntitiesCount > 0) {
        setBackendStatusMode('live_firestore');
        setIsLiveFirestore(true);
        setBackendStatusDetails(`Cloud Firestore live & synchronized (${cooksRes.data?.length || 0} verified cooks · ${menuRes.data?.length || 0} menu items · 3 plans · 3 promotions).`);
        setFirestoreNotice('Cloud Firestore (cooknow-9444c) active & synchronized.');
      } else {
        setBackendStatusMode('offline_fallback');
        setIsLiveFirestore(false);
        setBackendStatusDetails('Operating with local StorageManager pilot data fallback (offline baseline).');
        setFirestoreNotice('Operating with local StorageManager pilot baseline.');
      }

      // Check secondary Supabase status if configured (for dual-read / migration verification)
      await hydrateSupabaseFromPublicApi();
      if (isSupabaseConfigured()) {
        setIsLiveSupabase(true);
      } else {
        setIsLiveSupabase(false);
      }
    } catch (err: any) {
      console.warn('Firestore backend notice:', err);
      setBackendStatusMode('query_error');
      setFirestoreQueryError(err.message || 'Connecting to Firestore');
      setIsLiveFirestore(false);
      setBackendStatusDetails(`Firestore offline fallback: ${err.message || 'Connecting'}`);
      setFirestoreNotice(`Firestore offline fallback: ${err.message || 'Connecting'}`);
    } finally {
      setIsBackendLoading(false);
    }
  };

  const loadLiveSupabaseData = async () => {
    setIsBackendLoading(true);
    setBackendError(null);
    try {
      await hydrateSupabaseFromPublicApi();
      if (!isSupabaseConfigured()) {
        setIsLiveSupabase(false);
        return;
      }

      const [cooksRes, menuRes, ordersRes, reviewsRes, partnerRes, ridersRes, plansRes, subsRes] =
        await Promise.all([
          supabaseService.fetchCooks(),
          supabaseService.fetchMenuItems(),
          supabaseService.fetchOrders(),
          supabaseService.fetchReviews(),
          supabaseService.fetchPartnerApplications(),
          supabaseService.fetchDeliveryPartners(),
          supabaseService.fetchMealPlans(),
          supabaseService.fetchSubscriptions(),
        ]);

      if (cooksRes.error && menuRes.error) {
        setBackendError(`Supabase notice: ${cooksRes.error}.`);
        setIsLiveSupabase(false);
        return;
      }

      if (cooksRes.data && cooksRes.data.length > 0) {
        setCooks(cooksRes.data);
        setCurrentCook(cooksRes.data[0]);
      }
      if (menuRes.data && menuRes.data.length > 0) setMenuItems(menuRes.data);
      if (ordersRes.data && ordersRes.data.length > 0) setOrders(ordersRes.data);
      if (reviewsRes.data && reviewsRes.data.length > 0) setReviews(reviewsRes.data);
      if (partnerRes.data && partnerRes.data.length > 0) setPartnerApplications(partnerRes.data);
      if (ridersRes.data && ridersRes.data.length > 0) {
        setDeliveryPartners(ridersRes.data);
        setCurrentRider(ridersRes.data[0]);
      }
      if (plansRes.data && plansRes.data.length > 0) setMealPlans(plansRes.data);
      if (subsRes.data && subsRes.data.length > 0) setSubscriptions(subsRes.data);

      setIsLiveSupabase(true);
    } catch (err: any) {
      setBackendError(err.message || 'Supabase network exception');
      setIsLiveSupabase(false);
    } finally {
      setIsBackendLoading(false);
    }
  };

  // Initial load from Cloud Firestore + Supabase migration probe
  useEffect(() => {
    loadLiveBackendData();
  }, []);

  // Customer Firebase Authentication & Profile Synchronization Listener
  useEffect(() => {
    const unsubscribe = onAuthUserChanged(async (user) => {
      setCurrentFirebaseUser(user);
      if (user) {
        try {
          const profileRes = await firestoreService.fetchUserProfile(user.uid);
          if (profileRes.data) {
            setCustomerProfile(profileRes.data);
          } else {
            // Secure profile initialization adhering to firestore.rules
            const isOwnerEmail = user.email?.toLowerCase().trim() === 'vivekn528@gmail.com';
            const newProfile: Profile = {
              id: user.uid,
              email: user.email || '',
              fullName: user.displayName || 'Customer',
              phone: '',
              role: isOwnerEmail ? 'admin' : 'customer',
              createdAt: new Date().toISOString(),
            };
            await firestoreService.saveUserProfile(newProfile);
            setCustomerProfile(newProfile);
          }
        } catch (profileErr) {
          console.warn('Customer profile initialization notice:', profileErr);
        }
        // Refresh customer-scoped orders from live Firestore
        loadLiveBackendData();
      } else {
        setCustomerProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync to Storage whenever master state changes
  useEffect(() => {
    StorageManager.saveCooks(cooks);
  }, [cooks]);

  useEffect(() => {
    StorageManager.saveMenuItems(menuItems);
  }, [menuItems]);

  useEffect(() => {
    StorageManager.saveOrders(orders);
  }, [orders]);

  useEffect(() => {
    StorageManager.saveReviews(reviews);
  }, [reviews]);

  useEffect(() => {
    StorageManager.savePartnerApplications(partnerApplications);
  }, [partnerApplications]);

  useEffect(() => {
    StorageManager.saveDeliveryPartners(deliveryPartners);
  }, [deliveryPartners]);

  useEffect(() => {
    StorageManager.saveMealPlans(mealPlans);
  }, [mealPlans]);

  useEffect(() => {
    StorageManager.saveSubscriptions(subscriptions);
  }, [subscriptions]);

  useEffect(() => {
    StorageManager.savePromotions(promotions);
  }, [promotions]);

  useEffect(() => {
    StorageManager.saveComplaints(complaints);
  }, [complaints]);

  useEffect(() => {
    StorageManager.saveOperatingExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    StorageManager.saveSettings(settings);
  }, [settings]);

  // Keep trackedOrder in sync if orders change + Live Firestore Snapshot Subscription
  useEffect(() => {
    if (trackedOrder) {
      const refreshed = orders.find((o) => o.id === trackedOrder.id);
      if (refreshed) setTrackedOrder(refreshed);
    }
  }, [orders, trackedOrder]);

  // Real-time Firestore Snapshot Listener for active order
  useEffect(() => {
    if (!trackedOrder?.id) return;
    const unsubscribe = firestoreService.subscribeToOrder(trackedOrder.id, (liveOrder) => {
      if (liveOrder) {
        setTrackedOrder(liveOrder);
        setOrders((prev) => prev.map((o) => (o.id === liveOrder.id ? liveOrder : o)));
      }
    });
    return () => {
      unsubscribe();
    };
  }, [trackedOrder?.id]);

  // Cart Quantities map
  const cartItemQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    cart.forEach((c) => {
      map[c.menuItem.id] = c.quantity;
    });
    return map;
  }, [cart]);

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Role Change Handler with Zero-Trust Authentication Gate
  const handleRoleChange = (role: UserRole) => {
    if (role === 'admin') {
      if (!isOwnerAuthenticated) {
        setIsOwnerAuthModalOpen(true);
        return;
      }
      setCurrentRole('admin');
      setActiveTab('admin-dashboard');
      return;
    }
    setCurrentRole(role);
  };

  // Cart Handlers
  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItem.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
    showToast(`Added "${item.name}" to your meal bag!`);
  };

  const handleUpdateCartQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.menuItem.id === itemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.menuItem.id !== itemId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Customer Authentication Actions
  const handleCustomerGoogleSignIn = async (): Promise<boolean> => {
    setIsCustomerAuthLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.error) {
        showToast(`Sign-in notice: ${res.error}`);
        return false;
      }
      if (res.user) {
        showToast(`Welcome to CookNow, ${res.user.displayName || res.user.email}!`);
        return true;
      }
      return false;
    } catch (err: any) {
      showToast(`Sign-in failed: ${err.message || 'Authentication error'}`);
      return false;
    } finally {
      setIsCustomerAuthLoading(false);
    }
  };

  const handleCustomerSignOut = async () => {
    try {
      await signOutFirebase();
      setCurrentFirebaseUser(null);
      setCustomerProfile(null);
      showToast('Signed out from CookNow customer account.');
    } catch (err: any) {
      showToast(`Sign-out error: ${err.message}`);
    }
  };

  // Order Lifecycle Handlers (Connected to Cloud Functions with atomic transactional fallback)
  const handleOrderPlaced = async (newOrder: Order) => {
    if (!currentFirebaseUser) {
      showToast('⚠️ Google Sign-In is required to secure your order.');
      setIsCheckoutOpen(true);
      throw new Error('Google Sign-In is required before placing an order.');
    }

    // Strict security rule requirement: customerId MUST match auth.currentUser.uid
    const canonicalOrder: Order = {
      ...newOrder,
      customerId: currentFirebaseUser.uid,
    };

    const payload = {
      cookId: canonicalOrder.cookId,
      items: canonicalOrder.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      promoCode: canonicalOrder.discountCode,
      paymentMethod: canonicalOrder.paymentMethod,
      idempotencyKey: `${currentFirebaseUser.uid}_${canonicalOrder.id}`,
      deliveryAddress: canonicalOrder.deliveryAddress,
      deliveryInstructions: canonicalOrder.deliveryInstructions,
    };

    const orderRes = await placeCustomerOrder(payload, canonicalOrder);

    if (!orderRes.success || !orderRes.order) {
      // CRITICAL REQUIREMENT: Never silently save failed orders to localStorage as successful
      showToast(`❌ Order rejected: ${orderRes.error}`);
      throw new Error(`Order placement rejected: ${orderRes.error}`);
    }

    const confirmedOrder = orderRes.order;
    setOrders((prev) => [confirmedOrder, ...prev]);
    setCart([]);
    setIsCheckoutOpen(false);
    setTrackedOrder(confirmedOrder);
    showToast(
      `Order #${confirmedOrder.id} placed & secured ${orderRes.fromServerFunction ? 'via Cloud Functions' : 'in Cloud Firestore'}!`
    );

    // Secondary sync to Supabase during Phase 3 migration if configured
    if (isSupabaseConfigured()) {
      supabaseService.insertOrder(confirmedOrder).catch(() => {});
    }
  };

  const handleCancelOrder = async (orderId: string, reason: string) => {
    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            status: 'cancelled',
            cancellationReason: reason,
            events: [
              ...ord.events,
              {
                status: 'cancelled',
                timestamp: now,
                note: `Order cancelled. Reason: ${reason}`,
              },
            ],
            updatedAt: now,
          };
        }
        return ord;
      })
    );

    // Primary: Cloud Firestore update
    const firestoreRes = await firestoreService.updateOrderStatus(orderId, 'cancelled', reason);
    if (firestoreRes.error) {
      showToast(`⚠️ Firestore cancel notice: ${firestoreRes.error}`);
    } else {
      showToast(`Order #${orderId} cancelled & updated in Cloud Firestore.`);
    }

    if (isSupabaseConfigured()) {
      supabaseService.updateOrderStatus(orderId, 'cancelled', reason).catch(() => {});
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: OrderStatus, reason?: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    if (!StorageManager.isValidOrderTransition(targetOrder.status, nextStatus)) {
      showToast(`Invalid transition from ${targetOrder.status} to ${nextStatus}.`);
      return;
    }

    const now = new Date().toISOString();
    const eventNote =
      nextStatus === 'accepted'
        ? 'Accepted by kitchen. Ingredients being freshly prepared.'
        : nextStatus === 'preparing'
        ? 'Cooking in progress with fresh tawa rotis and spices.'
        : nextStatus === 'ready'
        ? 'Meal prepared & packed in hygienic thermal container.'
        : nextStatus === 'out_for_delivery'
        ? 'Dispatched with local delivery partner to Nalapani Chowk.'
        : nextStatus === 'delivered'
        ? 'Successfully delivered to customer. Payment collected.'
        : reason || 'Order status updated.';

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            status: nextStatus,
            cancellationReason: nextStatus === 'cancelled' ? reason : ord.cancellationReason,
            paymentStatus: nextStatus === 'delivered' ? 'paid' : ord.paymentStatus,
            events: [
              ...ord.events,
              {
                status: nextStatus,
                timestamp: now,
                note: eventNote,
              },
            ],
            updatedAt: now,
          };
        }
        return ord;
      })
    );

    // Primary: Cloud Firestore update
    const firestoreRes = await firestoreService.updateOrderStatus(orderId, nextStatus, reason);
    if (firestoreRes.error) {
      showToast(`⚠️ Firestore update notice: ${firestoreRes.error}`);
    } else {
      showToast(`Order #${orderId} updated to ${nextStatus.replace(/_/g, ' ')} in Cloud Firestore!`);
    }

    if (isSupabaseConfigured()) {
      supabaseService.updateOrderStatus(orderId, nextStatus, reason).catch(() => {});
    }
  };

  // Delivery Partner Status Handler
  const handleUpdateDeliveryStatus = async (
    orderId: string,
    status: OrderStatus,
    partnerId: string,
    partnerName: string
  ) => {
    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            status,
            deliveryPartnerId: partnerId,
            deliveryPartnerName: partnerName,
            deliveryStatus: status === 'delivered' ? 'delivered' : 'out_for_delivery',
            paymentStatus: status === 'delivered' ? 'paid' : ord.paymentStatus,
            events: [
              ...ord.events,
              {
                status,
                timestamp: now,
                note: `Delivery status updated by rider ${partnerName}: ${status}`,
              },
            ],
            updatedAt: now,
          };
        }
        return ord;
      })
    );

    // If delivered, update rider's balance
    if (status === 'delivered') {
      setDeliveryPartners((prev) =>
        prev.map((dp) =>
          dp.id === partnerId
            ? {
                ...dp,
                totalDeliveries: dp.totalDeliveries + 1,
                earningsBalance: dp.earningsBalance + 25,
              }
            : dp
        )
      );
    }

    // Primary: Cloud Firestore delivery partner assignment and status update
    const deliveryStatus = status === 'delivered' ? 'delivered' : 'out_for_delivery';
    const firestoreRes = await firestoreService.updateOrderDeliveryStatus(orderId, deliveryStatus, partnerId, partnerName);
    await firestoreService.updateOrderStatus(orderId, status);
    if (firestoreRes.error) {
      showToast(`⚠️ Firestore rider notice: ${firestoreRes.error}`);
    } else {
      showToast(`Order #${orderId} delivery status: ${status.replace(/_/g, ' ')} (Firestore)`);
    }
  };

  // Partner Onboarding Approval / Rejection
  const handleApprovePartner = async (appId: string, reason: string) => {
    const now = new Date().toISOString();
    const app = partnerApplications.find((a) => a.id === appId);
    if (!app) return;

    setPartnerApplications((prev) =>
      prev.map((a) =>
        a.id === appId
          ? { ...a, status: 'approved', reviewerReason: reason, reviewedAt: now, reviewedBy: OWNER_PROFILE.fullName }
          : a
      )
    );

    // Add as approved cook/restaurant
    const newCook: Cook = {
      id: `cook-${Date.now()}`,
      userId: `user-cook-${Date.now()}`,
      kitchenName: app.businessName,
      ownerName: app.ownerName,
      phone: app.phone,
      bio: `${app.sampleMenu}. Verified by Founder Vivek Singh Negi for Nalapani operations.`,
      address: app.address,
      locality: app.locality,
      city: 'Dehradun',
      state: 'Uttarakhand',
      fssaiNumber: app.fssaiNumber,
      isVerified: true,
      verificationStatus: 'approved',
      verificationNotes: reason,
      partnerType: app.partnerType,
      avatarUrl: app.kitchenPhotos?.[0] || FALLBACK_KITCHEN_AVATAR,
      rating: 5.0,
      reviewCount: 0,
      specialty: app.sampleMenu.slice(0, 45),
      deliveryTimeMin: 20,
      deliveryTimeMax: 35,
      isAcceptingOrders: true,
      operatingHours: app.operatingHours,
      dailyCapacity: app.dailyCapacity,
      createdAt: now,
    };

    setCooks((prev) => [newCook, ...prev]);

    // Primary: Cloud Firestore update
    await firestoreService.updatePartnerApplicationStatus(appId, 'approved', reason, OWNER_PROFILE.fullName);
    await firestoreService.insertCook(newCook);

    if (isSupabaseConfigured()) {
      supabaseService.updatePartnerApplicationStatus(appId, 'approved', reason, OWNER_PROFILE.fullName).catch(() => {});
      supabaseService.insertCook(newCook).catch(() => {});
    }

    showToast(`Approved ${app.businessName} as verified partner in Cloud Firestore!`);
  };

  const handleRejectPartner = async (appId: string, reason: string) => {
    const now = new Date().toISOString();
    setPartnerApplications((prev) =>
      prev.map((a) =>
        a.id === appId
          ? { ...a, status: 'rejected', reviewerReason: reason, reviewedAt: now, reviewedBy: OWNER_PROFILE.fullName }
          : a
      )
    );

    await firestoreService.updatePartnerApplicationStatus(appId, 'rejected', reason, OWNER_PROFILE.fullName);

    if (isSupabaseConfigured()) {
      supabaseService.updatePartnerApplicationStatus(appId, 'rejected', reason, OWNER_PROFILE.fullName).catch(() => {});
    }

    showToast(`Partner application rejected with recorded audit reason in Cloud Firestore.`);
  };

  // Delivery Partner Approval / Rejection
  const handleApproveDeliveryPartner = async (partnerId: string, notes: string) => {
    setDeliveryPartners((prev) =>
      prev.map((dp) =>
        dp.id === partnerId
          ? { ...dp, status: 'approved', reviewerNotes: notes, isAvailable: true }
          : dp
      )
    );

    await firestoreService.updateDeliveryPartnerStatus(partnerId, 'approved', notes);

    if (isSupabaseConfigured()) {
      supabaseService.updateDeliveryPartnerStatus(partnerId, 'approved', notes).catch(() => {});
    }

    showToast(`Rider approved to accept Nalapani Chowk deliveries in Cloud Firestore!`);
  };

  const handleRejectDeliveryPartner = async (partnerId: string, reason: string) => {
    setDeliveryPartners((prev) =>
      prev.map((dp) =>
        dp.id === partnerId
          ? { ...dp, status: 'rejected', reviewerNotes: reason, isAvailable: false }
          : dp
      )
    );

    await firestoreService.updateDeliveryPartnerStatus(partnerId, 'rejected', reason);

    if (isSupabaseConfigured()) {
      supabaseService.updateDeliveryPartnerStatus(partnerId, 'rejected', reason).catch(() => {});
    }

    showToast(`Rider application rejected in Cloud Firestore.`);
  };

  const handleAssignDeliveryPartner = async (orderId: string, partnerId: string, partnerName: string) => {
    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              deliveryPartnerId: partnerId,
              deliveryPartnerName: partnerName,
              deliveryStatus: 'assigned',
              events: [
                ...o.events,
                {
                  status: o.status,
                  timestamp: now,
                  note: `Assigned to delivery partner ${partnerName} by Owner Vivek Singh Negi.`,
                },
              ],
            }
          : o
      )
    );

    await firestoreService.updateOrderDeliveryStatus(orderId, 'assigned', partnerId, partnerName);

    if (isSupabaseConfigured()) {
      supabaseService.updateOrderStatus(orderId, 'ready').catch(() => {});
    }

    showToast(`Order #${orderId} assigned to ${partnerName} (Cloud Firestore).`);
  };

  // Subscription Handlers
  const handleSubscribeMealPlan = async (sub: CustomerSubscription) => {
    setSubscriptions((prev) => [sub, ...prev]);

    const res = await firestoreService.insertSubscription(sub);
    if (res.error) {
      showToast(`⚠️ Firestore subscription note: ${res.error}. Persisted locally.`);
    } else {
      showToast(`Subscribed to ${sub.planTitle}! Saved in Cloud Firestore.`);
    }

    if (isSupabaseConfigured()) {
      supabaseService.insertSubscription(sub).catch(() => {});
    }
  };

  const handlePauseSubscription = (subId: string, pauseDate: string) => {
    setSubscriptions((prev) =>
      prev.map((s) => {
        if (s.id === subId && s.pausesRemaining > 0) {
          return {
            ...s,
            pauseDates: [...s.pauseDates, pauseDate],
            pausesRemaining: s.pausesRemaining - 1,
          };
        }
        return s;
      })
    );
    showToast(`Pause scheduled for ${pauseDate}. Meal entitlement extended.`);
  };

  const handleCancelSubscription = (subId: string, reason: string) => {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, status: 'cancelled' } : s))
    );
    showToast('Subscription cancelled according to published refund terms.');
  };

  // Complaint Resolution
  const handleResolveComplaint = async (complaintId: string, notes: string, refundAmount: number) => {
    const now = new Date().toISOString();
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId
          ? {
              ...c,
              status: 'resolved',
              resolutionNotes: notes,
              refundIssued: refundAmount,
              resolvedAt: now,
            }
          : c
      )
    );

    await firestoreService.updateComplaintStatus(complaintId, 'resolved', notes, refundAmount);

    showToast(`Complaint resolved with recorded refund of ₹${refundAmount} in Cloud Firestore.`);
  };

  // Reviews Handler (Delivered verification enforced before review insertion)
  const handleSubmitReview = async (newReview: Review) => {
    const targetOrder = orders.find((o) => o.id === newReview.orderId);
    if (targetOrder && targetOrder.status !== 'delivered') {
      showToast('⚠️ Reviews can only be submitted for delivered orders.');
      return;
    }

    setReviews((prev) => [newReview, ...prev]);
    const cookReviews = [...reviews.filter((r) => r.cookId === newReview.cookId), newReview];
    const avg = cookReviews.reduce((sum, r) => sum + r.rating, 0) / cookReviews.length;
    setCooks((prev) =>
      prev.map((c) =>
        c.id === newReview.cookId
          ? { ...c, rating: avg, reviewCount: cookReviews.length }
          : c
      )
    );

    const res = await firestoreService.insertReviewWithOrderVerification(newReview);
    if (res.error) {
      showToast(`⚠️ Firestore review verification note: ${res.error}`);
      return;
    }

    if (isSupabaseConfigured()) {
      supabaseService.insertReview(newReview).catch(() => {});
    }

    showToast('Thank you for reviewing! Secured in Cloud Firestore.');
  };

  // Filtered Dishes for Marketplace
  const filteredMeals = useMemo(() => {
    return menuItems.filter((item) => {
      const cook = cooks.find((c) => c.id === item.cookId);

      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesCook = cook?.kitchenName.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesCook) return false;
      }

      // Category filter
      if (selectedCategory !== 'All Meals' && item.category !== selectedCategory) {
        return false;
      }

      // Locality filter
      if (localityFilter !== 'all' && cook?.locality !== localityFilter) {
        return false;
      }

      // Dietary filter
      if (dietaryFilter !== 'all' && item.dietaryType !== dietaryFilter) {
        return false;
      }

      // Max Price
      if (item.price > maxPrice) {
        return false;
      }

      return true;
    });
  }, [menuItems, cooks, searchQuery, selectedCategory, localityFilter, dietaryFilter, maxPrice]);

  // Student Special Thalis (Mini ₹49, Regular ₹69, Full ₹79)
  const studentSpecialThalis = useMemo(() => {
    return menuItems.filter((m) => m.isStudentSpecial || m.category === 'Student Thali');
  }, [menuItems]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-900 flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-stone-900 text-white px-4 py-3 rounded-xl shadow-xl border border-stone-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Navigation */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        activeTab={activeTab}
        onNavigate={(tab) => {
          if (tab === 'admin-dashboard' && !isOwnerAuthenticated) {
            setIsOwnerAuthModalOpen(true);
            return;
          }
          setActiveTab(tab);
        }}
        onOpenPartnerModal={() => setIsPartnerModalOpen(true)}
        onOpenDeliveryModal={() => setIsDeliveryModalOpen(true)}
        onOpenDbGuide={() => setIsDbGuideOpen(true)}
        isOwnerLoggedIn={isOwnerAuthenticated}
        currentUser={currentFirebaseUser}
        onCustomerSignIn={handleCustomerGoogleSignIn}
        onCustomerSignOut={handleCustomerSignOut}
      />

      {/* Backend Integration Status Bar (Firebase Cloud Firestore + Firebase Storage Primary, Supabase Secondary) */}
      <div className="bg-stone-100 border-b border-stone-200/80 px-4 py-2 text-[11px] text-stone-600">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {backendStatusMode === 'live_firestore' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Firestore Data
              </span>
            ) : backendStatusMode === 'query_error' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-900 border border-rose-300">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Firestore Query Error
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Offline/Demo Fallback
              </span>
            )}

            <span>
              <strong>Target:</strong>{' '}
              <span className="text-emerald-950 font-semibold font-mono">cooknow-9444c</span>
              {' · '}
              <span className="text-stone-700">{backendStatusDetails}</span>
            </span>
            {isBackendLoading && (
              <span className="text-emerald-700 font-semibold">(Syncing...)</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-stone-500 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isLiveSupabase ? 'bg-emerald-500' : 'bg-stone-300'}`} />
              <span>Supabase {isLiveSupabase ? 'Active (Dual-Sync)' : 'Standby'}</span>
            </span>
            <button
              onClick={() => setIsDbGuideOpen(true)}
              className="text-stone-600 hover:text-stone-900 font-semibold cursor-pointer underline underline-offset-2"
            >
              Migration & Schema Guide
            </button>
            <button
              onClick={() => loadLiveBackendData()}
              className="text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer"
            >
              Refresh Backend
            </button>
          </div>
        </div>
      </div>

      {/* Explicit Offline/Demo Fallback Banner */}
      {backendStatusMode === 'offline_fallback' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-950">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Offline/Demo Fallback Active:</strong> Displaying local pilot baseline from StorageManager. No live Firestore documents were loaded.
              </span>
            </div>
            <button
              onClick={() => loadLiveBackendData()}
              className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded text-[11px] cursor-pointer"
            >
              Connect to Live Firestore
            </button>
          </div>
        </div>
      )}

      {/* Explicit Firestore Query Error Banner */}
      {firestoreQueryError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-950">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Firestore Query Error:</strong> {firestoreQueryError}. Retaining local fallback for offline resilience.
              </span>
            </div>
            <button
              onClick={() => loadLiveBackendData()}
              className="px-2 py-0.5 bg-rose-200 hover:bg-rose-300 font-bold text-[11px] rounded cursor-pointer"
            >
              Retry Query
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {/* VIEW 1: CUSTOMER EXPLORE MARKETPLACE */}
        {activeTab === 'explore' && (
          <div className="space-y-10">
            {/* Hero Section */}
            <Hero
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              localityFilter={localityFilter}
              onLocalityChange={setLocalityFilter}
            />

            {/* Student Special Thalis Quick Strip (Phase 4: Mini ₹49, Regular ₹69, Full ₹79) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-gradient-to-r from-amber-50 to-emerald-50 rounded-2xl border border-amber-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                      <Sparkles className="w-4 h-4 text-amber-700" />
                      <span>Hostel & PG Student Saver</span>
                    </div>
                    <h2 className="text-xl font-black text-stone-900 mt-0.5">
                      Daily Student Special Thalis (Starting at ₹49)
                    </h2>
                    <p className="text-xs text-stone-600 mt-0.5">
                      Freshly made tawa rotis and wholesome dals designed for student budgets across Nalapani Chowk & Raipur Road.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('student-thalis')}
                    className="text-xs font-bold text-emerald-900 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all student meals</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {studentSpecialThalis.slice(0, 3).map((item) => {
                    const cook = cooks.find((c) => c.id === item.cookId);
                    return (
                      <MealCard
                        key={item.id}
                        item={item}
                        cook={cook}
                        quantityInCart={cartItemQuantities[item.id] || 0}
                        onAddToCart={handleAddToCart}
                        onUpdateQuantity={handleUpdateCartQuantity}
                        onViewDetails={(meal) => setSelectedMeal(meal)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Marketplace Grid & Filters Container */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              {/* Secondary Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-stone-200/90 shadow-2xs">
                {/* Dietary Filter Segmented Control */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <span className="text-xs font-semibold text-stone-500 mr-1">Diet:</span>
                  <button
                    onClick={() => setDietaryFilter('all')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      dietaryFilter === 'all'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    All Types
                  </button>
                  <button
                    onClick={() => setDietaryFilter('pure_veg')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      dietaryFilter === 'pure_veg'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                    <span>Pure Veg Only</span>
                  </button>
                  <button
                    onClick={() => setDietaryFilter('egg')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      dietaryFilter === 'egg'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    <span>Egg Dishes</span>
                  </button>
                </div>

                {/* Price Range Filter */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">
                    Max Price: <strong className="font-mono text-stone-900">₹{maxPrice}</strong>
                  </span>
                  <input
                    type="range"
                    min={49}
                    max={250}
                    step={10}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-28 sm:w-36 accent-emerald-800 cursor-pointer"
                  />
                </div>
              </div>

              {/* Meals Grid Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-stone-900">
                    Homestyle Dishes in Dehradun ({filteredMeals.length})
                  </h2>
                  <p className="text-xs text-stone-500">
                    Prepared on tawa with low oil, fresh produce, and motherly care.
                  </p>
                </div>

                <div className="text-xs text-stone-500">
                  Showing available dishes around <strong className="text-stone-800">Nalapani Chowk</strong>
                </div>
              </div>

              {/* Meals Grid */}
              {filteredMeals.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-stone-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
                    <Info className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-stone-800">No dishes match your filters</h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Try clearing your search query or adjusting the maximum price slider.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All Meals');
                      setDietaryFilter('all');
                      setMaxPrice(200);
                      setLocalityFilter('all');
                    }}
                    className="px-4 py-2 bg-emerald-800 text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 transition-colors cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredMeals.map((meal) => {
                    const cook = cooks.find((c) => c.id === meal.cookId);
                    return (
                      <MealCard
                        key={meal.id}
                        item={meal}
                        cook={cook}
                        quantityInCart={cartItemQuantities[meal.id] || 0}
                        onAddToCart={handleAddToCart}
                        onUpdateQuantity={handleUpdateCartQuantity}
                        onViewDetails={(item) => setSelectedMeal(item)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Verified Home Cooks Showcase Section */}
              <div className="pt-10 border-t border-stone-200/80 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Neighborhood Kitchens
                    </span>
                    <h2 className="text-xl font-extrabold text-stone-900">
                      Meet the Home Cooks & Selected Restaurants of Dehradun
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('cooks')}
                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all registered providers</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {cooks.slice(0, 3).map((cook) => {
                    const cookItemCount = menuItems.filter((m) => m.cookId === cook.id).length;
                    return (
                      <CookCard
                        key={cook.id}
                        cook={cook}
                        menuItemCount={cookItemCount}
                        onSelectCook={(c) => setSelectedCookProfile(c)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: STUDENT THALIS (Phase 4: Mini ₹49, Regular ₹69, Full ₹79) */}
        {activeTab === 'student-thalis' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
            <div className="max-w-3xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
                <Sparkles className="w-4 h-4" />
                <span>Nalapani Chowk Student Food Subsidy Initiative</span>
              </div>
              <h1 className="text-3xl font-black text-stone-900">
                Student Special Thalis (From ₹49)
              </h1>
              <p className="text-sm text-stone-600 leading-relaxed">
                Wholesome motherly cooking portioned and priced honestly for hostel and PG students living around UPES, DIT, and surrounding colleges.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {studentSpecialThalis.map((meal) => {
                const cook = cooks.find((c) => c.id === meal.cookId);
                return (
                  <MealCard
                    key={meal.id}
                    item={meal}
                    cook={cook}
                    quantityInCart={cartItemQuantities[meal.id] || 0}
                    onAddToCart={handleAddToCart}
                    onUpdateQuantity={handleUpdateCartQuantity}
                    onViewDetails={(item) => setSelectedMeal(item)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 3: MONTHLY TIFFIN & MEAL PLANS (Phase 3) */}
        {activeTab === 'meal-plans' && (
          <MealPlansView
            mealPlans={mealPlans}
            subscriptions={subscriptions}
            onSubscribe={handleSubscribeMealPlan}
            onPauseSubscription={handlePauseSubscription}
            onResumeSubscription={(subId) => {
              setSubscriptions((prev) =>
                prev.map((s) => (s.id === subId ? { ...s, status: 'active' } : s))
              );
              showToast('Subscription resumed.');
            }}
            onCancelSubscription={handleCancelSubscription}
          />
        )}

        {/* VIEW 4: HOME COOKS & RESTAURANTS DIRECTORY */}
        {activeTab === 'cooks' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-stone-500 tracking-wide uppercase">
                  <span>Verified Kitchen Directory</span>
                  <span aria-hidden="true">·</span>
                  <span>Dehradun Hub</span>
                </div>
                <h1 className="text-3xl font-black text-stone-900 mt-1">
                  Local Home Cooks & Selected Restaurants
                </h1>
                <p className="text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
                  Connect with verified home kitchens and vetted affordable eateries in Nalapani Chowk and Raipur Road.
                </p>
              </div>

              <button
                onClick={() => setIsPartnerModalOpen(true)}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                + Apply to Sell on CookNow
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cooks.map((cook) => {
                const count = menuItems.filter((m) => m.cookId === cook.id).length;
                return (
                  <CookCard
                    key={cook.id}
                    cook={cook}
                    menuItemCount={count}
                    onSelectCook={(c) => setSelectedCookProfile(c)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 5: CUSTOMER MY ORDERS */}
        {activeTab === 'my-orders' && (
          <CustomerOrdersView
            orders={orders}
            onTrackOrder={(ord) => setTrackedOrder(ord)}
            onOpenReview={(ord) => setReviewOrder(ord)}
            onReorder={(order) => {
              order.items.forEach((ordItem) => {
                const match = menuItems.find((m) => m.id === ordItem.menuItemId);
                if (match) handleAddToCart(match);
              });
              setIsCartOpen(true);
            }}
            onBrowseMeals={() => setActiveTab('explore')}
            currentUser={currentFirebaseUser}
            onSignIn={handleCustomerGoogleSignIn}
          />
        )}

        {/* VIEW 6: COOK DASHBOARD */}
        {activeTab === 'cook-dashboard' && (
          <CookDashboard
            cooks={cooks}
            menuItems={menuItems}
            orders={orders}
            currentCook={currentCook}
            onSelectCurrentCook={setCurrentCook}
            onUpdateCookProfile={async (up) => {
              setCooks((prev) => prev.map((c) => (c.id === up.id ? up : c)));
              setCurrentCook(up);
              await firestoreService.updateCook(up.id, up);
              showToast('Kitchen profile updated in Cloud Firestore!');
            }}
            onSaveMenuItem={async (itemToSave) => {
              setMenuItems((prev) => {
                const idx = prev.findIndex((i) => i.id === itemToSave.id);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = itemToSave;
                  return next;
                }
                return [itemToSave, ...prev];
              });

              const res = await firestoreService.saveMenuItem(itemToSave);
              if (res.error) {
                showToast(`⚠️ Firestore save note: ${res.error}. Persisted locally.`);
              } else {
                showToast(`Saved dish: "${itemToSave.name}" in Cloud Firestore!`);
              }

              if (isSupabaseConfigured()) {
                supabaseService.saveMenuItem(itemToSave).catch(() => {});
              }
            }}
            onDeleteMenuItem={async (itemId) => {
              setMenuItems((prev) => prev.filter((i) => i.id !== itemId));
              const res = await firestoreService.deleteMenuItem(itemId);
              if (res.error) {
                showToast(`⚠️ Firestore delete note: ${res.error}`);
              } else {
                showToast('Dish removed from Cloud Firestore.');
              }

              if (isSupabaseConfigured()) {
                supabaseService.deleteMenuItem(itemId).catch(() => {});
              }
            }}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onSubmitVerificationRequest={async (req) => {
              await firestoreService.insertCookVerificationRequest(req);
              showToast('Verification audit application submitted to Cloud Firestore!');
            }}
          />
        )}

        {/* VIEW 7: DELIVERY PARTNER OPERATIONS (Phase 2) */}
        {activeTab === 'delivery-dashboard' && (
          <DeliveryPartnerDashboard
            deliveryPartners={deliveryPartners}
            currentPartner={currentRider}
            orders={orders}
            onSelectPartner={setCurrentRider}
            onUpdateDeliveryStatus={handleUpdateDeliveryStatus}
          />
        )}

        {/* VIEW 8: OWNER CONTROL CENTRE (Vivek Singh Negi - Phase 5, 6, 7, 8) */}
        {activeTab === 'admin-dashboard' && isOwnerAuthenticated && (
          <AdminDashboard
            cooks={adminCooks.length > 0 ? adminCooks : cooks}
            menuItems={menuItems}
            orders={orders}
            reviews={reviews}
            partnerApplications={partnerApplications}
            deliveryPartners={deliveryPartners}
            mealPlans={mealPlans}
            subscriptions={subscriptions}
            promotions={promotions}
            complaints={complaints}
            expenses={expenses}
            settings={settings}
            onApprovePartner={handleApprovePartner}
            onRejectPartner={handleRejectPartner}
            onApproveDeliveryPartner={handleApproveDeliveryPartner}
            onRejectDeliveryPartner={handleRejectDeliveryPartner}
            onAssignDeliveryPartner={handleAssignDeliveryPartner}
            onResolveComplaint={handleResolveComplaint}
            onSavePromotion={async (promo) => {
              setPromotions((prev) => [promo, ...prev]);
              await firestoreService.savePromotion(promo);
              showToast(`Promotion "${promo.code}" saved in Cloud Firestore!`);
            }}
            onTogglePromotion={async (promoId) => {
              const target = promotions.find((p) => p.id === promoId);
              const nextActive = target ? !target.isActive : false;
              setPromotions((prev) =>
                prev.map((p) => (p.id === promoId ? { ...p, isActive: nextActive } : p))
              );
              if (target) {
                await firestoreService.savePromotion({ ...target, isActive: nextActive });
              }
              showToast('Promotion status updated in Cloud Firestore.');
            }}
            onAddExpense={async (exp) => {
              setExpenses((prev) => [exp, ...prev]);
              await firestoreService.insertOperatingExpense(exp);
              showToast(`Recorded expense: ₹${exp.amount} in Cloud Firestore`);
            }}
            onToggleMenuItemAvailability={async (itemId) => {
              const target = menuItems.find((it) => it.id === itemId);
              const nextAvail = target ? !target.isAvailable : false;
              setMenuItems((prev) =>
                prev.map((it) => (it.id === itemId ? { ...it, isAvailable: nextAvail } : it))
              );
              if (target) {
                await firestoreService.saveMenuItem({ ...target, isAvailable: nextAvail });
              }
              showToast('Dish availability updated in Cloud Firestore.');
            }}
            onUpdateSettings={async (newSettings) => {
              setSettings(newSettings);
              await firestoreService.savePlatformSettings(newSettings);
              showToast('Platform settings saved to Cloud Firestore.');
            }}
            onAdminCancelOrder={handleCancelOrder}
            onResetDatabase={() => {
              StorageManager.resetDatabase();
              setCooks(StorageManager.getCooks());
              setMenuItems(StorageManager.getMenuItems());
              setOrders(StorageManager.getOrders());
              setReviews(StorageManager.getReviews());
              setPartnerApplications(StorageManager.getPartnerApplications());
              setDeliveryPartners(StorageManager.getDeliveryPartners());
              setMealPlans(StorageManager.getMealPlans());
              setSubscriptions(StorageManager.getSubscriptions());
              setPromotions(StorageManager.getPromotions());
              setComplaints(StorageManager.getComplaints());
              setExpenses(StorageManager.getOperatingExpenses());
              setSettings(StorageManager.getSettings());
              showToast('Local database restored to initial Nalapani Chowk seed data.');
            }}
            onSignOutOwner={() => {
              signOutFirebase();
              StorageManager.setOwnerAuthenticated(false);
              setIsOwnerAuthenticated(false);
              setCurrentRole('customer');
              setActiveTab('explore');
              showToast('Executive session locked.');
            }}
            onOpenSupabaseConfig={() => setIsSupabaseModalOpen(true)}
            onOpenDbGuide={() => setIsDbGuideOpen(true)}
          />
        )}
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        settings={settings}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cart}
        cooks={cooks}
        promotions={promotions}
        settings={settings}
        onOrderPlaced={handleOrderPlaced}
        currentUser={currentFirebaseUser}
        onSignInWithGoogle={handleCustomerGoogleSignIn}
      />

      {/* Meal Details Modal */}
      <MealDetailsModal
        item={selectedMeal}
        cook={cooks.find((c) => c.id === selectedMeal?.cookId)}
        quantityInCart={selectedMeal ? cartItemQuantities[selectedMeal.id] || 0 : 0}
        onClose={() => setSelectedMeal(null)}
        onAddToCart={handleAddToCart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onViewCookProfile={(cook) => setSelectedCookProfile(cook)}
      />

      {/* Cook Profile & Kitchen Menu Modal */}
      <CookProfileModal
        cook={selectedCookProfile}
        menuItems={menuItems}
        reviews={reviews}
        cartItemQuantities={cartItemQuantities}
        onClose={() => setSelectedCookProfile(null)}
        onAddToCart={handleAddToCart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onViewMealDetails={(meal) => setSelectedMeal(meal)}
      />

      {/* Live Order Tracker Modal */}
      <OrderTrackerModal
        order={trackedOrder}
        onClose={() => setTrackedOrder(null)}
        onCancelOrder={handleCancelOrder}
      />

      {/* Review Modal */}
      <ReviewModal
        order={reviewOrder}
        onClose={() => setReviewOrder(null)}
        onSubmitReview={handleSubmitReview}
      />

      {/* Partner With Us Modal (Phase 1) */}
      <PartnerWithUsModal
        isOpen={isPartnerModalOpen}
        onClose={() => setIsPartnerModalOpen(false)}
        onSubmitApplication={async (app) => {
          setPartnerApplications((prev) => [app, ...prev]);
          await firestoreService.insertPartnerApplication(app);
          showToast(`Application submitted for ${app.businessName} & secured in Cloud Firestore!`);
        }}
      />

      {/* Become a Delivery Partner Modal (Phase 2) */}
      <DeliveryPartnerModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        onSubmitApplication={async (partner) => {
          setDeliveryPartners((prev) => [partner, ...prev]);
          await firestoreService.insertDeliveryPartner(partner);
          showToast(`Delivery registration submitted for ${partner.fullName} & secured in Cloud Firestore!`);
        }}
      />

      {/* Owner Authentication Modal Gate (Zero-Trust Security) */}
      <OwnerAuthModal
        isOpen={isOwnerAuthModalOpen}
        onClose={() => setIsOwnerAuthModalOpen(false)}
        onAuthenticated={() => {
          setIsOwnerAuthenticated(true);
          setCurrentRole('admin');
          setActiveTab('admin-dashboard');
          showToast(`Welcome, ${OWNER_PROFILE.fullName}! Super Admin session verified.`);
        }}
      />

      {/* Database & Deployment Setup Guide Modal */}
      <DatabaseGuideModal
        isOpen={isDbGuideOpen}
        onClose={() => setIsDbGuideOpen(false)}
        onOpenSupabaseConfig={() => setIsSupabaseModalOpen(true)}
      />

      {/* Supabase Connection & Configuration Modal */}
      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConnectionSuccess={() => {
          setIsSupabaseModalOpen(false);
          loadLiveSupabaseData();
          showToast('Supabase connection verified! Synced with PostgreSQL.');
        }}
      />

      {/* Clean Footer */}
      <footer className="mt-16 bg-stone-900 text-stone-400 border-t border-stone-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <span className="text-base font-bold text-white tracking-tight">CookNow</span>
              <p className="text-stone-400 text-xs leading-relaxed">
                "Pahadi Swad, Ghar Jaisa Khana, Roz Ka Affordable Meal."
              </p>
              <div className="text-[11px] text-emerald-400 pt-1">
                Founder: {OWNER_PROFILE.fullName} · {OWNER_PROFILE.launchMarket}
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-stone-200">Dehradun Localities</span>
              <ul className="space-y-1 text-stone-400">
                <li>• Nalapani Chowk (Central Hub)</li>
                <li>• Raipur Road & Tapovan Enclave</li>
                <li>• Sahastradhara Road</li>
                <li>• Karanpur / DIT College Corridor</li>
              </ul>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-stone-200">Student & Partner Programs</span>
              <ul className="space-y-1 text-stone-400">
                <li>
                  <button onClick={() => setActiveTab('student-thalis')} className="hover:text-stone-200">
                    • Daily Student Thalis (From ₹49)
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab('meal-plans')} className="hover:text-stone-200">
                    • Monthly Tiffin Subscriptions
                  </button>
                </li>
                <li>
                  <button onClick={() => setIsPartnerModalOpen(true)} className="hover:text-stone-200">
                    • Partner with CookNow (Cooks & Rest.)
                  </button>
                </li>
                <li>
                  <button onClick={() => setIsDeliveryModalOpen(true)} className="hover:text-stone-200">
                    • Become a Delivery Partner
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-stone-200">Full-Stack Architecture</span>
              <p className="text-stone-400 text-[11px] leading-relaxed">
                Supabase PostgreSQL schemas with Row-Level Security (RLS) & server-side payment verification boundary.
              </p>
              <button
                onClick={() => setIsDbGuideOpen(true)}
                className="mt-2 text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4 cursor-pointer"
              >
                View Setup & Migration SQL
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-stone-500">
            <span>
              © {new Date().getFullYear()} CookNow Technologies Pvt. Ltd. · Nalapani Chowk, Dehradun, Uttarakhand, India.
            </span>
            <span>
              Support: {settings.supportEmail} · {settings.supportPhone}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
