import React from 'react';

/**
 * ReturnedReceipt component for professional returned receipt
 */
export function ReturnedReceipt({ receiptData }: { receiptData: any }) {
    if (!receiptData) return <div style={{ color: 'red', textAlign: 'center' }}>No receipt data found.</div>;
    // Defensive: allow both flat and nested data
    let data = receiptData.data || receiptData;
    const returnedItems = receiptData.returnedItems || data.returnedItems || [];
    const returnNote = receiptData.returnNote || data.returnNote || '';

    if (!data || !data.invoiceNumber) {
        return <div style={{ color: 'red', textAlign: 'center' }}>Invalid or incomplete receipt data.</div>;
    }

    const businessInfo = {
        name: 'MARCO POLO ORIENTAL RUGS, INC.',
        address: '3260 DUKE ST',
        city: 'ALEXANDRIA',
        state: 'VA',
        zip: '22314',
        phone: '703-461-0207',
        fax: '703-461-0208',
        website: 'www.marcopolorugs.com',
        email: 'marcopolorugs@aol.com',
    };

    return (
        <div className="print-receipt-center" style={{ fontFamily: 'Arial, sans-serif', background: '#fff', color: '#222', padding: 24, maxWidth: 480, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <img src="/LOGO.png" alt="Logo" style={{ height: 60, marginRight: 16 }} />
                <div>
                    <h2 style={{ margin: 0, fontSize: 18 }}>{businessInfo.name}</h2>
                    <div style={{ fontSize: 12 }}>{businessInfo.address}, {businessInfo.city}, {businessInfo.state} {businessInfo.zip}</div>
                    <div style={{ fontSize: 12 }}>Phone: {businessInfo.phone} | Fax: {businessInfo.fax}</div>
                    <div style={{ fontSize: 12 }}>{businessInfo.website} | {businessInfo.email}</div>
                </div>
            </div>
            <h3 style={{ textAlign: 'center', margin: '16px 0', letterSpacing: 2 }}>RETURNED RECEIPT</h3>
            <div style={{ marginBottom: 12, fontSize: 14 }}>
                <b>Invoice #:</b> {data.invoiceNumber || ''}<br />
                <b>Date:</b> {new Date().toLocaleDateString()}<br />
                <b>Customer:</b> {data.soldTo?.name || ''}<br />
                <b>Address:</b> {data.soldTo?.address || ''}, {data.soldTo?.city || ''}, {data.soldTo?.state || ''} {data.soldTo?.zip || ''}<br />
                <b>Phone:</b> {data.soldTo?.phone || ''}<br />
                {data.servedBy && (<span><b>Served by:</b> {data.servedBy}</span>)}
            </div>
            <div style={{ marginBottom: 12, fontSize: 14 }}>
                <b>Returned Items:</b>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {Array.isArray(returnedItems) && returnedItems.length > 0 ? returnedItems.map((item: any, idx: number) => (
                        <li key={item.id || idx}>
                            {item.sku || ''} - {item.description || ''}
                        </li>
                    )) : <li>No returned items found.</li>}
                </ul>
            </div>
            {returnNote && (
                <div style={{ marginBottom: 12, fontSize: 14 }}>
                    <b>Return Note:</b> {returnNote}
                </div>
            )}
            <div style={{ marginTop: 24, fontSize: 12, color: '#666', borderTop: '1px solid #eee', paddingTop: 12, textAlign: 'center' }}>
                Thank you for your business. Please keep this receipt for your records.
            </div>
        </div>
    );
}
