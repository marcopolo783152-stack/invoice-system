const { initializeApp } = require('firebase/app');
const { getFirestore, getDocs, collection, query, orderBy, limit } = require('firebase/firestore');

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

async function checkRecentLogs() {
    try {
        const q = query(collection(db, 'timelogs'), orderBy('timestamp', 'desc'), limit(15));
        const snap = await getDocs(q);
        
        console.log(`Recent Timelogs:`);
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`- ${data.employeeName}: ${data.type} at ${data.timestamp} (notes: ${data.notes || ''})`);
        });

    } catch (e) {
        console.error('Error:', e);
    }
}

checkRecentLogs().then(() => process.exit(0));
