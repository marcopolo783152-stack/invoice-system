
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "components", "public", "Hero.tsx");
let content = fs.readFileSync(file, "utf8");

// We need to add state for the review modal
const stateInsertStr = `  // Approved reviews for home
  const approvedReviews = reviews.filter(rev => rev.isApproved);`;
  
const stateInsertIdx = content.indexOf(stateInsertStr);
if (stateInsertIdx !== -1) {
    const stateStr = `  // Leave Review State
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
    content = content.substring(0, stateInsertIdx) + stateStr + content.substring(stateInsertIdx);
}

// Now insert the button to open the modal in the Customer Reviews Board
const btnInsertStr = `<h2 className="font-serif text-3xl sm:text-4xl text-editorial-text font-light tracking-wide">Showroom Testimonials</h2>`;
const btnInsertIdx = content.indexOf(btnInsertStr);
if (btnInsertIdx !== -1) {
    const endOfPara = content.indexOf(`</p>`, btnInsertIdx) + 4;
    const btnStr = `\n            <button onClick={() => setIsReviewModalOpen(true)} className="mt-4 px-6 py-2 bg-editorial-accent text-white font-serif text-sm hover:bg-neutral-800 transition">Leave a Review</button>`;
    content = content.substring(0, endOfPara) + btnStr + content.substring(endOfPara);
}

// Now insert the modal JSX before the final section
const finalSectionStr = `{/* 7. Grand Finale Call-to-Action */}`;
const finalSectionIdx = content.indexOf(finalSectionStr);
if (finalSectionIdx !== -1) {
    const modalStr = `
      {/* Leave a Review Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setIsReviewModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="font-serif text-2xl text-editorial-text mb-2">Leave a Review</h3>
            <p className="text-sm text-gray-500 mb-6">Share your experience with Marco Polo.</p>
            
            {reviewSubmitted ? (
                <div className="p-4 bg-green-50 text-green-800 text-center text-sm font-medium border border-green-200">
                    Review submitted for approval! Thank you.
                </div>
            ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Your Name</label>
                    <input required type="text" value={reviewName} onChange={e => setReviewName(e.target.value)} className="w-full border border-gray-300 p-2 text-sm focus:ring-1 focus:ring-editorial-accent" placeholder="Jane Doe" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Which Rug? (Optional)</label>
                    <select value={reviewRugId} onChange={e => setReviewRugId(e.target.value)} className="w-full border border-gray-300 p-2 text-sm focus:ring-1 focus:ring-editorial-accent">
                        <option value="general">General Experience</option>
                        {rugs.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Rating</label>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} onClick={() => setReviewRating(star)} className={"w-6 h-6 cursor-pointer " + (star <= reviewRating ? "fill-editorial-accent text-editorial-accent" : "text-gray-300")} />
                        ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Your Review</label>
                    <textarea required value={reviewText} onChange={e => setReviewText(e.target.value)} rows="4" className="w-full border border-gray-300 p-2 text-sm focus:ring-1 focus:ring-editorial-accent" placeholder="Tell us about your experience..."></textarea>
                  </div>
                  <button type="submit" className="w-full bg-editorial-accent text-white py-3 text-sm font-semibold uppercase tracking-wider hover:bg-neutral-800 transition">Submit Review</button>
                </form>
            )}
          </div>
        </div>
      )}
`;
    content = content.substring(0, finalSectionIdx) + modalStr + content.substring(finalSectionIdx);
}

fs.writeFileSync(file, content, "utf8");
console.log("Success Hero Modification");

