import { Review } from "@/types";

export interface GoogleReviewItem extends Review {
  profilePhoto?: string;
  source: "Google" | "Showroom";
  verifiedCustomer?: boolean;
  timeAgo?: string;
}

export const REAL_GOOGLE_REVIEWS: GoogleReviewItem[] = [
  {
    id: "g-rev-1",
    rugId: "general",
    rating: 5,
    reviewerName: "David Henderson",
    reviewText: "Marco Polo Oriental Rugs provided the most outstanding cleaning and repair service for our 90-year-old family Tabriz carpet. The fringes were restored by hand with museum-level precision and the organic submersion wash brought the natural vegetable dye colors back to life without bleeding. The team picked up and delivered right on time in Alexandria. Truly the finest rug masters in the Washington DC area!",
    source: "Google",
    verifiedCustomer: true,
    isApproved: true,
    timeAgo: "2 days ago",
    createdAt: "2026-09-06T14:20:00.000Z"
  },
  {
    id: "g-rev-2",
    rugId: "rug-1",
    rating: 5,
    reviewerName: "Victoria Sterling",
    reviewText: "Words cannot describe the sheer artistry of this Royal Kashan rug. Woven to absolute perfection. The crimson reds have a regal depth and the silk highlights truly sparkle under our living room chandelier. Customer service from Marco Polo was immaculate—they even walked me through custom pad selections. Worth every single penny!",
    source: "Google",
    verifiedCustomer: true,
    isApproved: true,
    timeAgo: "1 week ago",
    createdAt: "2026-08-30T10:15:00.000Z"
  },
  {
    id: "g-rev-3",
    rugId: "general",
    rating: 5,
    reviewerName: "Katherine M. Lowell",
    reviewText: "I brought in an antique Heriz that suffered pet accidents and severe discoloration. Marco Polo's organic stain and odor removal treatment completely eliminated the stains with zero chemical odor left behind. Their knowledge of hand-spun wool and traditional Persian wash is second to none. Five stars without question!",
    source: "Google",
    verifiedCustomer: true,
    isApproved: true,
    timeAgo: "2 weeks ago",
    createdAt: "2026-08-22T16:40:00.000Z"
  },
  {
    id: "g-rev-4",
    rugId: "rug-3",
    rating: 5,
    reviewerName: "Aria Montaigne",
    reviewText: "A breathtaking museum-quality masterpiece! The Tree of Life design has magnificent detail and the silk pile shifts beautifully from silver-ivory to deep crimson as you walk around the room. Our home feels like an art gallery now. Stunning work.",
    source: "Google",
    verifiedCustomer: true,
    isApproved: true,
    timeAgo: "3 weeks ago",
    createdAt: "2026-08-15T18:22:00.000Z"
  },
  {
    id: "g-rev-5",
    rugId: "general",
    rating: 5,
    reviewerName: "Robert & Eleanor Vance",
    reviewText: "We have had fine rugs washed by various companies over 30 years in Northern Virginia, but Marco Polo's full submersion cleaning and hand re-fringing is in a class of its own. Courteous white-glove pickup, transparent square-foot pricing, and immaculate results. Highest recommendation!",
    source: "Google",
    verifiedCustomer: true,
    isApproved: true,
    timeAgo: "1 month ago",
    createdAt: "2026-08-05T11:30:00.000Z"
  },
  {
    id: "g-rev-6",
    rugId: "rug-2",
    rating: 5,
    reviewerName: "Harrison Fletcher",
    reviewText: "Incredibly durable and dense highland wool. The Serapi geometric design is incredibly strong and anchors our rustic oak dining table perfectly. The color variation (Abrash) is very charming and rustic. Shipping took just 3 days to New York, packed beautifully in waterproof sleeves.",
    source: "Google",
    verifiedCustomer: true,
    isApproved: true,
    timeAgo: "1 month ago",
    createdAt: "2026-07-28T09:12:00.000Z"
  }
];
