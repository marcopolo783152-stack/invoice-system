/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  Rug,
  CartItem,
  Order,
  OrderStatus,
  Review,
  BlogPost,
  ChatMessage,
  CustomerInfo,
  PaymentDetails,
  ShippingDetails,
  User,
  CleaningBooking,
  SocialMediaLink, PromoCode, ShopProfile
} from "@/types";
import { INITIAL_RUGS } from "@/data/rugs";
import { INITIAL_BLOGS } from "@/data/blogs";
import { getEmailConfig } from "@/lib/email-service";
import { auth, checkIsAdmin, logout, loginWithEmail, registerWithEmail } from "@/lib/auth";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAllInvoicesSync } from "@/lib/invoice-storage";
import { 
  seedShowroomDataIfEmpty, 
  subscribeToCollection, 
  subscribeToSettings, 
  addShowroomDoc, 
  updateShowroomDoc, 
  deleteShowroomDoc, 
  updateSettingDoc,
  SHOWROOM_RUGS,
  SHOWROOM_BLOGS,
  SHOWROOM_ORDERS,
  SHOWROOM_REVIEWS,
  SHOWROOM_CHAT, SHOWROOM_PROMOCODES,
  SHOWROOM_CLEANING,
  SHOWROOM_ESTIMATES
} from "@/lib/showroom-firebase";

