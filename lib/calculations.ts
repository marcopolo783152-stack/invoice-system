/**
 * CALCULATION ENGINE - BUSINESS LOGIC ONLY
 * 
 * This module contains all financial calculations for the invoice system.
 * It is completely independent of UI and can be tested in isolation.
 * 
 * DO NOT modify calculation formulas without verification against Excel.
 */

export type InvoiceMode = 'retail-per-rug' | 'wholesale-per-rug' | 'retail-per-sqft' | 'wholesale-per-sqft';
export type RugShape = 'rectangle' | 'round';

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
  // Return support
  returned?: boolean;
  returnNote?: string;
}

export type DocumentType = 'INVOICE' | 'CONSIGNMENT';

export interface InvoiceData {
  documentType?: DocumentType; // 'INVOICE' (default) or 'CONSIGNMENT'
  invoiceNumber: string;
  date: string;
  terms: string;
  soldTo: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email?: string;
  };
  items: InvoiceItem[];
  mode: InvoiceMode;
  discountPercentage?: number;  // Optional, only for retail modes
  notes?: string;
  signature?: string;  // Base64 encoded signature image
  returned?: boolean; // True if invoice is a return
  returnNote?: string; // Reason or note for return
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
  totalDue: number;
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
  const widthInFeet = widthFeet + widthInches / 12;
  
  if (shape === 'round') {
    // For round rugs, use diameter (from width) to calculate area
    // Area = π × radius² = π × (diameter/2)²
    const diameter = widthInFeet;
    const radius = diameter / 2;
    return Math.PI * radius * radius;
  }
  
  // Rectangle calculation
  const lengthInFeet = lengthFeet + lengthInches / 12;
  return widthInFeet * lengthInFeet;
}

/**
 * Calculate line item amount based on mode
 */
export function calculateLineAmount(item: InvoiceItem, mode: InvoiceMode): number {
  const squareFoot = calculateSquareFoot(
    item.widthFeet,
    item.widthInches,
    item.lengthFeet,
    item.lengthInches,
    item.shape
  );

  // Per Sq.Ft modes
  if (mode === 'retail-per-sqft' || mode === 'wholesale-per-sqft') {
    return squareFoot * (item.pricePerSqFt || 0);
  }

  // Per Rug modes
  return item.fixedPrice || 0;
}

/**
 * Calculate all invoice totals with exact Excel logic
 */
export function calculateInvoice(data: InvoiceData): InvoiceCalculations {
  const isRetail = data.mode.startsWith('retail');
  const isConsignment = data.documentType === 'CONSIGNMENT';
  const SALES_TAX_RATE = 0.06; // 6%

  // Calculate each line item
  const calculatedItems: CalculatedItem[] = data.items.map(item => {
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

  // Calculate discount (only for retail)
  let discount = 0;
  if (isRetail && data.discountPercentage) {
    discount = subtotal * (data.discountPercentage / 100);
  }

  const subtotalAfterDiscount = subtotal - discount;

  // Calculate sales tax (only for retail, applied after discount, but not for consignments)
  let salesTax = 0;
  if (isRetail && !isConsignment) {
    salesTax = subtotalAfterDiscount * SALES_TAX_RATE;
  }

  // Calculate total due
  const totalDue = subtotalAfterDiscount + salesTax;

  return {
    items: calculatedItems,
    subtotal,
    discount,
    subtotalAfterDiscount,
    salesTax,
    totalDue,
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

    const isPerSqFt = data.mode.includes('per-sqft');
    if (isPerSqFt && (item.pricePerSqFt === undefined || item.pricePerSqFt < 0)) {
      errors.push(`Item ${index + 1}: Valid price per sq.ft is required`);
    }
    if (!isPerSqFt && (item.fixedPrice === undefined || item.fixedPrice < 0)) {
      errors.push(`Item ${index + 1}: Valid fixed price is required`);
    }
  });

  return errors;
}
