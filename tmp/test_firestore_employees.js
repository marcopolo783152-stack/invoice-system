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

async function checkCollections() {
    try {
        const timelogsRoot = await getDocs(collection(db, 'timelogs'));
        console.log(`timelogs (root): ${timelogsRoot.size} documents`);

        const timelogsMarco = await getDocs(collection(db, 'marcopolo_timelogs'));
        console.log(`marcopolo_timelogs: ${timelogsMarco.size} documents`);
        
        const employeesRoot = await getDocs(collection(db, 'employees'));
        console.log(`employees (root): ${employeesRoot.size} documents`);

        const employeesMarco = await getDocs(collection(db, 'marcopolo_employees'));
        console.log(`marcopolo_employees: ${employeesMarco.size} documents`);

    } catch (e) {
        console.error('Error:', e);
    }
}

checkCollections().then(() => process.exit(0));
