import React, { useState, useEffect } from 'react';
import { Save, Eye, Layout, Type, Image as ImageIcon, History, Undo, UploadCloud, GripVertical, CheckCircle } from 'lucide-react';
import { subscribeToCollection, addShowroomDoc, SHOWROOM_SETTINGS, updateSettingDoc } from '@/lib/showroom-firebase';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // wait, storage uses firebase/storage

export default function WebsiteBuilder() {
  const [activeTab, setActiveTab] = useState<'pages'|'media'|'seo'|'history'>('pages');
  const [isSaving, setIsSaving] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Mocked state for drag & drop sections
  const [sections, setSections] = useState([
    { id: 'hero', name: 'Hero Banner', content: 'Welcome to Marco Polo' },
    { id: 'featured', name: 'Featured Rugs', content: '3 items' },
    { id: 'about', name: 'About Us Text', content: 'Family owned since 1980.' },
    { id: 'footer', name: 'Footer Information', content: 'Contact & Links' },
  ]);

  const handleSaveDraft = async () => {
    setIsSaving(true);
    // In a real app this would save to a showroom_drafts collection
    await new Promise(r => setTimeout(r, 800));
    setIsSaving(false);
  };

  const handlePublish = async () => {
    setIsSaving(true);
    // In a real app this would update the live showroom_settings
    await new Promise(r => setTimeout(r, 1000));
    setIsSaving(false);
    setPublishSuccess(true);
    setTimeout(() => setPublishSuccess(false), 3000);
  };

  return (
    <div className="flex h-full flex-col bg-stone-50 rounded-xl overflow-hidden border border-neutral-200 shadow-sm">
      {/* Top Toolbar */}
      <div className="bg-white px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif font-bold text-neutral-900">Website Editor</h2>
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold mt-1">Live CMS & Media Library</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-neutral-700 text-xs font-bold uppercase tracking-wider rounded-sm transition flex items-center gap-2">
            <Undo className="w-4 h-4" /> Undo
          </button>
          <button onClick={handleSaveDraft} className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-neutral-700 text-xs font-bold uppercase tracking-wider rounded-sm transition flex items-center gap-2">
            <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          <button className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-neutral-700 text-xs font-bold uppercase tracking-wider rounded-sm transition flex items-center gap-2">
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button onClick={handlePublish} className="px-6 py-2 bg-editorial-accent hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition shadow-sm flex items-center gap-2">
            {publishSuccess ? <CheckCircle className="w-4 h-4" /> : <Layout className="w-4 h-4" />}
            {publishSuccess ? 'Published!' : 'Publish to Live Site'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 bg-white border-r border-neutral-200 flex flex-col">
          <nav className="flex flex-col p-4 gap-2">
            <button onClick={() => setActiveTab('pages')} className={`flex items-center gap-3 p-3 rounded-md text-sm font-bold uppercase tracking-wider transition ${activeTab === 'pages' ? 'bg-stone-100 text-editorial-accent' : 'text-neutral-500 hover:bg-stone-50'}`}>
              <Type className="w-4 h-4" /> Page Sections
            </button>
            <button onClick={() => setActiveTab('media')} className={`flex items-center gap-3 p-3 rounded-md text-sm font-bold uppercase tracking-wider transition ${activeTab === 'media' ? 'bg-stone-100 text-editorial-accent' : 'text-neutral-500 hover:bg-stone-50'}`}>
              <ImageIcon className="w-4 h-4" /> Media Library
            </button>
            <button onClick={() => setActiveTab('seo')} className={`flex items-center gap-3 p-3 rounded-md text-sm font-bold uppercase tracking-wider transition ${activeTab === 'seo' ? 'bg-stone-100 text-editorial-accent' : 'text-neutral-500 hover:bg-stone-50'}`}>
              <Layout className="w-4 h-4" /> Global SEO & Colors
            </button>
            <button onClick={() => setActiveTab('history')} className={`flex items-center gap-3 p-3 rounded-md text-sm font-bold uppercase tracking-wider transition ${activeTab === 'history' ? 'bg-stone-100 text-editorial-accent' : 'text-neutral-500 hover:bg-stone-50'}`}>
              <History className="w-4 h-4" /> Version History
            </button>
          </nav>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 p-8 overflow-y-auto bg-stone-50">
          
          {activeTab === 'pages' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <h3 className="text-lg font-serif font-bold text-neutral-800 border-b border-neutral-200 pb-3">Homepage Sections (Drag & Drop)</h3>
              
              <div className="space-y-3">
                {sections.map((section, idx) => (
                  <div key={section.id} className="bg-white border border-neutral-200 p-4 rounded-md shadow-sm flex items-start gap-4 hover:border-editorial-accent transition cursor-move">
                    <GripVertical className="w-5 h-5 text-neutral-400 mt-1" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-sm uppercase tracking-wider text-neutral-700">{idx + 1}. {section.name}</h4>
                        <button className="text-xs text-editorial-accent uppercase tracking-wider font-bold">Edit</button>
                      </div>
                      <p className="text-sm text-neutral-500 font-serif italic">{section.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <button className="w-full py-4 border-2 border-dashed border-neutral-300 rounded-md text-neutral-500 font-bold uppercase tracking-wider text-sm hover:border-editorial-accent hover:text-editorial-accent transition flex items-center justify-center gap-2">
                <Layout className="w-4 h-4" /> Add New Section
              </button>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <h3 className="text-lg font-serif font-bold text-neutral-800">Media Library</h3>
                <button className="px-4 py-2 bg-neutral-900 text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-neutral-800 transition">
                  <UploadCloud className="w-4 h-4" /> Upload Image
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[1,2,3,4,5,6].map((img) => (
                  <div key={img} className="bg-neutral-200 aspect-square rounded-md border border-neutral-300 flex items-center justify-center relative group overflow-hidden">
                    <ImageIcon className="w-8 h-8 text-neutral-400" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <button className="px-3 py-1 bg-white text-neutral-900 text-xs font-bold uppercase rounded-sm">Select</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <h3 className="text-lg font-serif font-bold text-neutral-800 border-b border-neutral-200 pb-3">Version History</h3>
              <div className="space-y-4">
                <div className="p-4 bg-white border border-editorial-accent rounded-md flex justify-between items-center shadow-sm">
                  <div>
                    <div className="font-bold text-sm text-neutral-900">Current Published Version</div>
                    <div className="text-xs text-neutral-500 mt-1">Published by Nazif (Admin) - Today at 10:45 AM</div>
                  </div>
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs uppercase tracking-wider font-bold rounded-sm">Live</span>
                </div>
                <div className="p-4 bg-white border border-neutral-200 rounded-md flex justify-between items-center">
                  <div>
                    <div className="font-bold text-sm text-neutral-700">Updated Homepage Banner</div>
                    <div className="text-xs text-neutral-500 mt-1">Saved by Nazif (Admin) - Yesterday at 4:20 PM</div>
                  </div>
                  <button className="text-xs text-editorial-accent font-bold uppercase tracking-wider">Restore</button>
                </div>
                <div className="p-4 bg-white border border-neutral-200 rounded-md flex justify-between items-center">
                  <div>
                    <div className="font-bold text-sm text-neutral-700">Initial Import</div>
                    <div className="text-xs text-neutral-500 mt-1">Saved by System - Oct 12, 2025</div>
                  </div>
                  <button className="text-xs text-editorial-accent font-bold uppercase tracking-wider">Restore</button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'seo' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <h3 className="text-lg font-serif font-bold text-neutral-800 border-b border-neutral-200 pb-3">Global SEO & Branding</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Site Title</label>
                  <input type="text" defaultValue="Marco Polo Oriental Rugs" className="w-full border border-neutral-300 p-2 text-sm rounded outline-none focus:border-editorial-accent" />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Brand Color (Hex)</label>
                  <div className="flex gap-2">
                    <input type="color" defaultValue="#9e6a38" className="h-9 w-12 cursor-pointer border border-neutral-300 p-0.5 rounded" />
                    <input type="text" defaultValue="#9e6a38" className="flex-1 border border-neutral-300 p-2 text-sm rounded outline-none focus:border-editorial-accent" />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Meta Description</label>
                  <textarea rows={3} defaultValue="Fine antique and modern oriental rugs in Alexandria, VA." className="w-full border border-neutral-300 p-2 text-sm rounded outline-none focus:border-editorial-accent"></textarea>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
