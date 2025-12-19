# 🚀 QUICK START GUIDE

Get your invoice system running in 3 minutes!

---

## ⚡ Fastest Way to Start

```bash
# 1. Open terminal in project folder
cd "c:\Users\Dell\Desktop\Invoices"

# 2. Start development server
npm run dev

# 3. Open browser to http://localhost:3000
```

That's it! You should see the invoice system running.

---

## 🎯 First Steps

### 1. Customize Your Business Info

Edit `config/business.ts`:
```typescript
export const businessConfig = {
  name: 'YOUR BUSINESS NAME',
  address: 'Your Address',
  city: 'Your City',
  state: 'ST',
  zip: '12345',
  phone: '(555) 123-4567',
  email: 'info@yourbusiness.com',
};
```

### 2. Create Your First Invoice

1. Select invoice mode (Retail/Wholesale, Per Rug/Per Sq.Ft)
2. Fill in invoice number and date
3. Enter customer information
4. Add items with dimensions and prices
5. Click "Generate Invoice"

### 3. Test Print Output

1. Click "Print" button
2. Check print preview
3. Verify layout matches your needs
4. Print or save as PDF

---

## 📋 Invoice Modes Explained

### Retail - Per Rug
- Fixed price per rug
- Includes discount option
- Adds 6% sales tax
- **Use for**: Standard retail sales

### Wholesale - Per Rug  
- Fixed price per rug
- No discount
- No sales tax
- **Use for**: Wholesale bulk orders

### Retail - Per Sq.Ft
- Price based on square footage
- Includes discount option
- Adds 6% sales tax
- **Use for**: Custom size rugs (retail)

### Wholesale - Per Sq.Ft
- Price based on square footage
- No discount
- No sales tax
- **Use for**: Custom size rugs (wholesale)

---

## 💡 Quick Tips

### Entering Dimensions
- **Width**: Enter feet and inches separately
  - Example: 8 feet 6 inches → Width Feet: 8, Width Inches: 6
- **Length**: Same format
  - Example: 10 feet 3 inches → Length Feet: 10, Length Inches: 3

### Calculation Example
```
Rug Size: 8'6" × 10'3"
Square Feet = (8 + 6/12) × (10 + 3/12)
           = 8.5 × 10.25
           = 87.125 sq.ft

If Price per Sq.Ft = $25.00
Amount = 87.125 × $25.00 = $2,178.13
```

### Printing Tips
- Use Chrome or Edge for best results
- Set margins to 0.5 inches
- Select "Portrait" orientation
- Use "Save as PDF" for digital copies

---

## 🔧 Common Tasks

### Add Multiple Items
1. Fill first item details
2. Click "+ Add Item"
3. Repeat for each item
4. All items appear on same invoice

### Apply Discount (Retail Only)
1. Select a Retail mode
2. Enter discount percentage (0-100)
3. Discount applied before tax calculation

### Add Notes
- Use Notes field for:
  - Payment instructions
  - Special terms
  - Return policy
  - Thank you message

---

## 📱 For Mobile/Desktop Apps

### Windows EXE (Coming Soon)
```bash
npm run electron:build
# Install the generated .exe file
```

### Android APK (Coming Soon)
```bash
npm run capacitor:build
# Build in Android Studio
```

---

## ❓ Troubleshooting

### Port 3000 Already in Use
```bash
# Use different port
npm run dev -- -p 3001
```

### Styles Not Loading
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### PDF Not Generating
- Use Print → Save as PDF instead
- Check browser console for errors

---

## 📞 Need Help?

1. Check [README.md](README.md) for full documentation
2. Review [ARCHITECTURE.md](ARCHITECTURE.md) for system design
3. See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment help

---

## ✅ Checklist Before Production

- [ ] Updated business information in `config/business.ts`
- [ ] Tested all four invoice modes
- [ ] Verified calculations are correct
- [ ] Tested print output
- [ ] Tried PDF export
- [ ] Tested on different browsers
- [ ] Customized invoice template (if needed)

---

**Ready to start? Run `npm run dev` and open http://localhost:3000!** 🎉
