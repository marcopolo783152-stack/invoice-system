
import { NextRequest, NextResponse } from 'next/server';
import { File } from 'buffer'; // Import File from 'buffer' module (Node 20+) or use global if available
// If global 'File' is not available in this env (older Node), we can полиfill or use Blob.
// But Next.js 'nodejs' runtime usually has global File. Let's try global first.

export const runtime = 'nodejs';
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

        // Use standard global FormData (undici/native in Next.js)
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
            const base64Data = attachment_data.base64.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');

            // Use explicit 'File' constructor to ensure EmailJS treats it as an attachment
            // content-type is critical
            const file = new File([buffer], attachment_data.name, { type: 'application/pdf' });

            formData.append('invoice_file', file as any);
            console.log('Attached file:', attachment_data.name, 'Size:', buffer.length);
        }

        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send-form', {
            method: 'POST',
            body: formData,
            // Header is set automatically by fetch for FormData
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
