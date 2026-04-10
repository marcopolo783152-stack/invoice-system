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

async function verifyPayments() {
    try {
        const paySnap = await getDocs(collection(db, 'employeepayments'));
        const payments = [];
        paySnap.forEach(p => payments.push(p.data()));

        const empSnap = await getDocs(collection(db, 'employees'));
        const emps = [];
        empSnap.forEach(e => emps.push({ id: e.id, ...e.data() }));

        console.log("Payment Totals (Database):");
        for (const emp of emps) {
            const empPayments = payments.filter(p => p.employeeId === emp.id);
            const totalPaid = empPayments.reduce((acc, p) => acc + Number(p.amount), 0);
            console.log(`- ${emp.name}: Total Paid=$${totalPaid}`);
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

verifyPayments().then(() => process.exit(0));
