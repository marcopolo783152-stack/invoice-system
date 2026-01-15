
const { calculateInvoice } = require('./lib/calculations');

// Mock data
const mockInvoice = {
    documentType: 'CONSIGNMENT',
    mode: 'wholesale',
    items: [
        { id: '1', widthFeet: 10, widthInches: 0, lengthFeet: 14, lengthInches: 0, shape: 'rectangle', fixedPrice: 1000, sold: false, returned: false, sku: 'A', description: 'A' },
        { id: '2', widthFeet: 8, widthInches: 0, lengthFeet: 10, lengthInches: 0, shape: 'rectangle', fixedPrice: 800, sold: true, returned: false, sku: 'B', description: 'B' },
        { id: '3', widthFeet: 5, widthInches: 0, lengthFeet: 8, lengthInches: 0, shape: 'rectangle', fixedPrice: 500, sold: false, returned: true, sku: 'C', description: 'C' }
    ],
    additionalCharges: [{ id: 'x', amount: 100, description: 'Shipping' }],
    payments: [{ id: 'p1', amount: 200, method: 'Check' }],
    downpayment: 0
};

const result = calculateInvoice(mockInvoice);

console.log('Total Due (Consignment Value):', result.totalDue);
console.log('Sold Amount:', result.soldAmount);
console.log('Returned Amount:', result.returnedAmount);
console.log('Total Paid:', result.totalPaid);
console.log('Balance Due:', result.balanceDue);
console.log('Remaining Inventory (Template Formula):', result.totalDue - result.soldAmount - result.returnedAmount);
