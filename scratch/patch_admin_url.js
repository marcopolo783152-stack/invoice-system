const fs = require('fs');

const adminFile = 'components/public/AdminDashboard.tsx';
let content = fs.readFileSync(adminFile, 'utf8');

const oldState = `const [activeTab, setActiveTab] = useState<"analytics" | "inventory" | "bulk_import" | "orders" | "cleaning" | "reviews" | "messages" | "blogs" | "promotions" | "settings">("analytics");`;

const newState = `const [activeTab, setActiveTabState] = useState<"analytics" | "inventory" | "bulk_import" | "orders" | "cleaning" | "reviews" | "messages" | "blogs" | "promotions" | "settings">("analytics");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("adminTab") as any;
      if (tab) setActiveTabState(tab);
    }
  }, []);

  const setActiveTab = (tab: "analytics" | "inventory" | "bulk_import" | "orders" | "cleaning" | "reviews" | "messages" | "blogs" | "promotions" | "settings") => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("view", "admin");
      params.set("adminTab", tab);
      window.history.pushState(null, "", "?" + params.toString());
    }
  };`;

content = content.replace(oldState, newState);

fs.writeFileSync(adminFile, content);
console.log("Patched AdminDashboard.tsx for URL state persistence");
