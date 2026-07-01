const fs = require('fs');

const file = 'components/public/CartView.tsx';
let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

// 1. Find the checkoutStep line and inject isProcessing if missing
if (!content.includes('const [isProcessing, setIsProcessing] = useState(false);')) {
  // Regex to match the checkoutStep useState regardless of its exact type literal
  const regex = /const \[checkoutStep, setCheckoutStep\] = useState<[^>]+>\("cart"\);/;
  content = content.replace(regex, match => `${match}\n  const [isProcessing, setIsProcessing] = useState(false);`);
}

fs.writeFileSync(file, content);
console.log('Fixed isProcessing definition in CartView.tsx');
