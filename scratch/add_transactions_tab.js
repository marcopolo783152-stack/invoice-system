const fs = require('fs');

const file = 'components/public/AdminDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const invoiceSystemNav = `            <a
              href="/admin/invoices"
              className="w-full flex items-center justify-between py-2.5 px-3 rounded-none font-bold uppercase tracking-wider transition cursor-pointer text-gray-300 hover:bg-white/10 hover:text-white"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4.5 w-4.5" />
                <span>Invoice System</span>
              </div>
            </a>`;
            
const transactionsNav = `
            <button
              onClick={() => setActiveTab("transactions")}
              className={\`w-full flex items-center justify-between py-2.5 px-3 rounded-none font-bold uppercase tracking-wider transition cursor-pointer \${
                activeTab === "transactions" ? "bg-editorial-accent text-white" : "text-gray-300 hover:bg-white/10"
              }\`}
            >
              <div className="flex items-center gap-3">
                <Banknote className="h-4.5 w-4.5" />
                <span>Transactions</span>
              </div>
            </button>`;

if (content.includes(invoiceSystemNav) && !content.includes('<span>Transactions</span>')) {
  content = content.replace(invoiceSystemNav, transactionsNav + '\n' + invoiceSystemNav);
  fs.writeFileSync(file, content);
  console.log('Successfully added Transactions button to sidebar in AdminDashboard');
} else if (content.includes('<span>Transactions</span>')) {
  console.log('Transactions button already in sidebar');
} else {
  console.log('Could not find invoice system nav block');
}
