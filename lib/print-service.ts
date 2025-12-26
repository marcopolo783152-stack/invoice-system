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
    // We need to copy all <style> and <link rel="stylesheet"> tags
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
                /* Force Print Visibility Overrides */
                body, html {
                    margin: 0;
                    padding: 0;
                    height: auto !important;
                    overflow: visible !important;
                    background: white !important;
                }
                
                /* Ensure content fits */
                .invoice, .invoice-container {
                    width: 100% !important;
                    max-width: 100% !important;
                    box-shadow: none !important;
                    margin: 0 !important;
                    visibility: visible !important;
                    display: block !important;
                }

                /* Hide non-print elements just in case */
                .no-print { display: none !important; }

                @media print {
                    @page { margin: 0; size: auto; }
                    body { -webkit-print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div id="print-root">
                ${content}
            </div>
            <script>
                // iPad/Mobile Fix: Wait for resources
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                        // Optional: Close after print
                        // window.close(); 
                    }, 500);
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
};
