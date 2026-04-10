const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDocs, collection } = require('firebase/firestore');

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

async function testFirebase() {
    console.log('Testing Firestore write...');
    try {
        const testId = `TEST-${Date.now()}`;
        await setDoc(doc(db, 'appraisals', testId), {
            id: testId,
            customerName: 'Test Node',
            value: 123
        });
        console.log('Write to "appraisals" collection SUCCESS');
    } catch (e) {
        console.error('Write to "appraisals" error:', e.message);
    }
    
    try {
        const testId = `TEST-${Date.now()}`;
        await setDoc(doc(db, 'marcopolo_appraisals', testId), {
            id: testId,
            customerName: 'Test Node',
            value: 123
        });
        console.log('Write to "marcopolo_appraisals" collection SUCCESS');
    } catch (e) {
        console.error('Write to "marcopolo_appraisals" error:', e.message);
    }
}

testFirebase().then(() => process.exit(0));
