const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadString, getDownloadURL } = require('firebase/storage');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCT5ukPxCXfMI3j8PgJCGdF5AvN6RnX0Y8",
  authDomain: "marcopolo-invoice.firebaseapp.com",
  projectId: "marcopolo-invoice",
  storageBucket: "marcopolo-invoice.firebasestorage.app",
  messagingSenderId: "257585408766",
  appId: "1:257585408766:web:6309ba28477926e86c796f"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const imageRef = ref(storage, 'test.txt');

async function testFirebase() {
    console.log('Testing storage...');
    try {
        await uploadString(imageRef, 'test', 'raw');
        console.log('Upload success');
    } catch (e) {
        console.error('Storage error:', e);
        if (e.customData) console.error('Custom Data:', e.customData);
    }
}

testFirebase().then(() => process.exit(0));
