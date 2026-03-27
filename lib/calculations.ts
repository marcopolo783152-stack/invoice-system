/**
 * CALCULATION ENGINE - BUSINESS LOGIC ONLY
 * 
 * This module contains all financial calculations for the invoice system.
 * It is completely independent of UI and can be tested in isolation.
 * 
 * DO NOT modify calculation formulas without verification against Excel.
 */

export type InvoiceMode = 'retail' | 'wholesale' | 'wash' | 'retail-per-rug' | 'wholesale-per-rug' | 'retail-per-sqft' | 'wholesale-per-sqft';
export type RugShape = 'rectangle' | 'round';
export type PricingMethod = 'piece' | 'sqft';

export interface InvoiceItem {
  id: string;
  sku: string;
  description: string;
  shape: RugShape;        // Rectangle or Round
  widthFeet: number;
  widthInches: number;
  lengthFeet: number;
  lengthInches: number;
  pricePerSqFt?: number;  // Used in per-sqft modes
  fixedPrice?: number;    // Used in per-rug modes
  pricingMethod?: PricingMethod; // New: per-item pricing method
  // Return support
  returned?: boolean;
  returnNote?: string;
  // Image support
  image?: string; // Legacy: Base64 encoded single image
  images?: string[]; // New: Array of up to 5 base64 encoded images
  // Item visibility/status
  sold?: boolean; // New: track if item in consignment is sold
  soldDate?: string; // Date when item was sold
  // Wash/Repair specific
  serviceType?: {
    wash: boolean;
    repair: boolean;
  };
  // Condition tracking
  conditions?: {
    used?: boolean;
    heavyWear?: boolean;
    damagedEdges?: boolean;
    frayedEnds?: boolean;
    holes?: boolean;
    thinAreas?: boolean;
    looseKnots?: boolean;
    fading?: boolean;
    bleeding?: boolean;
    stains?: boolean;
    petStains?: boolean;
    waterDamage?: boolean;
    mold?: boolean;
    insectDamage?: boolean;
    sunDamage?: boolean;
    other?: string;
  };
  // Expanded Inventory Fields (Mapped from Excel)
  origin?: string;
  material?: string;
  quality?: string;
  design?: string;
  colorBorder?: string;
  colorBg?: string;
  importCost?: number; // Cost per sq ft
  totalCost?: number;  // Total cost
  zone?: string;       // Warehouse Zone
}

export type DocumentType = 'INVOICE' | 'CONSIGNMENT' | 'WASH';

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: 'Check' | 'Cash' | 'Card' | 'Other';
  reference?: string;
  note?: string;
}

export interface InvoiceData {
  documentType?: DocumentType; // 'INVOICE' (default) or 'CONSIGNMENT'
  invoiceNumber: string;
  date: string;
  terms: string;
  soldTo: {
    name: string;
    companyName?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email?: string;
  };
  items: InvoiceItem[];
  mode: InvoiceMode;
  discountPercentage?: number;  // LEGACY: Still used for backward compatibility
  discountValue?: number;       // New: Unified discount value
  discountType?: 'percentage' | 'amount'; // New: Type of discount
  additionalCharges?: { id: string; amount: number; description: string }[];
  notes?: string;
  signature?: string;  // Base64 encoded signature image
  returned?: boolean; // True if invoice is a return
  returnNote?: string; // Reason or note for return
  servedBy?: string; // User who served this invoice
  // Wash/Repair specific
  pickupDate?: string;
  status?: 'washing' | 'repairing' | 'ready' | 'picked_up';
  pickupSignature?: string; // Signature collected at pickup
  isDraft?: boolean; // True if invoice is in draft mode
  downpayment?: number; // Optional downpayment for consignment
  payments?: Payment[]; // New: Track multiple payments
  images?: string[]; // Global invoice images if needed
}

export interface CalculatedItem extends InvoiceItem {
  squareFoot: number;
  amount: number;
}

export interface InvoiceCalculations {
  items: CalculatedItem[];
  subtotal: number;
  discount: number;
  subtotalAfterDiscount: number;
  salesTax: number;
  totalAdditionalCharges: number;
  totalDue: number;
  // Net values (excluding returned items)
  netSubtotal: number;
  netTotalDue: number;
  returnedAmount: number;
  soldAmount: number; // New: total value of items marked as sold
  downpayment?: number;
  totalPaid: number; // New: Total paid (downpayment + payments)
  balanceDue: number; // Changed from optional to mandatory number (derived)
}

