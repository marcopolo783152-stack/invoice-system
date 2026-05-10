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
        console.log("Running query...");
        const q = query(collection(db, 'timelogs'), orderBy('timestamp', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        console.log("Success! Logs count:", snapshot.size);
        process.exit(0);
    } catch (e) {
        console.error("Query failed with error:", e.message);
        process.exit(1);
    }
}

testQuery();
