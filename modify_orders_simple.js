
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "components", "public", "AdminDashboard.tsx");
let content = fs.readFileSync(file, "utf8");

const startStr = `{orders.map((o) => {`;
const endRegex = /                  <\/div>\s*?\n\s*?\);\s*?\n\s*?}\)}/;

const newStart = `{(() => {
                  const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                  const activeOrders = sortedOrders.filter(o => o.status !== "Delivered" && o.status !== "Cancelled");
                  const deliveredOrders = sortedOrders.filter(o => o.status === "Delivered");
                  const cancelledOrders = sortedOrders.filter(o => o.status === "Cancelled");
                  
                  const renderOrderCard = (o: any) => {`;

const newEnd = `                  </div>
                  );
                  };

                  return (
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
                  );
                })()}`;

if (!content.includes(startStr)) {
    console.log("Could not find start string");
    process.exit(1);
}
if (!endRegex.test(content)) {
    console.log("Could not find end string");
    process.exit(1);
}

content = content.replace(startStr, newStart);
content = content.replace(endRegex, newEnd);

fs.writeFileSync(file, content, "utf8");
console.log("Success simple");