interface StoreContextType {
  rugs: Rug[];
  blogs: BlogPost[];
  orders: Order[];
  reviews: Review[];
  chatMessages: ChatMessage[];
  cart: CartItem[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  activeView: "customer" | "admin";
  setActiveView: (view: "customer" | "admin") => void;
  adminTab: string;
  setAdminTab: (tab: string) => void;
  
  // User Authentication
  currentUser: User | null;
  loginUser: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  signupUser: (name: string, email: string, pass: string, phone?: string, address?: string) => Promise<{ success: boolean; message: string }>;
  addAdminUser: (name: string, email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  logoutUser: () => Promise<void>;
  
  // Cleaning bookings
  cleaningBookings: CleaningBooking[];
  addCleaningBooking: (booking: Omit<CleaningBooking, "id" | "status" | "createdAt">) => CleaningBooking;
  updateCleaningBookingStatus: (id: string, status: CleaningBooking["status"]) => void;
  deleteCleaningBooking: (id: string) => void;
  estimates: any[];
  updateEstimateStatus: (id: string, status: string) => void;
  deleteEstimate: (id: string) => void;
  
  // Cart operations
  addToCart: (rug: Rug) => void;
  removeFromCart: (rugId: string) => void;
  updateCartQuantity: (rugId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Checkout operations
  checkout: (customer: CustomerInfo, payment: PaymentDetails, deliveryOption: "Pickup" | "Delivery", shipping: number, tax: number, totalWeightLbs?: number, appliedPromo?: PromoCode, discountAmount?: number) => Order;
  
  // Admin Operations
  addRug: (rug: Omit<Rug, "id" | "rating">) => void;
  updateRug: (id: string, rug: Partial<Rug>) => void;
  deleteRug: (id: string) => void;
  incrementRugViews: (id: string) => void;
  toggleRugFavorite: (id: string) => void;
  favoritedRugIds: string[];
  updateOrderStatus: (orderId: string, status: OrderStatus, shipping?: ShippingDetails) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  deleteOrderPaymentDetails: (orderId: string) => void;
  approveReview: (reviewId: string) => void;
  deleteReview: (reviewId: string) => void;
  addBlogPost: (post: Omit<BlogPost, "id">) => void;
  updateBlogPost: (id: string, post: Partial<BlogPost>) => void;
  deleteBlogPost: (id: string) => void;
  
  // Customer support chat operations
  sendChatMessage: (text: string, sender: "customer" | "admin", orderId?: string, sessionId?: string, customerName?: string) => void;
  clearChat: (sessionId?: string) => void;
  deleteChatSession: (sessionId: string) => void;
  
  // Customer Review Submit
  submitReview: (rugId: string, reviewerName: string, rating: number, reviewText: string, imageUrl?: string) => void;

  // Hero Cover Photo & Showroom Announcement & Logo
  heroCoverPhotos: string[];
  setHeroCoverPhotos: (urls: string[]) => void;
  showroomAnnouncement: string;
  setShowroomAnnouncement: (text: string) => void;
  logoUrl: string;
  // Shop Profile
  shopProfile: ShopProfile;
  setShopProfile: (profile: ShopProfile) => void;

  setLogoUrl: (url: string) => void;

  // Social media links customizable by admin
  socialLinks: SocialMediaLink[];
  setSocialLinks: (links: SocialMediaLink[]) => void;

  // Promo Codes
  promoCodes: PromoCode[];
  addPromoCode: (promo: Omit<PromoCode, "id" | "usedCount">) => void;
  updatePromoCode: (id: string, updates: Partial<PromoCode>) => void;
  deletePromoCode: (id: string) => void;
  deleteOrder: (id: string) => void;

  // Analytics
  referrers: Record<string, number>;
  incrementReferrer: (source: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const INITIAL_REVIEWS: Review[] = [
  {
    id: "rev-1",
    rugId: "rug-1",
    rating: 5,
    reviewerName: "Victoria Sterling",
    reviewText: "Words cannot describe the sheer artistry of this Royal Kashan rug. Woven to absolute perfection. The crimson reds have a regal depth and the silk highlights truly sparkle under our living room chandelier. Customer service from Marco Polo was immaculate—they even walked me through custom pad selections. Worth every single penny!",
    isApproved: true,
    createdAt: "2026-05-10T14:30:00.000Z"
  },
  {
    id: "rev-2",
    rugId: "rug-2",
    rating: 5,
    reviewerName: "Harrison Fletcher",
    reviewText: "Incredibly durable and dense highland wool. The Serapi geometric design is incredibly strong and anchors our rustic oak dining table perfectly. The color variation (Abrash) is very charming and rustic. Shipping took just 3 days to New York, packed beautifully in waterproof sleeves.",
    isApproved: true,
    createdAt: "2026-06-01T10:15:00.000Z"
  },
  {
    id: "rev-3",
    rugId: "rug-3",
    rating: 5,
    reviewerName: "Aria Montaigne",
    reviewText: "A breathtaking museum-quality masterpiece! The Tree of Life design has magnificent detail and the silk pile shifts beautifully from silver-ivory to deep crimson as you walk around the room. Our home feels like an art gallery now. Stunning work.",
    isApproved: true,
    createdAt: "2026-06-12T18:22:00.000Z"
  },
  {
    id: "rev-4",
    rugId: "rug-4",
    rating: 4,
    reviewerName: "Julian Vance",
    reviewText: "Lovely geometric patterns and vibrant native colors on this Kazak. The hand-spun wool is soft underfoot. There is a slight herbal aroma from the vegetable dyes, which dissipated after two days of unrolling. Outstanding value for an authentic handmade Afghan piece.",
    isApproved: true,
    createdAt: "2026-06-20T09:45:00.000Z"
  }
];

// Safe LocalStorage helpers for sandboxed iframe compatibility
const safeGetItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn("Storage read blocked by context sandbox:", e);
    return null;
  }
};

const safeSetItem = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("Storage write blocked by context sandbox:", e);
  }
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Views
  const [activeView, setActiveView] = useState<"customer" | "admin">(() => {
    if (typeof window === 'undefined') return "customer";
    // Clear legacy localStorage to enforce strict session logouts
    localStorage.removeItem("marcopolo_active_view");
    const sessionView = sessionStorage.getItem("marcopolo_active_view");
    return (sessionView === "admin") ? "admin" : "customer";
  });
  const [adminTab, setAdminTab] = useState<string>("analytics");
  const [cartOpen, setCartOpen] = useState<boolean>(false);
  useEffect(() => {
    sessionStorage.setItem('marcopolo_active_view', activeView);
  }, [activeView]);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  

  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [cleaningBookings, setCleaningBookings] = useState<CleaningBooking[]>(() => {
    const local = safeGetItem("marcopolo_cleaning_bookings");
    return local ? JSON.parse(local) : [];
  });
  const [estimates, setEstimates] = useState<any[]>([]);

  // Core collections synced to Firebase
  const [rugs, setRugs] = useState<Rug[]>([]);
  const [favoritedRugIds, setFavoritedRugIds] = useState<string[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    const local = safeGetItem("marcopolo_cart");
    return local ? JSON.parse(local) : [];
  });

