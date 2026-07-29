
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "components", "public", "AdminDashboard.tsx");
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  "  const [adminSearchQuery, setAdminSearchQuery] = useState(\"\");",
  "  const [adminSearchQuery, setAdminSearchQuery] = useState(\"\");\n  const [orderStatusFilter, setOrderStatusFilter] = useState(\"All\");\n  const [orderSearchQuery, setOrderSearchQuery] = useState(\"\");"
);

const renderOrderBlockReplaced = content.replace(
  `                  const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                  const activeOrders = sortedOrders.filter(o => o.status !== "Delivered" && o.status !== "Cancelled");
                  const deliveredOrders = sortedOrders.filter(o => o.status === "Delivered");
                  const cancelledOrders = sortedOrders.filter(o => o.status === "Cancelled");
                  
                  const renderOrderCard = (o: any) => {`,
  `                  const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                  
                  const filteredOrders = sortedOrders.filter(o => {
                    const searchLower = orderSearchQuery.toLowerCase();
                    const matchesSearch = 
                      !orderSearchQuery || 
                      o.id.toLowerCase().includes(searchLower) ||
                      o.customerInfo.name.toLowerCase().includes(searchLower) ||
                      o.customerInfo.phone.toLowerCase().includes(searchLower) ||
                      o.customerInfo.email.toLowerCase().includes(searchLower) ||
                      (o.shippingDetails?.trackingNumber && o.shippingDetails.trackingNumber.toLowerCase().includes(searchLower));

                    const matchesStatus = 
                      orderStatusFilter === "All" ||
                      (orderStatusFilter === "Active" && o.status !== "Delivered" && o.status !== "Cancelled") ||
                      (orderStatusFilter === "Shipped" && o.status === "Shipped") ||
                      (orderStatusFilter === "Delivered" && o.status === "Delivered") ||
                      (orderStatusFilter === "Cancelled" && o.status === "Cancelled");

                    return matchesSearch && matchesStatus;
                  });

                  const renderOrderCard = (o: any) => {`
);

const returnBlockReplaced = renderOrderBlockReplaced.replace(
  `                  return (
                      <div className="space-y-8">
                        {activeOrders.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="font-serif text-lg font-bold text-neutral-800 border-b border-neutral-200 pb-2">Active Orders</h3>
                            {activeOrders.map(renderOrderCard)}
                          </div>
                        )}
                        {deliveredOrders.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="font-serif text-lg font-bold text-emerald-800 border-b border-emerald-200 pb-2">Delivered</h3>
                            {deliveredOrders.map(renderOrderCard)}
                          </div>
                        )}
                        {cancelledOrders.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="font-serif text-lg font-bold text-red-800 border-b border-red-200 pb-2">Cancelled</h3>
                            {cancelledOrders.map(renderOrderCard)}
                          </div>
                        )}
                      </div>
                  );`,
  `                  return (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                          <div className="flex bg-neutral-100 p-1 rounded-lg overflow-x-auto gap-1">
                            {["All", "Active", "Shipped", "Delivered", "Cancelled"].map(tab => (
                              <button
                                key={tab}
                                type="button"
                                onClick={() => setOrderStatusFilter(tab)}
                                className={\`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded whitespace-nowrap transition-colors \${orderStatusFilter === tab ? "bg-white text-editorial-accent shadow-sm" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/50"}\`}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>
                          <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                            <input
                              type="text"
                              value={orderSearchQuery}
                              onChange={(e) => setOrderSearchQuery(e.target.value)}
                              placeholder="Search orders..."
                              className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:border-editorial-accent focus:ring-1 focus:ring-editorial-accent outline-none"
                            />
                          </div>
                        </div>

                        {filteredOrders.length > 0 ? (
                          <div className="space-y-4">
                            {filteredOrders.map(renderOrderCard)}
                          </div>
                        ) : (
                          <div className="text-center py-12 bg-white border border-neutral-100 rounded-xl space-y-2">
                            <p className="text-sm text-neutral-500">No orders match your search and filter criteria.</p>
                          </div>
                        )}
                      </div>
                  );`
);

if (content === returnBlockReplaced) {
  console.log("No replacements made. Script failed to match strings.");
} else {
  fs.writeFileSync(file, returnBlockReplaced, "utf8");
  console.log("Updated AdminDashboard.tsx successfully.");
}