/**
 * Calculate square footage from feet and inches
 * Rectangle: (WidthFeet + WidthInches/12) × (LengthFeet + LengthInches/12)
 * Round: π × (diameter/2)² where diameter is taken from width dimension
 */
export function calculateSquareFoot(
  widthFeet: number,
  widthInches: number,
  lengthFeet: number,
  lengthInches: number,
  shape: RugShape = 'rectangle'
): number {
  const safeWidthFeet = isNaN(widthFeet) ? 0 : widthFeet;
  const safeWidthInches = isNaN(widthInches) ? 0 : widthInches;
  const safeLengthFeet = isNaN(lengthFeet) ? 0 : lengthFeet;
  const safeLengthInches = isNaN(lengthInches) ? 0 : lengthInches;

  const widthInFeet = safeWidthFeet + safeWidthInches / 12;

  if (shape === 'round') {
    // For round rugs, use diameter (from width) to calculate area
    // Area = π × radius² = π × (diameter/2)²
    const diameter = widthInFeet;
    const radius = diameter / 2;
    return Math.PI * radius * radius;
  }

  // Rectangle calculation
  const lengthInFeet = safeLengthFeet + safeLengthInches / 12;
  return widthInFeet * lengthInFeet;
}

/**
 * Calculate line item amount based on mode and pricing method
 */
export function calculateLineAmount(item: InvoiceItem, mode: InvoiceMode): number {
  const squareFoot = calculateSquareFoot(
    item.widthFeet,
    item.widthInches,
    item.lengthFeet,
    item.lengthInches,
    item.shape
  );

  // New logic: Use item's pricingMethod if available
  const effectivePricingMethod = item.pricingMethod ||
    (mode.includes('per-sqft') ? 'sqft' : 'piece');

  if (effectivePricingMethod === 'sqft') {
    const price = item.pricePerSqFt || 0;
    return squareFoot * (isNaN(price) ? 0 : price);
  }

  // Default to fixed price
  const price = item.fixedPrice || 0;
  return isNaN(price) ? 0 : price;
}

/**
 * Calculate all invoice totals with exact Excel logic
 */
