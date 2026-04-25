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
            padding: '0.5in 0.5in 2in 0.5in', // Standard safe margin
            margin: '10px auto',
            background: 'white',
            fontFamily: 'Cinzel, "Times New Roman", Times, serif', // Elegant web font that works everywhere
            position: 'relative',
            boxSizing: 'border-box'
        }}>
            
            {/* Ensure fonts are loaded from Google Fonts for all devices */}
            <style dangerouslySetInnerHTML={{__html: `
                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Cinzel+Decorative:wght@400;700&display=swap');
            `}} />

            <div style={{ padding: '0.1in', position: 'relative' }}>
                
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
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
                    }}>
                        <svg width="100%" height="100%" viewBox="0 0 900 140" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
                            <defs>
                                <style>{`
                                    @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&display=swap');
                                    .algerian-svg {
                                        font-family: Algerian, "Cinzel Decorative", serif;
                                        font-weight: 700;
                                        text-anchor: middle;
                                        letter-spacing: 2px;
                                    }
                                `}</style>
                            </defs>
                            
                            {/* Solid Green Header at exact size 38 */}
                            <text x="450" y="55" fontSize="38" className="algerian-svg" fill="#065f46">
                                CERTIFICATE OF AUTHENTICITY &
                            </text>
                            <text x="450" y="115" fontSize="38" className="algerian-svg" fill="#065f46">
                                APPRAISAL
                            </text>
                        </svg>
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
                                    maxWidth: '300px',
                                    height: '380px',
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
                <div style={{ textAlign: 'right', fontWeight: 'bold', fontStyle: 'italic', fontSize: '11pt', marginBottom: '15px', paddingRight: '10px' }}>
                    Date: {formatLongDate(appraisal.date)}
                </div>

                <div style={{ marginTop: '20px', paddingTop: '10px', paddingBottom: '20px', color: '#000' }}>
                    {/* Signature Area */}
                    <div style={{ marginBottom: '10px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>Ariana Oriental Rugs</div>
                        <div style={{ fontSize: '12pt', marginBottom: '25px' }}>Certified Oriental Rug Appraiser</div>
                        
                        {/* Signature Line */}
                        <div style={{ width: '250px', borderBottom: '1px solid black', marginBottom: '5px' }}></div>
                    </div>

                    {/* Footer */}
                    <div style={{ textAlign: 'left', fontWeight: 'bold', fontStyle: 'italic', fontSize: '10pt', marginTop: '15px' }}>
                        ARIANA ORIENTAL RUGS INC | 3210 DUKE ST, ALEXANDRIA, VA 22314 | +1 (703) 801 1640
                    </div>
                </div>
            </div>

            {/* Specific Print Styles to ensure exact formatting when printing */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { 
                        size: letter; 
                        margin: 0.5in; 
                    }
                    body { 
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact; 
                        background: white !important;
                    }
                    .pdf-page {
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                    }
                }
            `}} />
        </div>
    );
}
