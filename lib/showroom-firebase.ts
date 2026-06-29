import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  writeBatch 
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { Rug, BlogPost, Review, Order, ChatMessage, CleaningBooking, SocialMediaLink } from "@/types";
import { INITIAL_RUGS } from "@/data/rugs";
import { INITIAL_BLOGS } from "@/data/blogs";

export const SHOWROOM_RUGS = "showroom_rugs";
export const SHOWROOM_BLOGS = "showroom_blogs";
export const SHOWROOM_ORDERS = "showroom_orders";
export const SHOWROOM_REVIEWS = "showroom_reviews";
export const SHOWROOM_CHAT = "showroom_chat";
export const SHOWROOM_SETTINGS = "showroom_settings";
export const SHOWROOM_CLEANING = "showroom_cleaning_bookings";
export const SHOWROOM_PROMOCODES = "showroom_promocodes";

// -- Seeding Initial Data --

export const seedShowroomDataIfEmpty = async () => {
  const firestoreDb = db; 
  if (!isFirebaseConfigured() || !firestoreDb) { alert("FIREBASE IS NOT CONFIGURED OR DB IS NULL in addShowroomDoc! isConfig: " + isFirebaseConfigured() + ", db: " + !!firestoreDb); return; }

  try {
    // Check Rugs
    const rugsSnap = await getDocs(collection(firestoreDb, SHOWROOM_RUGS));
    if (rugsSnap.empty) {
      const batch = writeBatch(firestoreDb);
      INITIAL_RUGS.forEach(rug => {
        const ref = doc(collection(firestoreDb, SHOWROOM_RUGS), rug.id);
        batch.set(ref, rug);
      });
      await batch.commit();
      console.log("Seeded initial rugs to Firebase.");
    }

    // Check Blogs
    const blogsSnap = await getDocs(collection(firestoreDb, SHOWROOM_BLOGS));
    if (blogsSnap.empty) {
      const batch = writeBatch(firestoreDb);
      INITIAL_BLOGS.forEach(blog => {
        const ref = doc(collection(firestoreDb, SHOWROOM_BLOGS), blog.id);
        batch.set(ref, blog);
      });
      await batch.commit();
      console.log("Seeded initial blogs to Firebase.");
    }

    // Check Settings
    const settingsSnap = await getDocs(collection(firestoreDb, SHOWROOM_SETTINGS));
    if (settingsSnap.empty) {
      const batch = writeBatch(firestoreDb);
      
      const defaultSocials: SocialMediaLink[] = [
        { platform: "instagram", url: "https://instagram.com/marcopolorugs" },
        { platform: "pinterest", url: "https://pinterest.com/marcopolorugs" },
        { platform: "facebook", url: "https://facebook.com/marcopolorugs" },
        { platform: "tiktok", url: "https://tiktok.com/@marcopolorugs" },
        { platform: "youtube", url: "https://youtube.com/c/marcopolorugs" },
        { platform: "twitter", url: "https://twitter.com/marcopolorugs" }
      ];

      batch.set(doc(firestoreDb, SHOWROOM_SETTINGS, "hero"), { 
        urls: ["", "", ""]
      });
      batch.set(doc(firestoreDb, SHOWROOM_SETTINGS, "announcement"), { text: "🏛️ SHOWROOM SPECIAL: Free premium felt underlays with any 8x10 or larger antique Persian collection purchase this week." });
            batch.set(doc(firestoreDb, SHOWROOM_SETTINGS, "profile"), { 
        name: "Marco Polo Fine Rugs",
        phone: "+1 (555) 123-4567",
        email: "contact@marcopolorugs.com",
        address: "123 Luxury Avenue, Design District, NY 10001"
      });
      batch.set(doc(firestoreDb, SHOWROOM_SETTINGS, "logo"), { url: "" });
      batch.set(doc(firestoreDb, SHOWROOM_SETTINGS, "social"), { links: defaultSocials });
      
      await batch.commit();
      console.log("Seeded initial settings to Firebase.");
    }

    // Check Reviews (Seed manually)
    const reviewsSnap = await getDocs(collection(firestoreDb, SHOWROOM_REVIEWS));
    if (reviewsSnap.empty) {
      const INITIAL_REVIEWS: Review[] = [
        {
          id: "rev-1",
          rugId: "rug-1",
          rating: 5,
          reviewerName: "Victoria Sterling",
          reviewText: "Words cannot describe the sheer artistry of this Royal Kashan rug. Woven to absolute perfection. The crimson reds have a regal depth and the silk highlights truly sparkle under our living room chandelier. Customer service from Marco Polo was immaculate—they even walked me through custom pad selections. Worth every single penny!",
          isApproved: true,
          createdAt: "2026-05-10T14:30:00.000Z"
        },
        {
          id: "rev-2",
          rugId: "rug-2",
          rating: 5,
          reviewerName: "Harrison Fletcher",
          reviewText: "Incredibly durable and dense highland wool. The Serapi geometric design is incredibly strong and anchors our rustic oak dining table perfectly. The color variation (Abrash) is very charming and rustic. Shipping took just 3 days to New York, packed beautifully in waterproof sleeves.",
          isApproved: true,
          createdAt: "2026-06-01T10:15:00.000Z"
        },
        {
          id: "rev-3",
          rugId: "rug-3",
          rating: 5,
          reviewerName: "Aria Montaigne",
          reviewText: "A breathtaking museum-quality masterpiece! The Tree of Life design has magnificent detail and the silk pile shifts beautifully from silver-ivory to deep crimson as you walk around the room. Our home feels like an art gallery now. Stunning work.",
          isApproved: true,
          createdAt: "2026-06-12T18:22:00.000Z"
        },
        {
          id: "rev-4",
          rugId: "rug-4",
          rating: 4,
          reviewerName: "Julian Vance",
          reviewText: "Lovely geometric patterns and vibrant native colors on this Kazak. The hand-spun wool is soft underfoot. There is a slight herbal aroma from the vegetable dyes, which dissipated after two days of unrolling. Outstanding value for an authentic handmade Afghan piece.",
          isApproved: true,
          createdAt: "2026-06-20T09:45:00.000Z"
        }
      ];
      
      const batch = writeBatch(firestoreDb);
      INITIAL_REVIEWS.forEach(rev => {
        const ref = doc(collection(firestoreDb, SHOWROOM_REVIEWS), rev.id);
        batch.set(ref, rev);
      });
      await batch.commit();
      console.log("Seeded initial reviews to Firebase.");
    }

  } catch (error) {
    console.error("Error seeding initial showroom data to Firebase:", error);
  }
};

