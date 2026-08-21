import React, { forwardRef } from 'react';
import { Employee, EmployeePayment, TimeLog } from '@/lib/employee-storage';

interface PaymentReceiptProps {
    employee: Employee;
    payment: EmployeePayment;
    allPayments: EmployeePayment[];
    logs: TimeLog[];
}

function numberToWords(num: number): string {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if ((num = Math.floor(num)) === 0) return 'Zero';

    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 !== 0 ? '-' + a[num % 10] : '');
    if (num < 1000) return a[Math.floor(num / 100)] + 'Hundred ' + (num % 100 !== 0 ? 'and ' + numberToWords(num % 100) : '');
    if (num < 1000000) return numberToWords(Math.floor(num / 1000)) + 'Thousand ' + (num % 1000 !== 0 ? numberToWords(num % 1000) : '');
    return num.toString();
}

export const PaymentReceiptTemplate = forwardRef<HTMLDivElement, PaymentReceiptProps>(
    ({ employee, payment, allPayments, logs }, ref) => {
        const isLoan = payment.type === 'LOAN';

        // Sort all payments by date
        const sortedPayments = [...allPayments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Find this payment's index
        const currentIndex = sortedPayments.findIndex(p => p.id === payment.id);
        const previousPayment = currentIndex > 0 ? sortedPayments[currentIndex - 1] : null;

        const periodStart = previousPayment ? new Date(previousPayment.date) : new Date(employee.joinedDate);
        const periodEnd = new Date(payment.date);

        // Calculate balances to perfectly match the dashboard's current state
        // The dashboard uses ALL logs, regardless of date, so we will too.
        const daysWorked = logs.filter(l => l.type === 'IN').length;
        const dailyRate = employee.dailyRate || 100;
        const totalEarned = daysWorked * dailyRate;

        // The dashboard uses ALL payments.
        const totalPaidAllTime = allPayments.reduce((sum, p) => sum + p.amount, 0);

        // Since THIS payment is included in allPayments, the "Prior Paid" is:
        const priorPaidAmount = totalPaidAllTime - payment.amount;
        const priorPaymentsCount = allPayments.length - 1;

        // Current Balance BEFORE this payment
        const priorBalance = totalEarned - priorPaidAmount;

        // Balance AFTER this payment
        // Wait, if it's a LOAN, it counts as paid. So we just subtract it too!
        const newBalance = priorBalance - payment.amount;

        const dollars = Math.floor(payment.amount);
        const cents = Math.round((payment.amount - dollars) * 100);
        const spelledOutAmount = `${numberToWords(dollars).trim()} and ${cents.toString().padStart(2, '0')}/100`;

        return (
            <div ref={ref} className="pdf-page" style={{
                width: '8.5in',
                minHeight: '10.5in',
                padding: '30px',
                background: 'white',
                margin: '0 auto',
                boxSizing: 'border-box',
                fontFamily: '"Courier New", Courier, monospace',
                color: '#1e293b'
            }}>
                <style>{`
                    @media print {
                        @page { margin: 0; size: auto; }
                        body { margin: 0; }
                    }
                `}</style>
                {/* --- CHECK SECTION --- */}
                <div style={{
                    border: '1px solid #94a3b8',
                    padding: '30px',
                    borderRadius: '8px',
                    position: 'relative',
                    background: '#f8fafc',
                    boxShadow: 'inset 0 0 50px rgba(0,0,0,0.02)',
                    marginBottom: '40px'
                }}>
                    {/* Background Pattern */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.03, backgroundImage: 'repeating-linear-gradient(45deg, #1e293b 0, #1e293b 1px, transparent 1px, transparent 10px)', pointerEvents: 'none' }}></div>

                    {/* Top Row: Company Info & Check No/Date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', position: 'relative', zIndex: 1 }}>
                        <div style={{ fontFamily: 'sans-serif' }}>
                            <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '2px', color: '#0f172a' }}>MARCO POLO ORIENTAL RUGS INC.</div>
                            <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                                3260 Duke St<br />
                                Alexandria, VA 22314<br />
                                (703) 461-0207
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', fontFamily: 'sans-serif' }}>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#94a3b8' }}>
                                NO. {payment.id.substring(0, 6).toUpperCase()}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>DATE</span>
                                <div style={{ borderBottom: '1px solid #1e293b', width: '150px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>
                                    {periodEnd.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pay To Row */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px', marginBottom: '25px', position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>PAY TO THE<br/>ORDER OF</div>
                        <div style={{ flex: 1, borderBottom: '1px solid #1e293b', fontSize: '20px', fontWeight: 700, paddingBottom: '4px', paddingLeft: '10px' }}>
                            {employee.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '18px', fontWeight: 700 }}>$</span>
                            <div style={{ border: '1px solid #1e293b', background: '#fff', padding: '5px 15px', fontSize: '20px', fontWeight: 800, width: '150px', textAlign: 'right' }}>
                                {payment.amount.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    {/* Spelled Out Amount Row */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px', marginBottom: '40px', position: 'relative', zIndex: 1 }}>
                        <div style={{ flex: 1, borderBottom: '1px solid #1e293b', fontSize: '16px', fontWeight: 600, paddingBottom: '4px', textTransform: 'capitalize' }}>
                            {spelledOutAmount} -------------------------------------------------------------
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>DOLLARS</div>
                    </div>

                    {/* Bottom Row: Memo & Signature */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', width: '50%' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>MEMO</span>
                            <div style={{ flex: 1, borderBottom: '1px solid #1e293b', fontSize: '14px', paddingBottom: '4px' }}>
                                {isLoan ? 'Advance Loan' : 'Salary Payment'} {payment.notes ? `- ${payment.notes}` : ''}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', width: '35%' }}>
                            <div style={{ borderBottom: '1px solid #1e293b', height: '30px' }}></div>
                            <div style={{ fontSize: '10px', textAlign: 'center', marginTop: '4px', color: '#475569' }}>AUTHORIZED SIGNATURE</div>
                        </div>
                    </div>

                    {/* Fake MICR Line */}
                    <div style={{ marginTop: '30px', fontSize: '22px', fontFamily: '"OCR A Extended", monospace', textAlign: 'center', color: '#475569' }}>
                        |:051000033|: {payment.id.substring(0, 9).toUpperCase()} ||" 0001
                    </div>
                </div>

                <div style={{ borderTop: '2px dashed #cbd5e1', margin: '20px 0', position: 'relative' }}>
                    <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#fff', padding: '0 10px', fontSize: '12px', color: '#94a3b8' }}>
                        DETACH AND RETAIN FOR YOUR RECORDS
                    </span>
                </div>

                {/* --- PAY STUB SECTION --- */}
                <div style={{ fontFamily: 'sans-serif' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #1e293b', paddingBottom: '10px', marginBottom: '15px' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>REMITTANCE ADVICE</h2>
                            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '5px' }}>
                                Employee ID: <strong>{employee.empId}</strong>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Payment Date</div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                                {periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                            <tr style={{ background: '#1e293b', color: '#fff' }}>
                                <th style={{ padding: '8px 10px', textAlign: 'left', borderRadius: '6px 0 0 6px' }}>DESCRIPTION</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right' }}></th>
                                <th style={{ padding: '8px 10px', textAlign: 'right', borderRadius: '0 6px 6px 0' }}>AMOUNT</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: isLoan ? '#d97706' : '#10b981' }}>
                                    THIS {isLoan ? 'LOAN / ADVANCE' : 'PAYMENT'} AMOUNT
                                </td>
                                <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}></td>
                                <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 800, fontSize: '14px', color: isLoan ? '#d97706' : '#10b981' }}>
                                    - ${payment.amount.toFixed(2)}
                                </td>
                            </tr>
                            <tr style={{ background: '#f1f5f9' }}>
                                <td style={{ padding: '10px', fontWeight: 700 }}>CURRENT DUE BALANCE</td>
                                <td style={{ padding: '10px', textAlign: 'right' }}></td>
                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 900, fontSize: '16px' }}>
                                    ${newBalance.toFixed(2)}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div style={{ marginTop: '20px', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                        <p>This statement constitutes a full accounting of wages and advances up to the date specified.</p>
                        <p>If you have any questions about this statement, please contact management immediately.</p>
                    </div>
                </div>
            </div>
        );
    }
);

PaymentReceiptTemplate.displayName = 'PaymentReceiptTemplate';
