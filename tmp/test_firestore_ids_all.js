const { initializeApp } = require('firebase/app');
const { getFirestore, getDocs, collection, query, orderBy } = require('firebase/firestore');

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

async function checkIds() {
    try {
        const q = query(collection(db, 'timelogs'), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        
        console.log(`Checking ALL LOGS in DB:`);
        let badCount = 0;
        snap.forEach(doc => {
            const data = doc.data();
            if (data.employeeId && data.employeeId.includes('EMP-')) {
                console.log(`FOUND BUGGY LOG: ${data.employeeName}: employeeId=${data.employeeId}, type=${data.type}`);
                badCount++;
            }
        });
        console.log(`Total buggy logs: ${badCount}`);

    } catch (e) {
        console.error('Error:', e);
    }
}

checkIds().then(() => process.exit(0));
