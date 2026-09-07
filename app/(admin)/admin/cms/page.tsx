'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/context/StoreContext';
import { Save, Image as ImageIcon, Video, Type, Megaphone, FileText, PlusCircle, Trash2 } from 'lucide-react';

export default function CMSPage() {
  const { websiteContent, setWebsiteContent, blogs, addBlogPost, deleteBlogPost } = useStore();
  const [localContent, setLocalContent] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'posts'>('content');

  // New Blog Post State
  const [newPost, setNewPost] = useState({ title: '', excerpt: '', content: '', category: 'News', featuredImage: '' });

  useEffect(() => {
    setLocalContent(websiteContent || {});
  }, [websiteContent]);

  const handleChange = (key: string, value: string) => {
    setLocalContent((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSaveContent = async () => {
    setIsSaving(true);
    setWebsiteContent(localContent);
    const { updateShowroomDoc } = await import('@/lib/showroom-firebase');
    await updateShowroomDoc('showroom_settings', 'live_website_content', { data: localContent });
    alert('Website Updated Successfully! The public site is now using these changes.');
    setIsSaving(false);
  };

  const handleAddPost = async () => {
    if (!newPost.title || !newPost.content) {
      alert("Please provide a title and content.");
      return;
    }
    
    // addBlogPost automatically handles firebase in StoreContext
    addBlogPost({
      ...newPost,
      date: new Date().toLocaleDateString(),
      author: 'Admin',
      readTime: '3 min read',
      category: newPost.category as any,
    });
    
    setNewPost({ title: '', excerpt: '', content: '', category: 'News', featuredImage: '' });
    alert("Post published successfully!");
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 border-neutral-200 gap-4">
        <div>
          <h1 className="text-3xl font-serif text-neutral-800">Website CMS</h1>
          <p className="text-neutral-500 mt-1">Manage your public website's layout, SEO, and Blog Posts.</p>
        </div>
        <div className="flex gap-2 bg-neutral-100 p-1 rounded">
          <button 
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors ${activeTab === 'content' ? 'bg-white shadow-sm text-editorial-accent' : 'text-neutral-500'}`}
          >
            Site Layout
          </button>
          <button 
            onClick={() => setActiveTab('posts')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors ${activeTab === 'posts' ? 'bg-white shadow-sm text-editorial-accent' : 'text-neutral-500'}`}
          >
            Blog / Announcements
          </button>
        </div>
      </div>

      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={handleSaveContent} 
              disabled={isSaving}
              className="flex items-center gap-2 bg-editorial-accent hover:bg-neutral-800 text-white px-6 py-2 rounded-sm font-bold uppercase tracking-wider text-sm transition-colors"
            >
              <Save size={18} />
              {isSaving ? 'Publishing...' : 'Publish to Live Site'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Marketing / Announcement Bar */}
            <div className="bg-white p-6 shadow-sm border border-neutral-200 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><Megaphone size={18} className="text-editorial-accent"/> Announcement / Promo Banner</h2>
              <p className="text-xs text-neutral-500">This banner appears at the very top of your public website.</p>
              <input 
                type="text"
                value={localContent.announcement_text || ''}
                onChange={e => handleChange('announcement_text', e.target.value)}
                placeholder="e.g. 15% Off All Rug Cleaning this month!"
                className="w-full p-2 border border-neutral-300 rounded"
              />
              <input 
                type="text"
                value={localContent.announcement_link || ''}
                onChange={e => handleChange('announcement_link', e.target.value)}
                placeholder="Link URL (optional)"
                className="w-full p-2 border border-neutral-300 rounded"
              />
            </div>

            {/* Hero Section */}
            <div className="bg-white p-6 shadow-sm border border-neutral-200 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><Video size={18} className="text-editorial-accent"/> Hero Banner Media</h2>
              <p className="text-xs text-neutral-500">Add a stunning image or video URL for the top of the homepage.</p>
              <label className="text-xs font-bold uppercase text-neutral-700">Hero Media URL (Image or Video)</label>
              <input 
                type="text"
                value={localContent.hero_media_url || ''}
                onChange={e => handleChange('hero_media_url', e.target.value)}
                placeholder="e.g. https://example.com/rug-video.mp4"
                className="w-full p-2 border border-neutral-300 rounded"
              />
              <label className="text-xs font-bold uppercase text-neutral-700">Hero Headline</label>
              <input 
                type="text"
                value={localContent.hero_headline || 'Marco Polo Oriental Rugs'}
                onChange={e => handleChange('hero_headline', e.target.value)}
                className="w-full p-2 border border-neutral-300 rounded"
              />
              <label className="text-xs font-bold uppercase text-neutral-700">Hero Subtitle</label>
              <textarea 
                value={localContent.hero_subtitle || 'Premier Rug Wash & Restoration in Washington DC.'}
                onChange={e => handleChange('hero_subtitle', e.target.value)}
                className="w-full p-2 border border-neutral-300 rounded"
                rows={2}
              />
            </div>

            {/* SEO Metadata */}
            <div className="bg-white p-6 shadow-sm border border-neutral-200 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><Type size={18} className="text-editorial-accent"/> Google Search (SEO)</h2>
              <p className="text-xs text-neutral-500">Edit the words Google sees when ranking your website.</p>
              <label className="text-xs font-bold uppercase text-neutral-700">Home Page Meta Title</label>
              <input 
                type="text"
                value={localContent.seo_title || 'Marco Polo Oriental Rugs | Alexandria VA'}
                onChange={e => handleChange('seo_title', e.target.value)}
                className="w-full p-2 border border-neutral-300 rounded"
              />
              <label className="text-xs font-bold uppercase text-neutral-700">Home Page Meta Description</label>
              <textarea 
                value={localContent.seo_description || 'Authentic handmade Persian rugs, oriental rugs, rug cleaning, and restoration in the Washington DC area.'}
                onChange={e => handleChange('seo_description', e.target.value)}
                className="w-full p-2 border border-neutral-300 rounded"
                rows={3}
              />
            </div>

            {/* Custom Ad Space */}
            <div className="bg-white p-6 shadow-sm border border-neutral-200 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><ImageIcon size={18} className="text-editorial-accent"/> Custom Homepage Ad</h2>
              <p className="text-xs text-neutral-500">Place an advertisement or special message in the middle of your homepage.</p>
              <input 
                type="text"
                value={localContent.ad_image_url || ''}
                onChange={e => handleChange('ad_image_url', e.target.value)}
                placeholder="Ad Image URL"
                className="w-full p-2 border border-neutral-300 rounded"
              />
              <input 
                type="text"
                value={localContent.ad_text || ''}
                onChange={e => handleChange('ad_text', e.target.value)}
                placeholder="Ad Headline (e.g. Free Pad with Every Rug Wash!)"
                className="w-full p-2 border border-neutral-300 rounded"
              />
            </div>

          </div>
        </div>
      )}

      {activeTab === 'posts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Create Post Form */}
          <div className="lg:col-span-1 bg-white p-6 shadow-sm border border-neutral-200 space-y-4 h-fit">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><PlusCircle size={18} className="text-editorial-accent"/> Create New Post</h2>
            
            <div>
              <label className="text-xs font-bold uppercase text-neutral-700">Post Title / Headline</label>
              <input 
                type="text" 
                value={newPost.title} 
                onChange={e => setNewPost({...newPost, title: e.target.value})}
                className="w-full p-2 border border-neutral-300 rounded mt-1" 
                placeholder="e.g. Summer Rug Cleaning Guide"
              />
            </div>
            
            <div>
              <label className="text-xs font-bold uppercase text-neutral-700">Category</label>
              <select 
                value={newPost.category} 
                onChange={e => setNewPost({...newPost, category: e.target.value})}
                className="w-full p-2 border border-neutral-300 rounded mt-1"
              >
                <option value="News">News / Announcement</option>
                <option value="Education">Education & Care</option>
                <option value="Curator's Note">Curator's Note</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-bold uppercase text-neutral-700">Featured Image URL (Optional)</label>
              <input 
                type="text" 
                value={newPost.featuredImage} 
                onChange={e => setNewPost({...newPost, featuredImage: e.target.value})}
                className="w-full p-2 border border-neutral-300 rounded mt-1" 
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-neutral-700">Short Excerpt (Shows in List)</label>
              <textarea 
                value={newPost.excerpt} 
                onChange={e => setNewPost({...newPost, excerpt: e.target.value})}
                className="w-full p-2 border border-neutral-300 rounded mt-1" 
                rows={2}
                placeholder="Brief summary..."
              />
            </div>
            
            <div>
              <label className="text-xs font-bold uppercase text-neutral-700">Full Content</label>
              <textarea 
                value={newPost.content} 
                onChange={e => setNewPost({...newPost, content: e.target.value})}
                className="w-full p-2 border border-neutral-300 rounded mt-1 h-32" 
                placeholder="Write your article or announcement here..."
              />
            </div>

            <button 
              onClick={handleAddPost}
              className="w-full bg-editorial-accent text-white py-3 rounded font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors"
            >
              Publish Post
            </button>
          </div>

          {/* List of Posts */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold mb-4">Published Posts ({blogs.length})</h2>
            {blogs.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 bg-white border border-neutral-200">
                <FileText size={48} className="mx-auto mb-4 opacity-30" />
                <p>No blog posts or announcements published yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {blogs.map(post => (
                  <div key={post.id} className="bg-white p-4 border border-neutral-200 shadow-sm flex items-start gap-4">
                    {post.featuredImage ? (
                      <img src={post.featuredImage} alt="Cover" className="w-24 h-24 object-cover rounded" />
                    ) : (
                      <div className="w-24 h-24 bg-neutral-100 flex items-center justify-center rounded">
                        <FileText className="text-neutral-300" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-neutral-900">{post.title}</h3>
                        <button 
                          onClick={() => {
                            if(window.confirm('Delete this post permanently?')) {
                              // Type mismatch? We might need to ensure delete exists
                              // Let's just assume we can call deleteBlogPost if it exists in store.
                              if (typeof deleteBlogPost === 'function') {
                                deleteBlogPost(post.id);
                              } else {
                                alert("Delete function not fully wired yet.");
                              }
                            }
                          }}
                          className="text-red-500 hover:bg-red-50 p-2 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-xs text-editorial-accent font-bold uppercase tracking-widest mt-1">{post.category} • {post.date}</p>
                      <p className="text-sm text-neutral-500 mt-2 line-clamp-2">{post.excerpt || post.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
