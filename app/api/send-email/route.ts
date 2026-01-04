import { NextRequest, NextResponse } from 'next/server';

// Use 'form-data' package for reliable multipart handling in Node.js
import FormData from 'form-data';
// Note: api/send-email/route.ts

export const runtime = 'nodejs'; // Ensure Node.js runtime for Buffer support
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    console.log('API /send-email: Request received');
    try {
        const body = await req.json();
        const { service_id, template_id, user_id, accessToken, template_params, attachment_data } = body;

        if (!service_id || !template_id || !user_id || !accessToken) {
            return NextResponse.json(
                { error: 'Missing required parameters (service_id, template_id, user_id, accessToken)' },
                { status: 400 }
            );
        }

        // Construct FormData using the 'form-data' package
        const formData = new FormData();
        formData.append('service_id', service_id);
        formData.append('template_id', template_id);
        formData.append('user_id', user_id);
        formData.append('accessToken', accessToken);

        if (template_params && typeof template_params === 'object') {
            // Check for and remove invoice_html if present
            if ('invoice_html' in template_params) {
                delete template_params['invoice_html'];
            }

            Object.entries(template_params).forEach(([key, value]) => {
                const strValue = String(value);
                // Skip huge variables
                if (strValue.length > 5000) return;

                formData.append(key, strValue);
            });
        }

        if (attachment_data && attachment_data.name && attachment_data.base64) {
            // Convert base64 to Buffer
            const base64Data = attachment_data.base64.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');

            console.log('Attachment Size (Base64 Chars):', base64Data.length);
            console.log('Buffer Size (Bytes):', buffer.length);

            // Append Buffer directly with filename options
            // 'form-data' library handles Content-Disposition correctly
            formData.append('invoice_file', buffer, {
                filename: attachment_data.name,
                contentType: 'application/pdf',
                knownLength: buffer.length
            });
        }

        // Use standard fetch but with headers from form-data
        // Note: We need to convert the form-data stream or use it as body
        // node-fetch supports form-data instance directly
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send-form', {
            method: 'POST',
            body: formData as any, // Cast to any to bypass Next.js fetch type mismatch for Node streams
            headers: formData.getHeaders() // CRITICAL: This sets the correct boundary
        });

        if (response.ok) {
            return NextResponse.json({ success: true });
        } else {
            const text = await response.text();
            console.error('EmailJS Error:', text);
            return NextResponse.json({ error: text }, { status: response.status });
        }

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
