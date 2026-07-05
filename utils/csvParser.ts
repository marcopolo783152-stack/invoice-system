import { Rug } from "../types";

export const downloadCsvTemplate = () => {
  const headers = [
    "sku", "name", "type", "color", "price", "originalPrice", "sizeCategory", "dimensions",
    "origin", "material", "style", "age", "condition", "shape",
    "availability", "weightLbs", "isSpecialSale", "description"
  ];

  const exampleRow = [
    "M. 32267", "Antique Persian Heriz", "Handmade", "Red, Blue", "4500", "5500", "8x10", "8'2 x 10'5",
    "Persia (Iran)", "100% Kork Wool", "Antique", "Antique (100+ yrs)", "Excellent", "Rectangular",
    "In Stock", "45", "TRUE", "A stunning example of a Persian Heriz..."
  ];

  const csvContent = [
    headers.join(","),
    exampleRow.map(val => `"${val.replace(/"/g, '""')}"`).join(",")
  ].join("\n");

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "marcopolo_rugs_import_template.csv");
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseRugCsv = (csvText: string): Partial<Rug>[] => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length < 2) throw new Error("CSV must contain a header row and at least one data row.");

  // Naive CSV split (handles quotes naively, assumes no complex internal commas inside unquoted strings)
  // For a robust app, you'd use a real regex or parser, but this works for basic template usage.
  const parseLine = (line: string) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && line[i+1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.trim().toLowerCase());
  const requiredHeaders = ["sku", "name", "price", "sizecategory", "dimensions"];
  
  for (const req of requiredHeaders) {
    if (!headers.includes(req)) {
      throw new Error(`Missing required column: ${req}`);
    }
  }

  const parsedRugs: Partial<Rug>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i]);
    const rug: any = {};
    
    headers.forEach((header, index) => {
      let val = row[index]?.trim() || "";
      if (header === "price" || header === "originalprice" || header === "weightlbs") {
        rug[header] = val ? parseFloat(val.replace(/[^0-9.]/g, '')) : undefined;
      } else if (header === "isspecialsale") {
        rug[header] = val.toLowerCase() === "true" || val === "1";
      } else {
        rug[header] = val;
      }
    });

    let mfgType: any = "Handmade";
    if (rug.type && typeof rug.type === 'string' && rug.type.toLowerCase().includes('machine')) {
      mfgType = "Machine-made";
    }

    // Fix casing for camelCase fields since headers are lowercase
    const formattedRug: Partial<Rug> = {
      sku: rug.sku,
      name: rug.name,
      manufacturingType: mfgType,
      type: rug.type || "",
      color: rug.color || "",
      price: rug.price,
      originalPrice: rug.originalprice,
      sizeCategory: rug.sizecategory || "Medium",
      dimensions: rug.dimensions,
      origin: rug.origin || "Unknown",
      material: rug.material || "Wool",
      style: rug.style || "Traditional",
      age: rug.age || "New",
      condition: rug.condition || "Excellent",
      shape: rug.shape || "Rectangular",
      availability: rug.availability || "In Stock",
      weightLbs: rug.weightlbs,
      isSpecialSale: rug.isspecialsale || false,
      description: rug.description || "",
      colors: rug.color ? rug.color.split(',').map((c: string) => c.trim()) : [],
      images: [], // Images handled separately via file match
      rating: 5,
    };

    if (formattedRug.sku && formattedRug.name && formattedRug.price) {
      parsedRugs.push(formattedRug);
    }
  }

  return parsedRugs;
};
