const fs = require('fs');

// 1. Update StoreContext.tsx
const storeFile = 'context/StoreContext.tsx';
let storeContent = fs.readFileSync(storeFile, 'utf8');

const oldDeleteRug = `  const deleteRug = (id: string) => {
    setRugs(prev => prev.filter(r => r.id !== id)); // Optimistic UI
    deleteShowroomDoc(SHOWROOM_RUGS, id);
  };`;

const newDeleteRug = `  const deleteRug = async (id: string) => {
    const rug = rugs.find(r => r.id === id);
    setRugs(prev => prev.filter(r => r.id !== id)); // Optimistic UI
    
    // Delete images from Firebase Storage
    if (rug) {
      try {
        const { storage } = await import("@/lib/firebase");
        const { ref, deleteObject } = await import("firebase/storage");
        const deleteImg = async (url) => {
          if (!url || !url.includes("firebasestorage.googleapis.com")) return;
          try {
            await deleteObject(ref(storage, url));
          } catch (e) {
            console.error("Failed to delete storage image", e);
          }
        };
        
        if (rug.imageUrl) await deleteImg(rug.imageUrl);
        if (rug.additionalImages) {
          for (const img of rug.additionalImages) {
            await deleteImg(img);
          }
        }
      } catch (e) {
        console.error("Error cleaning up storage", e);
      }
    }
    
    deleteShowroomDoc(SHOWROOM_RUGS, id);
  };`;

if (storeContent.includes(oldDeleteRug)) {
  storeContent = storeContent.replace(oldDeleteRug, newDeleteRug);
  fs.writeFileSync(storeFile, storeContent);
  console.log("Updated deleteRug in StoreContext.tsx");
} else {
  console.log("Could not find old deleteRug logic");
}

// 2. Update AdminDashboard.tsx
const adminFile = 'components/public/AdminDashboard.tsx';
let adminContent = fs.readFileSync(adminFile, 'utf8');

const oldBulkActions = `                          Remove Sale
                          </button>
                        </div>`;

const newBulkActions = `                          Remove Sale
                          </button>
                          
                          <button 
                            onClick={() => {
                              if (confirm(\`Are you sure you want to completely delete \${selectedRugIds.length} rug(s)? This will also permanently delete all associated images from storage.\`)) {
                                selectedRugIds.forEach(id => {
                                  deleteRug(id);
                                });
                                setSelectedRugIds([]);
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition ml-4"
                          >
                            Delete Selected
                          </button>
                        </div>`;

if (adminContent.includes(oldBulkActions)) {
  adminContent = adminContent.replace(oldBulkActions, newBulkActions);
  fs.writeFileSync(adminFile, adminContent);
  console.log("Updated Bulk Actions in AdminDashboard.tsx");
} else {
  console.log("Could not find Bulk Actions logic");
}
