const fs = require('fs');
let content = fs.readFileSync('context/StoreContext.tsx', 'utf8');

// Fix cart hydration
content = content.replace(
`  const [cart, setCart] = useState<CartItem[]>(() => {
    const local = safeGetItem("marcopolo_cart");
    return local ? JSON.parse(local) : [];
  });`,
`  const [cart, setCart] = useState<CartItem[]>([]);
  useEffect(() => {
    const local = safeGetItem("marcopolo_cart");
    if (local) {
      try {
        setCart(JSON.parse(local));
      } catch(e){}
    }
  }, []);`
);

// Fix cleaningBookings hydration
content = content.replace(
`  const [cleaningBookings, setCleaningBookings] = useState<CleaningBooking[]>(() => {
    const local = safeGetItem("marcopolo_cleaning_bookings");
    return local ? JSON.parse(local) : [];
  });`,
`  const [cleaningBookings, setCleaningBookings] = useState<CleaningBooking[]>([]);
  useEffect(() => {
    const local = safeGetItem("marcopolo_cleaning_bookings");
    if (local) {
      try {
        setCleaningBookings(JSON.parse(local));
      } catch(e){}
    }
  }, []);`
);

fs.writeFileSync('context/StoreContext.tsx', content);
