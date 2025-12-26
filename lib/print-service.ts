export const printElement = (elementId: string) => {
    // 1. Identify the Element
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Print Error: Element with id "${elementId}" not found.`);
        return;
    }

    // 2. Open New Window
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
        alert('Please allow popups for this website to print.');
        return;
    }

    // 3. Prepare Content
    const content = element.innerHTML;

    // 4. Gather Styles
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(style => style.outerHTML)
        .join('\n');

    // 5. Construct New Document
    printWindow.document.open();
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Invoice</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${styles}
            <style>
                /* Emergency CSS requested by user */
                body, html { 
                    visibility: visible !important; 
                    height: auto !important; 
                    overflow: visible !important; 
                    background: white !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                .no-print { display: none !important; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                
                /* Layout overrides */
                #invoice-view, .invoice-printable-wrapper {
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 20px !important;
                    box-sizing: border-box !important;
                }

                /* Manual Print Button UI (hidden in print) */
                .manual-print-ui {
                    padding: 20px;
                    text-align: center;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                    font-family: system-ui, -apple-system, sans-serif;
                }
                .print-btn {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .print-btn:hover { background: #2563eb; }
                
                @media print {
                    .manual-print-ui { display: none !important; }
                    body { padding: 0 !important; }
                    #invoice-view, .invoice-printable-wrapper { padding: 0 !important; }
                }
            </style>
        </head>
        <body>
            <div class="manual-print-ui no-print">
                <button class="print-btn" onclick="window.print()">🖨️ Print Invoice</button>
                <p style="margin-top: 10px; color: #64748b; font-size: 14px;">
                    If the print dialog doesn't appear automatically, click the button above.
                </p>
            </div>

            <div id="invoice-view">
                ${content}
            </div>

            <script>
                window.onload = function() {
                    // Check if mobile/iPad
                    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                    
                    if (isMobile) {
                        // On Mobile/iPad: Do NOT auto-print. 
                        // Browsers often block 'background' print calls.
                        // User must click the button.
                        console.log('Mobile device detected - waiting for manual print trigger');
                    } else {
                        // On Desktop: Auto-print after delay
                        setTimeout(function() {
                            window.print();
                        }, 1000);
                    }
                };
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
};
