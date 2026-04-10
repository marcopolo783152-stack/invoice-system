const { initializeApp } = require('firebase/app');
const { getFirestore, getDocs, collection, query, where } = require('firebase/firestore');

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

async function verifyPayroll() {
    try {
        const empSnap = await getDocs(collection(db, 'employees'));
        const emps = [];
        empSnap.forEach(e => emps.push({ id: e.id, ...e.data() }));

        const logSnap = await getDocs(collection(db, 'timelogs'));
        const logs = [];
        logSnap.forEach(l => logs.push(l.data()));

        console.log("Payroll Verification (Database vs Screenshot):");
        for (const emp of emps) {
            const empInLogs = logs.filter(l => l.employeeId === emp.id && l.type === 'IN');
            const uniqueDays = new Set(empInLogs.map(l => {
                const ts = l.timestamp;
                const date = ts.toDate ? ts.toDate() : new Date(ts);
                return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            })).size;
            
            const totalEarned = uniqueDays * (emp.dailyRate || 100);
            console.log(`- ${emp.name}: Working Days=${uniqueDays}, Total Earned=$${totalEarned}`);
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

verifyPayroll().then(() => process.exit(0));
