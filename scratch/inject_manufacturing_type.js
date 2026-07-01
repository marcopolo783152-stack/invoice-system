const fs = require('fs');

const path = 'components/public/AdminDashboard.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. State definition
code = code.replace(
  'const [rugName, setRugName] = useState("");',
  'const [rugName, setRugName] = useState("");\n  const [rugManufacturingType, setRugManufacturingType] = useState<"Handmade" | "Machine-made">("Handmade");'
);

// 2. Populate in edit
code = code.replace(
  'setRugName(r.name);',
  'setRugName(r.name);\n      setRugManufacturingType(r.manufacturingType || "Handmade");'
);

// 3. Reset in clear
code = code.replace(
  'setRugName("");',
  'setRugName("");\n      setRugManufacturingType("Handmade");'
);

// 4. Save object
code = code.replace(
  'name: rugName,',
  'name: rugName,\n      manufacturingType: rugManufacturingType,'
);

// 5. Form Field (Add before Size Category)
const sizeCategoryLabel = '<label className="block text-neutral-500 font-semibold uppercase">Size Category</label>';
const newField = `
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-semibold uppercase">Type</label>
                  <select
                    value={rugManufacturingType}
                    onChange={(e) => setRugManufacturingType(e.target.value as any)}
                    className="w-full bg-stone-50 border border-neutral-200 rounded-lg py-2 px-3 outline-none focus:border-amber-500 text-xs"
                  >
                    <option value="Handmade">Handmade</option>
                    <option value="Machine-made">Machine-made</option>
                  </select>
                </div>
`;
code = code.replace(
  '<div className="space-y-1">\n                  ' + sizeCategoryLabel,
  newField + '\n                <div className="space-y-1">\n                  ' + sizeCategoryLabel
);

// 6. Inventory List UI
code = code.replace(
  '<div>{r.dimensions}</div>',
  `<div>{r.dimensions}</div>
                          {r.manufacturingType === 'Machine-made' ? (
                              <span className="inline-block px-2 py-0.5 mt-1 bg-stone-100 text-stone-600 text-[10px] font-bold rounded-sm border border-stone-200">MACHINE</span>
                          ) : (
                              <span className="inline-block px-2 py-0.5 mt-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-sm border border-amber-200">HANDMADE</span>
                          )}`
);

fs.writeFileSync(path, code, 'utf8');
console.log("Updated AdminDashboard.tsx");