  const [heroCoverPhotos, setHeroCoverPhotosState] = useState<string[]>([]);
  const [showroomAnnouncement, setShowroomAnnouncementState] = useState<string>("");
  const [shopProfile, setShopProfileState] = useState<ShopProfile>({
    name: "MARCO POLO ORIENTAL RUGS, INC.",
    phone: "703-461-0200",
    email: "marcopolorugs@aol.com",
    address: "3240 DUKE ST, ALEXANDRIA, VA 22314",
    logoUrl: ""
  });
  const [logoUrl, setLogoUrlState] = useState<string>("/LOGO.png");
  const [socialLinks, setSocialLinksState] = useState<SocialMediaLink[]>([
    { platform: "instagram", url: "https://instagram.com/marcopolorugs" },
    { platform: "pinterest", url: "https://pinterest.com/marcopolorugs" },
    { platform: "facebook", url: "https://facebook.com/marcopolorugs" },
    { platform: "tiktok", url: "https://tiktok.com/@marcopolorugs" },
    { platform: "youtube", url: "https://youtube.com/c/marcopolorugs" },
    { platform: "twitter", url: "https://twitter.com/marcopolorugs" }
  ]);

  const [referrers, setReferrers] = useState<Record<string, number>>({});

  const incrementReferrer = (source: string) => {
    setReferrers(prev => {
      const updated = { ...prev, [source]: (prev[source] || 0) + 1 };
      updateSettingDoc("referrers", { sources: updated });
      return updated;
    });
  };

