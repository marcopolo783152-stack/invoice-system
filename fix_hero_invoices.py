import os

filepath = "z:/MNS Important tools/marco-polo-merge/Invoices/components/public/Hero.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. State changes
content = content.replace(
'''  const [cleaningPreferredDate, setCleaningPreferredDate] = useState("2026-07-01");
  const [cleaningPreferredTime, setCleaningPreferredTime] = useState("10:00");
  
  // Custom Dimension Sizing States
  const [dimensionUnit, setDimensionUnit] = useState<"Feet & Inches" | "Total Inches" | "Meters (M)">("Feet & Inches");
  
  // Feet & Inches inputs (e.g. 8'3 x 10'1)
  const [wFeet, setWFeet] = useState<number>(8);
  const [wInches, setWInches] = useState<number>(3);
  const [lFeet, setLFeet] = useState<number>(10);
  const [lInches, setLInches] = useState<number>(1);
  
  // Total Inches inputs
  const [wTotalInches, setWTotalInches] = useState<number>(99);
  const [lTotalInches, setLTotalInches] = useState<number>(121);

  // Meters inputs
  const [wMeters, setWMeters] = useState<number>(2.5);
  const [lMeters, setLMeters] = useState<number>(3.0);''',
'''  const [cleaningPreferredDate, setCleaningPreferredDate] = useState("");
  const [cleaningPreferredTime, setCleaningPreferredTime] = useState("");
  
  // Custom Dimension Sizing States
  const [dimensionUnit, setDimensionUnit] = useState<"Feet & Inches" | "Total Inches" | "Meters (M)">("Feet & Inches");
  
  // Feet & Inches inputs (e.g. 8'3 x 10'1)
  const [wFeet, setWFeet] = useState<number | "">("");
  const [wInches, setWInches] = useState<number | "">("");
  const [lFeet, setLFeet] = useState<number | "">("");
  const [lInches, setLInches] = useState<number | "">("");
  
  // Total Inches inputs
  const [wTotalInches, setWTotalInches] = useState<number | "">("");
  const [lTotalInches, setLTotalInches] = useState<number | "">("");

  // Meters inputs
  const [wMeters, setWMeters] = useState<number | "">("");
  const [lMeters, setLMeters] = useState<number | "">("");'''
)

# 2. Calculation changes
content = content.replace(
'''  if (dimensionUnit === "Feet & Inches") {
    calculatedWidth = Number(wFeet) + Number(wInches) / 12;
    calculatedLength = Number(lFeet) + Number(lInches) / 12;
    areaSqft = calculatedWidth * calculatedLength;
    sizeDescription = `${wFeet}'${wInches}" × ${lFeet}'${lInches}"`;
  } else if (dimensionUnit === "Total Inches") {
    calculatedWidth = Number(wTotalInches) / 12;
    calculatedLength = Number(lTotalInches) / 12;
    areaSqft = calculatedWidth * calculatedLength;
    sizeDescription = `${wTotalInches}" × ${lTotalInches}" (${Math.floor(wTotalInches / 12)}'${wTotalInches % 12}" × ${Math.floor(lTotalInches / 12)}'${lTotalInches % 12}")`;
  } else if (dimensionUnit === "Meters (M)") {
    // 1 meter = 3.28084 feet
    calculatedWidth = Number(wMeters) * 3.28084;
    calculatedLength = Number(lMeters) * 3.28084;
    areaSqft = calculatedWidth * calculatedLength;
    sizeDescription = `${wMeters} m × ${lMeters} m`;
  }''',
'''  if (dimensionUnit === "Feet & Inches") {
    calculatedWidth = Number(wFeet || 0) + Number(wInches || 0) / 12;
    calculatedLength = Number(lFeet || 0) + Number(lInches || 0) / 12;
    areaSqft = calculatedWidth * calculatedLength;
    sizeDescription = `${wFeet || 0}'${wInches || 0}" × ${lFeet || 0}'${lInches || 0}"`;
  } else if (dimensionUnit === "Total Inches") {
    calculatedWidth = Number(wTotalInches || 0) / 12;
    calculatedLength = Number(lTotalInches || 0) / 12;
    areaSqft = calculatedWidth * calculatedLength;
    sizeDescription = `${wTotalInches || 0}" × ${lTotalInches || 0}" (${Math.floor(Number(wTotalInches || 0) / 12)}'${Number(wTotalInches || 0) % 12}" × ${Math.floor(Number(lTotalInches || 0) / 12)}'${Number(lTotalInches || 0) % 12}")`;
  } else if (dimensionUnit === "Meters (M)") {
    // 1 meter = 3.28084 feet
    calculatedWidth = Number(wMeters || 0) * 3.28084;
    calculatedLength = Number(lMeters || 0) * 3.28084;
    areaSqft = calculatedWidth * calculatedLength;
    sizeDescription = `${wMeters || 0} m × ${lMeters || 0} m`;
  }'''
)

# 3. onChange changes
replacements = {
    "onChange={(e) => setWFeet(Math.max(0, Number(e.target.value)))}": "onChange={(e) => setWFeet(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}",
    "onChange={(e) => setWInches(Math.min(11, Math.max(0, Number(e.target.value))))}": "onChange={(e) => setWInches(e.target.value === '' ? '' : Math.min(11, Math.max(0, Number(e.target.value)))))}",
    "onChange={(e) => setLFeet(Math.max(0, Number(e.target.value)))}": "onChange={(e) => setLFeet(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}",
    "onChange={(e) => setLInches(Math.min(11, Math.max(0, Number(e.target.value))))}": "onChange={(e) => setLInches(e.target.value === '' ? '' : Math.min(11, Math.max(0, Number(e.target.value)))))}",
    "onChange={(e) => setWTotalInches(Math.max(1, Number(e.target.value)))}": "onChange={(e) => setWTotalInches(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}",
    "onChange={(e) => setLTotalInches(Math.max(1, Number(e.target.value)))}": "onChange={(e) => setLTotalInches(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}",
    "onChange={(e) => setWMeters(Math.max(0.1, Number(e.target.value)))}": "onChange={(e) => setWMeters(e.target.value === '' ? '' : Math.max(0.1, Number(e.target.value)))}",
    "onChange={(e) => setLMeters(Math.max(0.1, Number(e.target.value)))}": "onChange={(e) => setLMeters(e.target.value === '' ? '' : Math.max(0.1, Number(e.target.value)))}"
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
