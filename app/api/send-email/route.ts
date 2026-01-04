import { NextRequest, NextResponse } from 'next/server';
import FormData from 'form-data';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    console.log('API /send-email: Request received (Axios Stream Version)');
    try {
        const body = await req.json();
        const { service_id, template_id, user_id, accessToken, template_params, attachment_data } = body;

        // Validation
        if (!service_id || !template_id || !user_id || !accessToken) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        const formData = new FormData();
        formData.append('service_id', service_id);
        formData.append('template_id', template_id);
        formData.append('user_id', user_id);
        formData.append('accessToken', accessToken);

        // Parameters
        if (template_params && typeof template_params === 'object') {
            if ('invoice_html' in template_params) delete template_params['invoice_html'];

            Object.entries(template_params).forEach(([key, value]) => {
                const strValue = String(value);
                if (strValue.length > 5000) return;
                formData.append(key, strValue);
            });
        }

        // Attachment Handling: Write to Temp -> Stream
        let tempFilePath = '';
        if (attachment_data && attachment_data.base64) {
            const tempDir = os.tmpdir();
            // Sanitize filename
            const safeName = (attachment_data.name || 'invoice.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
            tempFilePath = path.join(tempDir, safeName);

            // Convert Base64 to Buffer and Write to Disk
            const base64Data = attachment_data.base64.split(',')[1];
            fs.writeFileSync(tempFilePath, base64Data, { encoding: 'base64' });

            console.log('Created temp file:', tempFilePath);

            // Create Stream
            const fileStream = fs.createReadStream(tempFilePath);

            // KEY: Append as 'invoice_file'
            // This MUST match the variable name in EmailJS Dashboard > Template > Attachments
            formData.append('invoice_file', fileStream);
        }

        console.log('Sending via Axios...');

        const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send-form', formData, {
            headers: {
                ...formData.getHeaders(),
            },
            // Important for large files
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        });

        // Cleanup
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath); } catch (e) { console.error('Cleanup error:', e); }
        }

        if (response.status === 200 || response.status === 201) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed' }, { status: response.status });
        }

    } catch (error: any) {
        console.error('API Error:', error.response?.data || error.message);
        const errorMsg = typeof error.response?.data === 'string' ? error.response.data : error.message;
        return NextResponse.json({ error: errorMsg }, { status: error.response?.status || 500 });
    }
}
