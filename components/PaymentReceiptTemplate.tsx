import React, { forwardRef } from 'react';
import { Employee, EmployeePayment } from '@/lib/employee-storage';

interface PaymentReceiptProps {
    employee: Employee;
    payment: EmployeePayment;
}

export const PaymentReceiptTemplate = forwardRef<HTMLDivElement, PaymentReceiptProps>(
    ({ employee, payment }, ref) => {
        const isLoan = payment.type === 'LOAN';

        return (
            <div ref={ref} className="pdf-page" style={{
                width: '8.5in',
                minHeight: '11in',
                padding: '40px',
                background: 'white',
                margin: '0 auto',
                boxSizing: 'border-box',
                fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                color: '#1e293b'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '30px' }}>
                    <div>
                        <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '4px', marginBottom: '4px' }}>MARCO POLO</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', letterSpacing: '2px' }}>ORIENTAL RUGS INC.</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '8px' }}>
                            3260 Duke St, Alexandria, VA 22314<br />
                            (703) 461-0207
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: isLoan ? '#d97706' : '#10b981', textTransform: 'uppercase' }}>
                            {isLoan ? 'EMPLOYEE LOAN' : 'PAYMENT RECEIPT'}
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>
                            Date: {new Date(payment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                            Receipt #: {payment.id.substring(0, 8).toUpperCase()}
                        </div>
                    </div>
                </div>

                {/* Employee Info */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '40px', background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', background: '#e2e8f0' }}>
                        {employee.photo ? (
                            <img src={employee.photo} alt={employee.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>👤</div>
                        )}
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Issued To</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>{employee.name}</div>
                        <div style={{ fontSize: '14px', color: '#475569' }}>Employee ID: {employee.empId}</div>
                    </div>
                </div>

                {/* Payment Details */}
                <div style={{ marginBottom: '50px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
                        Transaction Details
                    </div>
                    
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td style={{ padding: '15px 0', borderBottom: '1px solid #f1f5f9', color: '#64748b', width: '30%' }}>Transaction Type</td>
                                <td style={{ padding: '15px 0', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#1e293b' }}>
                                    {isLoan ? 'Company Advance / Loan' : 'Salary / Compensation Payment'}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ padding: '15px 0', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>Amount Disbursed</td>
                                <td style={{ padding: '15px 0', borderBottom: '1px solid #f1f5f9', fontWeight: 900, fontSize: '20px', color: '#1e293b' }}>
                                    ${payment.amount.toFixed(2)}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ padding: '15px 0', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>Notes / Description</td>
                                <td style={{ padding: '15px 0', borderBottom: '1px solid #f1f5f9', color: '#1e293b' }}>
                                    {payment.notes || 'No notes provided'}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ padding: '15px 0', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>Disbursement Date</td>
                                <td style={{ padding: '15px 0', borderBottom: '1px solid #f1f5f9', color: '#1e293b' }}>
                                    {new Date(payment.date).toLocaleString('en-US')}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Signature Section */}
                <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ width: '40%' }}>
                        <div style={{ borderBottom: '1px solid #cbd5e1', height: '40px' }}></div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', textAlign: 'center' }}>
                            Authorized Signature (Manager)
                        </div>
                    </div>
                    <div style={{ width: '40%' }}>
                        <div style={{ borderBottom: '1px solid #cbd5e1', height: '40px' }}></div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', textAlign: 'center' }}>
                            Employee Signature (Acknowledged)
                        </div>
                    </div>
                </div>

                {/* Footer terms */}
                <div style={{ marginTop: '60px', fontSize: '10px', color: '#94a3b8', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                    {isLoan ? (
                        <p>By signing this document, the employee acknowledges receipt of the loan advance amount specified above. This advance will be deducted from future compensation as per company policy.</p>
                    ) : (
                        <p>This receipt confirms the payment of wages/compensation for services rendered. Retain this copy for your personal records.</p>
                    )}
                    <p style={{ marginTop: '10px' }}>Generated by Marco Polo Internal HR System • {new Date().getFullYear()}</p>
                </div>
            </div>
        );
    }
);

PaymentReceiptTemplate.displayName = 'PaymentReceiptTemplate';