  // Track global referrer on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasTracked = sessionStorage.getItem("mp_tracked_referrer");
      if (!hasTracked) {
        sessionStorage.setItem("mp_tracked_referrer", "true");
        let source = "Direct";
        if (document.referrer) {
          try {
            const url = new URL(document.referrer);
            source = url.hostname;
          } catch (e) {
            source = document.referrer;
          }
        }
        incrementReferrer(source);
      }
    }
  }, []);

  // Seed and Subscribe on mount
  useEffect(() => {
    let unsubs: (() => void)[] = [];
    
    seedShowroomDataIfEmpty().then(() => {
      unsubs.push(subscribeToCollection<Rug>(SHOWROOM_RUGS, setRugs));
      unsubs.push(subscribeToCollection<BlogPost>(SHOWROOM_BLOGS, setBlogs));
      unsubs.push(subscribeToCollection<Order>(SHOWROOM_ORDERS, setOrders));
      unsubs.push(subscribeToCollection<Review>(SHOWROOM_REVIEWS, setReviews));
      unsubs.push(subscribeToCollection<ChatMessage>(SHOWROOM_CHAT, setChatMessages));
      unsubs.push(subscribeToCollection<CleaningBooking>(SHOWROOM_CLEANING, setCleaningBookings));
      unsubs.push(subscribeToCollection<any>(SHOWROOM_ESTIMATES, setEstimates));
      unsubs.push(subscribeToCollection<PromoCode>(SHOWROOM_PROMOCODES, setPromoCodes));
      
      unsubs.push(subscribeToSettings({
        onHero: setHeroCoverPhotosState,
        onAnnouncement: setShowroomAnnouncementState,
        onLogo: setLogoUrlState,
        onProfile: setShopProfileState,
        onReferrers: setReferrers,
        onSocial: setSocialLinksState
      }));
    });

    return () => unsubs.forEach(unsub => unsub());
  }, []);

    const setHeroCoverPhotos = (urls: string[]) => {
    // Filter out blob URLs to prevent black screen bug on reload
    const cleanUrls = urls.map(u => (u.startsWith("blob:") ? "" : u));
    setHeroCoverPhotosState(cleanUrls);
    updateSettingDoc("hero", { urls: cleanUrls });
  };

  const setShowroomAnnouncement = (text: string) => {
    setShowroomAnnouncementState(text);
    updateSettingDoc("announcement", { text });
  };

  
  const setShopProfile = (profile: ShopProfile) => {
    updateSettingDoc("profile", profile);
  };

  const setLogoUrl = (url: string) => {
    setLogoUrlState(url);
    updateSettingDoc("logo", { url });
  };

  const setSocialLinks = (links: SocialMediaLink[]) => {
    setSocialLinksState(links);
    updateSettingDoc("social", { links });
  };

  // Local Storage synchronizers for local-only state
  useEffect(() => {
    safeSetItem("marcopolo_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const stored = safeGetItem("marcopolo_favorites");
    if (stored) {
      try {
        setFavoritedRugIds(JSON.parse(stored));
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("marcopolo_current_user", JSON.stringify(currentUser));
  }, [currentUser]);

  



  const hasSyncedRetroactive = useRef(false);

  // Retroactive sync: mark existing rugs as Sold if they appear in any past invoice
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (rugs.length > 0 && !hasSyncedRetroactive.current) {
      hasSyncedRetroactive.current = true;
      
      try {
        const storedInvoices = getAllInvoicesSync() || [];
        const allInvoiceItems = storedInvoices.flatMap((inv: any) => inv.items || []);
        
        const rugsToUpdate = rugs.filter(rug => {
          if (rug.availability !== "Sold" && rug.sku) {
            return allInvoiceItems.some((item: any) => item.sku === rug.sku);
          }
          return false;
        });

        if (rugsToUpdate.length > 0) {
          rugsToUpdate.forEach(rug => {
            updateRug(rug.id, { availability: "Sold" });
          });
        }
      } catch (e) {
        console.error("Failed to retroactively sync invoices", e);
      }
    }
  }, [rugs.length]);

  // Auto-delete chats older than 24 hours on mount and periodically
  useEffect(() => {
    const checkAndDeleteExpiredChats = () => {
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in ms
      
      setChatMessages((prev) => {
        const activeMessages = prev.filter((msg) => {
          const msgTime = new Date(msg.timestamp).getTime();
          const isExpired = now - msgTime > twentyFourHours;
          return !isExpired;
        });
        return activeMessages;
      });
    };

    checkAndDeleteExpiredChats();
    const interval = setInterval(checkAndDeleteExpiredChats, 10 * 60 * 1000); // Check every 10 minutes
    return () => clearInterval(interval);
  }, []);

  // --- Cart Actions ---
  const addToCart = (rug: Rug) => {
    if (rug.availability !== "In Stock") return;
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.rug.id === rug.id);
      if (existingIndex > -1) {
        return prevCart; // Handmade rugs are unique! Limit qty to 1
      }
      return [...prevCart, { rug, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const removeFromCart = (rugId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.rug.id !== rugId));
  };

  const updateCartQuantity = (rugId: string, quantity: number) => {
    // Unique handmade rugs can't be ordered in multiple identical units, but let's keep it safe.
    if (quantity <= 0) {
      removeFromCart(rugId);
    } else {
      setCart((prevCart) =>
        prevCart.map((item) =>
          item.rug.id === rugId ? { ...item, quantity: Math.min(1, quantity) } : item
        )
      );
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  // --- Checkout Flow ---
  const checkout = (
    customer: CustomerInfo,
    payment: PaymentDetails,
    deliveryOption: "Pickup" | "Delivery",
    shipping: number,
    tax: number,
    totalWeightLbs?: number,
    appliedPromo?: PromoCode,
    discountAmount?: number
  ): Order => {
    const subtotal = cart.reduce((sum, item) => sum + item.rug.price * item.quantity, 0);
    const total = subtotal + shipping + tax;
    
    const newOrder: Order = {
      id: `MPR-${Math.floor(100000 + Math.random() * 90000).toString()}`,
      customerInfo: customer,
      cartItems: [...cart],
      subtotal,
      tax,
      shipping,
      deliveryOption,
      total: total - (discountAmount || 0),
      discountAmount,
      appliedPromoCode: appliedPromo?.code,
      totalWeightLbs,
      status: "Pending Confirmation", // manual admin verification
      paymentDetails: payment,
      createdAt: new Date().toISOString()
    };

    // Add new order to Firebase
    addShowroomDoc(SHOWROOM_ORDERS, newOrder);
    
    // Trigger Email/SMS notifications automatically
    const emailConfig = getEmailConfig();
    fetch('/api/notify-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: newOrder, shopProfile, emailConfig })
    }).catch(err => console.error('Notification trigger failed:', err));
    
    if (appliedPromo && appliedPromo.oneTimeUse) {
      updatePromoCode(appliedPromo.id, {
        isActive: false,
        usedBy: customer.name,
        usedAt: new Date().toISOString()
      });
    }
    
    // Mark checked out rugs as "Reserved" (pending confirmation) in Firebase
    cart.forEach(item => {
      updateShowroomDoc(SHOWROOM_RUGS, item.rug.id, { availability: "Reserved" });
    });

    // Empty the cart
    clearCart();
    return newOrder;
  };

  // --- Admin Catalog Actions ---
  const addRug = (newRug: Omit<Rug, "id" | "rating">) => {
    const id = `rug-${Date.now()}`;
    const rug: Rug = {
      ...newRug,
      id,
      rating: 5.0
    };
    setRugs(prev => [rug, ...prev]); // Optimistic UI
    addShowroomDoc(SHOWROOM_RUGS, rug);
  };

  const updateRug = (id: string, updatedFields: Partial<Rug>) => {
    setRugs(prev => prev.map(r => r.id === id ? { ...r, ...updatedFields } : r)); // Optimistic UI
    updateShowroomDoc(SHOWROOM_RUGS, id, updatedFields);
  };

  const incrementRugViews = (id: string) => {
    const rug = rugs.find(r => r.id === id);
    if (!rug) return;
    updateRug(id, { views: (rug.views || 0) + 1 });
  };

  const toggleRugFavorite = (id: string) => {
    const rug = rugs.find(r => r.id === id);
    if (!rug) return;
    
    setFavoritedRugIds(prev => {
      let next;
      if (prev.includes(id)) {
        next = prev.filter(rId => rId !== id);
        updateRug(id, { favorites: Math.max(0, (rug.favorites || 0) - 1) });
      } else {
        next = [...prev, id];
        updateRug(id, { favorites: (rug.favorites || 0) + 1 });
      }
      safeSetItem("marcopolo_favorites", JSON.stringify(next));
      return next;
    });
  };

  const deleteRug = async (id: string) => {
    const rug = rugs.find(r => r.id === id);
    setRugs(prev => prev.filter(r => r.id !== id)); // Optimistic UI
    
    // Delete images from Firebase Storage
    if (rug) {
      try {
        const { storage } = await import("@/lib/firebase");
        const { ref, deleteObject } = await import("firebase/storage");
        if (storage) {
          const deleteImg = async (url: string) => {
            if (!url || !url.includes("firebasestorage.googleapis.com")) return;
            try {
              // @ts-ignore
              await deleteObject(ref(storage, url));
            } catch (e) {
              console.error("Failed to delete storage image", e);
            }
          };
          
          if (rug.images && Array.isArray(rug.images)) {
            for (const img of rug.images) {
              await deleteImg(img);
            }
          }
        }
      } catch (e) {
        console.error("Error cleaning up storage", e);
      }
    }
    
    deleteShowroomDoc(SHOWROOM_RUGS, id);
  };

  // --- Order Status Management ---
  const updateOrderStatus = (
    orderId: string,
    status: OrderStatus,
    shipping?: ShippingDetails
  ) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    if (status === "Cancelled") {
      order.cartItems.forEach(item => {
        updateShowroomDoc(SHOWROOM_RUGS, item.rug.id, { availability: "In Stock" });
      });
    } else if (status === "Confirmed") {
      order.cartItems.forEach(item => {
        updateShowroomDoc(SHOWROOM_RUGS, item.rug.id, { availability: "Sold" });
      });
    }

    const updatedFields: any = { status };
    if (shipping) {
      updatedFields.shippingDetails = {
        ...order.shippingDetails,
        ...shipping,
        shippedAt: shipping.shippedAt || new Date().toISOString()
      };
    }
    
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedFields } : o)); // Optimistic UI
    updateShowroomDoc(SHOWROOM_ORDERS, orderId, updatedFields);
  };

  const deleteOrderPaymentDetails = (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentDetails: undefined as any } : o));
    updateShowroomDoc(SHOWROOM_ORDERS, orderId, { paymentDetails: null });
  };

  const updateOrder = (orderId: string, updates: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
    updateShowroomDoc(SHOWROOM_ORDERS, orderId, updates);
  };

  const deleteOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId)); // Optimistic UI
    deleteShowroomDoc(SHOWROOM_ORDERS, orderId);
  };

  // --- Customer Reviews ---
  const submitReview = (
    rugId: string,
    reviewerName: string,
    rating: number,
    reviewText: string,
    imageUrl?: string
  ) => {
    const newReview: Review = {
      id: `rev-${Date.now()}`,
      rugId,
      rating,
      reviewerName,
      reviewText,
      imageUrl,
      isApproved: false, // Moderated by admin
      createdAt: new Date().toISOString()
    };
    setReviews(prev => [newReview, ...prev]);
      addShowroomDoc(SHOWROOM_REVIEWS, newReview).catch(e => console.error("Review save failed", e));
  };

  const approveReview = (reviewId: string) => {
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, isApproved: true } : r));
      updateShowroomDoc(SHOWROOM_REVIEWS, reviewId, { isApproved: true });
    };

  const deleteReview = (reviewId: string) => {
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      deleteShowroomDoc(SHOWROOM_REVIEWS, reviewId);
    };

  // --- Blog Operations ---
  const addBlogPost = (post: Omit<BlogPost, "id">) => {
    const id = `blog-${Date.now()}`;
    const newPost: BlogPost = { ...post, id };
    setBlogs(prev => [newPost, ...prev]); // Optimistic UI
    addShowroomDoc(SHOWROOM_BLOGS, newPost);
  };

  const updateBlogPost = (id: string, updatedPost: Partial<BlogPost>) => {
    setBlogs(prev => prev.map(b => b.id === id ? { ...b, ...updatedPost } : b)); // Optimistic UI
    updateShowroomDoc(SHOWROOM_BLOGS, id, updatedPost);
  };

  const deleteBlogPost = (id: string) => {
    setBlogs(prev => prev.filter(b => b.id !== id)); // Optimistic UI
    deleteShowroomDoc(SHOWROOM_BLOGS, id);
  };

  // --- Promo Codes ---
  const addPromoCode = (promo: Omit<PromoCode, "id" | "usedCount">) => {
    const newPromo: PromoCode = {
      ...promo,
      id: `promo-${Date.now()}`,
      usedCount: 0
    };
    setPromoCodes(prev => [newPromo, ...prev]); // Optimistic UI
    addShowroomDoc(SHOWROOM_PROMOCODES, newPromo);
  };

  const updatePromoCode = (id: string, updates: Partial<PromoCode>) => {
    updateShowroomDoc(SHOWROOM_PROMOCODES, id, updates);
  };
  
  const deletePromoCode = (id: string) => {
    setPromoCodes(prev => prev.filter(p => p.id !== id)); // Optimistic UI
    deleteShowroomDoc(SHOWROOM_PROMOCODES, id);
  };

  // --- Chat / Concierge Support ---
  const sendChatMessage = (
    text: string,
    sender: "customer" | "admin",
    orderId?: string,
    sessionId?: string,
    customerName?: string
  ) => {
    const sId = sessionId || "default";
    const cName = customerName || (sender === "customer" ? "Guest Customer" : "System");

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender,
      text,
      timestamp: new Date().toISOString(),
      sessionId: sId,
      orderId,
      customerName: cName
    };

    addShowroomDoc(SHOWROOM_CHAT, newMessage);

    // Simulate concierge response ONLY for customer messages
    if (sender === "customer") {
      setTimeout(() => {
        let replyText = "I have received your message. I am currently consulting our inventory and will assist you shortly.";
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes("order") || lowerText.includes("track") || lowerText.includes("shipping")) {
          replyText = "I see you are asking about an order. All our hand-knotted pieces are carefully rolled and packed in moisture-resistant sleeves. Standard insured shipping takes 3-5 business days. Please provide your order number (e.g., MPR-123456) so I can check its exact location.";
        } else if (lowerText.includes("custom") || lowerText.includes("size") || lowerText.includes("designer")) {
          replyText = "For our elite collections, we offer competitive trade programs for interior designers and seasonal curation discounts. Please let us know which specific SKU you are evaluating so we can prepare a tailored luxury quote for you.";
        } else if (lowerText.includes("clean") || lowerText.includes("wash") || lowerText.includes("repair")) {
          replyText = "Marco Polo offers organic full-submersion cold water washes and master weaving restoration services. Our specialized team handles delicate silk, wool, and antique dyes. Let us know your location to schedule a white-glove pickup!";
        }

        const simulatedReply: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: "admin",
          text: replyText,
          timestamp: new Date().toISOString(),
          sessionId: sId,
          customerName: cName
        };
        addShowroomDoc(SHOWROOM_CHAT, simulatedReply);
      }, 1500);
    }
  };

  const clearChat = (sessionId?: string) => {
    if (sessionId) {
      const messagesToDelete = chatMessages.filter((msg) => msg.sessionId === sessionId);
      messagesToDelete.forEach(msg => deleteShowroomDoc(SHOWROOM_CHAT, msg.id));
    } else {
      chatMessages.forEach(msg => deleteShowroomDoc(SHOWROOM_CHAT, msg.id));
    }
  };

  const deleteChatSession = (sessionId: string) => {
    const messagesToDelete = chatMessages.filter((msg) => (msg.sessionId || "default") === sessionId);
    messagesToDelete.forEach(msg => deleteShowroomDoc(SHOWROOM_CHAT, msg.id));
  };

  // --- Authentication Actions ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user doc
        const userDoc = await getDoc(doc(db as any, "showroom_customers", firebaseUser.uid));
        const isAdmin = await checkIsAdmin(firebaseUser.uid);
        
        let role = isAdmin ? "admin" : "customer";
        
        const userData: User = {
          id: firebaseUser.uid,
          name: userDoc.exists() ? userDoc.data().name : firebaseUser.displayName || "User",
          email: firebaseUser.email || "",
          role: role as "admin" | "customer"
        };
        
        setCurrentUser(userData);
        if (isAdmin) {
          setActiveView("admin");
          sessionStorage.setItem("mp-invoice-auth", "1");
        } else {
          setActiveView("customer");
        }
      } else {
        setCurrentUser(null);
        setActiveView("customer");
        sessionStorage.removeItem("mp-invoice-auth");
      }
    });
    return () => unsub();
  }, []);

  const loginUser = async (email: string, pass: string) => {
    const res = await loginWithEmail(email, pass);
    if (res.error) return { success: false, message: res.error };
    return { success: true, message: "Logged in successfully!" };
  };

  const signupUser = async (name: string, email: string, pass: string, phone?: string, address?: string) => {
    const res = await registerWithEmail(name, email, pass, phone);
    if (res.error) return { success: false, message: res.error };
    return { success: true, message: "Account created successfully!" };
  };

  const addAdminUser = async (name: string, email: string, pass: string) => {
    return { success: false, message: "Admins must be configured securely in Firebase." };
  };

  const logoutUser = async () => {
    await logout();
  };

  // --- Rug Cleaning Booking ---
  const addCleaningBooking = (booking: Omit<CleaningBooking, "id" | "status" | "createdAt">) => {
    const newBooking: CleaningBooking = {
      ...booking,
      id: `CL-CLN-${Math.floor(100000 + Math.random() * 900000)}`,
      status: "Pending",
      createdAt: new Date().toISOString()
    };
    addShowroomDoc(SHOWROOM_CLEANING, newBooking);
    return newBooking;
  };

  const updateCleaningBookingStatus = (id: string, status: CleaningBooking["status"]) => {
    updateShowroomDoc(SHOWROOM_CLEANING, id, { status });
  };

  const deleteCleaningBooking = (id: string) => {
    // Optimistic UI update
    setCleaningBookings(prev => prev.filter(b => b.id !== id));
    deleteShowroomDoc(SHOWROOM_CLEANING, id).catch(err => {
      console.error("Failed to delete cleaning booking:", err);
    });
  };

  const updateEstimateStatus = (id: string, status: string) => {
    updateShowroomDoc(SHOWROOM_ESTIMATES, id, { status });
  };

  const deleteEstimate = (id: string) => {
    setEstimates(prev => prev.filter(e => e.id !== id));
    deleteShowroomDoc(SHOWROOM_ESTIMATES, id).catch(err => {
      console.error("Failed to delete estimate:", err);
    });
  };

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    
    // Restore active view from local storage, but verify auth for admin view
    const view = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('marcopolo_active_view') : null;
    const auth = safeGetItem('mp-invoice-auth') || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('mp-invoice-auth') : null);
    
    if (view === 'admin' && auth === '1') {
      setActiveView('admin');
    } else if (view === 'customer') {
      setActiveView('customer');
    } else if (view === 'admin') {
      // Fallback if they tried to force admin without auth
      setActiveView('customer');
    }

    // --- INACTIVITY TIMEOUT (SHOWROOM) ---
    let inactivityTimer: NodeJS.Timeout;
    const INACTIVITY_LIMIT = 4 * 60 * 60 * 1000; // 4 hours

    const resetInactivity = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        // Auto-logout after 4 hours
        sessionStorage.removeItem('mp-invoice-auth');
        sessionStorage.removeItem('mp-invoice-user');
        localStorage.removeItem('mp-invoice-auth');
        localStorage.removeItem('mp-invoice-user');
        sessionStorage.removeItem('marcopolo_current_user');
        sessionStorage.removeItem('marcopolo_active_view');
        if (typeof window !== 'undefined') {
          setActiveView('customer');
        }
      }, INACTIVITY_LIMIT);
    };

    // Attach listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', resetInactivity);
      window.addEventListener('keypress', resetInactivity);
      window.addEventListener('click', resetInactivity);
      window.addEventListener('scroll', resetInactivity);
      window.addEventListener('touchstart', resetInactivity);
      resetInactivity();
    }

    return () => {
      if (typeof window !== 'undefined') {
        clearTimeout(inactivityTimer);
        window.removeEventListener('mousemove', resetInactivity);
        window.removeEventListener('keypress', resetInactivity);
        window.removeEventListener('click', resetInactivity);
        window.removeEventListener('scroll', resetInactivity);
        window.removeEventListener('touchstart', resetInactivity);
      }
    };
  }, []);

  return (
    <StoreContext.Provider
      value={{
        rugs,
        blogs,
        orders,
        reviews,
        chatMessages,
        cart,
        cartOpen,
        setCartOpen,
        activeView,
        setActiveView,
        adminTab,
        setAdminTab,
        currentUser,
        loginUser,
        signupUser,
        addAdminUser,
        logoutUser,
        cleaningBookings,
        addCleaningBooking,
        updateCleaningBookingStatus,
        deleteCleaningBooking,
        estimates,
        updateEstimateStatus,
        deleteEstimate,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        checkout,
        addRug,
        updateRug,
        deleteRug,
        incrementRugViews,
        toggleRugFavorite,
        favoritedRugIds,
        updateOrderStatus,
        updateOrder,
        deleteOrderPaymentDetails,
        approveReview,
        deleteReview,
        addBlogPost,
        updateBlogPost,
        deleteBlogPost,
        sendChatMessage,
        clearChat,
        deleteChatSession,
        submitReview,
        heroCoverPhotos,
        setHeroCoverPhotos,
        showroomAnnouncement,
        setShowroomAnnouncement,
        shopProfile,
    setShopProfile,
    logoUrl,
        setLogoUrl,
        socialLinks,
        setSocialLinks,
        promoCodes,
        addPromoCode,
        updatePromoCode,
        deletePromoCode,
        deleteOrder,
        referrers,
        incrementReferrer
      }}
    >
      {isHydrated ? children : null}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
};
