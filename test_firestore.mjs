import { initializeApp } from 'firebase/app'; 
import { getFirestore, setDoc, doc } from 'firebase/firestore'; 

const firebaseConfig = { 
  apiKey: 'AIzaSyCT5ukPxCXfMI3j8PgJCGdF5AvN6RnX0Y8', 
  authDomain: 'marcopolo-invoice.firebaseapp.com', 
  projectId: 'marcopolo-invoice', 
  storageBucket: 'marcopolo-invoice.firebasestorage.app', 
  messagingSenderId: '257585408766', 
  appId: '1:257585408766:web:6309ba28477926e86c796f' 
}; 
const app = initializeApp(firebaseConfig); 
const db = getFirestore(app); 

async function test() { 
  try { 
    console.log('Writing...'); 
    await setDoc(doc(db, 'showroom_reviews', 'test-rev-1'), { test: true }); 
    console.log('SUCCESS'); 
  } catch(e) { 
    console.error('ERROR:', e.message); 
  } 
  process.exit(0); 
} 

test();
