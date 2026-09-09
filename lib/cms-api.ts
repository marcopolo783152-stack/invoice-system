import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { CMSPage, CMSSettings, CMSMedia } from '@/components/public/WebsiteBuilderTypes';

// Pages
export const getCMSPages = async (): Promise<CMSPage[]> => {
  const snapshot = await getDocs(collection(db, 'site_pages'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CMSPage));
};

export const getCMSPageBySlug = async (slug: string): Promise<CMSPage | null> => {
  const q = query(collection(db, 'site_pages'), where('slug', '==', slug));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CMSPage;
};

export const saveCMSPage = async (page: Partial<CMSPage>): Promise<string> => {
  if (page.id) {
    const docRef = doc(db, 'site_pages', page.id);
    await updateDoc(docRef, {
      ...page,
      updatedAt: Date.now()
    });
    return page.id;
  } else {
    const docRef = await addDoc(collection(db, 'site_pages'), {
      ...page,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    return docRef.id;
  }
};

export const deleteCMSPage = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'site_pages', id));
};

// Settings
export const getCMSSettings = async (): Promise<CMSSettings | null> => {
  const docRef = doc(db, 'site_settings', 'global');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as CMSSettings;
  }
  return null;
};

export const saveCMSSettings = async (settings: CMSSettings): Promise<void> => {
  const docRef = doc(db, 'site_settings', 'global');
  await setDoc(docRef, settings, { merge: true });
};

// Media
export const getCMSMedia = async (): Promise<CMSMedia[]> => {
  const q = query(collection(db, 'site_media'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CMSMedia));
};

export const saveCMSMedia = async (media: Omit<CMSMedia, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'site_media'), media);
  return docRef.id;
};
