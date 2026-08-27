import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import fs from "fs";

const envData = fs.readFileSync('.env.local', 'utf-8');
const envVars = {};
envData.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

const firebaseConfig = {
    apiKey: envVars.NEXT_PUBLIC_FIREBASE_API_KEY.replace(/['"]/g, ''),
    authDomain: envVars.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN.replace(/['"]/g, ''),
    projectId: envVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID.replace(/['"]/g, ''),
    storageBucket: envVars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.replace(/['"]/g, ''),
    messagingSenderId: envVars.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID.replace(/['"]/g, ''),
    appId: envVars.NEXT_PUBLIC_FIREBASE_APP_ID.replace(/['"]/g, '')
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const prefix = (envVars.NEXT_PUBLIC_STORE_PREFIX || "").replace(/['"]/g, '');
    const q = query(collection(db, prefix + 'invoices'), orderBy('invoiceNumber', 'desc'), limit(5));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        let dateObj = data.createdAt;
        if (dateObj && dateObj.toDate) {
             dateObj = dateObj.toDate();
        }
        console.log(data.invoiceNumber, dateObj);
    });
}
run();
