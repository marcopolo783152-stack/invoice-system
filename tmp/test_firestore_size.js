const { initializeApp } = require('firebase/app');
const { getFirestore, getDoc, doc } = require('firebase/firestore');

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
        const snap = await getDoc(doc(db, 'appraisals', 'APP-1775668446469'));
        if (snap.exists()) {
            const data = snap.data();
            const imageSize = data.rugImage ? data.rugImage.length : 0;
            console.log('Appraisal exists. Image string length:', imageSize);
        } else {
            console.log('Appraisal not found');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testFirebaseRead().then(() => process.exit(0));