// -- Subscriptions --

export const subscribeToCollection = <T>(
  colName: string, 
  callback: (data: T[]) => void
) => {
  const firestoreDb = db; 
  if (!isFirebaseConfigured() || !firestoreDb) { console.warn("FIREBASE IS NOT CONFIGURED OR DB IS NULL in subscribe!"); return () => {}; }
  
  return onSnapshot(collection(firestoreDb, colName), (snapshot) => {
    const items: T[] = [];
    snapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as unknown as T);
    });
    callback(items);
  }, (error) => {
    console.error(`Error subscribing to ${colName}:`, error);
  });
};

export const subscribeToSettings = (
  callbacks: {
    onHero: (urls: string[]) => void;
    onAnnouncement: (text: string) => void;
    onLogo: (url: string) => void;
  onProfile: (p: any) => void;

    onSocial: (links: SocialMediaLink[]) => void;
  }
) => {
  const firestoreDb = db; 
  if (!isFirebaseConfigured() || !firestoreDb) { console.warn("FIREBASE IS NOT CONFIGURED OR DB IS NULL in subscribe!"); return () => {}; }
  
  return onSnapshot(collection(firestoreDb, SHOWROOM_SETTINGS), (snapshot) => {
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (doc.id === "hero") {
        if (data.urls) {
          callbacks.onHero(data.urls);
        } else if (data.url) {
          callbacks.onHero([data.url, "", ""]);
        }
      }
      if (doc.id === "announcement" && data.text !== undefined) callbacks.onAnnouncement(data.text);
      if (doc.id === "logo" && data.url !== undefined) callbacks.onLogo(data.url);
      if (doc.id === "profile") callbacks.onProfile(data);

      if (doc.id === "social" && data.links !== undefined) callbacks.onSocial(data.links);
    });
  }, (error) => {
    console.error(`Error subscribing to settings:`, error);
  });
};

// -- CRUD Operations --

export const addShowroomDoc = async (colName: string, data: any) => {
  const firestoreDb = db; 
  if (!isFirebaseConfigured() || !firestoreDb) { alert("FIREBASE IS NOT CONFIGURED OR DB IS NULL in addShowroomDoc! isConfig: " + isFirebaseConfigured() + ", db: " + !!firestoreDb); return; }
  if (data.id) {
    await setDoc(doc(firestoreDb, colName, data.id), data);
  } else {
    await addDoc(collection(firestoreDb, colName), data);
  }
};

export const updateShowroomDoc = async (colName: string, id: string, data: any) => {
  const firestoreDb = db; 
  if (!isFirebaseConfigured() || !firestoreDb) { alert("FIREBASE IS NOT CONFIGURED OR DB IS NULL in addShowroomDoc! isConfig: " + isFirebaseConfigured() + ", db: " + !!firestoreDb); return; }
  await updateDoc(doc(firestoreDb, colName, id), data);
};

export const deleteShowroomDoc = async (colName: string, id: string) => {
  const firestoreDb = db; 
  if (!isFirebaseConfigured() || !firestoreDb) { alert("FIREBASE IS NOT CONFIGURED OR DB IS NULL in addShowroomDoc! isConfig: " + isFirebaseConfigured() + ", db: " + !!firestoreDb); return; }
  await deleteDoc(doc(firestoreDb, colName, id));
};

export const updateSettingDoc = async (settingId: string, data: any) => {
  const firestoreDb = db; 
  if (!isFirebaseConfigured() || !firestoreDb) { alert("FIREBASE IS NOT CONFIGURED OR DB IS NULL in addShowroomDoc! isConfig: " + isFirebaseConfigured() + ", db: " + !!firestoreDb); return; }
  await setDoc(doc(firestoreDb, SHOWROOM_SETTINGS, settingId), data, { merge: true });
};
