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

async function checkQuery() {
    try {
        console.log("Attempting query: timelogs ORDER BY timestamp DESC LIMIT 500");
        const logCol = 'timelogs';
        const q = query(collection(db, logCol), orderBy('timestamp', 'desc'), limit(500));
        const snapshot = await getDocs(q);
        console.log(`Success! Fetched ${snapshot.size} logs.`);
        
        let invalidCount = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.timestamp) {
                console.log(`Log ${doc.id} MISSSING timestamp!`);
                invalidCount++;
            }
        });
        console.log(`Total logs with missing timestamp in top 500: ${invalidCount}`);

    } catch (e) {
        console.error('FAILED QUERY:', e.message);
        if (e.message.includes('index')) {
            console.log('CLUE: Missing Index error.');
        }
    }
}

checkQuery().then(() => process.exit(0));
