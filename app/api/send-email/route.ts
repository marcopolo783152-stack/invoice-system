
import { NextRequest, NextResponse } from 'next/server';

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

        const payload: any = {
            service_id,
            template_id,
            user_id,
            accessToken,
            template_params,
        };

        // If attachment data is present, format it for EmailJS
        // EmailJS REST API expects 'accessToken' (Private Key) to allow attachments
        // Attachment format usually requires a form-data approach or specific JSON structure if supported.
        // However, the standard REST API for simple JSON payload doesn't easily support file attachments 
        // without using multipart/form-data. 
        // But 'emailjs-com' (or raw fetch) can send JSON if the provider supports base64 in the parameters,
        // OR we use the strictly defined REST endpoint.
        //
        // Official EmailJS REST API:
        // POST https://api.emailjs.com/api/v1.0/email/send
        // Content-Type: application/json
        // {
        //   "service_id": "...",
        //   "template_id": "...",
        //   "user_id": "...",
        //   "accessToken": "...",
        //   "template_params": { ... }
        // }
        //
        // ALLOWING ATTACHMENTS via JSON:
        // EmailJS documentation is sparse on JSON-based attachments. 
        // They usually recommend FormData.
        // Let's try to construct a proper specific params structure if possible, 
        // OR we might need to assume the 'attachment_data' (base64) is passed as a template param
        // and the *TEMPLATE* handles it? NO, templates can't create files.
        //
        // WAIT: To send an attachment via EmailJS REST API, you generally MUST use FormData.
        // So we will construct a FormData object here and forward it.
        // But Request is JSON. We will convert it.

        // Correction: We can send a fetch request with JSON. 
        // But wait, standard EmailJS plan does NOT support attachments via pure JSON unless 
        // using a specific setting or if we use the 'content' param?
        // Actually, widespread usage suggests passing it as a variable is NOT enough for a real attachment.
        // We probably need to use the NodeJS client or just raw fetch with proper headers.

        // Let's try the direct JSON approach first, but typically attachments need to be passed strictly.
        // Use `formData` is the most reliable way with `accessToken`.

        // Construct FormData for the upstream request
        const formData = new FormData();
        formData.append('service_id', service_id);
        formData.append('template_id', template_id);
        formData.append('user_id', user_id);
        formData.append('accessToken', accessToken);
        // Flatten template_params so each key becomes a form field
        // This is safer for EmailJS send-form and avoids "variable size limit" on the JSON blob itself
        if (template_params && typeof template_params === 'object') {
            Object.entries(template_params).forEach(([key, value]) => {
                const strValue = String(value);
                console.log(`Param '${key}' size:`, strValue.length); // Log size for debugging
                formData.append(key, strValue);
            });
        }
        // formData.append('template_params', JSON.stringify(template_params)); // REMOVED

        if (attachment_data && attachment_data.name && attachment_data.base64) {
            // We need to convert base64 back to a Blob to append to FormData?
            // Node environment doesn't always have exact "Blob" fully compatible with fetch?
            // Actually, we can just pass the file.
            // But we are in an API route (Edge or Node).
            // simpler: The "content" of the file.
            //
            // Let's look at how to attach a file from Base64 string in Node fetch.
            // We can append a Blob.

            // Decoding Base64
            const base64Data = attachment_data.base64.split(',')[1]; // Remove 'data:application/pdf;base64,' prefix
            const buffer = Buffer.from(base64Data, 'base64');
            const blob = new Blob([buffer], { type: 'application/pdf' });

            formData.append('attachment', blob, attachment_data.name);
        }

        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send-form', {
            method: 'POST',
            body: formData,
            // Do NOT set Content-Type header manually for FormData, fetch does it with boundary
        });

        if (response.ok) {
            return NextResponse.json({ success: true });
        } else {
            const text = await response.text();
            return NextResponse.json({ error: text }, { status: response.status });
        }

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
