/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from "react";
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
  SHOWROOM_CLEANING
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
  loginUser: (email: string, pass: string) => { success: boolean; message: string };
  signupUser: (name: string, email: string, pass: string, phone?: string, address?: string) => { success: boolean; message: string };
  addAdminUser: (name: string, email: string, pass: string) => { success: boolean; message: string };
  logoutUser: () => void;
  
  // Cleaning bookings
  cleaningBookings: CleaningBooking[];
  addCleaningBooking: (booking: Omit<CleaningBooking, "id" | "status" | "createdAt">) => CleaningBooking;
  updateCleaningBookingStatus: (id: string, status: CleaningBooking["status"]) => void;
  deleteCleaningBooking: (id: string) => void;
  
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
  updateOrderStatus: (orderId: string, status: OrderStatus, shipping?: ShippingDetails) => void;
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
  const [activeView, setActiveView] = useState<"customer" | "admin">("customer");
  const [adminTab, setAdminTab] = useState<string>("analytics");
  const [cartOpen, setCartOpen] = useState<boolean>(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const local = safeGetItem("marcopolo_current_user");
    return local ? JSON.parse(local) : null;
  });

  const [registeredUsers, setRegisteredUsers] = useState<{ user: User; pass: string }[]>(() => {
    const local = safeGetItem("marcopolo_users_db");
    if (local) return JSON.parse(local);
    return [
      {
        user: { id: "admin-1", name: "Nazif (Admin)", email: "marcopolorugs@aol.com", role: "admin" },
        pass: "Marcopolo$"
      }
    ];
  });

  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [cleaningBookings, setCleaningBookings] = useState<CleaningBooking[]>(() => {
    const local = safeGetItem("marcopolo_cleaning_bookings");
    return local ? JSON.parse(local) : [];
  });

  // Core collections synced to Firebase
  const [rugs, setRugs] = useState<Rug[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    const local = safeGetItem("marcopolo_cart");
    return local ? JSON.parse(local) : [];
  });

  const [heroCoverPhotos, setHeroCoverPhotosState] = useState<string[]>([
    "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&q=80&w=1600",
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=1600",
    "https://images.unsplash.com/photo-1500336624444-0e6e225a3ee5?auto=format&fit=crop&q=80&w=1600"
  ]);
  const [showroomAnnouncement, setShowroomAnnouncementState] = useState<string>("🏛️ SHOWROOM SPECIAL: Free premium felt underlays with any 8x10 or larger antique Persian collection purchase this week.");
  const [shopProfile, setShopProfileState] = useState<ShopProfile>({
    name: "Marco Polo Showroom",
    phone: "(555) 123-4567",
    email: "contact@marcopolorugs.com",
    address: "123 Antique Way, Silk Road District",
    logoUrl: ""
  });
  const [logoUrl, setLogoUrlState] = useState<string>("");
  const [socialLinks, setSocialLinksState] = useState<SocialMediaLink[]>([
    { platform: "instagram", url: "https://instagram.com/marcopolorugs" },
    { platform: "pinterest", url: "https://pinterest.com/marcopolorugs" },
    { platform: "facebook", url: "https://facebook.com/marcopolorugs" },
    { platform: "tiktok", url: "https://tiktok.com/@marcopolorugs" },
    { platform: "youtube", url: "https://youtube.com/c/marcopolorugs" },
    { platform: "twitter", url: "https://twitter.com/marcopolorugs" }
  ]);

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
      unsubs.push(subscribeToCollection<PromoCode>(SHOWROOM_PROMOCODES, setPromoCodes));
      
      unsubs.push(subscribeToSettings({
        onHero: setHeroCoverPhotosState,
        onAnnouncement: setShowroomAnnouncementState,
        onLogo: setLogoUrlState,
        onProfile: setShopProfileState,

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
    safeSetItem("marcopolo_current_user", JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    safeSetItem("marcopolo_users_db", JSON.stringify(registeredUsers));
  }, [registeredUsers]);



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

  const deleteRug = (id: string) => {
    setRugs(prev => prev.filter(r => r.id !== id)); // Optimistic UI
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
    addShowroomDoc(SHOWROOM_REVIEWS, newReview);
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
  const loginUser = (email: string, pass: string) => {
    const formattedEmail = email.trim().toLowerCase();
    
    // Check if admin is logging in
    if (formattedEmail === "admin@marcopolo.com" || formattedEmail === "marcopolorugs@aol.com") {
      if (pass === "Marcopolo$") {
        const adminUser: User = { id: "admin-1", name: "Nazif (Admin)", email: formattedEmail, role: "admin" };
        setCurrentUser(adminUser);
        setActiveView("admin");
        
        // --- INVOICE SYSTEM INTEGRATION ---
        // Generate and store the shared authentication tokens for the old invoice system
        // so that the admin is seamlessly logged into /admin/invoices as well.
        safeSetItem("mp-invoice-auth", "1");
        safeSetItem("mp-invoice-user", JSON.stringify({ 
          id: "admin-1", 
          username: formattedEmail, 
          fullName: "Nazif (Admin)", 
          role: "admin", 
          email: formattedEmail 
        }));
        // Trigger a storage event so the invoice dashboard updates if it's already open in another tab
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('storage'));
        }
        
        return { success: true, message: "Logged in as Administrator." };
      } else {
        return { success: false, message: "Invalid administrator password." };
      }
    }

    // Customer & Dynamic Admin Login
    const found = registeredUsers.find((u) => u.user.email.toLowerCase() === formattedEmail);
    if (!found) {
      return { success: false, message: "User not found. Please sign up or try again." };
    }
    if (found.pass !== pass) {
      return { success: false, message: "Incorrect password. Please try again." };
    }

    setCurrentUser(found.user);
    if (found.user.role === "admin") {
      setActiveView("admin");
      // Generate and store the shared authentication tokens for the old invoice system
      safeSetItem("mp-invoice-auth", "1");
      safeSetItem("mp-invoice-user", JSON.stringify({ 
        id: found.user.id, 
        username: formattedEmail, 
        fullName: found.user.name, 
        role: "admin", 
        email: formattedEmail 
      }));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
      }
      return { success: true, message: `Welcome back, ${found.user.name}!` };
    }

    setActiveView("customer");
    return { success: true, message: `Welcome back, ${found.user.name}!` };
  };

  const signupUser = (name: string, email: string, pass: string, phone?: string, address?: string) => {
    const formattedEmail = email.trim().toLowerCase();
    if (formattedEmail === "admin@marcopolo.com" || formattedEmail === "marcopolorugs@aol.com") {
      return { success: false, message: "Cannot register using the protected admin email." };
    }

    const exists = registeredUsers.some((u) => u.user.email.toLowerCase() === formattedEmail);
    if (exists) {
      return { success: false, message: "An account with this email address already exists." };
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: formattedEmail,
      phone: phone?.trim(),
      address: address?.trim(),
      role: "customer"
    };

    setRegisteredUsers((prev) => [...prev, { user: newUser, pass }]);
    setCurrentUser(newUser);
    setActiveView("customer");
    return { success: true, message: `Account created successfully! Welcome, ${newUser.name}!` };
  };

  const addAdminUser = (name: string, email: string, pass: string) => {
    const formattedEmail = email.trim().toLowerCase();
    const exists = registeredUsers.some((u) => u.user.email.toLowerCase() === formattedEmail);
    if (exists) {
      return { success: false, message: "An account with this email address already exists." };
    }
    const newUser: User = {
      id: `admin-${Date.now()}`,
      name: name.trim(),
      email: formattedEmail,
      role: "admin"
    };
    setRegisteredUsers((prev) => [...prev, { user: newUser, pass }]);
    return { success: true, message: `Admin account created for ${newUser.name}!` };
  };

  const logoutUser = () => {
    setCurrentUser(null);
    setActiveView("customer");
    
    // --- INVOICE SYSTEM INTEGRATION ---
    // Clear shared authentication tokens
    try {
      localStorage.removeItem("mp-invoice-auth");
      localStorage.removeItem("mp-invoice-user");
      sessionStorage.removeItem("mp-invoice-auth");
      sessionStorage.removeItem("mp-invoice-user");
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.warn("Storage clear blocked by sandbox:", e);
    }
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


  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    
    // Restore active view from local storage, but verify auth for admin view
    const view = safeGetItem('marcopolo_active_view');
    const auth = safeGetItem('mp-invoice-auth');
    
    if (view === 'admin' && auth === '1') {
      setActiveView('admin');
    } else if (view === 'customer') {
      setActiveView('customer');
    } else if (view === 'admin') {
      // Fallback if they tried to force admin without auth
      setActiveView('customer');
    }
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
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        checkout,
        addRug,
        updateRug,
        deleteRug,
        updateOrderStatus,
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
        deleteOrder
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
