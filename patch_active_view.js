const fs = require('fs');
let content = fs.readFileSync('context/StoreContext.tsx', 'utf8');

// Fix activeView hydration
content = content.replace(
/const \[activeView, setActiveView\] = useState<'public' \| 'admin'>\(\(\) => \{[\s\S]*?\}\);/m,
`const [activeView, setActiveView] = useState<'public' | 'admin'>('public');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('marcopolo_active_view');
      if (stored === 'public' || stored === 'admin') {
        setActiveView(stored);
      }
    }
  }, []);`
);

fs.writeFileSync('context/StoreContext.tsx', content);
