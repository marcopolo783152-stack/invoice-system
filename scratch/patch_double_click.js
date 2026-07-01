const fs = require('fs');

const file = 'components/public/CartView.tsx';
let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

// Add isProcessing state
if (!content.includes('const [isProcessing, setIsProcessing] = useState(false);')) {
  content = content.replace('const [checkoutStep, setCheckoutStep] = useState<"cart" | "info" | "payment" | "success">("cart");', 'const [checkoutStep, setCheckoutStep] = useState<"cart" | "info" | "payment" | "success">("cart");\n  const [isProcessing, setIsProcessing] = useState(false);');
}

// Add setIsProcessing(true) in handleCheckoutSubmit
if (!content.includes('setIsProcessing(true);')) {
  content = content.replace('const handleCheckoutSubmit = (e: React.FormEvent) => {\n    e.preventDefault();\n    if (!name', 'const handleCheckoutSubmit = (e: React.FormEvent) => {\n    e.preventDefault();\n    if (isProcessing) return;\n    setIsProcessing(true);\n    if (!name');
}

// Disable button
if (!content.includes('disabled={isProcessing}')) {
  const targetBtn = '<button\n                  type="submit"\n                  className="w-full bg-editorial-accent text-white font-serif tracking-widest text-sm uppercase py-3.5 hover:bg-neutral-800 transition flex items-center justify-center gap-2 shadow-md"\n                >';
  const replacementBtn = '<button\n                  type="submit"\n                  disabled={isProcessing}\n                  className={`w-full bg-editorial-accent text-white font-serif tracking-widest text-sm uppercase py-3.5 hover:bg-neutral-800 transition flex items-center justify-center gap-2 shadow-md ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}\n                >';
  content = content.replace(targetBtn, replacementBtn);

  // Also replace the button text just to show a spinner
  content = content.replace('<span>Authorize Settlement</span>', '{isProcessing ? <span>Processing...</span> : <span>Authorize Settlement</span>}');
}

fs.writeFileSync(file, content);
console.log('Added isProcessing to prevent double clicks in CartView');
