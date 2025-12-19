# ⚡ QUICK REFERENCE CHEATSHEET

One-page reference for common tasks and commands.

---

## 🚀 Common Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Build Windows EXE
npm run electron:build

# Prepare Android build
npm run capacitor:build

# Install dependencies
npm install

# Update dependencies
npm update
```

---

## 📂 Key Files at a Glance

| File | Purpose | Edit? |
|------|---------|-------|
| `config/business.ts` | Your business info | ✅ YES |
| `lib/calculations.ts` | Calculation logic | ⚠️ CAREFUL |
| `components/InvoiceTemplate.tsx` | Invoice layout | ❌ LOCKED |
| `components/InvoiceForm.tsx` | Data entry | ✅ YES |
| `app/page.tsx` | Main coordinator | ⚠️ CAREFUL |

---

## 🧮 Quick Formulas

### Square Footage
```
(WidthFeet + WidthInches÷12) × (LengthFeet + LengthInches÷12)
```

### Per Sq.Ft Amount
```
SquareFoot × PricePerSqFt
```

### Retail Total
```
Subtotal - Discount + (Subtotal-Discount) × 0.06
```

### Wholesale Total
```
SUM(Amounts)
```

---

## 🎯 Invoice Modes

| Mode | Pricing | Discount | Tax |
|------|---------|----------|-----|
| Retail - Per Rug | Fixed | Yes | 6% |
| Wholesale - Per Rug | Fixed | No | No |
| Retail - Per Sq.Ft | Per Sq.Ft | Yes | 6% |
| Wholesale - Per Sq.Ft | Per Sq.Ft | No | No |

---

## 🔧 Quick Customizations

### Change Business Name
```typescript
// config/business.ts
name: 'YOUR BUSINESS NAME'
```

### Change Tax Rate
```typescript
// lib/calculations.ts
const SALES_TAX_RATE = 0.07; // 7%
```

### Change Default Terms
```typescript
// config/business.ts
defaultTerms: 'Net 30'
```

---

## 🖨️ Print Settings

- **Page**: US Letter (8.5" × 11")
- **Orientation**: Portrait
- **Margins**: 0.5 inches
- **Colors**: Enabled

---

## 📊 Dimension Entry Guide

### Example: 8 feet 6 inches
```
Width Feet: 8
Width Inches: 6
```

### Example: 10 feet (exact)
```
Length Feet: 10
Length Inches: 0
```

### Result
```
Square Feet = (8 + 6/12) × (10 + 0/12)
            = 8.5 × 10
            = 85.00
```

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 3000 in use | `npm run dev -- -p 3001` |
| Styles not loading | Delete `.next` folder, restart |
| PDF not working | Use Print → Save as PDF |
| Can't build EXE | Run `npm run build` first |
| Android errors | Sync with `npx cap sync` |

---

## 📁 Folder Structure (Simplified)

```
Invoices/
├── app/              → Pages
├── components/       → UI components
├── lib/              → Business logic
├── config/           → Settings
├── electron.js       → Desktop app
└── capacitor.config  → Mobile app
```

---

## 🎨 CSS Class Reference

```css
.invoice          /* Main container */
.header           /* Business info + title */
.soldTo           /* Customer section */
.invoiceInfo      /* Invoice # / Date / Terms */
.itemsTable       /* Items grid */
.totalsSection    /* Subtotal / Tax / Total */
```

---

## 🔢 Sample Invoice Data

```typescript
{
  invoiceNumber: 'INV-001',
  date: '2025-12-19',
  terms: 'Due on Receipt',
  soldTo: {
    name: 'John Doe',
    address: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
    phone: '(555) 123-4567'
  },
  items: [{
    sku: 'RUG-001',
    description: 'Persian Rug',
    widthFeet: 8,
    widthInches: 0,
    lengthFeet: 10,
    lengthInches: 0,
    pricePerSqFt: 25.00
  }],
  mode: 'retail-per-sqft',
  discountPercentage: 10
}
```

---

## ⌨️ TypeScript Interfaces

```typescript
InvoiceData     // Full invoice
InvoiceItem     // Single line item
InvoiceMode     // Business mode type
InvoiceCalculations  // Computed totals
```

---

## 🚦 Development Workflow

1. **Edit** → Make changes
2. **Save** → Auto-reload in browser
3. **Test** → Verify changes
4. **Build** → `npm run build`
5. **Deploy** → See DEPLOYMENT.md

---

## 📱 Platform URLs

| Platform | Access |
|----------|--------|
| Web Dev | http://localhost:3000 |
| Web Prod | Your hosting URL |
| Windows | Desktop application |
| Android | Mobile app |

---

## 🎯 Testing Checklist

- [ ] Enter invoice data
- [ ] Check calculations
- [ ] Preview invoice
- [ ] Test print
- [ ] Try PDF download
- [ ] Test all 4 modes
- [ ] Verify totals

---

## 📞 Documentation Quick Links

- **Getting Started**: [QUICKSTART.md](QUICKSTART.md)
- **Full Docs**: [README.md](README.md)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Deployment**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Overview**: [SUMMARY.md](SUMMARY.md)

---

## 💡 Pro Tips

1. Test calculations against Excel first
2. Always print test before releasing
3. Backup your keystore (Android)
4. Use version control (Git)
5. Document customizations
6. Keep business logic pure
7. Test on actual devices

---

## 🏃 Quick Start (30 seconds)

```bash
cd "c:\Users\Dell\Desktop\Invoices"
npm run dev
# Open http://localhost:3000
# Fill form → Generate → Print
```

---

## 🎓 Learn More

```
React      → https://react.dev
Next.js    → https://nextjs.org
TypeScript → https://typescriptlang.org
Electron   → https://electronjs.org
Capacitor  → https://capacitorjs.com
```

---

**Keep this page handy for quick reference!** 📌
