
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "components", "public", "Hero.tsx");
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  "const { rugs, reviews, sendChatMessage, addCleaningBooking, currentUser, heroCoverPhotos } = useStore();",
  "const { rugs, reviews, sendChatMessage, addCleaningBooking, currentUser, heroCoverPhotos, submitReview } = useStore();"
);

content = content.replace(
  "const { submitReview } = useStore.getState();",
  ""
);

fs.writeFileSync(file, content, "utf8");
console.log("Fixed useStore");

