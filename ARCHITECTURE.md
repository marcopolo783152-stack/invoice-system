# ARCHITECTURE & DEVELOPMENT GUIDE

Understanding the system architecture and development guidelines.

---

## 🏗️ System Architecture

### Overview

```
┌─────────────────────────────────────────────┐
│           USER INTERFACE LAYER              │
│  ┌──────────────────────────────────────┐  │
│  │   InvoiceForm (Data Entry)           │  │
│  │   InvoiceTemplate (Display/Print)    │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────┐
│         BUSINESS LOGIC LAYER                │
│  ┌──────────────────────────────────────┐  │
│  │   calculations.ts                    │  │
│  │   - calculateSquareFoot()            │  │
│  │   - calculateLineAmount()            │  │
│  │   - calculateInvoice()               │  │
│  │   - validateInvoiceData()            │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────┐
│           UTILITY LAYER                     │
│  ┌──────────────────────────────────────┐  │
│  │   pdf-utils.ts                       │  │
│  │   - printInvoice()                   │  │
│  │   - generatePDF()                    │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────┐
│         PLATFORM ADAPTERS                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │   Web    │  │ Electron │  │Capacitor │ │
│  │ (Browser)│  │ (Windows)│  │(Android) │ │
│  └──────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────┘
```

---

## 📁 File Responsibilities

### Business Logic (`lib/calculations.ts`)
**Purpose**: Pure calculation functions  
**Rules**:
- ❌ No UI dependencies
- ❌ No React hooks
- ❌ No side effects
- ✅ Pure functions only
- ✅ Fully testable
- ✅ Type-safe

**Key Functions**:
```typescript
calculateSquareFoot(wf, wi, lf, li) → number
calculateLineAmount(item, mode) → number
calculateInvoice(data) → InvoiceCalculations
formatCurrency(amount) → string
validateInvoiceData(data) → string[]
```

### UI Components

#### `InvoiceTemplate.tsx`
**Purpose**: Display invoice (LOCKED DESIGN)  
**Props**: `data`, `calculations`, `businessInfo`  
**Rules**:
- ❌ No calculations here
- ❌ No state management
- ✅ Display only
- ✅ Print-optimized

#### `InvoiceForm.tsx`
**Purpose**: Data entry  
**Rules**:
- ✅ Local state for form fields
- ✅ Validation on submit
- ✅ Calls parent's onSubmit

#### `app/page.tsx`
**Purpose**: Main coordinator  
**Responsibilities**:
- Manages invoice data state
- Calls calculation engine
- Handles print/PDF actions
- Coordinates components

---

## 🔄 Data Flow

```
1. User fills form
   └─> InvoiceForm collects data

2. User clicks "Generate Invoice"
   └─> Form validates data
   └─> Calls parent's onSubmit(data)

3. Main page receives data
   └─> Calls validateInvoiceData(data)
   └─> Calls calculateInvoice(data)
   └─> Sets state with results

4. Template renders
   └─> InvoiceTemplate receives data + calculations
   └─> Displays formatted invoice

5. User prints/exports
   └─> printInvoice() or generatePDF()
   └─> Browser/Electron handles output
```

---

## 🎯 Design Patterns

### Separation of Concerns
```typescript
// ✅ CORRECT
const calculations = calculateInvoice(data);
return <InvoiceTemplate data={data} calculations={calculations} />;

// ❌ WRONG - Don't calculate in component
return <InvoiceTemplate data={data} />;  // Then calculate inside
```

### Pure Functions
```typescript
// ✅ CORRECT - Pure function
export function calculateSquareFoot(wf, wi, lf, li) {
  return (wf + wi/12) * (lf + li/12);
}

// ❌ WRONG - Side effects
export function calculateSquareFoot(item) {
  item.squareFoot = (item.wf + item.wi/12) * (item.lf + item.li/12);
  return item;
}
```

### Type Safety
```typescript
// ✅ CORRECT - Strongly typed
interface InvoiceItem {
  id: string;
  sku: string;
  description: string;
  // ... all fields defined
}

// ❌ WRONG - Loose typing
function processItem(item: any) { }
```

---

## 🧪 Testing Strategy

### Unit Tests (Calculations)
```typescript
import { calculateSquareFoot, calculateInvoice } from './calculations';

describe('calculateSquareFoot', () => {
  it('calculates 8ft × 10ft correctly', () => {
    expect(calculateSquareFoot(8, 0, 10, 0)).toBe(80);
  });

  it('handles inches correctly', () => {
    expect(calculateSquareFoot(8, 6, 10, 6)).toBeCloseTo(89.25);
  });
});

describe('calculateInvoice', () => {
  it('applies retail calculations with tax', () => {
    const data = {
      mode: 'retail-per-sqft',
      items: [{ /* ... */ }],
      // ...
    };
    const result = calculateInvoice(data);
    expect(result.salesTax).toBeGreaterThan(0);
  });
});
```

