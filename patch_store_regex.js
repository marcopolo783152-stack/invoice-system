const fs = require('fs');
let content = fs.readFileSync('context/StoreContext.tsx', 'utf8');

content = content.replace(
  /const \[cart, setCart\] = useState<CartItem\[\]>\(\(\) => \{[\s\S]*?\}\);/m,
  `const [cart, setCart] = useState<CartItem[]>([]);
  useEffect(() => {
    const local = safeGetItem("marcopolo_cart");
    if (local) {
      try { setCart(JSON.parse(local)); } catch(e){}
    }
  }, []);`
);

content = content.replace(
  /const \[cleaningBookings, setCleaningBookings\] = useState<CleaningBooking\[\]>\(\(\) => \{[\s\S]*?\}\);/m,
  `const [cleaningBookings, setCleaningBookings] = useState<CleaningBooking[]>([]);
  useEffect(() => {
    const local = safeGetItem("marcopolo_cleaning_bookings");
    if (local) {
      try { setCleaningBookings(JSON.parse(local)); } catch(e){}
    }
  }, []);`
);

fs.writeFileSync('context/StoreContext.tsx', content);
