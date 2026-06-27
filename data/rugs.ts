/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Rug } from "../types";

export const INITIAL_RUGS: Rug[] = [
  {
    id: "rug-1",
    name: "Royal Kashan Imperial Medallion Rug",
    sku: "KAS-1049-IR",
    price: 12450,
    originalPrice: 14200,
    sizeCategory: "Large",
    dimensions: "9' 2\" x 12' 4\"",
    origin: "Persia (Iran)",
    material: "100% Fine Kork Wool & Pure Silk Accents",
    style: "Traditional",
    age: "Antique (100+ yrs)",
    condition: "Pristine",
    colors: ["Imperial Red", "Royal Blue", "Antique Cream", "Sage Green"],
    shape: "Rectangular",
    availability: "In Stock",
    description: "An extraordinary masterwork from the historic weaving center of Kashan. This museum-quality rug features an intricate double-medallion layout surrounded by thousands of hand-tied floral patterns and sweeping arabesques. Knotted with incredibly dense, hand-spun Kork wool and highlighted by luminous pure silk thread, its luster shines naturally under ambient lighting. A true heirloom piece representing the pinnacle of Persian artistry.",
    images: [
      "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&q=80&w=1200", // main full rug
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=1200", // weave detail 1
      "https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=1200", // weave detail 2
      "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?auto=format&fit=crop&q=80&w=1200"  // room setting
    ],
    rating: 4.9
  },
  {
    id: "rug-2",
    name: "Heriz Serapi Hand-Spun Tribal Rug",
    sku: "SER-2084-AZ",
    price: 8900,
    sizeCategory: "Oversized",
    dimensions: "11' 6\" x 15' 2\"",
    origin: "Persia (Azerbaijan region)",
    material: "100% Hand-Spun Highland Wool on Cotton Warp",
    style: "Tribal",
    age: "Vintage (50-90 yrs)",
    condition: "Excellent",
    colors: ["Terracotta", "Indigo Blue", "Camel", "Saffron Yellow"],
    shape: "Rectangular",
    availability: "In Stock",
    description: "Woven by nomadic craftspeople in the rugged mountains of northwest Persia, this Serapi-style Heriz rug is a showcase of bold, geometric design. It features a majestic, oversized central medallion with step-edged profiles and highly stylized palmettes. The vibrant terracotta and deep indigo dyes are fully organic, derived from local madder root and wild indigo. Renowned for their exceptional durability and bold artistic expression, Serapi rugs are highly sought after by designers worldwide.",
    images: [
      "https://images.unsplash.com/photo-1543248939-ff40856f65d4?auto=format&fit=crop&q=80&w=1200", // main rug
      "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&q=80&w=1200", // detail weave
      "https://images.unsplash.com/photo-1500336624444-0e6e225a3ee5?auto=format&fit=crop&q=80&w=1200"  // room setup
    ],
    rating: 4.8
  },
  {
    id: "rug-3",
    name: "Sultan Isfahan Tree of Life Pure Silk Rug",
    sku: "ISF-3021-SL",
    price: 18500,
    originalPrice: 21000,
    sizeCategory: "Medium",
    dimensions: "5' 6\" x 8' 2\"",
    origin: "Persia (Iran)",
    material: "100% Luminous Natural Silk on Silk Foundation",
    style: "Traditional",
    age: "Antique (100+ yrs)",
    condition: "Pristine",
    colors: ["Ivory", "Crimson", "Pale Turquoise", "Liquid Gold"],
    shape: "Rectangular",
    availability: "In Stock",
    description: "An incredibly rare, fully-silk masterpiece from the workshop of Isfahan's elite weavers. Rendering the classical 'Tree of Life' motif, it symbolizes eternal beauty, growth, and connection, populated by beautifully drawn exotic songbirds and nesting animals. Woven with an exceptionally tight density exceeding 1,000,000 knots per square meter, every vine, leaf, and feather is outlined with breathtaking precision. The silk pile catches and reflects light in a mesmerizing dance, shifting colors beautifully from different angles.",
    images: [
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=1200", // silk weave detail
      "https://images.unsplash.com/photo-1562577309-4932fdd64cd1?auto=format&fit=crop&q=80&w=1200", // pattern close up
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=1200"  // room setting
    ],
    rating: 5.0
  },
  {
    id: "rug-4",
    name: "Afghan Kazak Geometric Nomad Rug",
    sku: "KAZ-4091-AF",
    price: 3200,
    originalPrice: 3800,
    sizeCategory: "Medium",
    dimensions: "6' 1\" x 9' 0\"",
    origin: "Afghanistan",
    material: "100% Hand-Spun Lambswool & Vegetable Dyes",
    style: "Tribal",
    age: "New",
    condition: "Pristine",
    colors: ["Brick Red", "Mustard Gold", "Forest Green", "Ivory"],
    shape: "Rectangular",
    availability: "In Stock",
    description: "Woven in northern Afghanistan by traditional craftspeople, this Kazak rug exhibits bold tribal geometric medallions (known as 'guls') and striking borders. The hand-spun wool is exceptionally soft and chunky, giving it a delightful texture underfoot. All colors are derived strictly from native mountain plants, herbs, and walnut husks, creating unique horizontal color variations (abrash) that give this rug its rich, rustic character.",
    images: [
      "https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=1200", // main
      "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&q=80&w=1200", // weave detail
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1200"  // modern room
    ],
    rating: 4.7
  },
  {
    id: "rug-5",
    name: "Anatolian Oushak Soft Pastel Modern Rug",
    sku: "OUS-5028-TR",
    price: 5400,
    sizeCategory: "Large",
    dimensions: "8' 4\" x 10' 8\"",
    origin: "Turkey",
    material: "High-Grade Anatolian Sheep Wool on Cotton",
    style: "Modern",
    age: "New",
    condition: "Pristine",
    colors: ["Sage Green", "Peach Blossom", "Soft Cream", "Warm Sand"],
    shape: "Rectangular",
    availability: "In Stock",
    description: "Blending ancient Anatolian Turkish weaving methods with contemporary design palettes, this Oushak rug is perfect for today's luxury interiors. It showcases spacious, highly stylized floral motifs set against a serene pastel backdrop. Hand-knotted with premium sheep wool that has been double-washed for an incredibly soft pile and a subtle vintage sheen. It bridges classical elegance and modern sophistication effortlessly.",
    images: [
      "https://images.unsplash.com/photo-1500336624444-0e6e225a3ee5?auto=format&fit=crop&q=80&w=1200", // main
      "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&q=80&w=1200", // detail
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=1200"  // elegant living room
    ],
    rating: 4.6
  },
  {
    id: "rug-6",
    name: "Shiraz Nomadic Tree & Bird Runner",
    sku: "SHI-6072-RN",
    price: 2600,
    sizeCategory: "Runner",
    dimensions: "2' 8\" x 10' 4\"",
    origin: "Persia (Iran)",
    material: "100% Pure Lanolin Wool Pile & Wool Warp",
    style: "Vintage",
    age: "Vintage (50-90 yrs)",
    condition: "Very Good",
    colors: ["Deep Rust", "Midnight Navy", "Terracotta", "Forest Green"],
    shape: "Runner",
    availability: "In Stock",
    description: "An incredibly charming runner from the nomadic tribal federations of Shiraz. It features a repeated series of 'Tree of Life' panels flanked by stylized birds and animal totems representing good luck and prosperity. Knotted entirely out of pure, high-lanolin sheep wool (both pile and warp), this rug is heavy, supple, and warm. Its rich rust and midnight colors have mellowed beautifully into a warm, saturated vintage patina.",
    images: [
      "https://images.unsplash.com/photo-1562577309-4932fdd64cd1?auto=format&fit=crop&q=80&w=1200", // runner details
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=1200", // close up
      "https://images.unsplash.com/photo-1617806118233-18e1db207f62?auto=format&fit=crop&q=80&w=1200"  // narrow hallway
    ],
    rating: 4.8
  },
  {
    id: "rug-7",
    name: "Classic Tabriz Floral Medallion Rug",
    sku: "TAB-7012-TX",
    price: 7800,
    sizeCategory: "Large",
    dimensions: "8' 0\" x 10' 0\"",
    origin: "Persia (Iran)",
    material: "Fine Wool & Silk Highlights on Cotton",
    style: "Traditional",
    age: "Semi-Antique",
    condition: "Very Good",
    colors: ["Navy Blue", "Crimson Red", "Champagne Gold", "Olive"],
    shape: "Rectangular",
    availability: "Reserved",
    description: "Woven in the world-famous workshops of Tabriz, this semi-antique rug displays the highly sought-after classical 'Mahi' (Herati) design. It incorporates thousands of tiny, diamond-shaped leaf structures encircling a perfectly circular central medallion. Silk highlights are woven into the floral borders, providing a gorgeous tactile contrast. It is currently reserved for a private client evaluation.",
    images: [
      "https://images.unsplash.com/photo-1543248939-ff40856f65d4?auto=format&fit=crop&q=80&w=1200", // main
      "https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=1200", // detail
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1200"  // elegant study
    ],
    rating: 4.7
  },
  {
    id: "rug-8",
    name: "Sultanabad Grand Botanical Palace Rug",
    sku: "SUL-8015-PL",
    price: 29500,
    sizeCategory: "Palace-size",
    dimensions: "14' 0\" x 20' 6\"",
    origin: "Persia (Iran)",
    material: "Hand-Spun Mountain Wool & Silk Highlights",
    style: "Traditional",
    age: "Antique (100+ yrs)",
    condition: "Antique Wear",
    colors: ["Antique Ochre", "Terracotta Rust", "Sage", "Faded Indigo"],
    shape: "Rectangular",
    availability: "Sold",
    description: "An majestic, palace-size antique Sultanabad rug, woven around the early 1900s. It features a grand scale floral design, known for its open, spacious layout and large botanical palmettes. Free of a central medallion, the design repeats continuously, making it ideal for large majestic dining tables or grand living spaces. The rug exhibits gentle, authentic antique wear (distressed pile in some fields) that adds infinite prestige and historic soul to any luxury room.",
    images: [
      "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&q=80&w=1200", // main
      "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&q=80&w=1200", // detail
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=1200"  // grand room
    ],
    rating: 4.9
  }
];