### Integration Tests (Components)
```typescript
import { render, screen } from '@testing-library/react';
import InvoiceTemplate from './InvoiceTemplate';

test('renders invoice number', () => {
  const data = { invoiceNumber: 'INV-001', /* ... */ };
  render(<InvoiceTemplate data={data} calculations={calc} />);
  expect(screen.getByText('INV-001')).toBeInTheDocument();
});
```

---

## 📝 Code Style Guide

### Naming Conventions
```typescript
// Components: PascalCase
InvoiceTemplate.tsx
InvoiceForm.tsx

// Functions: camelCase
calculateSquareFoot()
formatCurrency()

// Constants: UPPER_SNAKE_CASE
const SALES_TAX_RATE = 0.06;

// Types/Interfaces: PascalCase
interface InvoiceData { }
type InvoiceMode = '...';
```

### File Organization
```typescript
// 1. Imports
import React from 'react';
import { calculateInvoice } from '@/lib/calculations';

// 2. Types/Interfaces
interface Props { }

// 3. Component/Function
export default function Component() { }

// 4. Helper functions (if needed)
function helperFunction() { }
```

---

## 🔧 Common Modifications

### Change Tax Rate
```typescript
// lib/calculations.ts
const SALES_TAX_RATE = 0.07; // Change from 0.06 to 0.07 (7%)
```

### Add New Invoice Mode
```typescript
// 1. Update type
export type InvoiceMode = 
  | 'retail-per-rug'
  | 'wholesale-per-rug'
  | 'retail-per-sqft'
  | 'wholesale-per-sqft'
  | 'new-mode';  // Add here

// 2. Update calculation logic
export function calculateInvoice(data: InvoiceData) {
  // Add mode-specific logic
}

// 3. Update form options
<select>
  <option value="new-mode">New Mode</option>
</select>
```

### Customize Template Layout
```css
/* components/InvoiceTemplate.module.css */
.invoice {
  /* Modify dimensions, spacing, etc. */
  /* BE CAREFUL - This affects print output! */
}
```

---

## 🚫 What NOT to Do

### Don't Mix Concerns
```typescript
// ❌ WRONG - Calculation in component
function InvoiceTemplate({ data }) {
  const total = data.items.reduce((sum, item) => {
    const sqft = (item.wf + item.wi/12) * (item.lf + item.li/12);
    return sum + sqft * item.price;
  }, 0);
  // ... render
}

// ✅ CORRECT - Use calculation engine
function InvoiceTemplate({ data, calculations }) {
  return <div>{calculations.totalDue}</div>;
}
```

### Don't Hardcode Values
```typescript
// ❌ WRONG
const tax = subtotal * 0.06;

// ✅ CORRECT
const SALES_TAX_RATE = 0.06;
const tax = subtotal * SALES_TAX_RATE;
```

### Don't Ignore TypeScript Errors
```typescript
// ❌ WRONG
// @ts-ignore
someFunction(data);

// ✅ CORRECT - Fix the type issue
const typedData: InvoiceData = data;
someFunction(typedData);
```

---

## 🎨 CSS Architecture

### Print-First Approach
```css
/* Default styles are print-optimized */
.invoice {
  width: 8.5in;
  font-size: 11pt;
}

/* Screen adjustments */
@media screen {
  .invoice {
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
  }
}

/* Print optimizations */
@media print {
  .invoice {
    box-shadow: none;
  }
}
```

### Use CSS Modules
```typescript
// ✅ CORRECT
import styles from './Component.module.css';
<div className={styles.invoice}>

// ❌ WRONG
<div className="invoice">  // Global class
```

---

## 🔄 State Management

### Current Approach (Sufficient)
```typescript
// Local state in page component
const [invoiceData, setInvoiceData] = useState(null);
```

### If Scaling (Future)
Consider:
- React Context for global state
- Redux/Zustand for complex state
- Local Storage for persistence

---

## 📦 Dependencies

### Core Dependencies
- `next`: Framework
- `react`: UI library
- `jspdf`: PDF generation
- `html2canvas`: HTML to canvas

### Platform Dependencies
- `electron`: Windows desktop
- `@capacitor/*`: Android mobile

### Update Strategy
```bash
# Check for updates
npm outdated

# Update carefully (test after each)
npm update

# Major versions - review breaking changes
npm install next@latest
```

---

## 🐛 Debugging

### Print Issues
```css
/* Add debug borders */
@media print {
  * {
    outline: 1px solid red !important;
  }
}
```

### Calculation Issues
```typescript
// Add console logging
console.log('Input:', data);
const result = calculateInvoice(data);
console.log('Output:', result);
```

### Platform Issues
```typescript
// Detect platform
if (typeof window !== 'undefined') {
  console.log('Running in browser');
}
```

---

## 📚 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Electron Docs](https://www.electronjs.org/docs)
- [Capacitor Docs](https://capacitorjs.com/docs)

---

## ✅ Best Practices

1. **Test calculations** against Excel before deploying
2. **Print test** on actual printer before releasing
3. **Separate concerns** - keep business logic pure
4. **Type everything** - use TypeScript strictly
5. **Document changes** - update this guide
6. **Version control** - commit often with clear messages
7. **Backup keystores** - critical for updates

---

**Remember**: The goal is maintainability and correctness, not cleverness!
