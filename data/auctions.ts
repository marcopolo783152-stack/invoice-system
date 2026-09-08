import { AuctionItem } from "@/types";

export const INITIAL_AUCTIONS: AuctionItem[] = [
  {
    id: "auc-lot-101",
    lotNumber: 101,
    title: "Magnificent Antique Persian Kashan Mohtasham Silk & Wool Carpet",
    sku: "KAS-1049-IR",
    origin: "Persia (Central Iran)",
    dimensions: "9' 2\" x 12' 4\"",
    material: "100% Fine Kork Wool & Pure Luminous Silk Highlights",
    age: "Circa 1890 (Antique - 130+ yrs)",
    condition: "Museum Pristine - Full Original Selvedges",
    estimatedLow: 12000,
    estimatedHigh: 18000,
    startingBid: 8500,
    reservePrice: 11000,
    currentBid: 10500,
    totalBids: 14,
    minBidIncrement: 500,
    bids: [
      {
        id: "bid-1",
        auctionId: "auc-lot-101",
        bidderName: "Collector 410",
        bidderEmail: "col***@gmail.com",
        bidderPaddleNumber: "P-410",
        amount: 8500,
        timestamp: "2026-09-07T14:30:00.000Z"
      },
      {
        id: "bid-2",
        auctionId: "auc-lot-101",
        bidderName: "Collector 812",
        bidderEmail: "art***@outlook.com",
        bidderPaddleNumber: "P-812",
        amount: 9500,
        timestamp: "2026-09-08T09:15:00.000Z"
      },
      {
        id: "bid-3",
        auctionId: "auc-lot-101",
        bidderName: "Private Client D.C.",
        bidderEmail: "geo***@dc.gov",
        bidderPaddleNumber: "P-205",
        amount: 10500,
        timestamp: "2026-09-08T11:00:00.000Z"
      }
    ],
    images: [
      "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=1200"
    ],
    description: "An extraordinary masterwork from the legendary workshop of Hadji Jalil / Mohtasham in Kashan. Woven with an exceptionally dense knot count in hand-spun mountain Kork wool accented with luminous real silk. The arabesque foliage and double-medallion composition glow with deep madder root and indigo tones. Authenticity and provenance certified by Marco Polo Oriental Rugs.",
    provenance: "Acquired from a distinguished Georgetown, D.C. estate collection; previously exhibited in 1954 New York Oriental Rug Society.",
    startDate: "2026-09-01T00:00:00.000Z",
    endDate: "2026-09-15T20:00:00.000Z",
    status: "live"
  },
  {
    id: "auc-lot-102",
    lotNumber: 102,
    title: "Rare Northwest Persian Serapi Heriz Tribal Masterpiece",
    sku: "SER-2084-AZ",
    origin: "Persia (Azerbaijan / Heriz Region)",
    dimensions: "11' 6\" x 15' 2\"",
    material: "100% Hand-Spun Highland Wool on Thick Cotton Foundation",
    age: "Vintage (Circa 1930)",
    condition: "Excellent Collector Condition - Lustrous Natural Abrash",
    estimatedLow: 9000,
    estimatedHigh: 14000,
    startingBid: 6000,
    reservePrice: 8000,
    currentBid: 7800,
    totalBids: 9,
    minBidIncrement: 300,
    bids: [
      {
        id: "bid-102-1",
        auctionId: "auc-lot-102",
        bidderName: "Patron 119",
        bidderEmail: "pat***@aol.com",
        bidderPaddleNumber: "P-119",
        amount: 6000,
        timestamp: "2026-09-06T18:00:00.000Z"
      },
      {
        id: "bid-102-2",
        auctionId: "auc-lot-102",
        bidderName: "Collector 304",
        bidderEmail: "mcl***@gmail.com",
        bidderPaddleNumber: "P-304",
        amount: 7800,
        timestamp: "2026-09-08T08:30:00.000Z"
      }
    ],
    images: [
      "https://images.unsplash.com/photo-1543248939-ff40856f65d4?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&q=80&w=1200"
    ],
    description: "Serapi rugs represent the pinnacle of rustic village artistry in Persia. This oversized room masterpiece boasts an expansive eight-point anchor medallion framed by sweeping oak leaf and palmette spandrels. Organic madder terracotta, deep cobalt, and soft saffron dyes provide a majestic room presence.",
    provenance: "From a private Virginia Hunt Country equestrian residence.",
    startDate: "2026-09-01T00:00:00.000Z",
    endDate: "2026-09-16T21:00:00.000Z",
    status: "live"
  },
  {
    id: "auc-lot-103",
    lotNumber: 103,
    title: "Pure Silk Sultan Isfahan Tree of Life Gallery Rug",
    sku: "ISF-3021-SL",
    origin: "Persia (Isfahan Workshop)",
    dimensions: "5' 6\" x 8' 2\"",
    material: "100% Pure Luminous Silk on Silk Warp & Weft",
    age: "Antique (Circa 1910)",
    condition: "Pristine Museum Quality - Shimmering Natural Sheen",
    estimatedLow: 18000,
    estimatedHigh: 25000,
    startingBid: 12000,
    reservePrice: 15000,
    currentBid: 16500,
    totalBids: 11,
    minBidIncrement: 500,
    bids: [
      {
        id: "bid-103-1",
        auctionId: "auc-lot-103",
        bidderName: "Collector 99",
        bidderEmail: "inv***@silkrugs.com",
        bidderPaddleNumber: "P-099",
        amount: 12000,
        timestamp: "2026-09-05T12:00:00.000Z"
      },
      {
        id: "bid-103-2",
        auctionId: "auc-lot-103",
        bidderName: "Paddle 520",
        bidderEmail: "del***@nyc.rr.com",
        bidderPaddleNumber: "P-520",
        amount: 16500,
        timestamp: "2026-09-08T10:45:00.000Z"
      }
    ],
    images: [
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1562577309-4932fdd64cd1?auto=format&fit=crop&q=80&w=1200"
    ],
    description: "An extraordinary silk weaving displaying songbirds, peacocks, and flowering vines springing from the sacred Tree of Life. Exceeds 900 hand-tied knots per square inch. Reflects light with dramatic color shifting from silvery pearl to saturated ruby.",
    provenance: "Private European Diplomatic Collection, Geneva; acquired 1978.",
    startDate: "2026-09-01T00:00:00.000Z",
    endDate: "2026-09-18T19:00:00.000Z",
    status: "live"
  }
];
