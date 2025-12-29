
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyCT5ukPxCXfMI3j8PgJCGdF5AvN6RnX0Y8",
    authDomain: "marcopolo-invoice.firebaseapp.com",
    projectId: "marcopolo-invoice",
    storageBucket: "marcopolo-invoice.firebasestorage.app",
    messagingSenderId: "257585408766",
    appId: "1:257585408766:web:6309ba28477926e86c796f"
};

async function search() {
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('Fetching invoices...');
    const q = query(collection(db, 'invoices'));
    const snapshot = await getDocs(q);

    console.log(`Found ${snapshot.size} total invoices in cloud.`);

    const matches = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        const startData = data.data || {}; // The nested data object
        const soldTo = startData.soldTo || {};
        const items = startData.items || [];
        const name = (soldTo.name || '').toLowerCase();

        // Criteria: "Himmet", "Solak", "Passion", or 41 items
        const isNameMatch = name.includes('himmet') || name.includes('solak') || name.includes('passion');
        const isItemMatch = items.length === 41;

        if (isNameMatch || isItemMatch) {
            matches.push({
                id: doc.id,
                invoiceNumber: data.invoiceNumber,
                customer: soldTo.name,
                itemCount: items.length,
                date: data.date,
                type: startData.documentType
            });
        }
    });

    if (matches.length > 0) {
        console.log('--- MATCHES FOUND ---');
        console.log(JSON.stringify(matches, null, 2));
    } else {
        console.log('No matches found for Himmet/Solak/Passion or 41 items.');
    }
}

search().catch(console.error);