export function calculateInvoice(data: InvoiceData): InvoiceCalculations {
  // Safety check for corrupt data
  if (!data || !data.items || !Array.isArray(data.items)) {
    return {
      items: [],
      subtotal: 0,
      discount: 0,
      subtotalAfterDiscount: 0,
      salesTax: 0,
      totalAdditionalCharges: 0,
      totalDue: 0,
      netSubtotal: 0,
      netTotalDue: 0,
      returnedAmount: 0,
      soldAmount: 0,
      downpayment: 0,
      totalPaid: 0,
      balanceDue: 0
    };
  }

  const isRetail = (data.mode || '').startsWith('retail');
  const isConsignment = data.documentType === 'CONSIGNMENT';
  const SALES_TAX_RATE = 0.06; // 6%

  // Calculate each line item
  const calculatedItems: CalculatedItem[] = data.items.filter(item => item).map(item => {
    const squareFoot = calculateSquareFoot(
      item.widthFeet,
      item.widthInches,
      item.lengthFeet,
      item.lengthInches,
      item.shape
    );
    const amount = calculateLineAmount(item, data.mode);

    return {
      ...item,
      squareFoot,
      amount,
    };
  });

  // Calculate subtotal
  const subtotal = calculatedItems.reduce((sum, item) => sum + item.amount, 0);

  // Calculate net subtotal (excluding returned items)
  const netSubtotal = calculatedItems
    .filter(item => !item.returned)
    .reduce((sum, item) => sum + item.amount, 0);

  const returnedAmount = subtotal - netSubtotal;
  const isWash = data.documentType === 'WASH' || data.mode === 'wash'; 

  // Calculate discount (Now for ALL modes)
  let discount = 0;
  const discountType = data.discountType || 'percentage';
  const discountValue = data.discountValue !== undefined ? data.discountValue : (data.discountPercentage || 0);

  if (discountType === 'percentage') {
    discount = subtotal * (discountValue / 100);
  } else {
    discount = discountValue;
  }

  // Calculate net discount (proportional to net subtotal for percentage, or fixed for amount)
  let netDiscount = 0;
  if (discountType === 'percentage') {
    netDiscount = netSubtotal * (discountValue / 100);
  } else {
    // For fixed amount discounts, if there are returns, we need to decide if the discount is reduced.
    // Standard business logic usually keeps the fixed discount unless it exceeds the total.
    // But for consistency with percentage, we'll apply it to the net total, capped by net subtotal.
    netDiscount = Math.min(discountValue, netSubtotal);
  }

  const subtotalAfterDiscount = Math.max(0, subtotal - discount);
  const netSubtotalAfterDiscount = Math.max(0, netSubtotal - netDiscount);

  // Calculate sales tax (only for retail, applied after discount, but not for consignments or wash)
  let salesTax = 0;
  if (isRetail && !isConsignment && !isWash) {
    salesTax = subtotalAfterDiscount * SALES_TAX_RATE;
  }

  let netSalesTax = 0;
  if (isRetail && !isConsignment && !isWash) {
    netSalesTax = netSubtotalAfterDiscount * SALES_TAX_RATE;
  }

  // Calculate Additional Charges
  const additionalCharges = data.additionalCharges || [];
  const totalAdditionalCharges = additionalCharges.reduce((sum, c) => sum + (c.amount || 0), 0);

  // Calculate total due
  const totalDue = subtotalAfterDiscount + salesTax + totalAdditionalCharges;
  const netTotalDue = netSubtotalAfterDiscount + netSalesTax + totalAdditionalCharges;

  // Calculate sold amount (specifically for consignments)
  const soldAmount = calculatedItems
    .filter(item => item.sold && !item.returned)
    .reduce((sum, item) => sum + item.amount, 0);

  // For Consignments, the "Revenue" or "Paid" part is the soldAmount
  // For standard Sales, it's the netTotalDue
  const netTotalDueFinal = isConsignment ? soldAmount : netTotalDue;

  // Calculate Total Paid
  const payments = data.payments || [];
  const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPaid = (data.downpayment || 0) + totalPayments;

  // Calculate Balance Due
  // If Consignment: Balance is (Sold Amount - Paid)
  // If Invoice/Wash: Balance is (Total Due - Paid)
  let balanceDue: number;
  if (isConsignment) {
    // For Consignment:
    // Total Value of Sold items + Additional Charges is what they owe us.
    // If they paid us (payments + downpayment), we subtract that.
    balanceDue = (soldAmount + totalAdditionalCharges) - totalPaid;
  } else {
    // For Retail/Wash:
    // Total Due is what they owe (excluding returns)
    balanceDue = netTotalDue - totalPaid;
  }

  return {
    items: calculatedItems,
    subtotal,
    discount,
    subtotalAfterDiscount,
    salesTax,
    totalAdditionalCharges,
    totalDue,
    netSubtotal,
    netTotalDue: netTotalDueFinal,
    returnedAmount: totalDue - netTotalDue, // Total value of returned items including tax and discount
    soldAmount,
    downpayment: data.downpayment || 0,
    totalPaid,
    balanceDue
  };
}

/**
 * Format currency value
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format square footage value
 */
export function formatSquareFoot(sqft: number): string {
  return sqft.toFixed(2);
}

/**
 * Validate invoice data
 */
export function validateInvoiceData(data: InvoiceData): string[] {
  const errors: string[] = [];

  if (!data.invoiceNumber.trim()) {
    errors.push('Invoice number is required');
  }

  if (!data.date) {
    errors.push('Invoice date is required');
  }

  if ((data.documentType || 'INVOICE') === 'WASH' && !data.pickupDate) {
    errors.push('Pick up Date is required for Wash/Repair');
  }

  if (!data.soldTo.name.trim()) {
    errors.push('Customer name is required');
  }

  if (data.items.length === 0) {
    errors.push('At least one item is required');
  }

  data.items.forEach((item, index) => {
    if (!item.sku.trim()) {
      errors.push(`Item ${index + 1}: SKU is required`);
    }
    if (!item.description.trim()) {
      errors.push(`Item ${index + 1}: Description is required`);
    }

    const effectivePricingMethod = item.pricingMethod || (data.mode.includes('per-sqft') ? 'sqft' : 'piece');
    if (effectivePricingMethod === 'sqft') {
      if (item.pricePerSqFt === undefined || isNaN(item.pricePerSqFt) || item.pricePerSqFt < 0) {
        errors.push(`Item ${index + 1}: Valid price per sq.ft is required`);
      }
    } else {
      if (item.fixedPrice === undefined || isNaN(item.fixedPrice) || item.fixedPrice < 0) {
        errors.push(`Item ${index + 1}: Valid fixed price is required`);
      }
    }
  });

  return errors;
}
