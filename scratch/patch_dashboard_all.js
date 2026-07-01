const fs = require('fs');

const file = 'components/public/AdminDashboard.tsx';
let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

// 1. Import generateAndDownloadReceiptPDF
if (!content.includes('generateAndDownloadReceiptPDF')) {
  content = content.replace('import { BulkImport } from "./BulkImport";', 'import { BulkImport } from "./BulkImport";\nimport { generateAndDownloadReceiptPDF } from "@/utils/pdf";');
}

// 2. Import FileDownloader icon (maybe Printer)
if (!content.includes('Printer')) {
  content = content.replace('Mail,', 'Mail,\n  Printer,');
}
if (!content.includes('Banknote')) {
    content = content.replace('Camera\n}', 'Camera,\n  Banknote\n}');
}

// 3. Add Free Shipping Toggle in form
const weightInputBlock = `<label className="block text-neutral-500 font-semibold uppercase">Shipping Weight (lbs)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={rugWeight}
                    onChange={(e) => setRugWeight(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 3.5"
                    className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500 font-mono text-xs"
                  />
                </div>`;

const weightInputWithShipping = `<label className="block text-neutral-500 font-semibold uppercase">Shipping Weight (lbs)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={rugWeight}
                    onChange={(e) => setRugWeight(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 3.5"
                    className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-semibold uppercase">Shipping Offer</label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer h-full pb-2">
                    <input 
                      type="checkbox"
                      checked={rugIsFreeShipping}
                      onChange={(e) => setRugIsFreeShipping(e.target.checked)}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                    />
                    <span className="text-sm font-semibold text-neutral-800">Free Shipping</span>
                  </label>
                </div>`;

if (content.includes(weightInputBlock) && !content.includes('Shipping Offer')) {
  content = content.replace(weightInputBlock, weightInputWithShipping);
}

// 4. Add "Print Invoice" Button
const emailInvoiceBlock = `<button
                            type="button"
                            onClick={async () => {
                              try {
                                alert('Sending invoice via SendGrid...');
                                const res = await fetch('/api/notify-order', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ order: o, shopProfile, type: 'invoice' })
                                });
                                if (res.ok) alert('Invoice Email Sent Successfully!');
                                else alert('Failed to send email.');
                              } catch(e) {
                                alert('Error sending email.');
                              }
                            }}
                            className="flex-1 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold uppercase tracking-wider text-sm rounded transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            <span>Email Invoice</span>
                          </button>`;

const printAndEmailInvoiceBlock = `<button
                            type="button"
                            onClick={() => generateAndDownloadReceiptPDF(o, shopProfile, logoUrl)}
                            className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-wider text-sm rounded transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Print PDF</span>
                          </button>\n                          ` + emailInvoiceBlock;

if (content.includes(emailInvoiceBlock) && !content.includes('Print PDF')) {
  content = content.replace(emailInvoiceBlock, printAndEmailInvoiceBlock);
}

// 5. Add Transactions Tab button in sidebar
const ordersTabButton = `{activeTab === "orders" && "Escrow Invoices & Dispatch Logs"}`;
const transactionsTabName = `{activeTab === "transactions" && "System Transactions Ledger"}`;
if (content.includes(ordersTabButton) && !content.includes(transactionsTabName)) {
  content = content.replace(ordersTabButton, ordersTabButton + '\n              ' + transactionsTabName);
}

const ordersNavButton = `<a 
              href="#" 
              onClick={(e) => { e.preventDefault(); setActiveTab("orders"); }}
              className={\`block p-4 rounded-xl transition \${activeTab === "orders" ? "bg-amber-100 text-amber-900 shadow-sm" : "text-neutral-500 hover:bg-neutral-100"}\`}
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4.5 w-4.5" />
                <span>Invoice System</span>
              </div>
            </a>`;
const transactionsNavButton = `<a 
              href="#" 
              onClick={(e) => { e.preventDefault(); setActiveTab("transactions"); }}
              className={\`block p-4 rounded-xl transition \${activeTab === "transactions" ? "bg-amber-100 text-amber-900 shadow-sm" : "text-neutral-500 hover:bg-neutral-100"}\`}
            >
              <div className="flex items-center gap-3">
                <Banknote className="h-4.5 w-4.5" />
                <span>Transactions</span>
              </div>
            </a>`;
            
if (content.includes(ordersNavButton) && !content.includes('<span>Transactions</span>')) {
  content = content.replace(ordersNavButton, ordersNavButton + '\n            ' + transactionsNavButton);
}

// 6. Add Transactions View Content
const cleaningTabEnd = `        {/* --- TAB E: CLEANING & RESTORATION --- */}`;
const transactionsTabView = `        {/* --- TAB: TRANSACTIONS --- */}
        {activeTab === "transactions" && (
          <div className="bg-white p-6 rounded-2xl shadow-md border border-neutral-200/50 space-y-6 text-left">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-serif text-base font-bold text-neutral-900 uppercase tracking-wider">System Transactions Ledger</h2>
                <p className="text-xs text-neutral-400">View a chronological history of all financial transactions and order values.</p>
              </div>
              <div className="text-right">
                <span className="block text-xs uppercase text-gray-400 font-bold tracking-widest">Total Revenue</span>
                <span className="text-2xl font-serif text-emerald-700">$\{orders.filter(o => o.status !== "Cancelled").reduce((sum, o) => sum + (o.total || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-sm border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 uppercase tracking-wider text-xs text-neutral-400 font-semibold bg-stone-50">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(o => (
                    <tr key={o.id} className="border-b border-neutral-100 hover:bg-stone-50 transition">
                      <td className="py-3 px-4 text-gray-600">{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 font-mono text-xs text-neutral-500">{o.id}</td>
                      <td className="py-3 px-4 font-bold text-neutral-800">{o.customerInfo?.name || "N/A"}</td>
                      <td className="py-3 px-4">
                        {o.paymentDetails?.cardNumber ? \`Card ending in \${o.paymentDetails.cardNumber.slice(-4)}\` : (o.paymentDetails?.method || "N/A")}
                      </td>
                      <td className="py-3 px-4">
                        <span className={\`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider \${o.status === "Cancelled" ? "bg-red-100 text-red-700" : o.status === "Delivered" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}\`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-serif text-emerald-700 font-bold">
                        $\{o.total ? o.total.toLocaleString(undefined, {minimumFractionDigits: 2}) : "0.00"}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">No transactions recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
`;

if (content.includes(cleaningTabEnd) && !content.includes('System Transactions Ledger')) {
  content = content.replace(cleaningTabEnd, transactionsTabView + cleaningTabEnd);
}


fs.writeFileSync(file, content);
console.log('Patched AdminDashboard.tsx successfully');
