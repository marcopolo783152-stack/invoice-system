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
            padding: '0.5in', // 0.5 inch margins as standard in MS Word
            margin: '0 auto',
            background: 'white',
            fontFamily: '"Times New Roman", Times, serif', // Classic appraisal font
            position: 'relative',
            boxSizing: 'border-box'
        }}>
            
            {/* Header Banner */}
            <div style={{ width: '100%', marginBottom: '15px' }}>
                <img 
                    src="/appraisal_assets/image4.jpeg" 
                    alt="Certificate Banner" 
                    style={{ width: '100%', height: 'auto', display: 'block' }} 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
            </div>

            {/* Sub-header Statement */}
            <div style={{ fontSize: '12pt', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '15px' }}>
                THIS DOCUMENT CERTIFIES THAT THE FOLLOWING ORIENTAL RUG IS THE PROPERTY OF:
            </div>

            {/* Customer Info & Emblem */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <div style={{ fontSize: '13pt', fontStyle: 'italic', fontWeight: 'bold' }}>
                    <div>{appraisal.customerName}</div>
                    <div style={{ marginTop: '5px' }}>{appraisal.customerAddress}</div>
                </div>
                <div style={{ width: '120px' }}>
                    <img 
                        src="/appraisal_assets/image3.jpeg" 
                        alt="Emblem" 
                        style={{ width: '100%', height: 'auto', borderRadius: '50%' }} 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                </div>
            </div>

            {/* Main Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', marginBottom: '10px' }}>
                <tbody>
                    <tr>
                        <th colSpan={3} style={{ 
                            textAlign: 'center', 
                            fontSize: '24pt', 
                            fontWeight: 'bold', 
                            padding: '10px', 
                            border: '1px solid black' 
                        }}>
                            Rug Identification
                        </th>
                    </tr>
                    
                    {/* Row 1 - Rug Number & Image Spanning */}
                    <tr>
                        <td style={{ border: '1px solid black', padding: '10px 15px', fontWeight: 'bold', fontSize: '14pt', width: '25%' }}>Rug Number</td>
                        <td style={{ border: '1px solid black', padding: '10px 15px', fontSize: '14pt', width: '25%' }}>{appraisal.rugNumber}</td>
                        <td rowSpan={7} style={{ 
                            border: '1px solid black', 
                            padding: '15px', 
                            width: '50%', 
                            textAlign: 'center', 
                            verticalAlign: 'middle',
                            background: '#fcfcfc'
                        }}>
                            {/* Wooden Picture Frame Effect */}
                            {appraisal.rugImage ? (
                                <div style={{ 
                                    border: '15px ridge #8B4513', // Classic brown wooden ridge
                                    display: 'inline-block', 
                                    padding: '0', 
                                    background: 'white',
                                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5), 5px 5px 15px rgba(0,0,0,0.3)'
                                }}>
                                    <div style={{ border: '2px solid #deb887' }}>
                                        <img 
                                            src={appraisal.rugImage} 
                                            alt="Rug Photo" 
                                            style={{ maxHeight: '450px', maxWidth: '100%', display: 'block' }} 
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div style={{ color: '#999', fontStyle: 'italic' }}>
                                    No Image Provided
                                </div>
                            )}
                        </td>
                    </tr>
                    
                    {/* Rows 2-7 */}
                    <tr>
                        <td style={{ border: '1px solid black', padding: '10px 15px', fontWeight: 'bold', fontSize: '14pt' }}>Type</td>
                        <td style={{ border: '1px solid black', padding: '10px 15px', fontSize: '14pt' }}>{appraisal.type}</td>
                    </tr>
                    <tr>
                        <td style={{ border: '1px solid black', padding: '10px 15px', fontWeight: 'bold', fontStyle: 'italic', fontSize: '14pt' }}>Size</td>
                        <td style={{ border: '1px solid black', padding: '10px 15px', fontSize: '14pt' }}>{appraisal.size}</td>
                    </tr>
                    <tr>
                        <td style={{ border: '1px solid black', padding: '10px 15px', fontWeight: 'bold', fontSize: '14pt' }}>Composition</td>
                        <td style={{ border: '1px solid black', padding: '10px 15px', fontSize: '14pt' }}>{appraisal.composition}</td>
                    </tr>
                    <tr>
                        <td style={{ border: '1px solid black', padding: '10px 15px', fontWeight: 'bold', fontSize: '14pt' }}>Origin</td>
                        <td style={{ border: '1px solid black', padding: '10px 15px', fontSize: '14pt' }}>{appraisal.origin}</td>
                    </tr>
                    <tr>
                        <td style={{ border: '1px solid black', padding: '10px 15px', fontWeight: 'bold', fontSize: '14pt' }}>Condition</td>
                        <td style={{ border: '1px solid black', padding: '10px 15px', fontSize: '14pt' }}>{appraisal.condition}</td>
                    </tr>
                    <tr>
                        <td style={{ border: '1px solid black', padding: '10px 15px', fontWeight: 'bold', fontSize: '14pt' }}>
                            Estimated<br/>Retail Value
                        </td>
                        <td style={{ border: '1px solid black', padding: '10px 15px', fontSize: '14pt', textAlign: 'center' }}>
                            $ {appraisal.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Date line */}
            <div style={{ textAlign: 'right', fontWeight: 'bold', fontStyle: 'italic', fontSize: '12pt', marginBottom: '20px' }}>
                Date: {formatLongDate(appraisal.date)}
            </div>

            {/* Signature Area */}
            <div style={{ marginBottom: '40px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>Marco Polo Oriental Rugs</div>
                <div style={{ fontSize: '12pt', marginBottom: '30px' }}>Certified Oriental Rug Appraiser</div>
                
                {/* Signature Line */}
                <div style={{ width: '250px', borderBottom: '1px solid black', marginBottom: '5px' }}></div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontStyle: 'italic', fontSize: '10pt', position: 'absolute', bottom: '0.5in', width: '7.5in' }}>
                MARCO POLO ORIENTAL RUGS | 3260 DUKE STREET, ALEXANDRIA, VA 22314 | (703) 461-0207
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
