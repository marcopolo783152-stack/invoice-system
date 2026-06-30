/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Rug {
  id: string;
  name: string;
  sku: string;
  price: number;
  originalPrice?: number | null; // for showing discount
  sizeCategory: string; // e.g. "8x10", "9x12", "6x9", "10x13", "Runner", "Custom"
  dimensions: string; // e.g. "8'3 x 10'1", "4' x 6'", "8' x 10'"
  origin: string; // e.g. "Persia (Iran)", "Afghanistan", "Turkey", "Caucasus"
  material: string; // e.g. "100% Kork Wool", "Silk on Silk", "Wool & Cotton"
  style: "Antique" | "Modern" | "Traditional" | "Vintage" | "Tribal";
  age: "Antique (100+ yrs)" | "Vintage (50-90 yrs)" | "Semi-Antique" | "New";
  condition: "Excellent" | "Pristine" | "Very Good" | "Good (Minor Wear)" | "Antique Wear";
  colors: string[]; // list of dominant colors
  shape: "Rectangular" | "Runner" | "Round" | "Square" | "Oval";
  availability: "In Stock" | "Sold" | "Reserved";
  description: string;
  images: string[]; // list of image URLs (up to 15)
  rating: number; // average rating
  weightLbs?: number; // shipping weight in pounds
  isSpecialSale?: boolean;
}

export const ALL_SIZES = Array.from(new Set([
  "Small", "Medium", "Large", "Oversized", "Palace-size", "Runner",
  "1x2", "2x3", "3x4", "3x5", "4x6", "5x7", "5x8", "6x8", "6x9", "7x10", "8x10", "8x11", "8x12", "9x11", "9x12", "10x12", "10x13", "10x14", "10x16", "12x14", "12x15", "12x16", "13x14", "13x15", "13x18", "Extra Large", "Extra Small", "Handmade", "Palace Rugs",
  "Runners", "wide", "4 ft Runner", "5 ft Runner", "6 ft Runner", "7 ft Runner", "8 ft Runner", "9 ft Runner", "10 ft Runner", "11 ft Runner", "14 ft Runner", "long", "Runner Medium", "Runner Short",
  "Rounds", "1 ft Round", "3 ft Round", "5 ft Round", "6 ft Round", "7 ft Round", "8 ft Round", "9 ft Round", "10 ft Round", "11 ft Round", "large", "Round Medium", "Round Small",
  "Squares", "3 ft Square", "4 ft Square", "5 ft Square", "6 ft Square", "7 ft Square", "8 ft Square", "9 ft Square", "10 ft Square", "11 ft Square", "Square Medium", "Square Small",
  "Ovals", "4x6 Oval", "6x7 Oval", "6x10 Oval", "7x10 Oval",
  "Octagons", "5 ft Octagon", "7 ft Octagon",
  "Pillow", "25 Euro Pillow", "Ottoman Decorative"
]));

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: "customer" | "admin";
}

export interface CleaningBooking {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  sizeDescription: string;
  width: number;
  length: number;
  widthInches?: number;
  lengthInches?: number;
  dimensionUnit: "Feet & Inches" | "Total Inches" | "Meters (M)";
  areaSqft: number;
  serviceOption: "Drop-off" | "Pickup";
  pickupFee: number;
  cleaningFee: number;
  totalPrice: number;
  preferredDate: string;
  preferredTime?: string; // preferred time for pickup/drop-off
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
  createdAt: string;
}

export interface CartItem {
  rug: Rug;
  quantity: number;
}

export type OrderStatus =
  | "Pending Confirmation"
  | "Confirmed"
  | "Preparing for Shipping"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  shippingAddress: string;
  billingAddress: string;
  notes?: string;
}

export interface PaymentDetails {
  cardBrand: string;
  last4: string;
  cardholderName: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCVC?: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: "percentage" | "fixed" | "free_shipping";
  discountValue: number;
  validUntil?: string; // ISO date string
  isActive: boolean;
  oneTimeUse: boolean;
    usedBy?: string;
    usedAt?: string;
  usedCount: number;
}

export interface ShippingDetails {
  carrier: string;
  trackingNumber: string;
  estimatedDelivery?: string;
  shippedAt?: string;
}

export interface Order {
  id: string;
  customerInfo: CustomerInfo;
  cartItems: CartItem[];
  subtotal: number;
    discountAmount?: number;
    appliedPromoCode?: string;
  tax: number; // 6% taxes
  shipping: number; // shipping cost (e.g. $16 for 2-5 lbs)
  deliveryOption: "Pickup" | "Delivery"; // pickup or delivery choice
  total: number;
  status: OrderStatus;
  paymentDetails: PaymentDetails;
  shippingDetails?: ShippingDetails;
  createdAt: string;
  totalWeightLbs?: number;
}

export interface Review {
  id: string;
  rugId: string;
  rating: number;
  reviewerName: string;
  reviewText: string;
  imageUrl?: string;
  isApproved: boolean; // Approved by admin
  createdAt: string;
}

export type BlogCategory =
  | "Interior Design Tips"
  | "Choosing a Rug"
  | "Cleaning & Care"
  | "History & Artistry"
  | "Rug Decoration Ideas";

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string; // Markdown or rich HTML content
  featuredImage: string;
  author: string;
  date: string;
  category: BlogCategory;
  readTime: string;
  relatedProducts?: string[]; // IDs of related rugs
}

export interface ChatMessage {
  id: string;
  sender: "customer" | "admin";
  text: string;
  timestamp: string;
  orderId?: string; // Optional order tracking reference
  sessionId?: string; // Thread session ID
  customerName?: string; // Customer name associated with the thread
}

export interface SocialMediaLink {
  platform: "instagram" | "facebook" | "pinterest" | "tiktok" | "youtube" | "twitter";
  url: string;
}

export interface ShopProfile {
  name: string;
  phone: string;
  email: string;
  address: string;
  logoUrl?: string;
}
