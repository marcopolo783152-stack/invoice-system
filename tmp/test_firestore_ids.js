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

async function checkIds() {
    try {
        const empSnap = await getDocs(collection(db, 'employees'));
        console.log("EMPLOYEES in DB:");
        empSnap.forEach(e => {
            const data = e.data();
            console.log(`- DocID: ${e.id}, empId: ${data.empId}, name: ${data.name}`);
        });

        console.log("\n------------------\n");

        const q = query(collection(db, 'timelogs'), orderBy('timestamp', 'desc'), limit(10));
        const snap = await getDocs(q);
        
        console.log(`RECENT LOGS in DB:`);
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`- ${data.employeeName}: employeeId=${data.employeeId}, type=${data.type}`);
        });

    } catch (e) {
        console.error('Error:', e);
    }
}

checkIds().then(() => process.exit(0));
