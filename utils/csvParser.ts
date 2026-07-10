import { Rug } from "../types";
import Papa from "papaparse";

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
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  if (result.errors && result.errors.length > 0) {
    // If there's an error on the very first row, it might be structural
    console.error("CSV Parsing Errors:", result.errors);
    throw new Error(`CSV Parsing Error: ${result.errors[0].message} (Row ${result.errors[0].row})`);
  }

  const rows = result.data as Record<string, string>[];
  if (rows.length === 0) {
    throw new Error("CSV must contain a header row and at least one data row.");
  }

  const firstRowHeaders = Object.keys(rows[0]);
  const hasSku = firstRowHeaders.includes("sku");
  const hasName = firstRowHeaders.includes("name");
  const hasPrice = firstRowHeaders.includes("price");
  const hasSizeCategory = firstRowHeaders.includes("sizecategory");
  // Some users might have 'dimension' instead of 'dimensions', accept both!
  const hasDimensions = firstRowHeaders.includes("dimensions") || firstRowHeaders.includes("dimension");

  if (!hasSku) throw new Error("Missing required column: sku");
  if (!hasName) throw new Error("Missing required column: name");
  if (!hasPrice) throw new Error("Missing required column: price");
  if (!hasSizeCategory) throw new Error("Missing required column: sizeCategory");
  if (!hasDimensions) throw new Error("Missing required column: dimensions or dimension");

  const parsedRugs: Partial<Rug>[] = [];

  for (const row of rows) {
    const rug: any = {};
    
    for (const [key, value] of Object.entries(row)) {
      const val = value?.trim() || "";
      if (key === "price" || key === "originalprice" || key === "weightlbs") {
        rug[key] = val ? parseFloat(val.replace(/[^0-9.]/g, '')) : undefined;
      } else if (key === "isspecialsale") {
        rug[key] = val.toLowerCase() === "true" || val === "1";
      } else {
        rug[key] = val;
      }
    }

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
      dimensions: rug.dimensions || rug.dimension || "",
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
