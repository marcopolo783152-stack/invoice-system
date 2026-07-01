const fs = require('fs');

const path = 'components/public/ShopView.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add state
code = code.replace(
  'const [searchQuery, setSearchQuery] = useState("");',
  'const [searchQuery, setSearchQuery] = useState("");\n  const [activeMfgType, setActiveMfgType] = useState<"All" | "Handmade" | "Machine-made">("All");'
);

// 2. Add filter logic inside useMemo for filteredRugs
// Let's find the filter block
code = code.replace(
  'const filteredRugs = useMemo(() => {\n    return rugs.filter(rug => {',
  'const filteredRugs = useMemo(() => {\n    return rugs.filter(rug => {\n      const mfgMatch = activeMfgType === "All" || (rug.manufacturingType || "Handmade") === activeMfgType;\n      if (!mfgMatch) return false;'
);

// 3. Add Tabs UI before the search/sort bar
const searchBarRegex = /(<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">)/;
const tabsUI = `
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white/50 backdrop-blur-md p-1 rounded-full border border-neutral-200/50 shadow-sm">
            {['All', 'Handmade', 'Machine-made'].map(type => (
              <button
                key={type}
                onClick={() => setActiveMfgType(type as any)}
                className={\`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 \${
                  activeMfgType === type
                    ? 'bg-amber-800 text-white shadow-md'
                    : 'text-neutral-600 hover:text-amber-800 hover:bg-amber-50'
                }\`}
              >
                {type === 'All' ? 'All Collections' : type}
              </button>
            ))}
          </div>
        </div>
        
        $1
`;
code = code.replace(searchBarRegex, tabsUI);

// 4. Add Manufacturing Type Badge on the Rug Cards
const imgRegex = /(<div className="aspect-\[4\/5\] w-full overflow-hidden bg-neutral-100 relative">)/;
const badgeUI = `$1
                    {rug.manufacturingType === 'Machine-made' ? (
                      <div className="absolute top-3 right-3 z-10 bg-stone-100/90 backdrop-blur text-stone-600 text-[10px] font-bold px-2 py-1 rounded shadow-sm border border-stone-200 uppercase tracking-wider">
                        Machine-made
                      </div>
                    ) : (
                      <div className="absolute top-3 right-3 z-10 bg-amber-50/90 backdrop-blur text-amber-700 text-[10px] font-bold px-2 py-1 rounded shadow-sm border border-amber-200 uppercase tracking-wider">
                        Handmade
                      </div>
                    )}
`;
code = code.replace(new RegExp(imgRegex, 'g'), badgeUI);

fs.writeFileSync(path, code, 'utf8');
console.log("Updated ShopView.tsx");
