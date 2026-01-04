import { NextRequest, NextResponse } from 'next/server';
import emailjs from '@emailjs/nodejs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    console.log('API /send-email: Request received (SDK Version)');
    try {
        const body = await req.json();
        const { service_id, template_id, user_id, accessToken, template_params, attachment_data } = body;

        if (!service_id || !template_id || !user_id || !accessToken) {
            return NextResponse.json(
                { error: 'Missing required parameters (service_id, template_id, user_id, accessToken)' },
                { status: 400 }
            );
        }

        // Initialize EmailJS with the Public Key (User ID) and Private Key
        // The SDK manual says: emailjs.init({ publicKey, privateKey })
        emailjs.init({
            publicKey: user_id,
            privateKey: accessToken, // This is key for allowing attachments
        });

        // Prepare parameters
        const sendParams = { ...template_params };

        // Remove known large text field if present
        if (sendParams.invoice_html) {
            delete sendParams.invoice_html;
        }

        // Handle Attachment
        // For @emailjs/nodejs, attachments are usually not part of standard params unless using a specific plugin?
        // Wait, standard usage is `emailjs.send(serviceID, templateID, templateParams, options)`
        // BUT, documentation suggests passing file path.
        // Since we are in memory (Buffer), we might need to write to /tmp or pass stream?
        // ACTUALLY, checking the source of @emailjs/nodejs:
        // It often relies on "send-form" logic if you want attachments comfortably?
        // But let's try passing it as a parameter if using the Service ID that supports it.
        //
        // NOTE: If this fails, we will have to write to /tmp/invoice.pdf and pass the path.
        // Next.js allows writing to /tmp.
        // This is safer.

        let pathToFile = '';
        if (attachment_data && attachment_data.base64) {
            const fs = require('fs');
            const path = require('path');
            const os = require('os');

            // Create temp file
            const tempDir = os.tmpdir();
            const fileName = attachment_data.name || 'invoice.pdf';
            pathToFile = path.join(tempDir, fileName);

            const base64Data = attachment_data.base64.split(',')[1];
            fs.writeFileSync(pathToFile, base64Data, { encoding: 'base64' });
            console.log('Created temp file:', pathToFile);

            // Add to params?
            // Actually, usually send() takes `templateParams`.
            // How to attach? 
            // There is `emailjs.sendForm`? No, that's browser.
            //
            // Many users report simply adding the file path to params works if using the nodejs sdk?
            // OR using the `content` property in a specific object?
            //
            // Let's safe bet: The SDK likely exports a send() that assumes JSON.
            // But valid attachments require multipart.
            //
            // RE-READING: "Variables size limit" is the error. 
            // This happens when sending JSON.
            //
            // The SDK *wraps* the API. If we use `useCORS`? No.
            //
            // ALTERNATIVE:
            // Construct the `FormData` manually but use the library's `send` method? No.
            //
            // Let's stick with the path approach which is standard for Node libraries (like Nodemailer).
            // Docs for @emailjs/nodejs are very sparse publicly without login.
            //
            // I will try passing the *stream* which is idiomatic Node.
            // sendParams['invoice_file'] = fs.createReadStream(pathToFile);
            // And enable multipart?
            //
            // This assumes the SDK detects the stream and uses Multipart.
            // If not, we are back to square one.
        }

        console.log('Sending via SDK...');

        // We will try to pass the path as a value. 
        // If the SDK is smart, it handles it. If not, we might get an error.
        // To be safe, let's TRY to attach it as a stream to the param 'invoice_file'.
        if (pathToFile) {
            const fs = require('fs');
            // Attempt to pass stream. This forces multipart in many libraries.
            sendParams['invoice_file'] = fs.createReadStream(pathToFile);
        }

        const response = await emailjs.send(service_id, template_id, sendParams, {
            publicKey: user_id,
            privateKey: accessToken,
        });

        console.log('SDK Response:', response);

        // Clean up temp file
        if (pathToFile) {
            try { require('fs').unlinkSync(pathToFile); } catch (e) { }
        }

        return NextResponse.json({ success: true, api_response: response });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || error.text || 'Unknown Error' }, { status: 500 });
    }
}
