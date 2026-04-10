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

async function testFirebaseRead() {
    try {
        const snap = await getDocs(collection(db, 'appraisals'));
        console.log('Read "appraisals":', snap.empty ? 'Empty' : `${snap.size} documents found`);
        if (!snap.empty) {
            console.log('All IDs:\n', snap.docs.map(d => `${d.id} - ${d.data().customerName}`).join('\n'));
        }
    } catch (e) {
        console.error('Read "appraisals" error:', e.message);
    }
}

testFirebaseRead().then(() => process.exit(0));
