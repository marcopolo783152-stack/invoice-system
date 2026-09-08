const fs = require('fs');
let code = fs.readFileSync('components/public/AdminDashboard.tsx', 'utf8');

const tabBtn = `
            <button
              onClick={() => setActiveTab("crm")}
              className={\`w-full flex items-center gap-3 py-2.5 px-3 rounded-none font-bold uppercase tracking-wider transition cursor-pointer \${
                activeTab === "crm" ? "bg-editorial-accent text-white" : "text-gray-300 hover:bg-white/10"
              }\`}
            >
              <Users className="h-4.5 w-4.5" />
              <span>Client CRM</span>
            </button>
            
            <button
              onClick={() => setActiveTab("orders")}
`;

code = code.replace(/<button[^>]+onClick=\{\(\) => setActiveTab\("orders"\)\}[^>]+>/, match => tabBtn.replace('<button\n              onClick={() => setActiveTab("orders")}', match));

// Also add title handling
code = code.replace(
  '{activeTab === "orders" && "Customer Orders & Dispatch Logs"}',
  '{activeTab === "crm" && "Client Relationship Management"}\n              {activeTab === "orders" && "Customer Orders & Dispatch Logs"}'
);

// Also render the component
const tabRender = `
        {activeTab === "crm" && (
          <CRMAdminTab />
        )}
        
        {/* --- TAB C: ORDER MANAGEMENT (CUSTOMER ORDERS) --- */}
`;

code = code.replace('{/* --- TAB C: ORDER MANAGEMENT (CUSTOMER ORDERS) --- */}', tabRender);

fs.writeFileSync('components/public/AdminDashboard.tsx', code);
