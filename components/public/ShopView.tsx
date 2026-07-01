/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { Rug, ALL_SIZES } from "@/types";
import { 
  SlidersHorizontal, 
  Search, 
  Grid, 
  Square,
  List,
  ChevronDown, 
  X, 
  Filter, 
  Star, 
  ShoppingBag, 
  Eye, 
  Info,
  Compass,
  Sparkles
} from "lucide-react";

interface ShopViewProps {
  onSelectRugId: (id: string) => void;
}

export const ShopView: React.FC<ShopViewProps> = ({ onSelectRugId }) => {
  const { rugs, addToCart } = useStore();
  
  // Search and Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMfgType, setActiveMfgType] = useState<"All" | "Handmade" | "Machine-made">("All");
  const [sortOption, setSortOption] = useState("featured");

  // Advanced Filters State
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedSpecificSizes, setSelectedSpecificSizes] = useState<string[]>([]);
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedShapes, setSelectedShapes] = useState<string[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(200000);

  // Mobile filters sidebar drawer open state
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'large' | 'list'>('grid');

  // Constants lists for filtering
  const sizeCategories = ["Small", "Medium", "Large", "Runner", "Oversized", "Palace-size"];
  const origins = ["Persia (Iran)", "Afghanistan", "Turkey", "Persia (Azerbaijan region)"];
  const styles = ["Antique", "Modern", "Traditional", "Vintage", "Tribal"];
  const materials = ["100% Fine Kork Wool & Pure Silk Accents", "100% Hand-Spun Highland Wool on Cotton Warp", "100% Luminous Natural Silk on Silk Foundation", "100% Hand-Spun Lambswool & Vegetable Dyes", "High-Grade Anatolian Sheep Wool on Cotton", "100% Pure Lanolin Wool Pile & Wool Warp"];
  const colorsList = ["Red", "Blue", "Cream", "Green", "Gold", "Terracotta", "Ochre", "Sage", "Navy", "Ivory", "Peach", "Camel"];
  const shapes = ["Rectangular", "Runner", "Round", "Square", "Oval"];
  const availabilities = ["In Stock", "Reserved", "Sold"];

  // Toggle helpers
  const toggleFilter = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setList(prev => prev.includes(val) ? prev.filter(item => item !== val) : [...prev, val]);
  };

  const clearAllFilters = () => {
    setSelectedSizes([]);
    setSelectedSpecificSizes([]);
    setSelectedOrigins([]);
    setSelectedStyles([]);
    setSelectedMaterials([]);
    setSelectedColors([]);
    setSelectedShapes([]);
    setSelectedAvailability([]);
    setMaxPrice(200000);
    setSearchQuery("");
  };

  // Memoized filter processing
  const filteredRugs = useMemo(() => {
    const getGeneralSizeCategory = (size: string): string => {
      const s = size.toLowerCase();
      if (s.includes("palace") || s.includes("grand")) return "Palace-size";
      if (s.includes("oversized") || s.includes("extra large") || s.includes("10x") || s.includes("12x") || s.includes("13x")) return "Oversized";
      if (s.includes("runner") || s.includes("wide") || s.includes("long") || s.includes("short") || s.includes("ft") || s.includes("runners")) return "Runner";
      if (s.includes("large") || s.includes("7x") || s.includes("8x") || s.includes("9x")) return "Large";
      if (s.includes("medium") || s.includes("5x") || s.includes("6x")) return "Medium";
      if (s.includes("small") || s.includes("1x") || s.includes("2x") || s.includes("3x") || s.includes("4x")) return "Small";
      return size; // fallback
    };

    return rugs.filter((rug) => {
      // If a rug got sold out, do not show in inventory
      if (rug.availability === "Sold") {
        return false;
      }

      // Search Text Match
      const matchesSearch = 
        searchQuery === "" ||
        rug.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rug.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rug.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rug.colors.some(col => col.toLowerCase().includes(searchQuery.toLowerCase()));

      // Category Lists Match
      const matchesSize = selectedSizes.length === 0 || selectedSizes.some(sel => {
        const genRugSize = getGeneralSizeCategory(rug.sizeCategory);
        return genRugSize === sel || rug.sizeCategory === sel;
      });

      // Specific Sizes Match
      const matchesSpecificSize = selectedSpecificSizes.length === 0 || selectedSpecificSizes.includes(rug.sizeCategory);

      const matchesOrigin = selectedOrigins.length === 0 || selectedOrigins.includes(rug.origin);
      const matchesStyle = selectedStyles.length === 0 || selectedStyles.includes(rug.style);
      
      const matchesMaterial = selectedMaterials.length === 0 || selectedMaterials.some(m => rug.material.includes(m) || m.includes(rug.material));
      
      const matchesColor = selectedColors.length === 0 || selectedColors.some(colorFilter => 
        rug.colors.some(c => c.toLowerCase().includes(colorFilter.toLowerCase()))
      );

      const matchesShape = selectedShapes.length === 0 || selectedShapes.includes(rug.shape);
      const matchesAvailability = selectedAvailability.length === 0 || selectedAvailability.includes(rug.availability);
      const matchesPrice = rug.price <= maxPrice;

      return matchesSearch && matchesSize && matchesSpecificSize && matchesOrigin && matchesStyle && matchesMaterial && matchesColor && matchesShape && matchesAvailability && matchesPrice;
    }).sort((a, b) => {
      // Sorting options
      if (sortOption === "price-low-high") return a.price - b.price;
      if (sortOption === "price-high-low") return b.price - a.price;
      if (sortOption === "rating") return b.rating - a.rating;
      return 0; // featured/default
    });
  }, [
    rugs, searchQuery, sortOption, selectedSizes, selectedSpecificSizes, selectedOrigins, selectedStyles, selectedMaterials, selectedColors, selectedShapes, selectedAvailability, maxPrice
  ]);

  const activeFiltersCount = 
    selectedSizes.length + 
    selectedSpecificSizes.length +
    selectedOrigins.length + 
    selectedStyles.length + 
    selectedMaterials.length + 
    selectedColors.length + 
    selectedShapes.length + 
    selectedAvailability.length + 
    (maxPrice < 30000 ? 1 : 0);

  // Reusable Sidebar content component
  const RenderFiltersSidebar = () => (
    <div className="space-y-6 text-xs font-sans">
      
      {/* Header with quick clear */}
      <div className="flex items-center justify-between pb-4 border-b border-editorial-border">
        <span className="font-bold text-editorial-text uppercase tracking-widest text-xs flex items-center gap-1.5">
          <SlidersHorizontal className="h-4 w-4 text-editorial-accent" />
          Filter Showroom
        </span>
        {activeFiltersCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-editorial-accent font-bold uppercase hover:underline"
          >
            Clear ({activeFiltersCount})
          </button>
        )}
      </div>

      {/* Price filter slider */}
      <div className="space-y-2">
        <div className="flex justify-between font-bold text-editorial-text">
          <span className="uppercase tracking-wider text-xs">Maximum Value</span>
          <span>${maxPrice.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min="1000"
          max="200000"
          step="1000"
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-editorial-accent cursor-pointer h-1 bg-gray-200"
        />
        <div className="flex justify-between text-sm text-gray-400">
          <span>$1,000</span>
          <span>$200,000</span>
        </div>
      </div>

      {/* Size Categories */}
      <div className="space-y-2 border-t border-editorial-border pt-4">
        <h4 className="font-bold uppercase tracking-wider text-editorial-text text-xs">Rug Size Class</h4>
        <div className="flex flex-wrap gap-1">
          {sizeCategories.map((size) => (
            <button
              key={size}
              onClick={() => toggleFilter(selectedSizes, setSelectedSizes, size)}
              className={`px-2.5 py-1.5 rounded-none border text-xs transition ${
                selectedSizes.includes(size)
                  ? "border-editorial-accent bg-editorial-aside text-editorial-accent font-bold"
                  : "border-editorial-border bg-white hover:border-gray-300 text-gray-600"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Specific Dimensions Filter */}
      <div className="space-y-2 border-t border-editorial-border pt-4">
        <h4 className="font-bold uppercase tracking-wider text-editorial-text text-xs">Specific Dimensions</h4>
        <div className="relative">
          <select
            value={selectedSpecificSizes[0] || ""}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedSpecificSizes(val ? [val] : []);
            }}
            className="w-full bg-white border border-editorial-border rounded-none py-1.5 px-2 text-xs text-gray-600 outline-none focus:border-editorial-accent"
          >
            <option value="">All Specific Sizes</option>
            {ALL_SIZES.map((sz) => (
              <option key={sz} value={sz}>{sz}</option>
            ))}
          </select>
        </div>
        {selectedSpecificSizes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {selectedSpecificSizes.map((sz) => (
              <span key={sz} className="inline-flex items-center gap-1 bg-stone-100 text-sm font-semibold text-editorial-text py-0.5 px-2 border border-stone-200">
                {sz}
                <button
                  type="button"
                  onClick={() => setSelectedSpecificSizes([])}
                  className="hover:text-red-500 font-bold ml-0.5 text-sm cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Country of Origin */}
      <div className="space-y-2 border-t border-editorial-border pt-4">
        <h4 className="font-bold uppercase tracking-wider text-editorial-text text-xs">Geographic Origin</h4>
        <div className="space-y-1.5">
          {origins.map((origin) => (
            <label key={origin} className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-editorial-text">
              <input
                type="checkbox"
                checked={selectedOrigins.includes(origin)}
                onChange={() => toggleFilter(selectedOrigins, setSelectedOrigins, origin)}
                className="rounded-none accent-editorial-accent border-gray-300 h-3.5 w-3.5 cursor-pointer"
              />
              <span>{origin}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Style Theme */}
      <div className="space-y-2 border-t border-editorial-border pt-4">
        <h4 className="font-bold uppercase tracking-wider text-editorial-text text-xs">Styling & Aesthetics</h4>
        <div className="space-y-1.5">
          {styles.map((style) => (
            <label key={style} className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-editorial-text">
              <input
                type="checkbox"
                checked={selectedStyles.includes(style)}
                onChange={() => toggleFilter(selectedStyles, setSelectedStyles, style)}
                className="rounded-none accent-editorial-accent border-gray-300 h-3.5 w-3.5 cursor-pointer"
              />
              <span>{style} Rugs</span>
            </label>
          ))}
        </div>
      </div>

      {/* Shape Categories */}
      <div className="space-y-2 border-t border-editorial-border pt-4">
        <h4 className="font-bold uppercase tracking-wider text-editorial-text text-xs">Rug Geometry</h4>
        <div className="flex flex-wrap gap-1">
          {shapes.map((shape) => (
            <button
              key={shape}
              onClick={() => toggleFilter(selectedShapes, setSelectedShapes, shape)}
              className={`px-2 py-1 border rounded-none text-xs transition ${
                selectedShapes.includes(shape)
                  ? "border-editorial-accent bg-editorial-aside text-editorial-accent font-bold"
                  : "border-editorial-border bg-white hover:border-gray-300 text-gray-600"
              }`}
            >
              {shape}
            </button>
          ))}
        </div>
      </div>

      {/* Dominant Colors */}
      <div className="space-y-2 border-t border-editorial-border pt-4">
        <h4 className="font-bold uppercase tracking-wider text-editorial-text text-xs">Dominant Colors</h4>
        <div className="flex flex-wrap gap-1">
          {colorsList.map((color) => (
            <button
              key={color}
              onClick={() => toggleFilter(selectedColors, setSelectedColors, color)}
              className={`px-2.5 py-1 text-xs transition border rounded-none ${
                selectedColors.includes(color)
                  ? "border-editorial-accent bg-editorial-aside text-editorial-accent font-bold"
                  : "border-editorial-border bg-editorial-bg hover:bg-gray-100 text-gray-500"
              }`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      {/* Availability Status */}
      <div className="space-y-2 border-t border-editorial-border pt-4">
        <h4 className="font-bold uppercase tracking-wider text-editorial-text text-xs">Availability</h4>
        <div className="space-y-1.5">
          {availabilities.map((avail) => (
            <label key={avail} className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-editorial-text">
              <input
                type="checkbox"
                checked={selectedAvailability.includes(avail)}
                onChange={() => toggleFilter(selectedAvailability, setSelectedAvailability, avail)}
                className="rounded-none accent-editorial-accent border-gray-300 h-3.5 w-3.5 cursor-pointer"
              />
              <span className={
                avail === "In Stock" ? "text-green-600 font-semibold" :
                avail === "Reserved" ? "text-editorial-accent font-semibold" :
                "text-red-500 line-through"
              }>{avail}</span>
            </label>
          ))}
        </div>
      </div>

    </div>
  );

  return (
    <div className="bg-editorial-bg min-h-screen py-10 text-editorial-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Page title and description */}
        <div className="border-b border-editorial-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-[0.3em] text-editorial-accent font-semibold block">Curated Oriental Showroom</span>
            <h1 className="font-serif text-3xl sm:text-4xl font-light text-editorial-text tracking-tight">
              Fine Hand-Knotted Collection
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 max-w-2xl font-light leading-relaxed">
              Filter through our investment-grade, ancient family-tied and certified authentic rugs. Secure escrow and manual invoice confirmations apply to each masterwork.
            </p>
          </div>

          {/* Controls Bar for Mobile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white rounded-none border border-editorial-border text-xs font-bold text-editorial-text shadow-sm hover:bg-editorial-bg cursor-pointer"
            >
              <Filter className="h-4 w-4 text-editorial-accent" />
              <span>Filter ({activeFiltersCount})</span>
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center bg-white rounded-none border border-editorial-border px-3 py-2 text-xs text-editorial-text shadow-sm">
              <span className="text-gray-400 mr-2 uppercase tracking-wider font-semibold">Sort By:</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="bg-transparent outline-none font-bold text-editorial-text cursor-pointer"
              >
                <option value="featured">Curator's Featured</option>
                <option value="price-low-high">Value: Low to High</option>
                <option value="price-high-low">Value: High to Low</option>
                <option value="rating">Discerning Rating</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search Bar Block */}
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
            <Search className="h-5 w-5 text-editorial-accent" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by rug name, country of origin, SKU, style or dominant colors..."
            className="w-full bg-white rounded-none py-3.5 pl-12 pr-4 border border-editorial-border shadow-sm outline-none text-xs text-editorial-text focus:border-editorial-accent transition-all font-sans font-light"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-editorial-text"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Main Columns Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Filters Sidebar (Desktop only) */}
          <aside className="hidden lg:block lg:col-span-3 bg-white p-6 rounded-none border border-editorial-border shadow-sm">
            <RenderFiltersSidebar />
          </aside>

          {/* Right Column: Products Grid */}
          <main className="lg:col-span-9 space-y-6">
            
            {/* Show search counts if filters active */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pb-2 border-b border-editorial-border">
              {activeFiltersCount > 0 || searchQuery !== "" ? (
                <div className="text-xs text-gray-500 font-sans flex items-center gap-4">
                  <span>
                    Found <strong>{filteredRugs.length}</strong> matching rug masterwork(s)
                  </span>
                  <button onClick={clearAllFilters} className="text-editorial-accent font-bold uppercase hover:underline">
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="text-xs text-gray-400 font-sans uppercase tracking-widest font-semibold">
                  Showroom Collection
                </div>
              )}

              {/* View Mode Toggles */}
              <div className="flex items-center gap-2 bg-editorial-aside border border-editorial-border p-1">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 transition ${viewMode === 'grid' ? 'bg-white text-editorial-accent shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Medium Grid View"
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setViewMode('large')}
                  className={`p-1.5 transition ${viewMode === 'large' ? 'bg-white text-editorial-accent shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Large Content Tiles"
                >
                  <Square className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 transition ${viewMode === 'list' ? 'bg-white text-editorial-accent shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  title="List View"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            {filteredRugs.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-none border border-editorial-border p-8 space-y-3">
                <SlidersHorizontal className="h-10 w-10 text-gray-300 mx-auto" />
                <h3 className="font-serif text-lg font-light text-editorial-text">No Masterpieces Found</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed font-light">
                  We could not find any fine rugs matching your active search queries or size thresholds. Try clearing active filters or modifying the price bar.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-5 py-2.5 bg-editorial-accent hover:bg-[#8E7453] text-white font-bold uppercase tracking-widest text-xs rounded-none shadow transition"
                >
                  Reset Showroom Filters
                </button>
              </div>
            ) : (
              <div className={`grid gap-6 ${
                viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
                viewMode === 'large' ? 'grid-cols-1 sm:grid-cols-1 lg:grid-cols-2' :
                'grid-cols-1'
              }`}>
                {filteredRugs.map((rug) => (
                  <div
                    key={rug.id}
                    className={`group bg-white rounded-none overflow-hidden border border-editorial-border shadow-sm hover:shadow-md transition duration-300 flex ${
                      viewMode === 'list' ? 'flex-col sm:flex-row' : 'flex-col'
                    } justify-between`}
                  >
                    
                    {/* Visual Panel */}
                    <div className={`relative bg-stone-100 overflow-hidden cursor-pointer animate-fadeIn ${
                      viewMode === 'list' ? 'w-full sm:w-1/3 aspect-[4/3] sm:aspect-square' : 'aspect-[4/3]'
                    }`} onClick={() => onSelectRugId(rug.id)}>
                      <img
                        src={rug.images?.[0] || "https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=800"}
                        alt={rug.name}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-700"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Badge Tags */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                        <span className="px-2.5 py-1 bg-editorial-text/90 backdrop-blur-sm text-sm text-white font-bold uppercase tracking-widest rounded-none shadow-sm">
                          {rug.origin}
                        </span>
                        <span className="px-2 py-0.5 bg-editorial-aside text-xs text-editorial-text font-bold uppercase tracking-wider rounded-none border border-editorial-border shadow-sm">
                          {rug.style}
                        </span>
                        {rug.isSpecialSale && (
                          <span className="px-2 py-0.5 bg-[#A68B67] text-xs text-white font-bold uppercase tracking-wider rounded-none shadow-sm flex items-center gap-1">
                            <Sparkles size={10} /> SPECIAL SALE
                          </span>
                        )}
                      </div>

                      <span className={`absolute top-3 right-3 px-2 py-0.5 text-xs tracking-wider font-extrabold uppercase rounded-none shadow-sm ${
                        rug.availability === "In Stock" ? "bg-green-600 text-white" :
                        rug.availability === "Reserved" ? "bg-editorial-accent text-white" :
                        "bg-red-500 text-white"
                      }`}>
                        {rug.availability}
                      </span>

                      {/* Dimensions Overlay */}
                      <div className="absolute bottom-2 inset-x-2 bg-neutral-900/75 backdrop-blur-xs text-white p-1 rounded-none text-center text-xs font-mono font-semibold tracking-wider opacity-0 group-hover:opacity-100 transition-all">
                        Dimensions: {rug.dimensions}
                      </div>
                    </div>

                    {/* Information Panel */}
                    <div className={`p-5 space-y-4 flex flex-col justify-between ${
                      viewMode === 'list' ? 'w-full sm:w-2/3 flex-1' : 'flex-1'
                    }`}>
                      <div className="space-y-1.5 text-left">
                        <div className="flex items-center gap-1.5 text-editorial-accent">
                          <Star className="h-3 w-3 fill-editorial-accent" />
                          <span className="text-xs font-bold text-editorial-text">{rug.rating.toFixed(1)} / 5</span>
                          <span className="text-sm text-gray-400">| Certified Origin</span>
                        </div>
                        <h3 
                          onClick={() => onSelectRugId(rug.id)}
                          className="font-serif font-light text-sm text-editorial-text group-hover:text-editorial-accent transition truncate cursor-pointer"
                        >
                          {rug.name}
                        </h3>
                        <p className="text-xs text-gray-400 font-medium font-sans font-light">
                          Age: {rug.age} | Size: {rug.dimensions} ({rug.sizeCategory}) | {rug.material}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-editorial-border flex items-center justify-between">
                        <div>
                          <span className="block text-xs uppercase tracking-wider text-gray-400 font-semibold">Concierge Value</span>
                          <div className="flex flex-wrap items-center gap-2">
                            {rug.originalPrice && rug.originalPrice > rug.price && (
                              <span className="text-xs text-gray-400 line-through">${rug.originalPrice.toLocaleString()}</span>
                            )}
                            <span className="font-serif text-sm font-light text-editorial-text">${rug.price.toLocaleString()}</span>
                            {rug.isFreeShipping && (
                              <span className="bg-[#8E7453] text-white text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm">Free Ship</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onSelectRugId(rug.id)}
                            title="Inspect Details"
                            className="p-2 bg-editorial-aside hover:bg-editorial-text hover:text-white rounded-none border border-editorial-border text-gray-600 transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          
                          {rug.availability === "In Stock" ? (
                            <button
                              onClick={() => addToCart(rug)}
                              className="px-3 py-2 bg-editorial-accent hover:bg-[#8E7453] text-white font-bold uppercase tracking-widest text-sm rounded-none shadow-sm transition flex items-center gap-1"
                            >
                              <ShoppingBag className="h-3.5 w-3.5" />
                              <span>Add</span>
                            </button>
                          ) : (
                            <span className="px-2 py-1.5 bg-editorial-aside rounded-none text-sm text-gray-400 uppercase tracking-wider font-semibold border border-editorial-border">
                              Locked
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
            
          </main>
        </div>

      </div>

      {/* --- Mobile Slide-over Filters Drawer --- */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden font-sans">
          <div className="absolute inset-0 bg-neutral-950/55 backdrop-blur-xs transition-opacity" onClick={() => setMobileFiltersOpen(false)} />
          
          <div className="absolute inset-y-0 left-0 max-w-full flex">
            <div className="w-screen max-w-xs bg-white h-full shadow-2xl flex flex-col animate-slideRight">
              
              {/* Header */}
              <div className="px-6 py-5 bg-editorial-aside border-b border-editorial-border flex items-center justify-between">
                <span className="font-bold text-editorial-text uppercase tracking-widest text-xs">Filter Showroom</span>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-editorial-text hover:bg-gray-100 rounded-none transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable filters body */}
              <div className="flex-1 overflow-y-auto px-6 py-6 bg-white">
                <RenderFiltersSidebar />
              </div>

              {/* Action footer */}
              <div className="p-4 border-t border-editorial-border bg-editorial-aside flex gap-2">
                <button
                  onClick={clearAllFilters}
                  className="flex-1 py-2.5 border border-editorial-border hover:border-gray-400 rounded-none text-xs font-bold uppercase tracking-wider text-gray-700 bg-white"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="flex-1 py-2.5 bg-editorial-accent hover:bg-[#8E7453] text-white rounded-none text-xs font-bold uppercase tracking-wider shadow-sm"
                >
                  Apply Filters ({activeFiltersCount})
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
