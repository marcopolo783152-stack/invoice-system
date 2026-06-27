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
  SocialMediaLink
} from "@/types";
import { INITIAL_RUGS } from "@/data/rugs";
import { INITIAL_BLOGS } from "@/data/blogs";

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
  
  // Cart operations
  addToCart: (rug: Rug) => void;
  removeFromCart: (rugId: string) => void;
  updateCartQuantity: (rugId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Checkout operations
  checkout: (customer: CustomerInfo, payment: PaymentDetails, deliveryOption: "Pickup" | "Delivery", shipping: number, tax: number, totalWeightLbs?: number) => Order;
  
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
  heroCoverPhoto: string;
  setHeroCoverPhoto: (url: string) => void;
  showroomAnnouncement: string;
  setShowroomAnnouncement: (text: string) => void;
  logoUrl: string;
  setLogoUrl: (url: string) => void;

  // Social media links customizable by admin
  socialLinks: SocialMediaLink[];
  setSocialLinks: (links: SocialMediaLink[]) => void;
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

  const [cleaningBookings, setCleaningBookings] = useState<CleaningBooking[]>(() => {
    const local = safeGetItem("marcopolo_cleaning_bookings");
    return local ? JSON.parse(local) : [];
  });

  // Core collections synced to localStorage
  const [rugs, setRugs] = useState<Rug[]>(() => {
    const local = safeGetItem("marcopolo_rugs");
    return local ? JSON.parse(local) : INITIAL_RUGS;
  });

  const [blogs, setBlogs] = useState<BlogPost[]>(() => {
    const local = safeGetItem("marcopolo_blogs");
    return local ? JSON.parse(local) : INITIAL_BLOGS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const local = safeGetItem("marcopolo_orders");
    return local ? JSON.parse(local) : [];
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    const local = safeGetItem("marcopolo_reviews");
    return local ? JSON.parse(local) : INITIAL_REVIEWS;
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const local = safeGetItem("marcopolo_chat");
    if (local) return JSON.parse(local);
    // Initial welcome message
    return [
      {
        id: "chat-welcome",
        sender: "admin",
        text: "Welcome to Marco Polo Oriental Rugs! I am Nazif, your personal concierge. How may I assist you with our luxury hand-knotted collection or tracking an active order today?",
        timestamp: new Date().toISOString(),
        sessionId: "default",
        customerName: "Guest Customer"
      }
    ];
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const local = safeGetItem("marcopolo_cart");
    return local ? JSON.parse(local) : [];
  });

  const [heroCoverPhoto, setHeroCoverPhotoState] = useState<string>(() => {
    return safeGetItem("marcopolo_hero_cover") || "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&q=80&w=1600";
  });

  const [showroomAnnouncement, setShowroomAnnouncementState] = useState<string>(() => {
    return safeGetItem("marcopolo_announcement") || "🏛️ SHOWROOM SPECIAL: Free premium felt underlays with any 8x10 or larger antique Persian collection purchase this week.";
  });

  const [logoUrl, setLogoUrlState] = useState<string>(() => {
    return safeGetItem("marcopolo_logo") || "";
  });

  const [socialLinks, setSocialLinksState] = useState<SocialMediaLink[]>(() => {
    const local = safeGetItem("marcopolo_social_links");
    if (local) return JSON.parse(local);
    return [
      { platform: "instagram", url: "https://instagram.com/marcopolorugs" },
      { platform: "pinterest", url: "https://pinterest.com/marcopolorugs" },
      { platform: "facebook", url: "https://facebook.com/marcopolorugs" },
      { platform: "tiktok", url: "https://tiktok.com/@marcopolorugs" },
      { platform: "youtube", url: "https://youtube.com/c/marcopolorugs" },
      { platform: "twitter", url: "https://twitter.com/marcopolorugs" }
    ];
  });

  const setHeroCoverPhoto = (url: string) => {
    setHeroCoverPhotoState(url);
    safeSetItem("marcopolo_hero_cover", url);
  };

  const setShowroomAnnouncement = (text: string) => {
    setShowroomAnnouncementState(text);
    safeSetItem("marcopolo_announcement", text);
  };

  const setLogoUrl = (url: string) => {
    setLogoUrlState(url);
    safeSetItem("marcopolo_logo", url);
  };

  const setSocialLinks = (links: SocialMediaLink[]) => {
    setSocialLinksState(links);
    safeSetItem("marcopolo_social_links", JSON.stringify(links));
  };

  // Local Storage synchronizers
  useEffect(() => {
    safeSetItem("marcopolo_rugs", JSON.stringify(rugs));
  }, [rugs]);

  useEffect(() => {
    safeSetItem("marcopolo_blogs", JSON.stringify(blogs));
  }, [blogs]);

  useEffect(() => {
    safeSetItem("marcopolo_orders", JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    safeSetItem("marcopolo_reviews", JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    safeSetItem("marcopolo_chat", JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    safeSetItem("marcopolo_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    safeSetItem("marcopolo_current_user", JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    safeSetItem("marcopolo_users_db", JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    safeSetItem("marcopolo_cleaning_bookings", JSON.stringify(cleaningBookings));
  }, [cleaningBookings]);

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
    totalWeightLbs?: number
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
      total,
      totalWeightLbs,
      status: "Pending Confirmation", // manual admin verification
      paymentDetails: payment,
      createdAt: new Date().toISOString()
    };

    // Append new order
    setOrders((prev) => [newOrder, ...prev]);
    
    // Mark checked out rugs as "Reserved" (pending confirmation)
    const orderRugIds = cart.map(item => item.rug.id);
    setRugs(prevRugs =>
      prevRugs.map(rug =>
        orderRugIds.includes(rug.id) ? { ...rug, availability: "Reserved" } : rug
      )
    );

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
    setRugs((prev) => [rug, ...prev]);
  };

  const updateRug = (id: string, updatedFields: Partial<Rug>) => {
    setRugs((prev) =>
      prev.map((rug) => (rug.id === id ? { ...rug, ...updatedFields } : rug))
    );
  };

  const deleteRug = (id: string) => {
    setRugs((prev) => prev.filter((rug) => rug.id !== id));
  };

  // --- Order Status Management ---
  const updateOrderStatus = (
    orderId: string,
    status: OrderStatus,
    shipping?: ShippingDetails
  ) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id !== orderId) return order;

        // If the order status changes to "Cancelled", mark rugs back to "In Stock"
        // If "Confirmed", mark rugs as "Sold"
        if (status === "Cancelled") {
          const rugIdsToStock = order.cartItems.map((item) => item.rug.id);
          setRugs((prevRugs) =>
            prevRugs.map((rug) =>
              rugIdsToStock.includes(rug.id) ? { ...rug, availability: "In Stock" } : rug
            )
          );
        } else if (status === "Confirmed") {
          const rugIdsToSold = order.cartItems.map((item) => item.rug.id);
          setRugs((prevRugs) =>
            prevRugs.map((rug) =>
              rugIdsToSold.includes(rug.id) ? { ...rug, availability: "Sold" } : rug
            )
          );
        }

        const updatedOrder: Order = { ...order, status };
        if (shipping) {
          updatedOrder.shippingDetails = {
            ...order.shippingDetails,
            ...shipping,
            shippedAt: shipping.shippedAt || new Date().toISOString()
          };
        }
        return updatedOrder;
      })
    );
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
      isApproved: false, // Admin must approve before publishing!
      createdAt: new Date().toISOString()
    };
    setReviews((prev) => [newReview, ...prev]);
  };

  const approveReview = (reviewId: string) => {
    setReviews((prev) =>
      prev.map((rev) => (rev.id === reviewId ? { ...rev, isApproved: true } : rev))
    );
  };

  const deleteReview = (reviewId: string) => {
    setReviews((prev) => prev.filter((rev) => rev.id !== reviewId));
  };

  // --- Blog Operations ---
  const addBlogPost = (post: Omit<BlogPost, "id">) => {
    const id = `blog-${Date.now()}`;
    const newPost: BlogPost = { ...post, id };
    setBlogs((prev) => [newPost, ...prev]);
  };

  const updateBlogPost = (id: string, updatedPost: Partial<BlogPost>) => {
    setBlogs((prev) =>
      prev.map((post) => (post.id === id ? { ...post, ...updatedPost } : post))
    );
  };

  const deleteBlogPost = (id: string) => {
    setBlogs((prev) => prev.filter((post) => post.id !== id));
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
      orderId,
      sessionId: sId,
      customerName: cName
    };

    setChatMessages((prev) => [...prev, newMessage]);

    // Simple real-time reply simulation! If customer is texting, let's trigger a elegant, contextual auto-concierge response after 1.5s
    // unless admin is replying. This helps the app feel alive and interactive instantly!
    if (sender === "customer") {
      setTimeout(() => {
        let replyText = "Thank you for reaching out. A master rug advisor has been notified of your message. We will respond with detailed expertise shortly. Feel free to also reach us directly at marcopolorugs@aol.com or call our showroom.";
        
        const lowerText = text.toLowerCase();
        if (lowerText.includes("track") || lowerText.includes("order") || lowerText.includes("mpr-")) {
          replyText = "To track your handmade rug delivery, please visit the 'Track Order' portal in the header menu and input your order tracking ID (e.g. MPR-XXXXXX). You can also view shipping documents and live tracking statuses there in real-time.";
        } else if (lowerText.includes("price") || lowerText.includes("cost") || lowerText.includes("discount")) {
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
        setChatMessages((prev) => [...prev, simulatedReply]);
      }, 1500);
    }
  };

  const clearChat = (sessionId?: string) => {
    if (sessionId) {
      setChatMessages((prev) => prev.filter((msg) => msg.sessionId !== sessionId));
    } else {
      setChatMessages([
        {
          id: "chat-welcome",
          sender: "admin",
          text: "Welcome to Marco Polo Oriental Rugs! I am Nazif, your personal concierge. How may I assist you with our luxury hand-knotted collection or tracking an active order today?",
          timestamp: new Date().toISOString(),
          sessionId: "default",
          customerName: "Guest Customer"
        }
      ]);
    }
  };

  const deleteChatSession = (sessionId: string) => {
    setChatMessages((prev) => prev.filter((msg) => (msg.sessionId || "default") !== sessionId));
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
    setCleaningBookings((prev) => [newBooking, ...prev]);
    return newBooking;
  };

  const updateCleaningBookingStatus = (id: string, status: CleaningBooking["status"]) => {
    setCleaningBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    );
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
        heroCoverPhoto,
        setHeroCoverPhoto,
        showroomAnnouncement,
        setShowroomAnnouncement,
        logoUrl,
        setLogoUrl,
        socialLinks,
        setSocialLinks
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
