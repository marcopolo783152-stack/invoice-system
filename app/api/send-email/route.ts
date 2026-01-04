import { NextRequest, NextResponse } from 'next/server';
import FormData from 'form-data';
import axios from 'axios';

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

        // Create form-data instance
        const formData = new FormData();
        formData.append('service_id', service_id);
        formData.append('template_id', template_id);
        formData.append('user_id', user_id);
        formData.append('accessToken', accessToken);

        // Flatten parameters
        if (template_params && typeof template_params === 'object') {
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

        // Handle attachment
        if (attachment_data && attachment_data.name && attachment_data.base64) {
            const base64Data = attachment_data.base64.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');

            console.log('Attaching file:', attachment_data.name);
            console.log('Size:', buffer.length);

            // Append using form-data specific options for filename and content-type
            // using 'invoice_file' as key. 
            formData.append('invoice_file', buffer, {
                filename: attachment_data.name,
                contentType: 'application/pdf',
                knownLength: buffer.length
            });
        }

        console.log('Sending request to EmailJS via Axios...');

        // Use Axios to post the form data
        // Axios handles the multipart boundary headers automatically when passed a FormData instance
        const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send-form', formData, {
            headers: {
                ...formData.getHeaders(),
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        });

        console.log('EmailJS Response:', response.status, response.data);

        if (response.status === 200 || response.status === 201) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed' }, { status: response.status });
        }

    } catch (error: any) {
        console.error('API Error:', error.response?.data || error.message);
        // Extract EmailJS specific error if available
        const errorMsg = typeof error.response?.data === 'string' ? error.response.data : error.message;
        return NextResponse.json({ error: errorMsg }, { status: error.response?.status || 500 });
    }
}
