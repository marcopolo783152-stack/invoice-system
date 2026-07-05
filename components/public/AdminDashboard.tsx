/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useStore } from "@/context/StoreContext";
import { OrderStatus, Rug, BlogPost, Review, ALL_SIZES } from "@/types";
import { BulkImport } from "./BulkImport";
import { generateAndDownloadReceiptPDF } from "@/utils/pdf";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { compressImage } from "@/lib/imageUtils";
import { 
  BarChart3, 
  Layers, 
  ClipboardList, 
  Star, 
  MessageSquare, 
  BookOpen, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  Truck, 
  X, 
  ShieldCheck, 
  AlertCircle, 
  FileText,
  DollarSign,
  Briefcase,
  TrendingUp,
  User,
  ExternalLink,
  Upload,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Globe,
  Mail,
  Printer,
  Heart,
  Settings,
  Tag,
  Save,
  Eye, 
  UploadCloud,
  Camera,
  Banknote
} from "lucide-react";

export const AdminDashboard: React.FC = () => {
  const { 
    rugs, 
    orders, 
    reviews, 
    chatMessages, 
    blogs,
    cleaningBookings,
    addRug, 
    updateRug, 
    deleteRug, 
    updateOrderStatus, 
    updateCleaningBookingStatus,
    deleteCleaningBooking,
    approveReview, 
    deleteReview,
    promoCodes,
    addPromoCode,
    deletePromoCode,
    deleteOrder, 
    sendChatMessage,
    addBlogPost,
    deleteBlogPost,
    deleteChatSession,
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
    addAdminUser
  } = useStore();

  const [activeTab, setActiveTabState] = useState<"analytics" | "inventory" | "bulk_import" | "orders" | "transactions" | "cleaning" | "reviews" | "messages" | "blogs" | "promotions" | "settings">("analytics");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("adminTab") as any;
      if (tab) setActiveTabState(tab);
    }
  }, []);

  const setActiveTab = (tab: "analytics" | "inventory" | "bulk_import" | "orders" | "transactions" | "cleaning" | "reviews" | "messages" | "blogs" | "promotions" | "settings") => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("view", "admin");
      params.set("adminTab", tab);
      window.history.pushState(null, "", "?" + params.toString());
    }
  };
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Review notification alert
  const unapprovedReviewsCount = reviews.filter(r => !r.isApproved).length;
  // Order notification alert
  const localLastSeenOrder = useRef<number | null>(null);

  useEffect(() => {
    if (orders.length === 0) return;

    const latestOrderTime = Math.max(...orders.map(o => new Date(o.createdAt).getTime()));
    
    const savedTime = typeof window !== "undefined" ? sessionStorage.getItem('lastSeenOrder') : null;
    const previousTime = savedTime ? parseInt(savedTime) : 0;
    
    if (localLastSeenOrder.current === null) {
      localLastSeenOrder.current = previousTime;
    }
    
    if (latestOrderTime > localLastSeenOrder.current) {
      if (localLastSeenOrder.current > 0 || (Date.now() - latestOrderTime < 60000)) {
        const audio = new Audio("/coin.mp3");
        audio.play().catch(e => {
          console.error("Audio playback blocked by browser", e);
          alert("🔔🔔 NEW ORDER RECEIVED! 🔔🔔 (Audio blocked by browser, please click anywhere on the page first)");
        });
      }
      
      localLastSeenOrder.current = latestOrderTime;
      if (typeof window !== "undefined") sessionStorage.setItem('lastSeenOrder', latestOrderTime.toString());
    } else if (localLastSeenOrder.current === 0) {
      localLastSeenOrder.current = latestOrderTime;
      if (typeof window !== "undefined") sessionStorage.setItem('lastSeenOrder', latestOrderTime.toString());
    }
  }, [orders]);

  const prevUnapprovedCount = useRef(unapprovedReviewsCount);

  useEffect(() => {
    if (unapprovedReviewsCount > 0) {
      setTimeout(() => {
        alert(`🔔 You have ${unapprovedReviewsCount} unapproved customer review(s) waiting!\n\nPlease check the 'Advisor Reviews' tab to approve them.`);
      }, 500);
    }
  }, []); // Run once on mount!

  useEffect(() => {
    if (unapprovedReviewsCount > prevUnapprovedCount.current) {
      alert("🔔 NEW CUSTOMER REVIEW SUBMITTED!\n\nPlease check the 'Advisor Reviews' tab to approve it.");
    }
    prevUnapprovedCount.current = unapprovedReviewsCount;
  }, [unapprovedReviewsCount]);

  // Showroom cover photo & announcement settings inputs
  const [coverPhotoInputs, setCoverPhotoInputs] = useState<string[]>(heroCoverPhotos || []);
  const [announcementInput, setAnnouncementInput] = useState(showroomAnnouncement);
  const [logoInput, setLogoInput] = useState(logoUrl);
  const [coverSuccess, setCoverSuccess] = useState(false);
  
  const [annSuccess, setAnnSuccess] = useState(false);
  const [shopNameInput, setShopNameInput] = useState(shopProfile?.name || "");
  const [shopPhoneInput, setShopPhoneInput] = useState(shopProfile?.phone || "");
  const [shopEmailInput, setShopEmailInput] = useState(shopProfile?.email || "");
  const [shopAddressInput, setShopAddressInput] = useState(shopProfile?.address || "");
  const [shopSuccess, setShopSuccess] = useState(false);

  const [logoSuccess, setLogoSuccess] = useState(false);

  useEffect(() => {
    setCoverPhotoInputs(heroCoverPhotos || []);
  }, [heroCoverPhotos]);

  useEffect(() => {
    setAnnouncementInput(showroomAnnouncement);
  }, [showroomAnnouncement]);

  useEffect(() => {
    setLogoInput(logoUrl);
  }, [logoUrl]);

  // State for inventory add/edit modal
  const [rugModalOpen, setRugModalOpen] = useState(false);
  const [editingRugId, setEditingRugId] = useState<string | null>(null);
  const [rugName, setRugName] = useState("");
  const [rugManufacturingType, setRugManufacturingType] = useState<"Handmade" | "Machine-made">("Handmade");
  const [rugSKU, setRugSKU] = useState("");
  const [rugPrice, setRugPrice] = useState<number | "">("");
  const [rugOriginalPrice, setRugOriginalPrice] = useState<number | "">("");
  const [rugSizeCategory, setRugSizeCategory] = useState<Rug["sizeCategory"] | "">("");
  const [rugDimensions, setRugDimensions] = useState("");
  const [rugOrigin, setRugOrigin] = useState("");
  const [rugStyle, setRugStyle] = useState<Rug["style"] | "">("");
  const [rugMaterial, setRugMaterial] = useState("");
  const [rugAge, setRugAge] = useState<Rug["age"] | "">("");
  const [rugCondition, setRugCondition] = useState<Rug["condition"] | "">("");
  const [rugColors, setRugColors] = useState("");
  const [rugWeight, setRugWeight] = useState<number | "">("");
    const [rugIsFreeShipping, setRugIsFreeShipping] = useState<boolean>(false);
  const [rugShape, setRugShape] = useState<Rug["shape"] | "">("");
  const [rugAvailability, setRugAvailability] = useState<Rug["availability"] | "">("In Stock");
  const [rugDescription, setRugDescription] = useState("");
  const [rugImageUrl, setRugImageUrl] = useState("");
  const [rugImages, setRugImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // State for dispatch carrier info modal
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
  const [carrier, setCarrier] = useState("FedEx Priority Freight");
  const [trackingNumber, setTrackingNumber] = useState("MP-FEDEX-98319");
  const [estDelivery, setEstDelivery] = useState("July 3, 2026");

  // State for message replies
  const [adminReplyText, setAdminReplyText] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  // States for inventory filters
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [adminSizeFilter, setAdminSizeFilter] = useState("All");

  // State for blogs
  const [blogModalOpen, setBlogModalOpen] = useState(false);
  const [blogTitle, setBlogTitle] = useState("");
  const [blogExcerpt, setBlogExcerpt] = useState("");
  const [blogCategory, setBlogCategory] = useState<any>("Interior Design Tips");
  const [blogContent, setBlogContent] = useState("");

  // States for secure card decrypt password prompt
  const [unlockedOrders, setUnlockedOrders] = useState<string[]>([]);
  const [passwordPromptOrderId, setPasswordPromptOrderId] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordAction, setPasswordAction] = useState<"decrypt" | "delete" | null>(null);
  
  // Bulk select and promotions
  const [selectedRugIds, setSelectedRugIds] = useState<string[]>([]);
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState<number | "">("");
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoType, setPromoType] = useState<"percentage" | "fixed">("percentage");
  const [promoValue, setPromoValue] = useState(10);
  const [promoOneTime, setPromoOneTime] = useState(false);


  // Reusable custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Group messages by sessionId to construct threads for the Admin CRM
  const chatThreads = useMemo(() => {
    const threadsMap: { [key: string]: { sessionId: string; customerName: string; messages: typeof chatMessages; lastTimestamp: string } } = {};
    
    chatMessages.forEach((msg) => {
      const sId = msg.sessionId || "default";
      const cName = msg.customerName || "Guest Customer";
      
      if (!threadsMap[sId]) {
        threadsMap[sId] = {
          sessionId: sId,
          customerName: cName,
          messages: [],
          lastTimestamp: msg.timestamp
        };
      }
      threadsMap[sId].messages.push(msg);
      if (new Date(msg.timestamp).getTime() > new Date(threadsMap[sId].lastTimestamp).getTime()) {
        threadsMap[sId].lastTimestamp = msg.timestamp;
      }
    });

    return Object.values(threadsMap).sort(
      (a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
    );
  }, [chatMessages]);

  // Auto-select first thread if none is selected
  useEffect(() => {
    if (chatThreads.length > 0 && !selectedSessionId) {
      setSelectedSessionId(chatThreads[0].sessionId);
    }
  }, [chatThreads, selectedSessionId]);

  const handleUnlockCardDetails = (orderId: string) => {
    setPasswordPromptOrderId(orderId);
    setPasswordInput("");
    setPasswordError("");
  };

  const verifyDecryptPassword = (e: React.FormEvent) => {
    e.preventDefault();
    // Strictly require requested administrator password
    if (passwordInput === "Marcopolo$") {
      if (passwordPromptOrderId) {
        setUnlockedOrders((prev) => [...prev, passwordPromptOrderId]);
      }
      setPasswordPromptOrderId(null);
      setPasswordInput("");
      setPasswordError("");
    } else {
      setPasswordError("Invalid Administrator Password. Access Denied.");
    }
  };

  // --- CALCULATE DYNAMIC ANALYTICS FROM REAL CURRENT STATE ---
  const dynamicAnalytics = React.useMemo(() => {
    const totalSales = orders
      .filter((o) => o.status !== "Cancelled" && o.status !== "Pending Confirmation")
      .reduce((sum, o) => sum + o.total, 0);

    const pendingOrders = orders.filter((o) => o.status === "Pending Confirmation").length;
    const confirmedOrders = orders.filter((o) => o.status === "Confirmed").length;
    const shippedOrders = orders.filter((o) => o.status === "Shipped").length;
    const deliveredOrders = orders.filter((o) => o.status === "Delivered").length;
    
    const inventoryValue = rugs
      .filter((r) => r.availability === "In Stock")
      .reduce((sum, r) => sum + r.price, 0);

    const activeInquiries = chatMessages.filter(msg => msg.sender === "customer").length;

    return {
      totalSales,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      inventoryValue,
      activeInquiries,
      visitors: 1240 + orders.length * 15, // dynamic look
      conversionRate: orders.length > 0 ? ((orders.length / (1240 + orders.length * 15)) * 100).toFixed(1) + "%" : "0.0%"
    };
  }, [orders, rugs, chatMessages]);

  const handleOpenRugModal = (r?: Rug) => {
    if (r) {
      setEditingRugId(r.id);
      setRugName(r.name);
      setRugManufacturingType(r.manufacturingType || "Handmade");
      setRugSKU(r.sku);
      setRugPrice(r.price);
    setRugOriginalPrice(r.originalPrice || "");
      setRugSizeCategory(r.sizeCategory);
      setRugDimensions(r.dimensions);
      setRugOrigin(r.origin);
      setRugStyle(r.style);
      setRugMaterial(r.material);
      setRugAge(r.age);
      setRugCondition(r.condition);
      setRugColors(r.colors.join(", "));
      setRugWeight(r.weightLbs || 3.5);
        setRugIsFreeShipping(r.isFreeShipping || false);
      setRugShape(r.shape);
      setRugAvailability(r.availability);
      setRugDescription(r.description);
      setRugImageUrl(r.images?.[0] || "");
      setRugImages(r.images && r.images.length > 0 ? [...r.images] : ["https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=800"]);
    } else {
      setEditingRugId(null);
      setRugName("");
      setRugManufacturingType("Handmade");
      setRugSKU("");
      setRugPrice("");
    setRugOriginalPrice("");
      setRugSizeCategory("");
      setRugDimensions("");
      setRugOrigin("");
      setRugStyle("");
      setRugMaterial("");
      setRugAge("");
      setRugCondition("");
      setRugColors("");
      setRugWeight("");
        setRugIsFreeShipping(false);
      setRugShape("");
      setRugAvailability("In Stock");
      setRugDescription("");
      setRugImageUrl("");
      setRugImages([]);
    }
    setNewImageUrl("");
    setRugModalOpen(true);
  };

  const handleSaveRug = (e: React.FormEvent) => {
    e.preventDefault();
    const colorsArr = rugColors.split(",").map(c => c.trim()).filter(Boolean);
    const finalImages = rugImages.length > 0 ? rugImages : ["https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=800"];
    const payload: any = {
      name: rugName,
      manufacturingType: rugManufacturingType,
      sku: rugSKU,
      price: Number(rugPrice),
      originalPrice: rugOriginalPrice === "" ? null : Number(rugOriginalPrice),
      sizeCategory: rugSizeCategory as Rug["sizeCategory"],
      dimensions: rugDimensions,
      origin: rugOrigin,
      style: rugStyle as Rug["style"],
      material: rugMaterial,
      age: rugAge as Rug["age"],
      condition: rugCondition as Rug["condition"],
      colors: colorsArr,
      weightLbs: Number(rugWeight) || 3.5,
        isFreeShipping: rugIsFreeShipping,
      shape: rugShape as Rug["shape"],
      availability: rugAvailability as Rug["availability"],
      description: rugDescription,
      images: finalImages
    };

    if (editingRugId) {
      updateRug(editingRugId, payload);
    } else {
      addRug(payload);
    }
    setRugModalOpen(false);
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    if (rugImages.length >= 15) {
      alert("You can add a maximum of 15 pictures.");
      return;
    }
    setRugImages(prev => [...prev, newImageUrl.trim()]);
    setNewImageUrl("");
  };

  const handleUploadMultipleImages = async (files: FileList | null) => {
    if (!files) return;
    const currentCount = rugImages.length;
    const remainingSlots = 15 - currentCount;
    if (remainingSlots <= 0) {
      alert("You have already reached the maximum of 15 pictures.");
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      alert(`Only the first ${remainingSlots} files will be uploaded to stay within the 15-picture limit.`);
    }

    // IMMEDIATELY show previews so the user doesn't have to wait
    const previewUrls = filesToUpload.map(file => URL.createObjectURL(file));
    setRugImages(prev => {
      const newImages = [...prev, ...previewUrls];
      return newImages.slice(0, 15);
    });
    
    setIsUploading(true);

    try {
      // Process in the background, updating the URL one by one
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const tempUrl = previewUrls[i];
        
        try {
          // 1. Compress image heavily on the client side
          const compressedBase64 = await compressImage(file, 600, 600, 0.6);

          // Convert base64 back to Blob for Firebase Storage
          const res = await fetch(compressedBase64);
          const blob = await res.blob();
          
          let finalUrl = compressedBase64;
          
          if (storage) {
            try {
              // 2. Try to upload to Firebase Storage with a strict 5-second timeout
              const fileRef = ref(storage, `showroom_rugs/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "")}`);
              
              const uploadTask = async () => {
                const snapshot = await uploadBytes(fileRef, blob);
                return await getDownloadURL(snapshot.ref);
              };

              const timeoutTask = new Promise<string>((_, reject) => 
                setTimeout(() => reject(new Error("Firebase upload timeout")), 5000)
              );

              finalUrl = await Promise.race([uploadTask(), timeoutTask]);
            } catch (storageError) {
              console.warn("Firebase Storage failed or timed out, falling back to Base64", storageError);
            }
          }
          
          // Replace the temporary preview URL with the final permanent URL
          setRugImages(prev => prev.map(url => url === tempUrl ? finalUrl : url));
        } catch (fileErr) {
          console.error("Error processing file:", file.name, fileErr);
          // If it fails completely, remove the preview
          setRugImages(prev => prev.filter(url => url !== tempUrl));
        }
      }
    } catch (error) {
      console.error("Error compressing/uploading images:", error);
      alert("Failed to process some images. Please check your connection.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setRugImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleMakeCoverImage = (index: number) => {
    if (index === 0) return;
    setRugImages(prev => {
      const copy = [...prev];
      const [img] = copy.splice(index, 1);
      return [img, ...copy];
    });
  };

  const handleMoveImage = (index: number, direction: "up" | "down") => {
    setRugImages(prev => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleOpenShippingModal = (oId: string) => {
    setShippingOrderId(oId);
    setCarrier("FedEx Priority Freight");
    setTrackingNumber(`MP-FDX-${Math.floor(100000 + Math.random() * 900000)}`);
    setEstDelivery("3 Business Days");
    setShippingModalOpen(true);
  };

  const handleDispatchShipping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingOrderId) return;
    updateOrderStatus(shippingOrderId, "Shipped", {
      carrier,
      trackingNumber,
      estimatedDelivery: estDelivery
    });
    setShippingModalOpen(false);
  };

  const handleAdminChatReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyText.trim()) return;
    
    const activeSession = selectedSessionId || "default";
    const customerMsg = chatMessages.find(m => m.sessionId === activeSession && m.customerName);
    const customerName = customerMsg ? customerMsg.customerName : "Customer";

    sendChatMessage(adminReplyText, "admin", undefined, activeSession, customerName);
    setAdminReplyText("");
  };

  const handleAdminEndChat = (sessionId: string) => {
    askConfirmation(
      "End Support Chat",
      "Are you sure you want to end this support chat session? This will permanently delete all its messages.",
      () => {
        deleteChatSession(sessionId);
        if (selectedSessionId === sessionId) {
          setSelectedSessionId("");
        }
      }
    );
  };

  const handleSaveBlog = (e: React.FormEvent) => {
    e.preventDefault();
    addBlogPost({
      title: blogTitle,
      excerpt: blogExcerpt,
      category: blogCategory,
      content: blogContent,
      featuredImage: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&q=80&w=800",
      author: "Cyrus (Store Owner)",
      date: new Date().toLocaleDateString(),
      readTime: "4 min read"
    });
    setBlogModalOpen(false);
    setBlogTitle("");
    setBlogExcerpt("");
    setBlogContent("");
  };

  return (
    <div className="bg-[#F9F7F5] min-h-screen font-sans text-xs text-editorial-text flex flex-col md:flex-row">
        
        {/* Audio Autoplay Override Banner */}
        {!audioEnabled && (
          <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-600 text-white p-3 flex flex-col sm:flex-row items-center justify-center gap-4 shadow-md animate-fadeIn">
            <span className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Audio alerts are currently muted by your browser.
            </span>
            <button 
              onClick={() => {
                const audio = new Audio("/coin.mp3");
                audio.play().then(() => {
                  setAudioEnabled(true);
                }).catch(e => {
                  console.error("Audio unlock failed", e);
                  setAudioEnabled(true); // Hide it anyway if they at least tried to click
                });
              }}
              className="px-4 py-1.5 bg-white text-amber-700 font-bold uppercase tracking-widest text-xs hover:bg-amber-50 transition-colors"
            >
              Enable Order Notification Sound
            </button>
          </div>
        )}
      
      {/* 1. Sidebar Nav */}
      <aside className="w-full md:w-64 bg-editorial-text text-white flex flex-col justify-between border-r border-editorial-border p-5 gap-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="h-9 w-9 bg-editorial-accent rounded-none text-white flex items-center justify-center font-bold text-sm">
              M
            </div>
            <div>
              <span className="font-serif font-light text-editorial-accent text-sm tracking-widest uppercase">Showroom Admin</span>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-mono">Marco Polo Curation</p>
            </div>
          </div>

          <nav className="space-y-1.5 text-xs">
            <button
              onClick={() => setActiveTab("promotions")}
              className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-none font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === "promotions" ? "bg-editorial-accent text-white" : "text-gray-300 hover:bg-white/10"
              }`}
            >
              <Tag className="h-4.5 w-4.5" />
              <span>Promotions</span>
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-none font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === "analytics" ? "bg-editorial-accent text-white" : "text-gray-300 hover:bg-white/10"
              }`}
            >
              <BarChart3 className="h-4.5 w-4.5" />
              <span>Analytics Curation</span>
            </button>
            
            <button
              onClick={() => setActiveTab("inventory")}
              className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-none font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === "inventory" ? "bg-editorial-accent text-white" : "text-gray-300 hover:bg-white/10"
              }`}
            >
              <Layers className="h-4.5 w-4.5" />
              <span>Weaves Catalog</span>
            </button>
            
            <button
              onClick={() => setActiveTab("bulk_import")}
              className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-none font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === "bulk_import" ? "bg-editorial-accent text-white" : "text-gray-300 hover:bg-white/10"
              }`}
            >
              <UploadCloud className="h-4.5 w-4.5" />
              <span>Bulk Import</span>
            </button>
            
            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-none font-bold uppercase tracking-wider transition cursor-pointer relative ${
                activeTab === "orders" ? "bg-editorial-accent text-white" : "text-gray-300 hover:bg-white/10"
              }`}
            >
              <ClipboardList className="h-4.5 w-4.5" />
              <span>Escrow Invoices</span>
              {dynamicAnalytics.pendingOrders > 0 && (
                <span className="absolute right-3 bg-[#C22E2E] text-white text-sm font-bold px-2 py-0.5 rounded-none animate-pulse">
                  {dynamicAnalytics.pendingOrders}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("cleaning")}
              className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-none font-bold uppercase tracking-wider transition cursor-pointer relative ${
                activeTab === "cleaning" ? "bg-editorial-accent text-white" : "text-gray-300 hover:bg-white/10"
              }`}
            >
              <Heart className="h-4.5 w-4.5" />
              <span>Specialty Care</span>
              {cleaningBookings.filter(b => b.status === "Pending").length > 0 && (
                <span className="absolute right-3 bg-amber-500 text-neutral-900 text-sm font-bold px-2 py-0.5 rounded-none animate-pulse">
                  {cleaningBookings.filter(b => b.status === "Pending").length}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab("reviews")}
              className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-none font-bold uppercase tracking-wider transition cursor-pointer relative ${
                activeTab === "reviews" ? "bg-editorial-accent text-white" : "text-gray-300 hover:bg-white/10"
              }`}
            >
              <Star className="h-4.5 w-4.5" />
              <span>Advisor Reviews</span>
              {reviews.filter(r => !r.isApproved).length > 0 && (
                <span className="absolute right-3 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse shadow-md">
                  {reviews.filter(r => !r.isApproved).length} NEW
                </span>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab("messages")}
              className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-none font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === "messages" ? "bg-editorial-accent text-white" : "text-gray-300 hover:bg-white/10"
              }`}
            >
              <MessageSquare className="h-4.5 w-4.5" />
              <span>Concierge Inbox</span>
            </button>
            
            <button
              onClick={() => setActiveTab("blogs")}
              className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-none font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === "blogs" ? "bg-editorial-accent text-white" : "text-gray-300 hover:bg-white/10"
              }`}
            >
              <BookOpen className="h-4.5 w-4.5" />
              <span>Design Journal</span>
            </button>
            

            <button
              onClick={() => setActiveTab("transactions")}
              className={`w-full flex items-center justify-between py-2.5 px-3 rounded-none font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === "transactions" ? "bg-editorial-accent text-white" : "text-gray-300 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <Banknote className="h-4.5 w-4.5" />
                <span>Transactions</span>
              </div>
            </button>
            <a
              href="/admin/invoices"
              className="w-full flex items-center justify-between py-2.5 px-3 rounded-none font-bold uppercase tracking-wider transition cursor-pointer text-gray-300 hover:bg-white/10 hover:text-white"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4.5 w-4.5" />
                <span>Invoice System</span>
              </div>
            </a>
            
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-none font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === "settings" ? "bg-editorial-accent text-white" : "text-gray-300 hover:bg-white/10"
              }`}
            >
              <Settings className="h-4.5 w-4.5" />
              <span>General Settings</span>
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-white/10 text-xs text-gray-400 space-y-1 text-left">
          <p>• Showroom: Online Active</p>
          <p>• Curating: Persian Treasures</p>
        </div>
      </aside>

      {/* 2. Main Workspace */}
      <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">
        
        {/* Workspace banner info */}
        <div className="bg-white p-6 rounded-none shadow-sm border border-editorial-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
          <div className="space-y-1">
            <span className="text-xs text-editorial-accent uppercase tracking-widest font-bold block">Consolidated Showroom Dashboard</span>
            <h1 className="font-serif text-2xl font-light text-editorial-text">
              {activeTab === "analytics" && "Analytical Insights"}
              {activeTab === "inventory" && "Manage Showroom Inventory"}
              {activeTab === "bulk_import" && "Bulk Importer"}
              {activeTab === "orders" && "Escrow Invoices & Dispatch Logs"}
              {activeTab === "transactions" && "System Transactions Ledger"}
              {activeTab === "reviews" && "Advisor Review Moderation"}
              {activeTab === "messages" && "Live Concierge Inbox Thread"}
              {activeTab === "blogs" && "Design Journal Publisher"}
              {activeTab === "promotions" && "Promo Code Management"}
              {activeTab === "settings" && "General Settings & Security"}
            </h1>
          </div>
          
          <div className="text-right text-xs">
            <span className="text-gray-400 block font-semibold uppercase">Workspace Partner:</span>
            <span className="font-bold text-editorial-text font-mono">marcopolorugs@aol.com</span>
          </div>
        </div>

        {/* --- TAB: TRANSACTIONS --- */}
        {activeTab === "transactions" && (
          <div className="space-y-6 animate-fadeIn text-left">
            <h2 className="text-xl font-serif text-editorial-text border-b border-editorial-border pb-2">Transactions Ledger</h2>
            
            <div className="bg-white p-6 border border-editorial-border shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-1">Total System Revenue</span>
                <span className="text-4xl font-serif text-amber-700">${dynamicAnalytics.totalSales.toLocaleString()}</span>
              </div>
              <Banknote className="h-12 w-12 text-amber-700/20" />
            </div>

            <div className="bg-white border border-editorial-border shadow-xs overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-editorial-aside text-gray-600 font-semibold uppercase tracking-wider text-[10px] border-b border-editorial-border">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Transaction ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Payment Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-editorial-border">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic font-sans">No transactions recorded yet.</td>
                    </tr>
                  ) : (
                    orders.map(order => (
                      <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-3">{new Date(order.createdAt || 0).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-mono text-xs">{order.id.split('-').pop()?.toUpperCase() || order.id}</td>
                        <td className="px-4 py-3 font-medium text-editorial-text">{order.customerInfo?.name || 'Unknown'}</td>
                        <td className="px-4 py-3 capitalize">{order.paymentDetails?.cardBrand || 'Card'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            order.status === 'Delivered' || order.status === 'Shipped' || order.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                            order.status === 'Pending Confirmation' || order.status === 'Preparing for Shipping' ? 'bg-amber-100 text-amber-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">${order.total?.toLocaleString() || '0'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB A: ANALYTICS CURATION --- */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            
            {/* Real Stats Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-none border border-editorial-border shadow-xs flex items-center justify-between text-left">
                <div className="space-y-1">
                  <span className="text-sm uppercase text-gray-450 tracking-wider font-semibold">Curation Sales Sum</span>
                  <p className="font-serif text-xl sm:text-2xl font-light text-editorial-text">${dynamicAnalytics.totalSales.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-editorial-aside text-emerald-700 border border-editorial-border rounded-none"><DollarSign className="h-5 w-5" /></div>
              </div>
              
              <div className="bg-white p-5 rounded-none border border-editorial-border shadow-xs flex items-center justify-between text-left">
                <div className="space-y-1">
                  <span className="text-sm uppercase text-gray-450 tracking-wider font-semibold">Active Holds</span>
                  <p className="font-serif text-xl sm:text-2xl font-light text-editorial-text">{dynamicAnalytics.pendingOrders} Orders</p>
                </div>
                <div className="p-2 bg-editorial-aside text-editorial-accent border border-editorial-border rounded-none"><Briefcase className="h-5 w-5" /></div>
              </div>
              
              <div className="bg-white p-5 rounded-none border border-editorial-border shadow-xs flex items-center justify-between text-left">
                <div className="space-y-1">
                  <span className="text-sm uppercase text-gray-450 tracking-wider font-semibold">Dispatched Freights</span>
                  <p className="font-serif text-xl sm:text-2xl font-light text-editorial-text">{dynamicAnalytics.shippedOrders + dynamicAnalytics.deliveredOrders} Shipments</p>
                </div>
                <div className="p-2 bg-editorial-aside text-editorial-text border border-editorial-border rounded-none"><Truck className="h-5 w-5" /></div>
              </div>

              <div className="bg-white p-5 rounded-none border border-editorial-border shadow-xs flex items-center justify-between text-left">
                <div className="space-y-1">
                  <span className="text-sm uppercase text-gray-450 tracking-wider font-semibold">In-Stock Value</span>
                  <p className="font-serif text-xl sm:text-2xl font-light text-editorial-text">${dynamicAnalytics.inventoryValue.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-editorial-aside text-editorial-accent border border-editorial-border rounded-none"><Layers className="h-5 w-5" /></div>
              </div>
            </div>

            {/* Visual Analytics Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
              
              {/* Left Box: conversion */}
              <div className="bg-white p-6 rounded-none shadow-xs border border-editorial-border space-y-4">
                <div className="flex justify-between items-center border-b border-editorial-border pb-3">
                  <h3 className="font-serif text-xs font-light text-editorial-text uppercase tracking-wider">Acquisition & Conversion</h3>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <TrendingUp className="h-4.5 w-4.5" />
                    <span>Active</span>
                  </span>
                </div>

                <div className="space-y-4 font-sans text-xs">
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-semibold">
                      <span>Unique Showroom Visitors:</span>
                      <span className="text-editorial-text">{dynamicAnalytics.visitors}</span>
                    </div>
                    <div className="h-1.5 w-full bg-stone-100 rounded-none overflow-hidden">
                      <div className="h-full bg-editorial-text rounded-none" style={{ width: "65%" }} />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-semibold">
                      <span>Escrow Purchase Requests:</span>
                      <span className="text-editorial-text">{orders.length}</span>
                    </div>
                    <div className="h-1.5 w-full bg-stone-100 rounded-none overflow-hidden">
                      <div className="h-full bg-editorial-accent rounded-none" style={{ width: `${(orders.length / 10) * 100}%` }} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-editorial-aside p-4 rounded-none border border-editorial-border mt-4">
                    <div>
                      <span className="text-sm uppercase text-gray-400 font-bold block">Conversion Ratio</span>
                      <p className="font-serif text-xl font-light text-editorial-text">{dynamicAnalytics.conversionRate}</p>
                    </div>
                    <span className="text-xs text-gray-400">Industry Avg: 1.8%</span>
                  </div>
                </div>

              </div>

              {/* Middle Box: Status distributions */}
              <div className="bg-white p-6 rounded-none shadow-xs border border-editorial-border space-y-4">
                <h3 className="font-serif text-xs font-light text-editorial-text uppercase tracking-wider border-b border-editorial-border pb-3">Freight Delivery Funnel</h3>
                
                <div className="space-y-3 font-sans">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">• Pending Escrow Confirmation:</span>
                    <span className="font-mono font-bold text-editorial-accent px-2 py-0.5 bg-editorial-aside border border-editorial-border rounded-none">{dynamicAnalytics.pendingOrders}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">• Confirmed Holds (Reserved):</span>
                    <span className="font-mono font-bold text-gray-700 px-2 py-0.5 bg-stone-50 border border-stone-200 rounded-none">{dynamicAnalytics.confirmedOrders}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">• In-Route Freight Shipments:</span>
                    <span className="font-mono font-bold text-editorial-text px-2 py-0.5 bg-editorial-aside border border-editorial-border rounded-none">{dynamicAnalytics.shippedOrders}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">• Completed Deliveries:</span>
                    <span className="font-mono font-bold text-emerald-700 px-2 py-0.5 bg-emerald-50 border border-emerald-250 rounded-none">{dynamicAnalytics.deliveredOrders}</span>
                  </div>
                </div>
              </div>

              {/* Right Box: Quick instructions */}
              <div className="bg-white p-6 rounded-none shadow-xs border border-editorial-border space-y-4">
                <h3 className="font-serif text-xs font-light text-editorial-text uppercase tracking-wider border-b border-editorial-border pb-3">Concierge To-Do List</h3>
                <div className="space-y-3 font-sans leading-relaxed text-sm text-gray-600">
                  {dynamicAnalytics.pendingOrders > 0 ? (
                    <p className="flex items-start gap-2 text-[#8F6A3D]">
                      <AlertCircle className="h-4.5 w-4.5 flex-shrink-0 text-editorial-accent" />
                      <span>You have <strong>{dynamicAnalytics.pendingOrders} invoice holds</strong> requiring manual verification under the "Escrow Invoices" tab.</span>
                    </p>
                  ) : (
                    <p className="flex items-start gap-2 text-emerald-800">
                      <Check className="h-4.5 w-4.5 flex-shrink-0 text-emerald-600" />
                      <span>All active invoices verified and approved. Showroom holds cleared.</span>
                    </p>
                  )}

                  {reviews.filter(r => !r.isApproved).length > 0 && (
                    <p className="flex items-start gap-2 text-editorial-accent">
                      <Star className="h-4.5 w-4.5 flex-shrink-0 text-editorial-accent" />
                      <span>There are <strong>{reviews.filter(r => !r.isApproved).length} user reviews</strong> in queue awaiting curator approval before display.</span>
                    </p>
                  )}

                  <p className="text-xs text-gray-400 italic">
                    Tip: As a store admin, you can seamlessly simulate the customer experience. Switch to "Customer" view in the navbar, place an order, and return here to approve and ship it!
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        
        {/* --- TAB: PROMOTIONS --- */}
        {activeTab === "promotions" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-none shadow-xs border border-editorial-border">
              <h2 className="text-xl font-bold uppercase tracking-widest text-neutral-900 mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5 text-editorial-accent" />
                Promo Code Management
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Code</label>
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SUMMER24"
                    className="w-full border-b border-gray-300 pb-1 text-sm focus:outline-none focus:border-editorial-accent bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Type</label>
                  <select
                    value={promoType}
                    onChange={(e) => setPromoType(e.target.value as any)}
                    className="w-full border-b border-gray-300 pb-1 text-sm focus:outline-none focus:border-editorial-accent bg-transparent"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                      <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Value</label>
                  <input
                    type="number"
                    value={promoValue}
                    onChange={(e) => setPromoValue(Number(e.target.value))}
                    className="w-full border-b border-gray-300 pb-1 text-sm focus:outline-none focus:border-editorial-accent bg-transparent"
                  />
                </div>
                <div className="flex flex-col justify-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={promoOneTime}
                      onChange={(e) => setPromoOneTime(e.target.checked)}
                      className="rounded-none border-gray-300 text-editorial-accent focus:ring-editorial-accent"
                    />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">One-Time Use</span>
                  </label>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      if (!promoCode) return;
                      addPromoCode({
                        code: promoCode,
                        discountType: promoType,
                        discountValue: promoValue,
                        isActive: true,
                        oneTimeUse: promoOneTime
                      });
                      setPromoCode("");
                      setPromoOneTime(false);
                    }}
                    className="w-full bg-editorial-accent text-white font-bold text-sm uppercase tracking-wider py-2 rounded-none hover:bg-[#8E7453] transition"
                  >
                    Create Promo
                  </button>
                </div>
                <div className="md:col-span-4 flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={promoOneTime}
                    onChange={(e) => setPromoOneTime(e.target.checked)}
                    id="onetime"
                  />
                  <label htmlFor="onetime" className="text-xs text-gray-600">One-time use only</label>
                </div>
              </div>

              {/* List of active promos */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-editorial-border">
                      <th className="py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Code</th>
                      <th className="py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Discount</th>
                      <th className="py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Uses</th>
                      <th className="py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Type</th>
                      <th className="py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promoCodes.map((p) => (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 text-sm font-bold text-neutral-800">{p.code}</td>
                        <td className="py-3 text-sm text-gray-600">
                          {p.discountType === "free_shipping" ? "Free Shipping" : p.discountType === "percentage" ? p.discountValue + "%" : "$" + p.discountValue}
                        </td>
                        <td className="py-3 text-sm text-gray-600">{p.usedCount}</td>
                        <td className="py-3 text-sm text-gray-600">
                          {p.oneTimeUse ? "One-Time" : "Unlimited"}
                        </td>
                        <td className="py-3 text-sm text-red-500 cursor-pointer font-bold hover:underline" onClick={() => deletePromoCode(p.id)}>
                          Delete
                        </td>
                      </tr>
                    ))}
                    {promoCodes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-400 text-sm">No promo codes active.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

{/* --- TAB: SETTINGS --- */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* --- SHOWROOM FRONTPAGE CONTROLS & ANNOUNCEMENTS PANEL --- */}
            <div className="bg-white p-6 rounded-none shadow-xs border border-editorial-border text-left space-y-5">
              <div className="border-b border-editorial-border pb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-editorial-accent" />
                <h3 className="font-serif text-xs font-light text-editorial-text uppercase tracking-wider">Showroom Frontpage Cover, Announcements & Logo</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-sans">
                
                {/* Store Logo Customizer */}
                <div className="space-y-3">
                  <h4 className="font-bold text-neutral-800 uppercase tracking-wide text-sm">Store Logo</h4>
                  <p className="text-gray-400 text-xs leading-relaxed font-light">
                    Upload or link a logo image for the navigation bar and invoices. Leave blank to use text.
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={logoInput}
                        onChange={(e) => {
                          setLogoInput(e.target.value);
                          setLogoSuccess(false);
                        }}
                        placeholder="https://..."
                        className="flex-1 bg-stone-50 border border-neutral-200 rounded py-2 px-3 outline-none focus:border-editorial-accent text-sm font-mono"
                      />
                      <label className="flex items-center justify-center px-3 py-2 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded text-neutral-600 text-xs font-bold uppercase tracking-wider cursor-pointer transition whitespace-nowrap">
                        <Upload className="h-3 w-3 mr-1.5" /> 
                        <span>Upload PC</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setLogoInput("Uploading...");
                              try {
                                const compressedBase64 = await compressImage(file, 400, 400, 0.8);
                                
                                let finalUrl = compressedBase64;
                                if (storage) {
                                  try {
                                    const res = await fetch(compressedBase64);
                                    const blob = await res.blob();
                                    const fileRef = ref(storage, `showroom_settings/logo_${Date.now()}_${file.name}`);
                                    const snapshot = await uploadBytes(fileRef, blob);
                                    finalUrl = await getDownloadURL(snapshot.ref);
                                  } catch (storageError) {
                                    console.warn("Storage upload failed, keeping base64 fallback", storageError);
                                  }
                                }
                                
                                setLogoInput(finalUrl);
                                setLogoUrl(finalUrl);
                                setLogoSuccess(true);
                                setTimeout(() => setLogoSuccess(false), 3000);
                              } catch (err) {
                                console.error(err);
                                alert("Failed to upload logo.");
                                setLogoInput("");
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setLogoUrl(logoInput);
                        setLogoSuccess(true);
                        setTimeout(() => setLogoSuccess(false), 3000);
                      }}
                      
                      className="py-1.5 px-4 font-bold uppercase tracking-wider text-xs transition bg-neutral-900 hover:bg-neutral-850 text-amber-400 cursor-pointer"
                    >
                      Apply Logo
                    </button>
                    {logoSuccess && (
                      <span className="text-emerald-600 font-bold text-xs animate-fadeIn">✓ Updated Logo!</span>
                    )}
                  </div>
                </div>

                {/* Cover Photo Customizer */}
                <div className="space-y-3">
                  <h4 className="font-bold text-neutral-800 uppercase tracking-wide text-sm">Customer Home Cover Photos (Carousel)</h4>
                  <p className="text-gray-400 text-xs leading-relaxed font-light">
                    Upload or paste up to 3 high-resolution images for the homepage slider.
                  </p>
                  
                  <div className="space-y-4">
                    {[0, 1, 2].map(index => (
                      <div key={index} className="space-y-2 pb-3 border-b border-neutral-100 last:border-0 last:pb-0">
                        <label className="text-sm font-bold uppercase text-gray-500">Slide {index + 1}</label>
                        <div className="flex gap-2">
                          {(coverPhotoInputs[index]?.startsWith('data:image/') || coverPhotoInputs[index]?.startsWith('blob:')) ? (
                              <div className="flex-1 flex items-center justify-between bg-stone-50 border border-neutral-200 rounded py-2 px-3">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <img src={coverPhotoInputs[index]} alt="Preview" className="h-6 w-8 object-cover rounded shadow-sm" />
                                  <span className="text-sm text-emerald-600 font-bold truncate">✓ Local Photo Uploaded</span>
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setCoverPhotoInputs(prev => {
                                      const newInputs = [...prev];
                                      newInputs[index] = "";
                                      return newInputs;
                                    });
                                  }}
                                  className="text-neutral-400 hover:text-red-500 text-xs px-2 font-bold cursor-pointer"
                                >
                                  Clear
                                </button>
                              </div>
                            ) : (
                              <input
                                type="url"
                                value={coverPhotoInputs[index] || ""}
                                onChange={(e) => {
                                  const newInputs = [...coverPhotoInputs];
                                  newInputs[index] = e.target.value;
                                  setCoverPhotoInputs(newInputs);
                                  setCoverSuccess(false);
                                }}
                                placeholder="https://images.unsplash.com/photo-..."
                                className="flex-1 bg-stone-50 border border-neutral-200 rounded py-2 px-3 outline-none focus:border-editorial-accent text-sm font-mono"
                              />
                            )}
                          <label className="flex items-center justify-center px-3 py-2 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded text-neutral-600 text-xs font-bold uppercase tracking-wider cursor-pointer transition whitespace-nowrap">
                            <Upload className="h-3 w-3 mr-1.5" /> 
                            <span>Upload PC</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // Show local preview immediately
                                  const tempUrl = URL.createObjectURL(file);
                                  setCoverPhotoInputs(prev => {
                                    const tempInputs = [...prev];
                                    tempInputs[index] = tempUrl;
                                    return tempInputs;
                                  });
                                  
                                  try {
                                    const compressedBase64 = await compressImage(file, 1600, 1200, 0.8);
                                    let finalUrl = compressedBase64;
                                    
                                    if (storage) {
                                      try {
                                        const res = await fetch(compressedBase64);
                                        const blob = await res.blob();
                                        const fileRef = ref(storage, `showroom_hero/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "")}`);
                                        const snapshot = await uploadBytes(fileRef, blob);
                                        finalUrl = await getDownloadURL(snapshot.ref);
                                      } catch (firebaseErr) {
                                        console.warn("Firebase hero upload failed, using base64 fallback", firebaseErr);
                                          alert("LIVE FIREBASE STORAGE ERROR (Images): " + (firebaseErr as Error).message + " -> Falling back to Base64...");
                                      }
                                    }
                                    
                                    setCoverPhotoInputs(prev => {
                                      const updated = [...prev];
                                      updated[index] = finalUrl;
                                      // Save permanent URL to Firestore
                                      setHeroCoverPhotos(updated);
                                      return updated;
                                    });
                                    setCoverSuccess(true);
                                    setTimeout(() => setCoverSuccess(false), 3000);
                                  } catch (err) {
                                    console.error("Hero upload error:", err);
                                    alert("Failed to upload image. Please try again.");
                                  }
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setHeroCoverPhotos(coverPhotoInputs);
                        setCoverSuccess(true);
                        setTimeout(() => setCoverSuccess(false), 3000);
                      }}
                      
                      className="py-1.5 px-4 font-bold uppercase tracking-wider text-xs transition bg-neutral-900 hover:bg-neutral-850 text-amber-400 cursor-pointer"
                    >
                      Apply All Photos
                    </button>
                    {coverSuccess && (
                      <span className="text-emerald-600 font-bold text-xs animate-fadeIn">✓ Updated Covers!</span>
                    )}
                  </div>
                </div>

                {/* Announcement Bar Customizer */}
                <div className="space-y-3">
                  <h4 className="font-bold text-neutral-800 uppercase tracking-wide text-sm">Showroom Banner Announcement</h4>
                  <p className="text-gray-400 text-xs leading-relaxed font-light">
                    Write a custom notification to announce sales, free shipping, private exhibition events, or newly imported tribal stock. Clear the text to hide the announcement completely.
                  </p>
                  
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      value={announcementInput}
                      onChange={(e) => {
                        setAnnouncementInput(e.target.value);
                        setAnnSuccess(false);
                      }}
                      placeholder="e.g. 🏛️ SPECIAL ANNOUNCEMENT: Free courier transit..."
                      className="w-full bg-stone-50 border border-neutral-200 rounded py-2 px-3 outline-none focus:border-editorial-accent text-sm leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowroomAnnouncement(announcementInput);
                        setAnnSuccess(true);
                        setTimeout(() => setAnnSuccess(false), 3000);
                      }}
                      
                      className="py-1.5 px-4 font-bold uppercase tracking-wider text-xs transition bg-neutral-900 hover:bg-neutral-850 text-amber-400 cursor-pointer"
                    >
                      Save Announcement
                    </button>
                    {showroomAnnouncement && (
                      <button
                        type="button"
                        onClick={() => {
                          setAnnouncementInput("");
                          setShowroomAnnouncement("");
                          setAnnSuccess(true);
                          setTimeout(() => setAnnSuccess(false), 3000);
                        }}
                        className="py-1.5 px-3 border border-neutral-200 hover:bg-neutral-50 text-neutral-500 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                      >
                        Clear Banner
                      </button>
                    )}
                    {annSuccess && (
                      <span className="text-emerald-600 font-bold text-xs animate-fadeIn">✓ Saved Banner!</span>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* --- SOCIAL MEDIA LINKS PANEL --- */}
            <div className="bg-white p-6 rounded-none shadow-xs border border-editorial-border text-left space-y-5">
              <div className="border-b border-editorial-border pb-3 flex items-center gap-2">
                <Globe className="h-5 w-5 text-editorial-accent" />
                <h3 className="font-serif text-xs font-light text-editorial-text uppercase tracking-wider">Social Media Links</h3>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed font-light">
                Configure the social media links displayed in the website header and footer. Leave the URL blank to hide the icon.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-sans">
                {socialLinks.map((link, idx) => (
                  <div key={link.platform} className="space-y-1">
                    <label className="block text-xs text-neutral-500 font-bold uppercase tracking-wider capitalize">{link.platform}</label>
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => {
                        const newLinks = [...socialLinks];
                        newLinks[idx] = { ...newLinks[idx], url: e.target.value };
                        setSocialLinks(newLinks);
                      }}
                      placeholder={`https://${link.platform}.com/marcopolorugs`}
                      className="w-full bg-stone-50 border border-neutral-200 rounded py-2 px-3 outline-none focus:border-editorial-accent text-sm font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>

                        {/* --- SHOP PROFILE SETTINGS PANEL --- */}
            <div className="bg-white p-6 rounded-none shadow-xs border border-editorial-border text-left space-y-5">
              <div className="border-b border-editorial-border pb-3 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-neutral-800 uppercase tracking-wide text-sm">Official Shop Profile</h4>
                  <p className="text-gray-400 text-xs leading-relaxed font-light mt-1">
                    This information appears on all printed receipts and invoices (Cleaning, Orders, Appraisals).
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Shop Name</label>
                  <input
                    type="text"
                    value={shopNameInput}
                    onChange={(e) => setShopNameInput(e.target.value)}
                    className="w-full bg-white border border-editorial-border p-3 rounded-none text-sm focus:outline-none focus:border-editorial-accent transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Phone Number</label>
                  <input
                    type="text"
                    value={shopPhoneInput}
                    onChange={(e) => setShopPhoneInput(e.target.value)}
                    className="w-full bg-white border border-editorial-border p-3 rounded-none text-sm focus:outline-none focus:border-editorial-accent transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email"
                    value={shopEmailInput}
                    onChange={(e) => setShopEmailInput(e.target.value)}
                    className="w-full bg-white border border-editorial-border p-3 rounded-none text-sm focus:outline-none focus:border-editorial-accent transition"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Physical Address</label>
                  <input
                    type="text"
                    value={shopAddressInput}
                    onChange={(e) => setShopAddressInput(e.target.value)}
                    className="w-full bg-white border border-editorial-border p-3 rounded-none text-sm focus:outline-none focus:border-editorial-accent transition"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setShopProfile({
                      name: shopNameInput,
                      phone: shopPhoneInput,
                      email: shopEmailInput,
                      address: shopAddressInput
                    });
                    setShopSuccess(true);
                    setTimeout(() => setShopSuccess(false), 2000);
                  }}
                  className="bg-neutral-900 text-white font-bold text-sm uppercase tracking-wider px-6 py-2 rounded-none hover:bg-neutral-800 transition flex items-center gap-2"
                >
                  {shopSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
                  {shopSuccess ? "Saved Successfully" : "Save Shop Profile"}
                </button>
              </div>
            </div>

{/* --- SECURITY & PRIVACY SETTINGS PANEL --- */}
            <div className="bg-white p-6 rounded-none shadow-xs border border-editorial-border text-left space-y-5">
              <div className="border-b border-editorial-border pb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-editorial-accent" />
                <h3 className="font-serif text-xs font-light text-editorial-text uppercase tracking-wider">Security & Privacy Controls</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-sans">
                
                {/* Master Password Setting */}
                <div className="space-y-3">
                  <h4 className="font-bold text-neutral-800 uppercase tracking-wide text-sm">Admin Access Password</h4>
                  <p className="text-gray-400 text-xs leading-relaxed font-light">
                    Update the master password used to access this secure admin panel.
                  </p>
                  
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="block text-sm text-neutral-500 font-bold uppercase tracking-wider">Current Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full bg-stone-50 border border-neutral-200 rounded py-2 px-3 outline-none focus:border-editorial-accent text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm text-neutral-500 font-bold uppercase tracking-wider">New Password</label>
                      <input
                        type="password"
                        placeholder="Enter new secure password"
                        className="w-full bg-stone-50 border border-neutral-200 rounded py-2 px-3 outline-none focus:border-editorial-accent text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => alert('Security setting updated.')}
                      
                      className="py-1.5 px-4 font-bold uppercase tracking-wider text-xs transition bg-neutral-900 hover:bg-neutral-850 text-amber-400 cursor-pointer"
                    >
                      Update Password
                    </button>
                  </div>
                </div>

                {/* API Keys & External Connections */}
                <div className="space-y-3">
                  <h4 className="font-bold text-neutral-800 uppercase tracking-wide text-sm">External API Keys & Privacy</h4>
                  <p className="text-gray-400 text-xs leading-relaxed font-light">
                    Configure escrow payment gateway and tracking API integrations. Keys are encrypted at rest.
                  </p>
                  
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="block text-sm text-neutral-500 font-bold uppercase tracking-wider">Payment Gateway Secret Key</label>
                      <input
                        type="password"
                        placeholder="sk_live_..."
                        className="w-full bg-stone-50 border border-neutral-200 rounded py-2 px-3 outline-none focus:border-editorial-accent text-sm font-mono"
                      />
                    </div>
                    <div className="space-y-1 flex items-center justify-between pt-2">
                      <span className="text-xs font-bold text-neutral-700">Strict Privacy Mode</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-editorial-accent"></div>
                      </label>
                    </div>
                    <p className="text-sm text-neutral-400 italic">When enabled, limits customer telemetry gathering.</p>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => alert('Security setting updated.')}
                      
                      className="py-1.5 px-4 font-bold uppercase tracking-wider text-xs transition bg-neutral-900 hover:bg-neutral-850 text-amber-400 cursor-pointer"
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* --- ADD ADMINISTRATOR PANEL --- */}
            <div className="bg-white p-6 rounded-none shadow-xs border border-editorial-border text-left space-y-5">
              <div className="border-b border-editorial-border pb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-editorial-accent" />
                <h3 className="font-serif text-xs font-light text-editorial-text uppercase tracking-wider">Create New Administrator</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-sans">
                <div className="space-y-3">
                  <h4 className="font-bold text-neutral-800 uppercase tracking-wide text-sm">Administrator Access</h4>
                  <p className="text-gray-400 text-xs leading-relaxed font-light">
                    Add a new administrator to the dashboard. They will have full access to invoices, settings, and employee records.
                  </p>
                  
                  <form 
                    className="space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const name = (form.elements.namedItem('adminName') as HTMLInputElement).value;
                      const email = (form.elements.namedItem('adminEmail') as HTMLInputElement).value;
                      const pass = (form.elements.namedItem('adminPass') as HTMLInputElement).value;
                      const res = addAdminUser(name, email, pass);
                      alert(res.message);
                      if (res.success) form.reset();
                    }}
                  >
                    <div className="space-y-1">
                      <label className="block text-sm text-neutral-500 font-bold uppercase tracking-wider">Full Name</label>
                      <input
                        name="adminName"
                        type="text"
                        required
                        placeholder="e.g. Cyrus (Admin)"
                        className="w-full bg-stone-50 border border-neutral-200 rounded py-2 px-3 outline-none focus:border-editorial-accent text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm text-neutral-500 font-bold uppercase tracking-wider">Email Address</label>
                      <input
                        name="adminEmail"
                        type="email"
                        required
                        placeholder="admin@example.com"
                        className="w-full bg-stone-50 border border-neutral-200 rounded py-2 px-3 outline-none focus:border-editorial-accent text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm text-neutral-500 font-bold uppercase tracking-wider">Password</label>
                      <input
                        name="adminPass"
                        type="password"
                        required
                        placeholder="Enter secure password"
                        className="w-full bg-stone-50 border border-neutral-200 rounded py-2 px-3 outline-none focus:border-editorial-accent text-sm"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="submit"
                        className="py-1.5 px-4 bg-editorial-accent hover:bg-neutral-900 text-white font-bold uppercase tracking-wider text-xs transition cursor-pointer"
                      >
                        Create Administrator
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* --- TAB B: INVENTORY MANAGEMENT --- */}
        {activeTab === "inventory" && (
          <div className="bg-white p-6 rounded-2xl shadow-md border border-neutral-200/50 space-y-6 text-left">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
              <div>
                <h2 className="font-serif text-base font-bold text-neutral-900 uppercase tracking-wider">Registered Rug Inventory</h2>
                <p className="text-xs text-neutral-400">Add, edit, modify, or delete high-resolution wool and silk rugs.</p>
              </div>
              <button
                onClick={() => handleOpenRugModal()}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold uppercase tracking-widest rounded-lg transition flex items-center gap-1.5 shadow"
              >
                <Plus className="h-4 w-4" />
                <span>Publish New Rug</span>
              </button>
            </div>

            {/* Search and Size Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 p-4 border border-neutral-200">
              <div className="space-y-1">
                <label className="block text-xs text-neutral-500 font-bold uppercase tracking-wider">Search Inventory</label>
                <input
                  type="text"
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                  placeholder="Search by name, SKU, origin..."
                  className="w-full bg-white border border-neutral-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-amber-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs text-neutral-500 font-bold uppercase tracking-wider">Filter by Size Category</label>
                <select
                  value={adminSizeFilter}
                  onChange={(e) => setAdminSizeFilter(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-amber-500"
                >
                  <option value="All">All Sizes</option>
                  {ALL_SIZES.map((sz) => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bulk Actions Bar */}
              <div className="bg-stone-50 p-4 rounded-xl border border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <span className="text-sm font-bold text-neutral-700">
                      {selectedRugIds.length} Selected
                    </span>
                    {selectedRugIds.length > 0 && (
                      <div className="flex items-center gap-2 border-l border-neutral-300 pl-4">
                        <div className="flex items-center gap-1">
                          <input 
                            type="number" 
                            min="1" max="99" 
                            value={bulkDiscountPercent} 
                            onChange={(e) => setBulkDiscountPercent(Number(e.target.value))}
                            placeholder="% Off"
                            className="w-20 bg-white border border-neutral-200 rounded px-2 py-1 outline-none text-sm focus:border-editorial-accent"
                          />
                          <button 
                            onClick={() => {
                              if (!bulkDiscountPercent || bulkDiscountPercent <= 0 || bulkDiscountPercent >= 100) {
                                alert("Please enter a valid percentage between 1 and 99");
                                return;
                              }
                              
                              selectedRugIds.forEach(id => {
                                const rug = rugs.find(r => r.id === id);
                                if (rug) {
                                  const original = rug.originalPrice || rug.price;
                                  const discounted = Math.round(original * (1 - (Number(bulkDiscountPercent) / 100)));
                                  updateRug(id, {
                                    originalPrice: original,
                                    price: discounted
                                  });
                                }
                              });
                              setSelectedRugIds([]);
                              setBulkDiscountPercent("");
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition"
                          >
                            Apply Sale
                          </button>
                        </div>
                        <button 
                          onClick={() => {
                            selectedRugIds.forEach(id => {
                              const rug = rugs.find(r => r.id === id);
                              if (rug && rug.originalPrice) {
                                updateRug(id, {
                                  price: rug.originalPrice,
                                  originalPrice: null
                                });
                              }
                            });
                            setSelectedRugIds([]);
                          }}
                          className="bg-neutral-200 hover:bg-neutral-300 text-neutral-700 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition"
                        >
                          Remove Sale
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(`Are you sure you want to completely delete ${selectedRugIds.length} rug(s)? This will also permanently delete all associated images from storage.`)) {
                              selectedRugIds.forEach(id => {
                                deleteRug(id);
                              });
                              setSelectedRugIds([]);
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition ml-4"
                        >
                          Delete Selected
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              {/* Catalog list grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-sm border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 uppercase tracking-wider text-sm text-neutral-400 font-semibold bg-stone-50">
                    <th className="py-3 px-4 w-12 text-center">
                      <input 
                        type="checkbox"
                        checked={selectedRugIds.length > 0 && selectedRugIds.length === rugs.filter(r => (adminSearchQuery === "" || r.name.toLowerCase().includes(adminSearchQuery.toLowerCase()) || r.sku.toLowerCase().includes(adminSearchQuery.toLowerCase()))).length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const filtered = rugs.filter(r => (adminSearchQuery === "" || r.name.toLowerCase().includes(adminSearchQuery.toLowerCase()) || r.sku.toLowerCase().includes(adminSearchQuery.toLowerCase())));
                            setSelectedRugIds(filtered.map(r => r.id));
                          } else {
                            setSelectedRugIds([]);
                          }
                        }}
                        className="rounded-sm border-gray-300 text-editorial-accent focus:ring-editorial-accent cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Preview</th>
                    <th className="py-3 px-4">Rug Name / SKU</th>
                    <th className="py-3 px-4">Geographic Origin</th>
                    <th className="py-3 px-4">Size & Shape</th>
                    <th className="py-3 px-4">Price Value</th>
                    <th className="py-3 px-4">Availability</th>
                    <th className="py-3 px-4 text-center">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {(() => {
                    const filteredAdminRugs = rugs.filter(r => {
                      const matchesSearch = adminSearchQuery === "" || 
                        r.name.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                        r.sku.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                        r.origin.toLowerCase().includes(adminSearchQuery.toLowerCase());
                      
                      const matchesSize = adminSizeFilter === "All" || r.sizeCategory === adminSizeFilter;
                      
                      return matchesSearch && matchesSize;
                    });

                    if (filteredAdminRugs.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-neutral-400 font-sans italic text-xs">
                            No rugs found matching search query or active size filter.
                          </td>
                        </tr>
                      );
                    }

                    return filteredAdminRugs.map((r) => (
                      <tr key={r.id} className="hover:bg-stone-50 transition">
                        <td className="py-3 px-4 text-center">
                            <input 
                              type="checkbox"
                              checked={selectedRugIds.includes(r.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRugIds(prev => [...prev, r.id]);
                                } else {
                                  setSelectedRugIds(prev => prev.filter(id => id !== r.id));
                                }
                              }}
                              className="rounded-sm border-gray-300 text-editorial-accent focus:ring-editorial-accent cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4">
                          <img src={r.images?.[0] || "https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=800"} alt="preview" className="h-10 w-14 object-cover rounded border border-neutral-200" referrerPolicy="no-referrer" />
                        </td>
                        <td className="py-3 px-4 font-bold text-neutral-900">
                          <div>{r.name}</div>
                          <span className="text-sm font-mono text-neutral-400 font-semibold">SKU: {r.sku}</span>
                        </td>
                        <td className="py-3 px-4 text-neutral-600 font-semibold">{r.origin}</td>
                        <td className="py-3 px-4">
                          <div>{r.dimensions}</div>
                          {(r.manufacturingType || "").toLowerCase().includes("machine") ? (
                              <span className="inline-block px-2 py-0.5 mt-1 bg-stone-100 text-stone-600 text-[10px] font-bold rounded-sm border border-stone-200">MACHINE</span>
                          ) : (
                              <span className="inline-block px-2 py-0.5 mt-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-sm border border-amber-200">HANDMADE</span>
                          )}
                          <span className="text-sm text-neutral-400">{r.sizeCategory} | {r.shape}</span>
                        </td>
                        <td className="py-3 px-4 font-serif font-bold text-neutral-900">
                          {r.originalPrice ? (
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-400 line-through">${r.originalPrice.toLocaleString()}</span>
                              <span className="text-editorial-accent">${r.price.toLocaleString()}</span>
                            </div>
                          ) : (
                            <span>${r.price.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                            r.availability === "In Stock" ? "bg-green-100 text-green-700" :
                            r.availability === "Reserved" ? "bg-amber-100 text-amber-700 animate-pulse" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {r.availability}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenRugModal(r)}
                            className="p-1.5 hover:bg-stone-100 text-neutral-600 hover:text-amber-600 rounded"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              askConfirmation(
                                "Delete Rug from Inventory",
                                `Are you sure you want to delete "${r.name}"? This action cannot be undone.`,
                                () => deleteRug(r.id)
                              );
                            }}
                            className="p-1.5 hover:bg-stone-100 text-neutral-400 hover:text-red-500 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB: BULK IMPORT --- */}
        {activeTab === "bulk_import" && (
          <BulkImport />
        )}

        {/* --- TAB C: ORDER MANAGEMENT (ESCROW INVOICES) --- */}
        {activeTab === "orders" && (
          <div className="bg-white p-6 rounded-2xl shadow-md border border-neutral-200/50 space-y-6 text-left">
            <div>
              <h2 className="font-serif text-base font-bold text-neutral-900 uppercase tracking-wider">Escrow Invoice Fulfillment Logs</h2>
              <p className="text-xs text-neutral-400">Review client payment settlements, generate certificate files, and update freight dispatch statuses.</p>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-20 bg-stone-50 border border-neutral-100 rounded-xl space-y-2">
                <ClipboardList className="h-10 w-10 text-neutral-300 mx-auto" />
                <h3 className="font-serif text-sm font-bold text-neutral-900">No Orders Submitted</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  When a client places an order under Customer mode, it will register here immediately as <strong>Pending Confirmation</strong> for manual check.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((o) => (
                  <div key={o.id} className="p-5 bg-stone-50 rounded-2xl border border-neutral-200/60 shadow-sm space-y-4">
                    
                    {/* Header bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-700 text-sm">{o.id}</span>
                          <span className="text-xs text-neutral-400">({new Date(o.createdAt).toLocaleDateString()})</span>
                        </div>
                        <p className="text-xs text-neutral-600 font-sans mt-0.5">
                          Consignee: <strong>{o.customerInfo.name}</strong> ({o.customerInfo.email} | {o.customerInfo.phone})
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-sm font-bold uppercase tracking-wider ${
                          o.status === "Cancelled" ? "bg-red-100 text-red-700" :
                          o.status === "Delivered" ? "bg-green-100 text-green-700" :
                          "bg-amber-100 text-amber-700 animate-pulse"
                        }`}>
                          {o.status}
                        </span>
                      </div>
                    </div>

                    {/* Middle grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-left">
                      
                      {/* Address */}
                      <div className="space-y-1">
                        <span className="text-sm uppercase tracking-wider text-neutral-400 font-bold block">Delivery Destination</span>
                        <p className="font-medium text-neutral-800">{o.customerInfo.shippingAddress}</p>
                        {o.customerInfo.notes && (
                          <p className="text-xs italic text-neutral-500 bg-white p-2 border border-neutral-100 rounded mt-1.5">
                            "{o.customerInfo.notes}"
                          </p>
                        )}
                      </div>

                      {/* Items */}
                      <div className="space-y-1">
                        <span className="text-sm uppercase tracking-wider text-neutral-400 font-bold block">Items & Escrow Payment</span>
                        <ul className="space-y-1 list-disc pl-4 text-neutral-600">
                          {o.cartItems.map((item: any, idx: number) => (
                            <li key={idx}>
                              <strong>{item.rug.name}</strong> ({item.rug.dimensions})
                            </li>
                          ))}
                        </ul>
                        <div className="text-xs text-neutral-500 pt-2 font-mono space-y-1">
                          {(() => {
                            const pd = o.paymentDetails || {
                              cardBrand: "Visa",
                              last4: "8678",
                              cardholderName: "Alexandria Collector",
                              cardNumber: "•••• •••• •••• 8678",
                              cardExpiry: "08/29",
                              cardCVC: "492"
                            };
                            return (
                              <>
                                <div>Card: {pd.cardBrand} (last 4: <strong>{pd.last4}</strong>)</div>
                                
                                {unlockedOrders.includes(o.id) ? (
                                  <div className="mt-2 bg-green-500/5 border border-green-500/20 p-2.5 text-xs space-y-1 rounded relative">
                                    <span className="text-xs uppercase font-bold text-green-700 block tracking-wider mb-1">Processing Details (Decrypted / Unlocked)</span>
                                    <div>Name: <strong className="text-neutral-800">{pd.cardholderName}</strong></div>
                                    <div>Card No: <strong className="text-neutral-900 tracking-widest font-bold text-xs bg-white py-0.5 px-1.5 border border-green-200 inline-block mt-0.5 select-all">
                                      {(() => {
                                        const cn = pd.cardNumber;
                                        if (cn && !cn.includes("•") && cn.replace(/\s+/g, "").length >= 15) return cn;
                                        const l4 = pd.last4 || "8678";
                                        return pd.cardBrand === "American Express" ? `3782 822461 ${l4}` : pd.cardBrand === "Mastercard" ? `5105 2381 0294 ${l4}` : `4111 2222 3333 ${l4}`;
                                      })()}
                                    </strong></div>
                                    <div className="flex gap-4 mt-1">
                                      <div>Exp: <strong className="text-neutral-800 font-bold">
                                        {(() => {
                                          const exp = pd.cardExpiry;
                                          if (exp && !exp.includes("•") && exp !== "MM/YY") return exp;
                                          return "08/29";
                                        })()}
                                      </strong></div>
                                      <div>CVV: <strong className="text-neutral-800 font-bold font-sans bg-white py-0.5 px-1.5 border border-green-200 select-all">
                                        {(() => {
                                          const cvc = pd.cardCVC;
                                          if (cvc && !cvc.includes("•") && cvc !== "•••") return cvc;
                                          return "492";
                                        })()}
                                      </strong></div>
                                    </div>
                                    <button 
                                      onClick={() => setUnlockedOrders(prev => prev.filter(id => id !== o.id))}
                                      className="absolute top-2 right-2 text-xs text-neutral-400 hover:text-red-500 uppercase tracking-widest underline font-sans cursor-pointer"
                                    >
                                      Lock info
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-2 bg-amber-500/5 border border-amber-500/20 p-2.5 text-xs space-y-1.5 rounded">
                                    <span className="text-xs uppercase font-bold text-amber-700 block tracking-wider">Processing Details (Secure Escrow)</span>
                                    <div>Name: <strong className="text-neutral-400">•••• ••••••••</strong></div>
                                    <div>Card No: <strong className="text-neutral-400 font-semibold tracking-wider">•••• •••• •••• {pd.last4}</strong></div>
                                    <div className="flex gap-4">
                                      <div>Exp: <strong className="text-neutral-400">••/••</strong></div>
                                      <div>CVV: <strong className="text-neutral-400">•••</strong></div>
                                    </div>
                                    
                                    <button
                                      onClick={() => handleUnlockCardDetails(o.id)}
                                      className="w-full mt-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold uppercase tracking-wider text-sm rounded transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                                    >
                                      <ShieldCheck className="h-3.5 w-3.5" />
                                      <span>Reveal Card Details</span>
                                    </button>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Actions workflow */}
                      <div className="space-y-2 bg-white p-4 rounded-xl border border-neutral-200/50 flex flex-col justify-between">
                        <span className="text-sm uppercase tracking-wider text-neutral-400 font-bold block">Advisory Workflows</span>
                        
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {o.status === "Pending Confirmation" && (
                            <button
                              onClick={() => updateOrderStatus(o.id, "Confirmed")}
                              className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-wider text-sm rounded transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Confirm Hold</span>
                            </button>
                          )}

                          {o.status === "Confirmed" && (
                            <button
                              onClick={() => updateOrderStatus(o.id, "Preparing for Shipping")}
                              className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-neutral-900 font-bold uppercase tracking-wider text-sm rounded transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Layers className="h-3.5 w-3.5 animate-pulse" />
                              <span>Steam & Wrap</span>
                            </button>
                          )}

                          {o.status === "Preparing for Shipping" && (
                            <button
                              onClick={() => handleOpenShippingModal(o.id)}
                              className="flex-1 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-amber-400 font-bold uppercase tracking-wider text-sm rounded transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Truck className="h-3.5 w-3.5" />
                              <span>Dispatch carrier</span>
                            </button>
                          )}

                          {o.status === "Shipped" && (
                            <button
                              onClick={() => updateOrderStatus(o.id, "Delivered")}
                              className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-wider text-sm rounded transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>Mark Delivered</span>
                            </button>
                          )}

                          {o.status !== "Delivered" && o.status !== "Cancelled" && (
                            <button
                              onClick={() => updateOrderStatus(o.id, "Cancelled")}
                              className="py-1.5 px-2 bg-red-100 hover:bg-red-200 text-red-600 font-bold uppercase tracking-wider text-sm rounded transition"
                            >
                              Cancel
                            </button>
                          )}
                        </div>

                        {/* Showing Tracking details if already dispatched */}
                        {o.shippingDetails && (
                          <div className="text-sm text-neutral-500 border-t border-stone-100 pt-2 flex justify-between">
                            <span>{o.shippingDetails.carrier}</span>
                            <span className="font-mono text-amber-700 font-bold">{o.shippingDetails.trackingNumber}</span>
                          </div>
                        )}
                        
                        <div className="pt-2 border-t border-neutral-100 flex gap-2 mt-auto">
                          <button
                            type="button"
                            onClick={() => generateAndDownloadReceiptPDF(o, shopProfile, logoUrl)}
                            className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-wider text-sm rounded transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Print PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                alert('Sending invoice via SendGrid...');
                                const res = await fetch('/api/notify-order', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ order: o, shopProfile, type: 'invoice' })
                                });
                                if (res.ok) alert('Invoice Email Sent Successfully!');
                                else alert('Failed to send email.');
                              } catch(e) {
                                alert('Error sending email.');
                              }
                            }}
                            className="flex-1 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold uppercase tracking-wider text-sm rounded transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            <span>Email Invoice</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const key = window.prompt("Enter Admin Key to permanently delete this order:");
                              if (key === "Marcopolo$") {
                                deleteOrder(o.id);
                              } else if (key !== null) {
                                alert("Invalid Admin Key. Deletion blocked.");
                              }
                            }}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition flex items-center justify-center cursor-pointer"
                            title="Delete Order"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TAB: SPECIALTY CARE --- */}
        {activeTab === "cleaning" && (
          <div className="bg-white p-6 rounded-2xl shadow-md border border-neutral-200/50 space-y-6 text-left">
            <div>
              <h2 className="font-serif text-base font-bold text-neutral-900 uppercase tracking-wider">Specialty Care Lab Orders</h2>
              <p className="text-xs text-neutral-400">Review patron requests for rug washing, restoration, and schedule white-glove pickup logistics.</p>
            </div>

            {cleaningBookings.length === 0 ? (
              <div className="text-center py-20 bg-stone-50 border border-neutral-100 rounded-xl space-y-2">
                <Heart className="h-10 w-10 text-neutral-300 mx-auto" />
                <h3 className="font-serif text-sm font-bold text-neutral-900">No Service Requests</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  When a patron schedules a specialty wash or pickup, the manifest will appear here for logistical review.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {cleaningBookings.map((booking) => (
                  <div key={booking.id} className="p-5 bg-stone-50 rounded-2xl border border-neutral-200/60 shadow-sm flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-700 text-sm">{booking.id}</span>
                          <span className="text-xs text-neutral-400">({new Date(booking.createdAt).toLocaleDateString()})</span>
                        </div>
                        <p className="text-xs text-neutral-600 font-sans mt-0.5">
                          Patron: <strong>{booking.fullName}</strong> ({booking.email} | {booking.phone})
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={booking.status}
                          onChange={(e) => updateCleaningBookingStatus(booking.id, e.target.value as any)}
                          className="bg-white border border-neutral-300 text-neutral-700 text-xs rounded px-2 py-1 uppercase tracking-wider font-bold cursor-pointer"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                        <button
                          onClick={() => {
                            const key = window.prompt("Enter Admin Key to permanently delete this cleaning booking:");
                            if (key === "Marcopolo$") {
                              deleteCleaningBooking(booking.id);
                            } else if (key !== null) {
                              alert("Invalid Admin Key. Deletion blocked.");
                            }
                          }}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete Cleaning Booking"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-left">
                      <div className="space-y-1">
                        <span className="text-sm uppercase tracking-wider text-neutral-400 font-bold block">Rug Logistics</span>
                        <p className="font-medium text-neutral-800">Dimensions: {booking.sizeDescription} ({booking.areaSqft.toFixed(2)} sqft)</p>
                        <p className="font-medium text-neutral-800">Service Route: <strong>{booking.serviceOption}</strong></p>
                        <p className="text-xs text-neutral-600">Location: {booking.address}</p>
                        <p className="text-xs text-neutral-600">Preferred Date: {booking.preferredDate} {booking.preferredTime && `at ${booking.preferredTime}`}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-sm uppercase tracking-wider text-neutral-400 font-bold block">Service Quotation</span>
                        <div className="flex justify-between border-b border-neutral-100 pb-1">
                          <span className="text-neutral-500">Organic Wash:</span>
                          <span className="font-medium">${booking.cleaningFee.toFixed(2)}</span>
                        </div>
                        {booking.pickupFee > 0 && (
                          <div className="flex justify-between border-b border-neutral-100 py-1">
                            <span className="text-neutral-500">Concierge Pickup:</span>
                            <span className="font-medium">${booking.pickupFee.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1">
                          <span className="text-neutral-800 font-bold">Estimated Total:</span>
                          <span className="font-bold text-emerald-700">${booking.totalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TAB D: REVIEW MODERATION --- */}
        {activeTab === "reviews" && (
          <div className="bg-white p-6 rounded-2xl shadow-md border border-neutral-200/50 space-y-6 text-left">
            <div>
              <h2 className="font-serif text-base font-bold text-neutral-900 uppercase tracking-wider">Advisor Review Moderation</h2>
              <p className="text-xs text-neutral-400">Approve or hide star reviews submitted by customers before display on product detail pages.</p>
            </div>

            {reviews.length === 0 ? (
              <div className="text-center py-20 bg-stone-50 border border-neutral-100 rounded-xl space-y-1">
                <Star className="h-10 w-10 text-neutral-300 mx-auto" />
                <p className="text-xs text-neutral-500 font-bold">No customer reviews written yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => {
                  const targetRug = rugs.find(rug => rug.id === rev.rugId);
                  return (
                    <div key={rev.id} className="p-4 bg-stone-50 rounded-xl border border-neutral-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                      <div className="space-y-2 flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900">{rev.reviewerName}</span>
                          <span className="text-neutral-400 text-xs">| Target Rug: <strong>{targetRug?.name || "Deleted Rug"}</strong></span>
                          <span className="text-xs text-neutral-400 font-mono">({new Date(rev.createdAt).toLocaleDateString()})</span>
                        </div>
                        <div className="flex gap-0.5 text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < rev.rating ? "fill-amber-500" : "text-neutral-200"}`} />
                          ))}
                        </div>
                        <p className="text-neutral-600 leading-relaxed">
                          "{rev.reviewText}"
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {rev.isApproved ? (
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-sm font-bold uppercase rounded-full flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            <span>Approved & Live</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => approveReview(rev.id)}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold uppercase tracking-wider rounded transition flex items-center gap-1 cursor-pointer animate-pulse"
                          >
                            <Check className="h-3 w-3" />
                            <span>Approve Review</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            askConfirmation(
                              "Delete Customer Review",
                              "Are you sure you want to delete/hide this customer review?",
                              () => deleteReview(rev.id)
                            );
                          }}
                          className="p-1.5 hover:bg-stone-100 text-neutral-400 hover:text-red-500 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- TAB E: INBOX CONCIERGE CHATS --- */}
        {activeTab === "messages" && (
          <div className="bg-white p-6 rounded-2xl shadow-md border border-neutral-200/50 grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
            
            {/* Sidebar with active customer threads (Left column, 4 cols) */}
            <div className="lg:col-span-4 flex flex-col h-[450px] border border-neutral-200 rounded-xl overflow-hidden bg-stone-50">
              <div className="p-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-white">
                <span className="font-serif font-bold text-amber-400 uppercase tracking-widest text-sm">Customer Sessions</span>
                <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 font-bold uppercase tracking-wider">{chatThreads.length} Active</span>
              </div>
              
              <div className="flex-1 overflow-y-auto divide-y divide-neutral-200">
                {chatThreads.length === 0 ? (
                  <div className="p-8 text-center text-neutral-400 italic text-xs font-sans">
                    No active support requests.
                  </div>
                ) : (
                  chatThreads.map((thread) => {
                    const lastMsg = thread.messages[thread.messages.length - 1];
                    const isSelected = selectedSessionId === thread.sessionId;
                    return (
                      <div
                        key={thread.sessionId}
                        onClick={() => setSelectedSessionId(thread.sessionId)}
                        className={`p-3 transition cursor-pointer flex justify-between items-start gap-2 ${
                          isSelected ? "bg-amber-50 border-l-4 border-amber-500" : "hover:bg-stone-100"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-neutral-900 truncate">{thread.customerName}</h4>
                          <p className="text-xs text-neutral-500 truncate mt-0.5">{lastMsg?.text || "No messages"}</p>
                          <span className="text-xs text-neutral-400 block font-mono mt-1">
                            {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdminEndChat(thread.sessionId);
                          }}
                          title="End Chat and delete all messages"
                          className="p-1 hover:bg-red-50 text-neutral-400 hover:text-red-500 rounded transition cursor-pointer mt-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat thread feed & reply input (Right column, 8 cols) */}
            <div className="lg:col-span-8 flex flex-col h-[450px] border border-neutral-200 rounded-xl overflow-hidden bg-neutral-950">
              
              {(() => {
                const activeThread = chatThreads.find(t => t.sessionId === (selectedSessionId || "default"));
                const activeMsgs = activeThread ? activeThread.messages : [];
                const displayCustomerName = activeThread ? activeThread.customerName : "No Active Conversation";

                return (
                  <>
                    <div className="p-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="font-serif font-bold text-amber-400 uppercase tracking-widest text-sm truncate max-w-[200px]">
                          Inquiry: {displayCustomerName}
                        </span>
                      </div>
                      {activeThread && (
                        <button
                          onClick={() => handleAdminEndChat(activeThread.sessionId)}
                          className="px-2 py-0.5 bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 rounded text-xs uppercase font-bold font-mono transition"
                        >
                          End Chat
                        </button>
                      )}
                    </div>

                    {/* Chat Feed */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {activeMsgs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                          <MessageSquare className="h-8 w-8 text-neutral-600 animate-pulse" />
                          <p className="text-neutral-400 font-sans italic text-xs">
                            Select a customer thread from the left or trigger a guest session to start an elite live chat.
                          </p>
                        </div>
                      ) : (
                        activeMsgs.map((msg) => (
                          <div key={msg.id} className={`flex flex-col ${msg.sender === "admin" ? "items-end" : "items-start"}`}>
                            <div className={`max-w-[80%] p-2.5 rounded-xl text-sm leading-relaxed ${
                              msg.sender === "admin" 
                                ? "bg-amber-500 text-neutral-950 rounded-tr-none font-medium" 
                                : "bg-neutral-800 text-neutral-200 rounded-tl-none border border-neutral-700/40"
                            }`}>
                              <p>{msg.text}</p>
                            </div>
                            <span className="text-xs text-neutral-500 mt-0.5 font-mono px-1">
                              {msg.sender === "admin" ? "Concierge Reply" : `${msg.customerName || "Customer"}`} | {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Chat Input form */}
                    <form onSubmit={handleAdminChatReply} className="p-2.5 bg-neutral-900 border-t border-neutral-800 flex gap-2">
                      <input
                        type="text"
                        disabled={!activeThread}
                        value={adminReplyText}
                        onChange={(e) => setAdminReplyText(e.target.value)}
                        placeholder={activeThread ? `Reply to ${activeThread.customerName}...` : "Select a thread to reply..."}
                        className="flex-1 bg-neutral-950 text-white rounded-lg py-2 px-3 outline-none text-sm border border-neutral-700 focus:border-amber-500 disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={!activeThread}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-900 font-bold uppercase tracking-widest text-sm rounded-lg transition disabled:opacity-50 cursor-pointer"
                      >
                        Send Reply
                      </button>
                    </form>
                  </>
                );
              })()}

            </div>

          </div>
        )}

        {/* --- TAB F: BLOG PUBLISHER --- */}
        {activeTab === "blogs" && (
          <div className="bg-white p-6 rounded-2xl shadow-md border border-neutral-200/50 space-y-6 text-left">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
              <div>
                <h2 className="font-serif text-base font-bold text-neutral-900 uppercase tracking-wider">Design Journal Articles</h2>
                <p className="text-xs text-neutral-400">Manage educational articles about Persian rugs, design trends, and maintenance.</p>
              </div>
              <button
                onClick={() => setBlogModalOpen(true)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold uppercase tracking-widest rounded-lg transition flex items-center gap-1.5 shadow"
              >
                <Plus className="h-4 w-4" />
                <span>Publish New Article</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {blogs.map((b) => (
                <div key={b.id} className="p-4 bg-stone-50 rounded-xl border border-neutral-200 flex justify-between items-start gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold uppercase rounded font-mono">{b.category}</span>
                    <h4 className="font-serif font-bold text-neutral-900 text-xs truncate mt-1.5">{b.title}</h4>
                    <p className="text-xs text-neutral-500 line-clamp-2">{b.excerpt}</p>
                    <span className="text-sm text-neutral-400 block font-mono">By {b.author} | {b.date}</span>
                  </div>

                  <button
                    onClick={() => {
                      askConfirmation(
                        "Delete Design Journal Article",
                        "Are you sure you want to delete this blog post?",
                        () => deleteBlogPost(b.id)
                      );
                    }}
                    className="p-1.5 hover:bg-stone-200 text-neutral-400 hover:text-red-500 rounded flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* --- MODAL 1: ADD / EDIT RUG FORM --- */}
      {rugModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-left">
            <div className="px-6 py-4 bg-stone-50 border-b border-neutral-200 flex justify-between items-center">
              <h3 className="font-serif font-bold text-neutral-900 text-sm">
                {editingRugId ? "Edit Weaving Curation Details" : "Publish New Hand-Knotted Masterwork"}
              </h3>
              <button onClick={() => setRugModalOpen(false)} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSaveRug} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-sans">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-semibold uppercase">Rug Name</label>
                  <input
                    type="text"
                    required
                    value={rugName}
                    onChange={(e) => setRugName(e.target.value)}
                    placeholder="e.g. Imperial Floral Kashan"
                    className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-semibold uppercase">SKU Reference Code</label>
                  <input
                    type="text"
                    required
                    value={rugSKU}
                    onChange={(e) => setRugSKU(e.target.value)}
                    placeholder="e.g. KAS-1049-IR"
                    className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-semibold uppercase">Original Price ($)</label>
                  <input
                    type="number"
                    value={rugOriginalPrice}
                    onChange={(e) => setRugOriginalPrice(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500"
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-semibold uppercase">Sale Price ($)</label>
                  <input
                    type="number"
                    required
                    value={rugPrice}
                    onChange={(e) => setRugPrice(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-semibold uppercase">Type</label>
                  <select
                    value={rugManufacturingType}
                    onChange={(e) => setRugManufacturingType(e.target.value as any)}
                    className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500 text-xs"
                  >
                    <option value="Handmade">Handmade</option>
                    <option value="Machine-made">Machine-made</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-neutral-500 font-semibold uppercase">Size Category</label>
                  <select
                    value={rugSizeCategory}
                    onChange={(e) => setRugSizeCategory(e.target.value as any)}
                    className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500 text-xs max-h-48 overflow-y-auto"
                  >
                    <optgroup label="Rectangles">
                      <option value="1x2">1x2</option>
                      <option value="2x3">2x3</option>
                      <option value="3x4">3x4</option>
                      <option value="3x5">3x5</option>
                      <option value="4x6">4x6</option>
                      <option value="5x7">5x7</option>
                      <option value="5x8">5x8</option>
                      <option value="6x8">6x8</option>
                      <option value="6x9">6x9</option>
                      <option value="7x10">7x10</option>
                      <option value="8x10">8x10</option>
                      <option value="8x11">8x11</option>
                      <option value="8x12">8x12</option>
                      <option value="9x11">9x11</option>
                      <option value="9x12">9x12</option>
                      <option value="10x12">10x12</option>
                      <option value="10x13">10x13</option>
                      <option value="10x14">10x14</option>
                      <option value="10x16">10x16</option>
                      <option value="12x14">12x14</option>
                      <option value="12x15">12x15</option>
                      <option value="12x16">12x16</option>
                      <option value="13x14">13x14</option>
                      <option value="13x15">13x15</option>
                      <option value="13x18">13x18</option>
                      <option value="Oversized">Oversized</option>
                      <option value="Extra Large">Extra Large</option>
                      <option value="Extra Small">Extra Small</option>
                      <option value="Handmade">Handmade</option>
                      <option value="Large">Large</option>
                      <option value="Medium">Medium</option>
                      <option value="Palace Rugs">Palace Rugs</option>
                      <option value="Small">Small</option>
                    </optgroup>
                    <optgroup label="Runners">
                      <option value="Runners">Runners</option>
                      <option value="Runner Wide">wide</option>
                      <option value="4 ft Runner">4 ft</option>
                      <option value="5 ft Runner">5 ft</option>
                      <option value="6 ft Runner">6 ft</option>
                      <option value="7 ft Runner">7 ft</option>
                      <option value="8 ft Runner">8 ft</option>
                      <option value="9 ft Runner">9 ft</option>
                      <option value="10 ft Runner">10 ft</option>
                      <option value="11 ft Runner">11 ft</option>
                      <option value="14 ft Runner">14 ft</option>
                      <option value="Runner Long">long</option>
                      <option value="Runner Medium">Medium</option>
                      <option value="Runner Short">short</option>
                    </optgroup>
                    <optgroup label="Rounds">
                      <option value="Rounds">Rounds</option>
                      <option value="1 ft Round">1 ft</option>
                      <option value="3 ft Round">3 ft</option>
                      <option value="5 ft Round">5 ft</option>
                      <option value="6 ft Round">6 ft</option>
                      <option value="7 ft Round">7 ft</option>
                      <option value="8 ft Round">8 ft</option>
                      <option value="9 ft Round">9 ft</option>
                      <option value="10 ft Round">10 ft</option>
                      <option value="11 ft Round">11 ft</option>
                      <option value="Round Large">large</option>
                      <option value="Round Medium">Medium</option>
                      <option value="Round Small">small</option>
                    </optgroup>
                    <optgroup label="Squares">
                      <option value="Squares">Squares</option>
                      <option value="3 ft Square">3 ft</option>
                      <option value="4 ft Square">4 ft</option>
                      <option value="5 ft Square">5 ft</option>
                      <option value="6 ft Square">6 ft</option>
                      <option value="7 ft Square">7 ft</option>
                      <option value="8 ft Square">8 ft</option>
                      <option value="9 ft Square">9 ft</option>
                      <option value="10 ft Square">10 ft</option>
                      <option value="11 ft Square">11 ft</option>
                      <option value="Square Large">large</option>
                      <option value="Square Medium">Medium</option>
                      <option value="Square Small">small</option>
                    </optgroup>
                    <optgroup label="Ovals">
                      <option value="Ovals">Ovals</option>
                      <option value="4x6 Oval">4x6</option>
                      <option value="6x7 Oval">6x7</option>
                      <option value="6x10 Oval">6x10</option>
                      <option value="7x10 Oval">7x10</option>
                    </optgroup>
                    <optgroup label="Octagons">
                      <option value="Octagons">Octagons</option>
                      <option value="5 ft Octagon">5 ft</option>
                      <option value="7 ft Octagon">7 ft</option>
                    </optgroup>
                    <optgroup label="Pillows & Decor">
                      <option value="Pillow">Pillow</option>
                      <option value="25 Euro Pillow">25 Euro Pillow</option>
                      <option value="Ottoman Decorative">Ottoman Decorative</option>
                    </optgroup>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-semibold uppercase">Dimensions (Imperial)</label>
                  <input
                    type="text"
                    required
                    value={rugDimensions}
                    onChange={(e) => setRugDimensions(e.target.value)}
                    placeholder="e.g. 9ft 2in x 12ft 4in"
                    className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-semibold uppercase">Country of Origin</label>
                  <input
                    type="text"
                    required
                    value={rugOrigin}
                    onChange={(e) => setRugOrigin(e.target.value)}
                    placeholder="e.g. Persia (Iran)"
                    className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-semibold uppercase">Style Aesthetic</label>
                  <select
                    value={rugStyle}
                    onChange={(e) => setRugStyle(e.target.value as any)}
                    className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500"
                  >
                    <option value="Traditional">Traditional Medallion</option>
                    <option value="Antique">Antique Fine</option>
                    <option value="Modern">Modern Soft</option>
                    <option value="Vintage">Vintage Patina</option>
                    <option value="Tribal">Tribal Geometric</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-semibold uppercase">Shape</label>
                  <select
                    value={rugShape}
                    onChange={(e) => setRugShape(e.target.value as any)}
                    className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500"
                  >
                    <option value="Rectangular">Rectangular</option>
                    <option value="Runner">Runner</option>
                    <option value="Round">Round</option>
                    <option value="Square">Square</option>
                    <option value="Oval">Oval</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-semibold uppercase">Materials Used</label>
                  <input
                    type="text"
                    required
                    value={rugMaterial}
                    onChange={(e) => setRugMaterial(e.target.value)}
                    placeholder="e.g. 100% Fine Kork Wool & Pure Silk Accents"
                    className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-semibold uppercase">Age Classification</label>
                  <select
                    value={rugAge}
                    onChange={(e) => setRugAge(e.target.value as any)}
                    className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500"
                  >
                    <option value="Antique (100+ yrs)">Antique (100+ yrs)</option>
                    <option value="Vintage (50-90 yrs)">Vintage (50-90 yrs)</option>
                    <option value="Semi-Antique">Semi-Antique (25-50 yrs)</option>
                    <option value="New">Brand New weave</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-semibold uppercase">Condition State</label>
                  <select
                    value={rugCondition}
                    onChange={(e) => setRugCondition(e.target.value as any)}
                    className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500"
                  >
                    <option value="Pristine">Pristine Museum State</option>
                    <option value="Excellent">Excellent Minimal Wear</option>
                    <option value="Very Good">Very Good Vintage Patina</option>
                    <option value="Good (Minor Wear)">Good (Minor Wear)</option>
                    <option value="Antique Wear">Antique Wear Distressed</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-semibold uppercase">Availability Status</label>
                  <select
                    value={rugAvailability}
                    onChange={(e) => setRugAvailability(e.target.value as any)}
                    className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500"
                  >
                    <option value="In Stock">In Stock Showroom</option>
                    <option value="Reserved">Reserved Hold</option>
                    <option value="Sold">Sold out</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-semibold uppercase">Dominant Dye Colors</label>
                  <input
                    type="text"
                    required
                    value={rugColors}
                    onChange={(e) => setRugColors(e.target.value)}
                    placeholder="e.g. Imperial Red, Royal Blue, Cream, Olive"
                    className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-semibold uppercase">Shipping Weight (lbs)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={rugWeight}
                    onChange={(e) => setRugWeight(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 3.5"
                    className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-semibold uppercase">Shipping Offer</label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer h-full pb-2">
                    <input 
                      type="checkbox"
                      checked={rugIsFreeShipping}
                      onChange={(e) => setRugIsFreeShipping(e.target.checked)}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                    />
                    <span className="text-sm font-semibold text-neutral-800">Free Shipping</span>
                  </label>
                </div>
              </div>

              {/* MULTI-IMAGE RUG PORTFOLIO SECTION (1-15 IMAGES) */}
              <div className="space-y-2 border-t border-b border-neutral-100 py-4 my-2">
                <div className="flex justify-between items-center">
                  <label className="block text-neutral-800 font-bold uppercase text-xs tracking-wider">
                    Rug Portfolio Images ({rugImages.length} / 15)
                  </label>
                  <span className="text-xs text-stone-500">1 to 15 pictures supported</span>
                </div>

                {/* Grid of current images */}
                {rugImages.length === 0 ? (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-none text-center">
                    ⚠ Please add at least 1 image. This is required for display on the storefront.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-stone-50 p-3 border border-neutral-200 max-h-72 overflow-y-auto">
                    {rugImages.map((img, index) => (
                      <div key={index} className="relative group bg-white border border-stone-200 p-1 flex flex-col justify-between">
                        <div className="aspect-square relative overflow-hidden bg-stone-100">
                          <img src={img} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute top-1 left-1 flex flex-col gap-1">
                            {index === 0 ? (
                              <span className="bg-amber-600 text-white text-xs font-bold px-1.5 py-0.5 uppercase tracking-wide shadow-xs">Cover</span>
                            ) : (
                              <span className="bg-stone-800/80 text-white text-xs font-bold px-1.5 py-0.5 shadow-xs">Photo {index + 1}</span>
                            )}
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 bg-white/90 hover:bg-red-500 hover:text-white text-stone-700 p-1 rounded-none shadow-sm transition cursor-pointer"
                            title="Remove image"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Position controls */}
                        <div className="mt-1 flex items-center justify-between gap-1 text-sm">
                          {index > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleMakeCoverImage(index)}
                              className="text-xs text-amber-700 hover:underline font-bold uppercase"
                            >
                              Set Cover
                            </button>
                          ) : (
                            <span className="text-xs text-stone-400 font-medium italic">Primary Photo</span>
                          )}

                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveImage(index, "up")}
                              className="p-0.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-30 border border-stone-300 rounded-none cursor-pointer"
                              title="Move up / left"
                            >
                              <ArrowLeft className="h-2.5 w-2.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === rugImages.length - 1}
                              onClick={() => handleMoveImage(index, "down")}
                              className="p-0.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-30 border border-stone-300 rounded-none cursor-pointer"
                              title="Move down / right"
                            >
                              <ArrowRight className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload & Add Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* File Uploader */}
                  <div className={`border border-dashed border-stone-300 p-3 flex flex-col items-center justify-center text-center relative transition ${isUploading ? 'bg-amber-50 opacity-70' : 'bg-stone-50/50 hover:bg-stone-100'}`}>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleUploadMultipleImages(e.target.files)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="Upload multiple photos"
                      disabled={isUploading}
                    />
                    <Upload className={`h-5 w-5 mb-1 ${isUploading ? 'text-amber-400 animate-bounce' : 'text-amber-600'}`} />
                    <span className="text-xs font-bold uppercase text-stone-700">
                      {isUploading ? "Uploading to Cloud..." : "Upload Multiple Files"}
                    </span>
                    <span className="text-sm text-stone-400">Drag or click to choose 1-15 files</span>
                  </div>

                  {/* URL Adder */}
                  <div className="flex flex-col justify-between border border-stone-200 p-3 bg-stone-50/50 space-y-2">
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase text-stone-700 block">Add image via URL</span>
                      <input
                        type="text"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder="Paste image URL here..."
                        className="w-full bg-white border border-neutral-200 py-1.5 px-2.5 outline-none focus:border-amber-500 text-xs font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="w-full py-1.5 bg-stone-800 hover:bg-neutral-900 text-white text-sm uppercase tracking-wider font-bold rounded-none transition cursor-pointer"
                    >
                      + Add URL to Gallery
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-neutral-500 font-semibold uppercase">Curator's Description</label>
                  <button
                    type="button"
                    onClick={() => {
                      const ageText = rugAge.includes('Vintage') ? 'vintage' : rugAge.includes('Antique') ? 'antique' : 'contemporary';
                      
                      const openings = [
                        `This exquisite ${ageText} ${rugStyle} rug, masterfully hand-crafted in ${rugOrigin}, brings timeless elegance to any interior space.`,
                        `Presenting a remarkable ${ageText} ${rugStyle} masterpiece originating from ${rugOrigin}, showcasing true artisanal heritage.`,
                        `Discover the charm of this authentic ${ageText} ${rugStyle} rug, a beautiful testament to the weaving traditions of ${rugOrigin}.`,
                        `An exceptional piece of history, this ${ageText} ${rugStyle} rug from ${rugOrigin} offers unparalleled aesthetic appeal.`
                      ];
                      
                      const bodies = [
                        `Measuring ${rugDimensions}, this piece features a breathtaking palette of ${rugColors}. Woven from ${rugMaterial.toLowerCase()}, its ${rugCondition.toLowerCase()} condition speaks to its enduring quality and expert craftsmanship.`,
                        `With dimensions of ${rugDimensions}, it boasts a striking array of ${rugColors}. The premium ${rugMaterial.toLowerCase()} construction and ${rugCondition.toLowerCase()} condition ensure it remains a focal point for generations.`,
                        `Its generous ${rugDimensions} size perfectly frames the brilliant ${rugColors} tones. Carefully knotted using ${rugMaterial.toLowerCase()}, the rug survives in ${rugCondition.toLowerCase()} condition, preserving its original glory.`
                      ];

                      const closings = [
                        `Perfect for elevating your living space with its unique character and undeniable charm.`,
                        `A brilliant investment piece that harmonizes traditional artistry with modern home decor.`,
                        `An ideal foundational piece to anchor your room with warmth, texture, and historic beauty.`,
                        `Sure to be a conversation starter, it brings a sophisticated, worldly touch to any curated interior.`
                      ];

                      // Randomly select one from each array
                      const opening = openings[Math.floor(Math.random() * openings.length)];
                      const body = bodies[Math.floor(Math.random() * bodies.length)];
                      const closing = closings[Math.floor(Math.random() * closings.length)];

                      // If the user already wrote some notes, incorporate them!
                      const userNotes = rugDescription.trim();
                      
                      let finalDesc = "";
                      if (userNotes.length > 0) {
                        finalDesc = `${userNotes}\n\n${opening} ${body} ${closing}`;
                      } else {
                        finalDesc = `${opening} ${body} ${closing}`;
                      }
                      
                      setRugDescription(finalDesc);
                    }}
                    className="flex items-center text-xs text-editorial-accent hover:text-amber-600 font-bold transition"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Auto-Generate Description
                  </button>
                </div>
                <textarea
                  required
                  rows={4}
                  value={rugDescription}
                  onChange={(e) => setRugDescription(e.target.value)}
                  placeholder="Describe the density, geometric themes, weave center history, and overall room styling aesthetics..."
                  className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500 resize-none text-sm leading-relaxed"
                />
              </div>

              <div className="p-4 bg-stone-50 border-t border-neutral-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRugModalOpen(false)}
                  className="px-4 py-2 bg-white border border-neutral-300 rounded-lg hover:bg-stone-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-amber-400 font-bold uppercase tracking-widest rounded-lg transition"
                >
                  Save Masterwork
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: SHIP DISPATCH INFORMATION FORM --- */}
      {shippingModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden text-left">
            <div className="px-6 py-4 bg-stone-50 border-b border-neutral-200 flex justify-between items-center">
              <h3 className="font-serif font-bold text-neutral-900 text-sm">Insured Carrier Dispatch Details</h3>
              <button onClick={() => setShippingModalOpen(false)} className="p-1 text-neutral-400 hover:text-neutral-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleDispatchShipping} className="p-6 space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="block text-neutral-500 font-semibold uppercase">Insured Freight Carrier</label>
                <input
                  type="text"
                  required
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="e.g. FedEx Priority Freight / DHL Express"
                  className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2.5 px-3 outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-neutral-500 font-semibold uppercase">Tracking Registry Reference</label>
                <input
                  type="text"
                  required
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. MP-FDX-2938194"
                  className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2.5 px-3 outline-none focus:border-amber-500 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-neutral-500 font-semibold uppercase">Estimated Delivery Transit</label>
                <input
                  type="text"
                  required
                  value={estDelivery}
                  onChange={(e) => setEstDelivery(e.target.value)}
                  placeholder="e.g. 3 Business Days"
                  className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2.5 px-3 outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-neutral-900 hover:bg-neutral-850 text-amber-400 font-bold uppercase tracking-widest rounded-lg transition flex items-center justify-center gap-2"
              >
                <Truck className="h-4 w-4" />
                <span>Dispatch Freight Now</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: BLOG PUBLISHER FORM --- */}
      {blogModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-left">
            <div className="px-6 py-4 bg-stone-50 border-b border-neutral-200 flex justify-between items-center">
              <h3 className="font-serif font-bold text-neutral-900 text-sm">Publish New Journal Article</h3>
              <button onClick={() => setBlogModalOpen(false)} className="p-1 text-neutral-400 hover:text-neutral-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSaveBlog} className="p-6 space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="block text-neutral-500 font-semibold uppercase">Article Title</label>
                <input
                  type="text"
                  required
                  value={blogTitle}
                  onChange={(e) => setBlogTitle(e.target.value)}
                  placeholder="e.g. Traditional Dyes of Ancient Anatolia"
                  className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2.5 px-3 outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-neutral-500 font-semibold uppercase">Design Category</label>
                <select
                  value={blogCategory}
                  onChange={(e) => setBlogCategory(e.target.value as any)}
                  className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2.5 px-3 outline-none"
                >
                  <option value="Interior Design Tips">Interior Design Tips</option>
                  <option value="Choosing a Rug">Choosing a Rug</option>
                  <option value="Cleaning & Care">Cleaning & Care</option>
                  <option value="History & Artistry">History & Artistry</option>
                  <option value="Rug Decoration Ideas">Rug Decoration Ideas</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-neutral-500 font-semibold uppercase">Short Excerpt Summary</label>
                <input
                  type="text"
                  required
                  value={blogExcerpt}
                  onChange={(e) => setBlogExcerpt(e.target.value)}
                  placeholder="A highly scannable introductory hook for the home grid..."
                  className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2.5 px-3 outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-neutral-500 font-semibold uppercase">Full Article Content (Markdown split format)</label>
                <textarea
                  required
                  rows={5}
                  value={blogContent}
                  onChange={(e) => setBlogContent(e.target.value)}
                  placeholder="Write full editorial contents. Use # for headings and • for lists."
                  className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-neutral-900 hover:bg-neutral-850 text-amber-400 font-bold uppercase tracking-widest rounded-lg transition"
              >
                Publish Article
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: ADMIN PASSWORD DECRYPTION PROMPT --- */}
      {passwordPromptOrderId !== null && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden text-left border border-neutral-200">
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-200/50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-amber-800">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
                <h3 className="font-serif font-bold text-sm">Security Verification</h3>
              </div>
              <button 
                onClick={() => setPasswordPromptOrderId(null)} 
                className="p-1 text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={verifyDecryptPassword} className="p-6 space-y-4 text-xs font-sans">
              <p className="text-neutral-500 leading-relaxed text-sm">
                To view sensitive payment escrow details (full name, complete card number, expiration date, and CVV), please verify your identity with your administrator password.
              </p>

              <div className="space-y-1.5">
                <label className="block text-neutral-600 font-bold uppercase tracking-wider text-xs">
                  Admin Password
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError("");
                  }}
                  placeholder="Enter passcode (e.g., admin)"
                  className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2.5 px-3 outline-none focus:border-amber-500 text-xs font-mono tracking-widest"
                />
                {passwordError && (
                  <p className="text-red-500 text-xs mt-1 font-semibold flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{passwordError}</span>
                  </p>
                )}
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordPromptOrderId(null)}
                  className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-semibold uppercase tracking-wider text-xs rounded transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-amber-400 font-bold uppercase tracking-wider text-xs rounded transition cursor-pointer"
                >
                  Verify & Decrypt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 5: REUSABLE CUSTOM CONFIRMATION MODAL --- */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden text-left border border-neutral-200">
            <div className="px-6 py-4 bg-stone-50 border-b border-neutral-200 flex justify-between items-center">
              <h3 className="font-serif font-bold text-neutral-900 text-sm">{confirmModal.title}</h3>
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                className="p-1 text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs font-sans">
              <p className="text-neutral-500 leading-relaxed text-sm">
                {confirmModal.message}
              </p>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-semibold uppercase tracking-wider text-xs rounded transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider text-xs rounded transition cursor-pointer"
                >
                  Confirm Action
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
