import React from 'react';
import { Appraisal } from '@/lib/appraisals-storage';

// Helper to format date like "March 22, 2026"
const formatLongDate = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    // Add timezone offset to prevent shifting backwards locally
    const userTimezoneOffset = d.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(d.getTime() + userTimezoneOffset);
    return adjustedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

interface Props {
    appraisal: Appraisal;
}

export default function AppraisalTemplate({ appraisal }: Props) {
    return (
        <div style={{ 
            width: '8.5in',
            minHeight: '11in',
            padding: '0.5in 0.5in 1.2in 0.5in', // Increased bottom margin significantly (1.2in)
            margin: '0 auto',
            background: 'white',
            fontFamily: '"Times New Roman", Times, serif', // Classic appraisal font
            position: 'relative',
            boxSizing: 'border-box'
        }}>
            
            <div style={{ padding: '0.2in', position: 'relative', height: '100%' }}>
                
                {/* Header Banner (Design on the head) with OVERLAY TEXT */}
                <div style={{ position: 'relative', width: '100%', marginBottom: '10px', textAlign: 'center' }}>
                    <img 
                        src="/appraisal_assets/image1.png" 
                        alt="Certificate Banner Background" 
                        style={{ width: '100%', height: 'auto', display: 'block' }} 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                        fontFamily: 'Algerian, "Times New Roman", Times, serif',
                        color: '#065f46', // Professional Dark Green
                        textShadow: '1px 1px 1px rgba(255,255,255,0.6)'
                    }}>
                        <div style={{ fontSize: '28pt', fontWeight: 'bold', paddingTop: '10px' }}>CERTIFICATE OF AUTHENTICITY &</div>
                        <div style={{ fontSize: '28pt', fontWeight: 'bold', marginTop: '5px' }}>APPRAISAL</div>
                    </div>
                </div>

                {/* Sub-header Statement */}
                <div style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '15px' }}>
                    THIS DOCUMENT CERTIFIES THAT THE FOLLOWING ORIENTAL RUG IS THE PROPERTY OF:
                </div>

                {/* Customer Info & Logo with Line */}
                <div style={{ position: 'relative', height: '100px', marginBottom: '20px', color: '#000' }}>
                    <div style={{ fontSize: '13pt', fontStyle: 'italic', fontWeight: 'bold' }}>{appraisal.customerName}</div>
                    <div style={{ fontSize: '11pt', fontStyle: 'italic', fontWeight: 'bold', marginTop: '8px' }}>{appraisal.customerAddress}</div>
                    
                    {/* The Logo overlapped on the right */}
                    <img 
                        src="/appraisal_assets/image2.jpeg" 
                        alt="Logo" 
                        style={{ position: 'absolute', right: '20px', top: '-10px', width: '120px', height: 'auto', zIndex: 10 }} 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                </div>

                {/* Main Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', marginBottom: '2px' }}>
                    <tbody>
                        <tr>
                            <th colSpan={2} style={{ 
                                textAlign: 'center', 
                                fontSize: '24pt', 
                                fontWeight: 'bold', 
                                padding: '12px', 
                                border: '1px solid black',
                                borderRight: 'none',
                                width: '55%'
                            }}>
                                Rug Identification
                            </th>
                            {/* The Frame Column Spanning Everything */}
                            <td rowSpan={8} style={{ 
                                border: 'none', 
                                width: '45%', 
                                textAlign: 'center', 
                                verticalAlign: 'middle',
                                padding: '10px'
                            }}>
                                {/* Custom Frame Background rigidly containerized */}
                                <div style={{ 
                                    position: 'relative',
                                    width: '100%',
                                    maxWidth: '340px',
                                    height: '460px',
                                    margin: '0 auto',
                                }}>
                                    {/* The Frame Graphic Background */}
                                    <img 
                                        src="/appraisal_assets/image3.jpeg" 
                                        style={{
                                            position: 'absolute',
                                            top: 0, left: 0,
                                            width: '100%', height: '100%',
                                            zIndex: 1,
                                            objectFit: 'fill'
                                        }}
                                        alt=""
                                    />
                                    {/* The Actual Uploaded Rug Image Bound Box - DEEPER RECESSED INSIDE FRAME */}
                                    <div style={{ 
                                        position: 'absolute', 
                                        top: '15%', bottom: '15%', left: '15%', right: '15%', 
                                        zIndex: 2, 
                                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                                        background: 'white',
                                        overflow: 'hidden',
                                        boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5)' // Stronger depth shadow
                                    }}>
                                        {appraisal.rugImage ? (
                                            <img 
                                                src={appraisal.rugImage} 
                                                alt="Rug Photo" 
                                                style={{ 
                                                    width: '100%', 
                                                    height: '100%', 
                                                    objectFit: 'cover',
                                                    display: 'block'
                                                }} 
                                            />
                                        ) : (
                                            <div style={{ fontWeight: 'bold', fontSize: '14pt', color: '#ccc' }}>Rug Photo Here</div>
                                        )}
                                    </div>
                                </div>
                            </td>
                        </tr>
                        
                        {/* Rows 1-7 */}
                        <tr>
                            <td style={{ border: '1px solid black', borderRight: '1px solid black', padding: '12px 15px', fontWeight: 'bold', fontSize: '14pt', width: '25%' }}>Rug Number</td>
                            <td style={{ border: '1px solid black', borderRight: 'none', padding: '12px 15px', fontSize: '14pt', width: '30%' }}>{appraisal.rugNumber}</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid black', padding: '12px 15px', fontWeight: 'bold', fontSize: '14pt' }}>Type</td>
                            <td style={{ border: '1px solid black', borderRight: 'none', padding: '12px 15px', fontSize: '14pt' }}>{appraisal.type}</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid black', padding: '12px 15px', fontWeight: 'bold', fontStyle: 'italic', fontSize: '14pt' }}>Size</td>
                            <td style={{ border: '1px solid black', borderRight: 'none', padding: '12px 15px', fontSize: '14pt' }}>{appraisal.size}</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid black', padding: '12px 15px', fontWeight: 'bold', fontSize: '14pt' }}>Composition</td>
                            <td style={{ border: '1px solid black', borderRight: 'none', padding: '12px 15px', fontSize: '14pt' }}>{appraisal.composition}</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid black', padding: '12px 15px', fontWeight: 'bold', fontSize: '14pt' }}>Origin</td>
                            <td style={{ border: '1px solid black', borderRight: 'none', padding: '12px 15px', fontSize: '14pt' }}>{appraisal.origin}</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid black', padding: '12px 15px', fontWeight: 'bold', fontSize: '14pt' }}>Condition</td>
                            <td style={{ border: '1px solid black', borderRight: 'none', padding: '12px 15px', fontSize: '14pt' }}>{appraisal.condition}</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid black', padding: '12px 15px', fontWeight: 'bold', fontSize: '14pt' }}>
                                Estimated<br/>Retail Value
                            </td>
                            <td style={{ border: '1px solid black', borderRight: 'none', padding: '12px 15px', fontSize: '14pt', textAlign: 'center', fontWeight: 'bold', color: '#065f46' }}>
                                ${appraisal.value?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Date line closely underneath the table */}
                <div style={{ textAlign: 'right', fontWeight: 'bold', fontStyle: 'italic', fontSize: '12pt', marginBottom: '25px', paddingRight: '10px' }}>
                    Date: {formatLongDate(appraisal.date)}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '40px', paddingBottom: '60px', color: '#000' }}>
                    {/* Signature Area */}
                    <div style={{ marginBottom: '10px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>Marco Polo Oriental Rugs</div>
                        <div style={{ fontSize: '12pt', marginBottom: '25px' }}>Certified Oriental Rug Appraiser</div>
                        
                        {/* Signature Line */}
                        <div style={{ width: '250px', borderBottom: '1px solid black', marginBottom: '5px' }}></div>
                    </div>

                    {/* Footer */}
                    <div style={{ textAlign: 'left', fontWeight: 'bold', fontStyle: 'italic', fontSize: '10pt', marginTop: '15px' }}>
                        MARCO POLO ORIENTAL RUGS | 3260 DUKE STREET, ALEXANDRIA, VA 22314 | (703) 461-0207
                    </div>
                </div>
            </div>

            {/* Specific Print Styles to ensure exact formatting when printing */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { margin: 0; size: letter; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
                }
            `}} />
        </div>
    );
}
