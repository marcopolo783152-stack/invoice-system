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
    // Get the HTML content
    const content = element.innerHTML;

    // 4. Construct New Document with `document.write`
    // We include the "Emergency" CSS as requested
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Invoice</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            
            <!-- Standard Stylesheets -->
            <!-- We try to get Tailwind/Main CSS if possible, but the inline styles below are the "Emergency" set -->
            ${Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(style => style.outerHTML)
            .join('\n')}

            <style>
                /* Emergency CSS requested by user */
                body { 
                    visibility: visible !important; 
                    display: block !important; 
                    height: auto !important; 
                    margin: 0 !important; 
                    padding: 0 !important;
                    background: white !important;
                }
                
                #invoice-view, .invoice-printable-wrapper { 
                    width: 100%; 
                    margin: 0; 
                    padding: 20px; 
                }
                
                .no-print { 
                    display: none !important; 
                }

                /* Ensure we override any potential hiding from cloned styles */
                @media print {
                    body { visibility: visible !important; }
                    .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            <div id="invoice-view" class="invoice-printable-wrapper">
                ${content}
            </div>
            
            <script>
                // Wait 1000ms as requested for images/layout to settle
                setTimeout(function() {
                    window.print();
                    // Optional: window.close(); 
                }, 1000);
            </script>
        </body>
        </html>
    `);

    // Important: Close the document stream
    printWindow.document.close();

    // focus the window
    printWindow.focus();
};
