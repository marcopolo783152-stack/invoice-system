
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "components", "public", "Hero.tsx");
let content = fs.readFileSync(file, "utf8");

const insertAfter = `  const [activeSlide, setActiveSlide] = useState(0);`;
const stateStr = `
  // Leave Review State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewName, setReviewName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewRugId, setReviewRugId] = useState("general");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewText.trim()) return;
    const { submitReview } = useStore.getState();
    submitReview(reviewRugId, reviewName, reviewRating, reviewText);
    setReviewSubmitted(true);
    setTimeout(() => {
        setIsReviewModalOpen(false);
        setReviewSubmitted(false);
        setReviewName("");
        setReviewText("");
        setReviewRating(5);
    }, 2000);
  };
`;

content = content.replace(insertAfter, insertAfter + "\n" + stateStr);
fs.writeFileSync(file, content, "utf8");
console.log("Success state added");

