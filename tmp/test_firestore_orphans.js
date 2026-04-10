const { initializeApp } = require('firebase/app');
const { getFirestore, getDocs, collection } = require('firebase/firestore');

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

async function verifyAll() {
    try {
        const empSnap = await getDocs(collection(db, 'employees'));
        const docIds = new Set();
        empSnap.forEach(e => docIds.add(e.id));
        
        console.log(`Checking ${docIds.size} employees against all timelogs...`);

        const snap = await getDocs(collection(db, 'timelogs'));
        let orphanCount = 0;
        let todayLogs = 0;
        snap.forEach(doc => {
            const data = doc.data();
            const ts = data.timestamp;
            let tsStr = ts;
            if (ts && ts.toDate) tsStr = ts.toDate().toISOString();
            
            if (tsStr && tsStr.includes('2026-04-')) {
                todayLogs++;
            }

            if (!docIds.has(data.employeeId)) {
                console.log(`ORPHAN LOG: ${data.employeeName} - ID: ${data.employeeId} - Date: ${tsStr}`);
                orphanCount++;
            }
        });

        console.log(`Total orphan logs (ID not matching any employee doc): ${orphanCount}`);
        console.log(`Total logs in April 2026: ${todayLogs}`);
    } catch (e) {
        console.error('Error:', e);
    }
}

verifyAll().then(() => process.exit(0));
