/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { BlogPost, BlogCategory } from "@/types";
import { Search, ChevronRight, Calendar, User, Clock, ArrowLeft, Bookmark, Heart, Grid, Sparkles } from "lucide-react";

interface BlogViewProps {
  onSelectRugId: (id: string) => void;
  setCurrentTab: (tab: string) => void;
}

export const BlogView: React.FC<BlogViewProps> = ({ onSelectRugId, setCurrentTab }) => {
  const { blogs, rugs } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activePost, setActivePost] = useState<BlogPost | null>(null);

  const categories = ["All", "Choosing a Rug", "History & Artistry", "Cleaning & Care"];

  const filteredPosts = useMemo(() => {
    return blogs.filter((post) => {
      const matchesSearch = 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [blogs, searchQuery, selectedCategory]);

  const handleReadPost = (post: BlogPost) => {
    setActivePost(post);
    window.scrollTo(0, 0);
  };

  const handleCloseReading = () => {
    setActivePost(null);
  };

  const handleRecommendClick = (rugId: string) => {
    onSelectRugId(rugId);
    setCurrentTab("shop");
  };

  return (
    <div className="bg-[#F9F7F5] min-h-screen py-12 font-sans text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* --- FULL BLOG POST READING MODE --- */}
        {activePost ? (
          <article className="max-w-3xl mx-auto bg-white rounded-none overflow-hidden shadow-sm border border-editorial-border p-6 sm:p-10 space-y-8 animate-fadeIn text-left">
            
            {/* Back Button */}
            <button
              onClick={handleCloseReading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-editorial-aside hover:bg-[#F2ECE4] text-editorial-text font-bold uppercase text-[10px] rounded-none transition border border-editorial-border cursor-pointer font-mono"
            >
              <ArrowLeft className="h-4 w-4 text-editorial-accent" />
              <span>Back to Editorial list</span>
            </button>

            {/* Meta headers */}
            <div className="space-y-4">
              <span className="px-3 py-1 bg-editorial-aside border border-editorial-border text-[10px] text-editorial-accent font-bold uppercase tracking-wider rounded-none">
                {activePost.category}
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl font-light text-editorial-text leading-tight">
                {activePost.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-500 border-y border-editorial-border py-3 font-light">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-editorial-accent" />
                  <span>{activePost.author}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{activePost.date}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{activePost.readTime}</span>
                </span>
              </div>
            </div>

            {/* Banner Photo */}
            <div className="aspect-[2/1] rounded-none overflow-hidden bg-editorial-aside border border-editorial-border">
              <img
                src={activePost.featuredImage}
                alt={activePost.title}
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Body Content (Render styled paragraphs & headings safely) */}
            <div className="prose prose-stone max-w-none text-editorial-text text-sm leading-relaxed space-y-6 font-light">
              {activePost.content.split("\n\n").map((block, idx) => {
                const trimmed = block.trim();
                if (!trimmed) return null;

                if (trimmed.startsWith("# ")) {
                  return (
                    <h2 key={idx} className="font-serif text-2xl font-light text-editorial-text mt-8 mb-4 border-b border-editorial-border pb-2">
                      {trimmed.replace("# ", "")}
                    </h2>
                  );
                }
                if (trimmed.startsWith("## ")) {
                  return (
                    <h3 key={idx} className="font-serif text-xl font-light text-editorial-text mt-6 mb-3">
                      {trimmed.replace("## ", "")}
                    </h3>
                  );
                }
                if (trimmed.startsWith("### ")) {
                  return (
                    <h4 key={idx} className="font-serif text-base font-light text-editorial-text mt-4 mb-2">
                      {trimmed.replace("### ", "")}
                    </h4>
                  );
                }
                if (trimmed.startsWith("* ")) {
                  return (
                    <ul key={idx} className="list-disc pl-5 space-y-1.5 text-xs text-editorial-text font-light">
                      {trimmed.split("\n").map((li, lIdx) => (
                        <li key={lIdx}>{li.replace("* ", "").replace("• ", "")}</li>
                      ))}
                    </ul>
                  );
                }
                if (trimmed.startsWith("• ")) {
                  return (
                    <ul key={idx} className="list-disc pl-5 space-y-1.5 text-xs text-editorial-text font-light">
                      {trimmed.split("\n").map((li, lIdx) => (
                        <li key={lIdx}>{li.replace("• ", "")}</li>
                      ))}
                    </ul>
                  );
                }

                return <p key={idx} className="text-xs sm:text-sm leading-relaxed text-editorial-text font-sans font-light">{trimmed}</p>;
              })}
            </div>

            {/* Related products inside article */}
            {activePost.relatedProducts && activePost.relatedProducts.length > 0 && (
              <div className="p-6 bg-editorial-aside border border-editorial-border rounded-none space-y-4 pt-6 text-left">
                <div className="flex items-center gap-2 text-editorial-text">
                  <Sparkles className="h-4.5 w-4.5 text-editorial-accent" />
                  <h4 className="font-serif font-light text-sm text-editorial-text">Discerning Curation Pairings</h4>
                </div>
                <p className="text-[11px] text-gray-500 font-light">
                  Elevate your space by pairing the design principles of this article with our hand-knotted showroom catalog.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activePost.relatedProducts.map((pId) => {
                    const r = rugs.find((rug) => rug.id === pId);
                    if (!r) return null;
                    return (
                      <div
                        key={r.id}
                        onClick={() => handleRecommendClick(r.id)}
                        className="flex items-center gap-3 p-3 bg-white border border-editorial-border rounded-none hover:border-editorial-accent cursor-pointer transition shadow-xs"
                      >
                        <img
                          src={r.images?.[0] || "https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=800"}
                          alt={r.name}
                          className="w-14 h-14 object-cover rounded-none border border-editorial-border flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <h5 className="font-serif text-xs font-light text-editorial-text truncate">{r.name}</h5>
                          <p className="text-[9px] text-gray-400 font-light">{r.dimensions} | {r.origin}</p>
                          <span className="text-xs font-serif font-semibold text-editorial-accent block mt-0.5">${r.price.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-editorial-border flex justify-between text-gray-400 text-[10px] font-light">
              <span>Curator Advisory Team</span>
              <span className="font-serif uppercase tracking-widest text-[9px]">Marco Polo Rugs</span>
            </div>

          </article>
        ) : (
          
          /* --- EDITORIAL DIRECTORY LIST VIEW --- */
          <div className="space-y-10">
            
            {/* Header Title */}
            <div className="text-center space-y-2">
              <span className="text-[10px] uppercase tracking-[0.3em] text-editorial-accent font-bold block">Artistry & Design Education</span>
              <h1 className="font-serif text-3xl sm:text-4xl font-light text-editorial-text tracking-tight">The Marco Polo Journal</h1>
              <p className="text-xs text-gray-500 max-w-md mx-auto font-light">
                Explore our fine weavers' journals detailing traditional dye compositions, geometric symbolisms, styling frameworks, and wool care formulas.
              </p>
            </div>

            {/* Filter categories & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-editorial-border pb-4">
              {/* Categories */}
              <div className="flex flex-wrap gap-1.5 justify-center">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-none border text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                      selectedCategory === cat
                        ? "border-editorial-accent bg-editorial-aside text-editorial-accent"
                        : "border-editorial-border bg-white hover:border-editorial-accent text-editorial-text font-light"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Quick Search */}
              <div className="relative w-full md:w-64">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles..."
                  className="w-full bg-white rounded-none py-2.5 pl-9 pr-3 border border-editorial-border outline-none text-[11px] text-editorial-text focus:border-editorial-accent font-mono"
                />
              </div>
            </div>

            {/* Grid List */}
            {filteredPosts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-none border border-editorial-border p-8 space-y-2 shadow-sm">
                <Bookmark className="h-10 w-10 text-editorial-accent/60 mx-auto" />
                <h3 className="font-serif text-sm font-light text-editorial-text">No Articles Match</h3>
                <p className="text-xs text-gray-400 font-light">Try modifying your search text or selecting another design category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => handleReadPost(post)}
                    className="group bg-white rounded-none overflow-hidden border border-editorial-border shadow-xs hover:border-editorial-accent transition-all duration-300 flex flex-col justify-between cursor-pointer"
                  >
                    {/* Cover Photo */}
                    <div className="aspect-[16/10] bg-editorial-aside overflow-hidden relative border-b border-editorial-border">
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-102 transition duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute top-3 left-3 px-2.5 py-1 bg-editorial-text/95 backdrop-blur-xs text-[8px] text-[#C2B29F] font-bold uppercase tracking-widest rounded-none border border-editorial-border">
                        {post.category}
                      </span>
                    </div>

                    {/* Excerpt panel */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex gap-3 items-center text-[9px] text-gray-400 font-mono font-light">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{post.date}</span>
                          </span>
                          <span>•</span>
                          <span>{post.readTime}</span>
                        </div>
                        
                        <h3 className="font-serif font-light text-sm text-editorial-text group-hover:text-editorial-accent transition line-clamp-2">
                          {post.title}
                        </h3>
                        
                        <p className="text-[11px] text-gray-500 line-clamp-3 leading-relaxed font-light">
                          {post.excerpt}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-editorial-border flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-editorial-accent group-hover:translate-x-1.5 transition-all">
                        <span>Read Advisory</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
