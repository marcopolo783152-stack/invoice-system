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

async function checkTypes() {
    try {
        const logCol = 'timelogs';
        const q = query(collection(db, logCol), limit(10));
        const snapshot = await getDocs(q);
        
        console.log("Checking field types in timelogs:");
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`Log ${doc.id}:`);
            console.log(`- employeeId: type=${typeof data.employeeId}, value=${data.employeeId}`);
            if (data.employeeId && data.employeeId.path) {
                console.log(`  (It's a DocumentReference! Path: ${data.employeeId.path})`);
            }
            console.log(`- timestamp: type=${typeof data.timestamp}, value=${data.timestamp}`);
            if (data.timestamp && data.timestamp.toDate) {
                console.log(`  (It's a Timestamp object)`);
            }
        });

    } catch (e) {
        console.error('Error:', e);
    }
}

checkTypes().then(() => process.exit(0));
