'use client';

import React, { useState, useEffect } from 'react';
import { Type, ImageIcon, Layout, History, GripVertical, Plus, Save, Trash2, Edit2, Check, X, ArrowLeft, UploadCloud, Globe, Settings, Eye } from 'lucide-react';
import { CMSPage, CMSSection, CMSSectionType, CMSSettings, CMSMedia } from './WebsiteBuilderTypes';
import { SECTION_SCHEMAS } from './CMSConfig';
import { getCMSPages, saveCMSPage, deleteCMSPage, getCMSSettings, saveCMSSettings, getCMSMedia, saveCMSMedia } from '@/lib/cms-api';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function WebsiteBuilder() {
  const [activeTab, setActiveTab] = useState<'pages' | 'media' | 'seo' | 'history'>('pages');
  
  // Pages State
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [editingPage, setEditingPage] = useState<CMSPage | null>(null);
  
  // Settings State
  const [settings, setSettings] = useState<CMSSettings | null>(null);
  
  // Media State
  const [mediaList, setMediaList] = useState<CMSMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const fetchedPages = await getCMSPages();
      setPages(fetchedPages);
      
      const fetchedSettings = await getCMSSettings();
      if (fetchedSettings) setSettings(fetchedSettings);
      
      const fetchedMedia = await getCMSMedia();
      setMediaList(fetchedMedia);
    } catch (e) {
      console.error("Failed to load CMS data", e);
    }
    setLoading(false);
  };

  const handleCreatePage = async () => {
    const newPage: Partial<CMSPage> = {
      title: 'New Page',
      slug: 'new-page',
      status: 'draft',
      seo: { title: 'New Page', description: '', socialImage: '' },
      sections: []
    };
    const id = await saveCMSPage(newPage);
    newPage.id = id;
    setPages([...pages, newPage as CMSPage]);
    setEditingPage(newPage as CMSPage);
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;
    await deleteCMSPage(id);
    setPages(pages.filter(p => p.id !== id));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `cms_media/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const newMedia = {
        url,
        name: file.name,
        type: file.type.startsWith('video/') ? 'video' as const : 'image' as const,
        size: file.size,
        createdAt: Date.now()
      };
      
      const id = await saveCMSMedia(newMedia);
      setMediaList([{ id, ...newMedia }, ...mediaList]);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed.");
    }
    setIsUploading(false);
  };

  if (loading) return <div className="p-8 text-center text-neutral-500">Loading Website Editor...</div>;

  return (
    <div className="h-full flex flex-col bg-stone-100">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4 flex justify-between items-center shadow-sm z-10 relative">
        <div>
          <h2 className="text-2xl font-serif text-neutral-900 font-bold">Website Editor <span className="text-xs text-editorial-accent uppercase tracking-widest font-sans ml-2 bg-amber-50 px-2 py-1 rounded">Visual CMS</span></h2>
          <p className="text-sm text-neutral-500 mt-1 font-light">Manage your entire public website from A to Z without code.</p>
        </div>
        <div className="flex gap-2">
          {editingPage && (
            <button 
              onClick={() => {
                saveCMSPage(editingPage);
                alert("Saved successfully!");
              }}
              className="flex items-center gap-2 bg-editorial-accent text-white px-4 py-2 rounded font-bold uppercase tracking-wider text-xs hover:bg-neutral-900 transition"
            >
              <Save className="w-4 h-4" /> Save Page
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white border-r border-neutral-200 flex flex-col shadow-sm">
          <nav className="flex flex-col p-4 gap-2">
            <button onClick={() => { setActiveTab('pages'); setEditingPage(null); }} className={`flex items-center gap-3 p-3 rounded-md text-sm font-bold uppercase tracking-wider transition ${activeTab === 'pages' ? 'bg-stone-100 text-editorial-accent' : 'text-neutral-500 hover:bg-stone-50'}`}>
              <Layout className="w-4 h-4" /> Pages
            </button>
            <button onClick={() => { setActiveTab('media'); setEditingPage(null); }} className={`flex items-center gap-3 p-3 rounded-md text-sm font-bold uppercase tracking-wider transition ${activeTab === 'media' ? 'bg-stone-100 text-editorial-accent' : 'text-neutral-500 hover:bg-stone-50'}`}>
              <ImageIcon className="w-4 h-4" /> Media Library
            </button>
            <button onClick={() => { setActiveTab('seo'); setEditingPage(null); }} className={`flex items-center gap-3 p-3 rounded-md text-sm font-bold uppercase tracking-wider transition ${activeTab === 'seo' ? 'bg-stone-100 text-editorial-accent' : 'text-neutral-500 hover:bg-stone-50'}`}>
              <Settings className="w-4 h-4" /> Site Settings
            </button>
          </nav>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 overflow-y-auto bg-stone-50">
          
          {/* PAGES LIST VIEW */}
          {activeTab === 'pages' && !editingPage && (
            <div className="max-w-5xl mx-auto p-8 space-y-6">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <h3 className="text-xl font-serif font-bold text-neutral-800">Page Management</h3>
                <button onClick={handleCreatePage} className="px-4 py-2 bg-editorial-accent text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-neutral-900 transition">
                  <Plus className="w-4 h-4" /> Create Page
                </button>
              </div>
              
              <div className="bg-white rounded shadow-sm border border-neutral-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-stone-100 border-b border-neutral-200 text-xs uppercase font-bold text-neutral-500 tracking-wider">
                    <tr>
                      <th className="p-4">Title</th>
                      <th className="p-4">Slug (URL)</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Last Updated</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map(page => (
                      <tr key={page.id} className="border-b border-neutral-100 hover:bg-stone-50 transition">
                        <td className="p-4 font-bold text-neutral-800">{page.title}</td>
                        <td className="p-4 text-neutral-500 text-sm">/{page.slug}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${page.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                            {page.status}
                          </span>
                        </td>
                        <td className="p-4 text-neutral-500 text-sm">{new Date(page.updatedAt).toLocaleDateString()}</td>
                        <td className="p-4 text-right space-x-2">
                          <button onClick={() => setEditingPage(page)} className="p-2 text-editorial-accent hover:bg-amber-50 rounded">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeletePage(page.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pages.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-neutral-500 font-light">No pages found. Create your first page!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PAGE EDITOR (BUILDER) */}
          {activeTab === 'pages' && editingPage && (
            <PageBuilderEditor 
              page={editingPage} 
              setPage={setEditingPage} 
              onBack={() => { setEditingPage(null); loadData(); }} 
            />
          )}

          {/* MEDIA LIBRARY */}
          {activeTab === 'media' && (
            <div className="max-w-6xl mx-auto p-8 space-y-6">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <h3 className="text-xl font-serif font-bold text-neutral-800">Media Library</h3>
                <label className="cursor-pointer px-4 py-2 bg-neutral-900 text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-neutral-800 transition">
                  <UploadCloud className="w-4 h-4" /> {isUploading ? 'Uploading...' : 'Upload Media'}
                  <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} disabled={isUploading} />
                </label>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {mediaList.map((media) => (
                  <div key={media.id} className="bg-neutral-200 aspect-square rounded-md border border-neutral-300 flex flex-col items-center justify-center relative group overflow-hidden bg-cover bg-center" style={{ backgroundImage: `url(${media.url})` }}>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <a href={media.url} target="_blank" rel="noreferrer" className="px-3 py-1 bg-white text-neutral-900 text-xs font-bold uppercase rounded-sm">View</a>
                    </div>
                  </div>
                ))}
                {mediaList.length === 0 && (
                  <div className="col-span-full py-12 text-center text-neutral-500">No media uploaded yet.</div>
                )}
              </div>
            </div>
          )}

          {/* SITE SETTINGS */}
          {activeTab === 'seo' && (
            <div className="max-w-3xl mx-auto p-8 space-y-6">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <h3 className="text-xl font-serif font-bold text-neutral-800">Global Site Settings</h3>
                <button 
                  onClick={async () => {
                    if (settings) {
                      await saveCMSSettings(settings);
                      alert("Global settings saved.");
                    }
                  }}
                  className="px-4 py-2 bg-editorial-accent text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-neutral-900 transition"
                >
                  <Save className="w-4 h-4" /> Save Settings
                </button>
              </div>

              <div className="bg-white p-6 rounded shadow-sm border border-neutral-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fallback empty settings if null */}
                {(() => {
                  const s = settings || {
                    primaryColor: '#9e6a38', secondaryColor: '#171717', backgroundColor: '#f5f5f4', textColor: '#262626',
                    headingStyle: 'serif', buttonStyle: 'solid', borderRadius: '4px', contentWidth: 'max-w-7xl',
                    logo: '', favicon: '', defaultSocialImage: ''
                  } as CMSSettings;
                  
                  return (
                    <>
                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Primary Color (Hex)</label>
                        <input type="color" value={s.primaryColor} onChange={e => setSettings({...s, primaryColor: e.target.value})} className="h-10 w-full cursor-pointer border border-neutral-300 p-0.5 rounded" />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Secondary Color (Hex)</label>
                        <input type="color" value={s.secondaryColor} onChange={e => setSettings({...s, secondaryColor: e.target.value})} className="h-10 w-full cursor-pointer border border-neutral-300 p-0.5 rounded" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Logo Image URL</label>
                        <input type="text" value={s.logo} onChange={e => setSettings({...s, logo: e.target.value})} className="w-full border border-neutral-300 p-2 text-sm rounded outline-none focus:border-editorial-accent" placeholder="https://..." />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Default Social Sharing Image</label>
                        <input type="text" value={s.defaultSocialImage} onChange={e => setSettings({...s, defaultSocialImage: e.target.value})} className="w-full border border-neutral-300 p-2 text-sm rounded outline-none focus:border-editorial-accent" placeholder="https://..." />
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// Sub-component for editing a specific page
function PageBuilderEditor({ page, setPage, onBack }: { page: CMSPage, setPage: (p: CMSPage) => void, onBack: () => void }) {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const addSection = (type: CMSSectionType) => {
    const newSection: CMSSection = {
      id: Date.now().toString(),
      type,
      order: page.sections.length,
      enabled: true,
      settings: {},
      content: {}
    };
    // Initialize default fields from schema
    SECTION_SCHEMAS[type].fields.forEach(f => {
      newSection.content[f.name] = '';
    });

    setPage({
      ...page,
      sections: [...page.sections, newSection]
    });
    setActiveSectionId(newSection.id);
  };

  const updateSection = (sectionId: string, updates: Partial<CMSSection>) => {
    setPage({
      ...page,
      sections: page.sections.map(s => s.id === sectionId ? { ...s, ...updates } : s)
    });
  };

  const removeSection = (sectionId: string) => {
    setPage({
      ...page,
      sections: page.sections.filter(s => s.id !== sectionId)
    });
    if (activeSectionId === sectionId) setActiveSectionId(null);
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newSections = [...page.sections];
      const temp = newSections[index - 1];
      newSections[index - 1] = newSections[index];
      newSections[index] = temp;
      // update orders
      newSections.forEach((s, i) => s.order = i);
      setPage({ ...page, sections: newSections });
    } else if (direction === 'down' && index < page.sections.length - 1) {
      const newSections = [...page.sections];
      const temp = newSections[index + 1];
      newSections[index + 1] = newSections[index];
      newSections[index] = temp;
      newSections.forEach((s, i) => s.order = i);
      setPage({ ...page, sections: newSections });
    }
  };

  return (
    <div className="flex h-full">
      {/* Left: Page Settings & Blocks List */}
      <div className="w-80 bg-white border-r border-neutral-200 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-neutral-200">
          <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-editorial-accent mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Pages
          </button>
          
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Page Title</label>
              <input type="text" value={page.title} onChange={e => setPage({...page, title: e.target.value})} className="w-full border border-neutral-300 p-2 text-sm rounded outline-none focus:border-editorial-accent font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">URL Slug</label>
              <input type="text" value={page.slug} onChange={e => setPage({...page, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} className="w-full border border-neutral-300 p-2 text-sm rounded outline-none focus:border-editorial-accent" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Status</label>
              <select value={page.status} onChange={e => setPage({...page, status: e.target.value as 'draft'|'published'})} className="w-full border border-neutral-300 p-2 text-sm rounded outline-none focus:border-editorial-accent">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-4 flex-1">
          <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-800 mb-3 flex justify-between items-center">
            Sections
          </h4>
          
          <div className="space-y-2">
            {page.sections.sort((a,b) => a.order - b.order).map((section, idx) => (
              <div key={section.id} 
                className={`border rounded-md p-3 cursor-pointer transition ${activeSectionId === section.id ? 'border-editorial-accent bg-amber-50' : 'border-neutral-200 hover:border-neutral-300 bg-white'}`}
                onClick={() => setActiveSectionId(section.id)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-neutral-400" />
                    <span className="font-bold text-sm text-neutral-700">{SECTION_SCHEMAS[section.type]?.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }} className="p-1 hover:bg-neutral-200 rounded text-neutral-500">↑</button>
                    <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }} className="p-1 hover:bg-neutral-200 rounded text-neutral-500">↓</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-200">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Add New Block</h5>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(SECTION_SCHEMAS).map(([type, schema]) => (
                <button 
                  key={type} 
                  onClick={() => addSection(type as CMSSectionType)}
                  className="p-2 text-xs border border-neutral-200 rounded bg-stone-50 hover:bg-editorial-accent hover:text-white hover:border-editorial-accent transition font-bold"
                >
                  + {schema.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Section Editor Panel */}
      <div className="flex-1 bg-stone-50 p-8 overflow-y-auto">
        {activeSectionId ? (() => {
          const section = page.sections.find(s => s.id === activeSectionId);
          if (!section) return null;
          const schema = SECTION_SCHEMAS[section.type];

          return (
            <div className="max-w-2xl mx-auto bg-white border border-neutral-200 shadow-sm rounded-md overflow-hidden">
              <div className="bg-stone-100 border-b border-neutral-200 p-4 flex justify-between items-center">
                <h3 className="font-serif font-bold text-lg text-neutral-800">Edit: {schema.name}</h3>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer">
                    <input type="checkbox" checked={section.enabled} onChange={e => updateSection(section.id, { enabled: e.target.checked })} className="accent-editorial-accent" />
                    Visible
                  </label>
                  <button onClick={() => removeSection(section.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {schema.fields.map(field => (
                  <div key={field.name} className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">{field.label}</label>
                    
                    {field.type === 'text' ? (
                      <textarea 
                        rows={4} 
                        value={section.content[field.name] || ''} 
                        onChange={e => updateSection(section.id, { content: { ...section.content, [field.name]: e.target.value } })}
                        className="w-full border border-neutral-300 p-2 text-sm rounded outline-none focus:border-editorial-accent"
                      />
                    ) : field.type === 'select' ? (
                      <select 
                        value={section.content[field.name] || ''} 
                        onChange={e => updateSection(section.id, { content: { ...section.content, [field.name]: e.target.value } })}
                        className="w-full border border-neutral-300 p-2 text-sm rounded outline-none focus:border-editorial-accent"
                      >
                        <option value="">Select option...</option>
                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : field.type === 'boolean' ? (
                      <input 
                        type="checkbox" 
                        checked={section.content[field.name] === true || section.content[field.name] === 'true'} 
                        onChange={e => updateSection(section.id, { content: { ...section.content, [field.name]: e.target.checked } })}
                        className="accent-editorial-accent"
                      />
                    ) : (
                      <input 
                        type={field.type === 'number' ? 'number' : field.type === 'color' ? 'color' : 'text'} 
                        value={section.content[field.name] || ''} 
                        onChange={e => updateSection(section.id, { content: { ...section.content, [field.name]: e.target.value } })}
                        className={`w-full border border-neutral-300 p-2 text-sm rounded outline-none focus:border-editorial-accent ${field.type==='color' ? 'h-10 cursor-pointer p-0.5' : ''}`}
                      />
                    )}
                    {field.type === 'image' && (
                       <p className="text-[10px] text-neutral-400 mt-1">Paste a URL from the Media Library.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })() : (
          <div className="flex flex-col items-center justify-center h-full text-neutral-400">
            <Layout className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-bold uppercase tracking-wider text-sm">Select a section to edit</p>
          </div>
        )}
      </div>
    </div>
  );
}
