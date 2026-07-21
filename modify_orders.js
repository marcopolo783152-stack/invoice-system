
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "components", "public", "AdminDashboard.tsx");
let content = fs.readFileSync(file, "utf8");

const startStr = `{orders.map((o) => {`;
const endStr = `                  </div>\n                  );\n                })}`;

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex) + endStr.length;

if (startIndex === -1 || endIndex < startStr.length) {
    console.log("Could not find the block");
    process.exit(1);
}

const mapBody = content.substring(startIndex + startStr.length, content.indexOf(endStr, startIndex));
const innerBody = mapBody.trim();

const newBlock = `{(() => {
                  const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                  const activeOrders = sortedOrders.filter(o => o.status !== "Delivered" && o.status !== "Cancelled");
                  const deliveredOrders = sortedOrders.filter(o => o.status === "Delivered");
                  const cancelledOrders = sortedOrders.filter(o => o.status === "Cancelled");
                  
                  const renderOrderCard = (o) => {
                    ${innerBody.replace(/\n/g, "\n                    ")}
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

content = content.substring(0, startIndex) + newBlock + content.substring(endIndex);
fs.writeFileSync(file, content, "utf8");
console.log("Success");

