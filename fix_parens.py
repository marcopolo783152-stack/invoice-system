import os

filepath = "z:/MNS Important tools/marco-polo-merge/Invoices/components/public/Hero.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("onChange={(e) => setWInches(e.target.value === '' ? '' : Math.min(11, Math.max(0, Number(e.target.value)))))}", "onChange={(e) => setWInches(e.target.value === '' ? '' : Math.min(11, Math.max(0, Number(e.target.value)))))}")
content = content.replace("onChange={(e) => setLInches(e.target.value === '' ? '' : Math.min(11, Math.max(0, Number(e.target.value)))))}", "onChange={(e) => setLInches(e.target.value === '' ? '' : Math.min(11, Math.max(0, Number(e.target.value)))))}")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
