import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { order, shopProfile } = await request.json();
    
    if (!order || !order.customerInfo) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
    }

    const { customerInfo } = order;
    const results: any = { email: null, sms: null };

    // 1. SendGrid Email Notification
    if (process.env.SENDGRID_API_KEY && customerInfo.email) {
      try {
        const emailBody = {
          personalizations: [{
            to: [{ email: customerInfo.email }],
            subject: `Order Confirmation - ${shopProfile?.name || 'Marco Polo'} (${order.id})`
          }],
          from: { email: shopProfile?.email || 'noreply@marcopolorugs.com', name: shopProfile?.name || 'Marco Polo' },
          content: [{
            type: 'text/html',
            value: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #8E7453;">Thank you for your order!</h2>
                <p>Dear ${customerInfo.name},</p>
                <p>We have successfully received your order <strong>${order.id}</strong>. Our curators are currently reviewing the inventory holds.</p>
                <p><strong>Total amount:</strong> $${order.total.toLocaleString()}</p>
                <p>You can track your order status anytime on our website using your Tracking ID: <strong>${order.id}</strong></p>
                <br/>
                <p>Warm Regards,</p>
                <p><strong>${shopProfile?.name || 'Marco Polo'}</strong></p>
              </div>
            `
          }]
        };

        const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailBody)
        });

        results.email = sgResponse.ok ? 'Sent' : `Failed: ${sgResponse.status}`;
      } catch (err) {
        results.email = 'Error';
      }
    } else {
      results.email = 'No API Key or Email provided';
    }

    // 2. Twilio SMS Notification
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER && customerInfo.phone) {
      try {
        const smsBody = `Hi ${customerInfo.name}, your order ${order.id} with ${shopProfile?.name || 'Marco Polo'} is received and Pending Confirmation. Track it on our website!`;
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
        
        const params = new URLSearchParams();
        params.append('To', customerInfo.phone);
        params.append('From', process.env.TWILIO_PHONE_NUMBER);
        params.append('Body', smsBody);

        const twResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params
        });

        results.sms = twResponse.ok ? 'Sent' : `Failed: ${twResponse.status}`;
      } catch (err) {
        results.sms = 'Error';
      }
    } else {
      results.sms = 'No API Key or Phone provided';
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Notify Order Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
