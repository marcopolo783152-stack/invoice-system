const fs = require('fs');
const file = 'context/StoreContext.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldDeleteRug = `  const deleteRug = async (id: string) => {
    const rug = rugs.find(r => r.id === id);
    setRugs(prev => prev.filter(r => r.id !== id)); // Optimistic UI
    
    // Delete images from Firebase Storage
    if (rug) {
      try {
        const { storage } = await import("@/lib/firebase");
        const { ref, deleteObject } = await import("firebase/storage");
        const deleteImg = async (url: string) => {
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

const newDeleteRug = `  const deleteRug = async (id: string) => {
    const rug = rugs.find(r => r.id === id);
    setRugs(prev => prev.filter(r => r.id !== id)); // Optimistic UI
    
    // Delete images from Firebase Storage
    if (rug) {
      try {
        const { storage } = await import("@/lib/firebase");
        const { ref, deleteObject } = await import("firebase/storage");
        
        if (storage) {
          const deleteImg = async (url: string) => {
            if (!url || !url.includes("firebasestorage.googleapis.com")) return;
            try {
              // @ts-ignore
              await deleteObject(ref(storage, url));
            } catch (e) {
              console.error("Failed to delete storage image", e);
            }
          };
          
          if (rug.images && Array.isArray(rug.images)) {
            for (const img of rug.images) {
              await deleteImg(img);
            }
          }
        }
      } catch (e) {
        console.error("Error cleaning up storage", e);
      }
    }
    
    deleteShowroomDoc(SHOWROOM_RUGS, id);
  };`;

if (content.includes(oldDeleteRug)) {
  content = content.replace(oldDeleteRug, newDeleteRug);
  fs.writeFileSync(file, content);
  console.log("Successfully patched deleteRug");
} else {
  console.log("Could not find old deleteRug logic");
}
