# Rug Business Invoice System

Professional, production-ready invoice system with a **single shared codebase** for:
- 🌐 **Web Application**
- 📱 **Android APK**
- 💻 **Windows EXE**

---

## 📚 Documentation

- **New User?** Start with [QUICKSTART.md](QUICKSTART.md) (3 minutes)
- **Need Reference?** Check [CHEATSHEET.md](CHEATSHEET.md)
- **Full Index:** See [INDEX.md](INDEX.md) for all documentation

---

## Features

✅ **Professional Invoice Template** - Print-optimized layout with pixel-perfect output  
✅ **Four Business Modes**:
- Retail - Per Rug
- Wholesale - Per Rug  
- Retail - Per Sq.Ft
- Wholesale - Per Sq.Ft

✅ **Exact Excel-Compatible Calculations**  
✅ **Print & PDF Export** - Identical output across all platforms  
✅ **Responsive Design** - Works on desktop, tablet, and mobile  
✅ **Separated Business Logic** - Easy to test and maintain  

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- For Android: Android Studio and Java JDK
- For Windows: Build environment (already works on Windows)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Building for Production

### Web Application

```bash
# Build static web app
npm run build

# The output will be in the 'out' folder
# Deploy to any static hosting (Vercel, Netlify, AWS S3, etc.)
```

### Windows EXE

```bash
# 1. Build the Next.js app first
npm run build

# 2. Build Electron app
npm run electron:build

# The .exe installer will be in 'electron-dist' folder
```

### Android APK

```bash
# 1. Build the Next.js app
npm run build

# 2. Initialize Capacitor (first time only)
npm run capacitor:init

# 3. Add Android platform (first time only)
npm run capacitor:add:android

# 4. Sync and open Android Studio
npm run capacitor:build

# 5. In Android Studio:
# - Build > Generate Signed Bundle / APK
# - Select APK
# - Create or select keystore
# - Build Release APK
```

---

## 📐 Invoice Calculation Logic

### Square Foot Formula
```
SquareFoot = (WidthFeet + WidthInches/12) × (LengthFeet + LengthInches/12)
```

### Line Amount Logic

**Per Sq.Ft Mode:**
```
Amount = SquareFoot × PricePerSqFt
```

**Per Rug Mode:**
```
Amount = FixedPrice
```

### Invoice Totals

**Retail Modes:**
```
Subtotal = SUM(Amount)
Discount = Subtotal × (DiscountPercentage / 100)
SubtotalAfterDiscount = Subtotal - Discount
SalesTax = SubtotalAfterDiscount × 0.06  // 6%
TotalDue = SubtotalAfterDiscount + SalesTax
```

**Wholesale Modes:**
```
Total = SUM(Amount)  // No tax, no discount
```

---

## 🏗️ Project Structure

```
rug-invoice-system/
├── app/                      # Next.js app directory
│   ├── page.tsx             # Main invoice page
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── InvoiceTemplate.tsx  # Invoice UI (LOCKED DESIGN)
│   ├── InvoiceTemplate.module.css
│   ├── InvoiceForm.tsx      # Data entry form
│   └── InvoiceForm.module.css
├── lib/                     # Business logic
│   ├── calculations.ts      # Pure calculation engine
│   └── pdf-utils.ts         # Print/PDF utilities
├── electron.js              # Electron main process
├── preload.js              # Electron preload script
├── capacitor.config.json   # Capacitor configuration
├── next.config.js          # Next.js configuration
└── package.json            # Dependencies and scripts
```

---

## 🎨 Customization

### Business Information

Edit the `businessInfo` prop in [app/page.tsx](app/page.tsx):

```typescript
businessInfo={{
  name: 'YOUR BUSINESS NAME',
  address: 'Your Address',
  city: 'Your City',
  state: 'ST',
  zip: '12345',
  phone: '(555) 123-4567',
  email: 'info@yourbusiness.com',
}}
```

### Sales Tax Rate

Edit the constant in [lib/calculations.ts](lib/calculations.ts):

```typescript
const SALES_TAX_RATE = 0.06; // Change to your tax rate
```

### Invoice Template

⚠️ **WARNING**: The invoice template design is locked. Only modify if absolutely necessary.

If you must change styling, edit [components/InvoiceTemplate.module.css](components/InvoiceTemplate.module.css).

---

## 🖨️ Print Configuration

The system is optimized for:
- **Page Size**: US Letter (8.5" × 11")
- **Orientation**: Portrait
- **Margins**: 0.5 inches

Print settings are defined in the CSS `@media print` section.

---

## 🧪 Testing

### Test Calculation Engine

```javascript
import { calculateInvoice } from './lib/calculations';

const testData = {
  invoiceNumber: 'TEST-001',
  date: '2025-01-01',
  terms: 'Net 30',
  soldTo: { name: 'Test Customer', /* ... */ },
  items: [
    {
      id: '1',
      sku: 'RUG-001',
      description: 'Persian Rug',
      widthFeet: 8,
      widthInches: 0,
      lengthFeet: 10,
      lengthInches: 0,
      pricePerSqFt: 25.00,
    }
  ],
  mode: 'retail-per-sqft',
};

const result = calculateInvoice(testData);
console.log(result);
// Expected: squareFoot = 80, amount = 2000.00
```

---

## 📱 Platform-Specific Notes

### Web
- Works on all modern browsers
- No installation required
- Can be installed as PWA (add manifest.json)

### Windows EXE
- Self-contained installer
- No browser required
- Automatic updates possible with electron-updater

### Android APK
- Requires Android 6.0+
- Uses WebView for rendering
- Can be published to Play Store

---

## 🔧 Troubleshooting

### PDF Generation Issues

If PDF download fails:
1. Use the Print button instead
2. Select "Save as PDF" in print dialog
3. Check browser console for errors

### Print Preview Doesn't Match Screen

Ensure you're viewing in a modern browser with proper print CSS support.

### Android Build Fails

1. Check Android Studio is installed
2. Verify Java JDK is configured
3. Run `npx cap sync` to update plugins

---

## 📄 License

Proprietary - All rights reserved

---

## 🆘 Support

For issues or questions:
1. Check this documentation
2. Review calculation logic in `lib/calculations.ts`
3. Verify invoice template in `components/InvoiceTemplate.tsx`

---

## ⚙️ Development Scripts

```bash
# Development
npm run dev              # Start dev server

# Building
npm run build           # Build Next.js app
npm run electron:build  # Build Windows EXE
npm run capacitor:build # Prepare Android build

# Utilities
npm run lint           # Check code quality
```

---

## 🎯 Key Design Principles

1. **Single Source of Truth**: One codebase for all platforms
2. **Separation of Concerns**: Business logic independent of UI
3. **Print First**: Optimized for professional printed output
4. **Pixel Perfect**: Consistent rendering everywhere
5. **Excel Compatible**: Matches existing invoice calculations exactly

---

**Built with ❤️ for professional rug business operations**
