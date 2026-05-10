import { db } from './lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

async function dumpLogs() {
    if (!db) {
        console.log("DB not initialized");
        return;
    }
    const q = query(collection(db, 'timelogs'), orderBy('timestamp', 'desc'), limit(10));
    const snap = await getDocs(q);
    console.log(`Found ${snap.size} logs`);
    snap.forEach(doc => {
        console.log(doc.id, doc.data());
    });
}

dumpLogs();
