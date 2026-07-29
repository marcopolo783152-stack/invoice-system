
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "components", "public", "Hero.tsx");
let content = fs.readFileSync(file, "utf8");
content = content.replace("const handleReviewSubmit = (e) => {", "const handleReviewSubmit = (e: React.FormEvent) => {");
fs.writeFileSync(file, content, "utf8");
console.log("Fixed implicitly any e");

