const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, limit, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCT5ukPxCXfMI3j8PgJCGdF5AvN6RnX0Y8",
  authDomain: "marcopolo-invoice.firebaseapp.com",
  projectId: "marcopolo-invoice",
  storageBucket: "marcopolo-invoice.firebasestorage.app",
  messagingSenderId: "257585408766",
  appId: "1:257585408766:web:6309ba28477926e86c796f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testQuery() {
    try {
        console.log("Running query exactly as in employee-storage.ts...");
        const limitCount = 500; // In page.tsx: getTimeLogs(500)
        const q = query(collection(db, 'timelogs'), orderBy('timestamp', 'desc'), limit(limitCount));
        const snapshot = await getDocs(q);
        console.log("Success! Logs count:", snapshot.size);
        
        // Print the first log to verify
        if (snapshot.size > 0) {
            console.log("First log:", snapshot.docs[0].data());
        }
        process.exit(0);
    } catch (e) {
        console.error("Query failed with error:", e.message);
        process.exit(1);
    }
}

testQuery();
