import {caller,serverDb} from '@/lib/server/firebase-admin';
import {requireStaff} from '@/lib/server/staff-permission';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const user = await caller(request);
    const raw = await request.text();
    if (raw.length > 2000) return NextResponse.json({error:"Request too large"},{status:413});
    const input = JSON.parse(raw);
    const id = input.orderId || input.order?.id;
    const type = input.type === 'invoice' ? 'invoice' : 'confirmation';
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return NextResponse.json({error:'Invalid order'}, {status:400});
    const ref = serverDb().collection('showroom_orders').doc(id);
    const snapshot = await ref.get();
    const order:any = snapshot.exists ? {...snapshot.data(),id:snapshot.id} : null;
    if (!order) return NextResponse.json({error:'Order not found'}, {status:404});
    if (type === 'invoice' || order.customerId !== user.uid) await requireStaff(request,'orders');
    const shopProfile = {name:'Marco Polo Rugs'};
    const key = process.env.EMAILJS_PRIVATE_KEY;
    if (!key) return NextResponse.json({error:'Email service needs configuration. Your order is saved.'}, {status:503});
    const recent = order.notificationAttempts?.[type] || 0;
    if (Date.now() - recent < 60000) return NextResponse.json({error:'Please wait a minute before retrying.'}, {status:429});
    await serverDb().runTransaction(async tx => {
      const current = (await tx.get(ref)).data();
      if (Date.now() - (current?.notificationAttempts?.[type] || 0) < 60000) throw Error('RETRY_LATER');
      tx.update(ref, {[`notificationAttempts.${type}`]:Date.now()});
    });
    const escape = (value:any) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c));
    order.customerInfo = {...order.customerInfo, name:escape(order.customerInfo?.name)};
    
    if (!order || !order.customerInfo) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
    }

    const { customerInfo } = order;
    const results: any = { email: null, sms: null };

    // 1. EmailJS Notification (Replaced SendGrid to bypass DMARC issues)
    const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'marcopolo2';
    const EMAILJS_TEMPLATE_ID = type === 'confirmation' ? 'marcopolo2' : (process.env.EMAILJS_TEMPLATE_INVOICE || 'rm8govh');
    const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || 'Anj9zrEUo-VEWvMVw';
    const EMAILJS_PRIVATE_KEY = key;

    if (customerInfo.email) {
      try {
        const subjectLine = type === 'invoice' 
          ? `Official Invoice - ${shopProfile?.name || 'Marco Polo'} (${order.id})`
          : `Order Confirmation - ${shopProfile?.name || 'Marco Polo'} (${order.id})`;

        const emailHtml = type === 'invoice' ? `
          <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #eaeaea; padding: 30px; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #8E7453; margin: 0; font-size: 28px; letter-spacing: 2px; text-transform: uppercase;">${shopProfile?.name || 'Marco Polo'}</h1>
              <p style="color: #666; font-size: 14px; margin-top: 5px; font-family: sans-serif;">EXOTIC ORIENTAL RUGS & TAPESTRIES</p>
            </div>
            
            <h2 style="color: #2c3e50; border-bottom: 2px solid #8E7453; padding-bottom: 10px; font-family: sans-serif;">Official Invoice</h2>
            <p>Dear ${customerInfo.name},</p>
            <p>What a wonderful choice! We are absolutely thrilled to finalize your order. Your official invoice for order <strong>${order.id}</strong> is ready for your records.</p>
            <p style="font-size: 22px; font-weight: bold; color: #8E7453; text-align: center; margin: 25px 0;">Total amount: $${order.total?.toLocaleString()}</p>
            
            <div style="background-color: #faf9f7; padding: 20px; border-radius: 5px; border-left: 4px solid #8E7453; margin: 25px 0; font-family: sans-serif;">
              <h3 style="margin-top: 0; color: #333;">View & Download Your Receipt</h3>
              <p style="margin-bottom: 15px;">You can view, print, or download your full PDF receipt anytime by visiting our website, clicking on the <strong>Track Order</strong> section, and entering your Tracking ID:</p>
              <div style="background: white; border: 1px dashed #ccc; padding: 10px; text-align: center;">
                <p style="font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 3px; color: #000;">${order.id}</p>
              </div>
              <div style="text-align: center; margin-top: 20px;">
                <a href="https://www.marcopolorugs.com/?track=${order.id}" style="display: inline-block; background-color: #8E7453; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; letter-spacing: 2px; border-radius: 4px; text-transform: uppercase;">Track Order Instantly</a>
              </div>
            </div>

            <div style="background-color: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 5px; margin: 30px 0;">
              <h3 style="color: #f1c40f; margin-top: 0;">✨ Enhance Your Home's Elegance ✨</h3>
              <p style="font-size: 14px; margin-bottom: 0;">Did you know we offer <strong>Professional Hand-Washing & Restoration</strong> for your heirloom rugs? Book a complimentary consultation with our master weavers today, or ask about our exclusive new arrivals!</p>
            </div>

            <p style="text-align: center; font-size: 15px;">If you love your experience with us, we would be incredibly honored if you could take a brief moment to <a href="https://www.google.com/search?gs_ssp=eJzj4tZP1zcsycjNKS8sMGC0UjWosLBMMk8yMkkzTUpMtkhMNrQyqDBLSrI0TkxMNk40NjUxMEz0kshNLErOVyjIz8lXyC_KTM0rScxRKCpNLwYAs7cZHQ&q=marco+polo+oriental+rugs&rlz=1C1ONGR_enUS1146US1146&oq=ma&gs_lcrp=EgZjaHJvbWUqFQgBEC4YJxivARjHARiABBiKBRiOBTIPCAAQIxgnGOMCGIAEGIoFMhUIARAuGCcYrwEYxwEYgAQYigUYjgUyBggCEEUYOzIGCAMQRRg5MgYIBBBFGDwyBggFEEUYPDIGCAYQRRg8MgYIBxBFGDzSAQgyNDU5ajBqN6gCALACAA&sourceid=chrome&ie=UTF-8" target="_blank" style="color: #8E7453; font-weight: bold; text-decoration: none;">leave a review on our Google profile</a>.</p>
            
            <p style="text-align: center; margin-top: 30px;">Thank you so much for choosing ${shopProfile?.name || 'Marco Polo Oriental Rugs'}. Your business means the world to us!</p>
            <div style="text-align: center; margin-top: 20px;">
              <p style="margin: 0; font-family: sans-serif; color: #666;">Warmest Regards,</p>
              <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 18px; color: #8E7453;">The ${shopProfile?.name || 'Marco Polo'} Team</p>
            </div>
          </div>
        ` : `
          <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #eaeaea; padding: 30px; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #8E7453; margin: 0; font-size: 28px; letter-spacing: 2px; text-transform: uppercase;">${shopProfile?.name || 'Marco Polo'}</h1>
              <p style="color: #666; font-size: 14px; margin-top: 5px; font-family: sans-serif;">EXOTIC ORIENTAL RUGS & TAPESTRIES</p>
            </div>
            
            <h2 style="color: #2c3e50; border-bottom: 2px solid #8E7453; padding-bottom: 10px; font-family: sans-serif;">Thank you for your order!</h2>
            <p>Dear ${customerInfo.name},</p>
            <p>What a wonderful choice! We are absolutely thrilled to confirm that we have successfully received your order <strong>${order.id}</strong>. Our expert curators are currently reviewing the inventory holds and will begin preparing it for you shortly.</p>
            <p style="font-size: 22px; font-weight: bold; color: #8E7453; text-align: center; margin: 25px 0;">Total amount: $${order.total?.toLocaleString()}</p>
            
            <div style="background-color: #faf9f7; padding: 20px; border-radius: 5px; border-left: 4px solid #8E7453; margin: 25px 0; font-family: sans-serif;">
              <h3 style="margin-top: 0; color: #333;">Track Your Order & Download Receipt</h3>
              <p style="margin-bottom: 15px;">You can view your live order status, print, or download your full PDF receipt anytime by visiting our website, clicking on the <strong>Track Order</strong> section, and entering your Tracking ID:</p>
              <div style="background: white; border: 1px dashed #ccc; padding: 10px; text-align: center;">
                <p style="font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 3px; color: #000;">${order.id}</p>
              </div>
              <div style="text-align: center; margin-top: 20px;">
                <a href="https://www.marcopolorugs.com/?track=${order.id}" style="display: inline-block; background-color: #8E7453; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; letter-spacing: 2px; border-radius: 4px; text-transform: uppercase;">Track Order Instantly</a>
              </div>
            </div>

            <div style="background-color: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 5px; margin: 30px 0;">
              <h3 style="color: #f1c40f; margin-top: 0;">✨ Enhance Your Home's Elegance ✨</h3>
              <p style="font-size: 14px; margin-bottom: 0;">Did you know we offer <strong>Professional Hand-Washing & Restoration</strong> for your heirloom rugs? Book a complimentary consultation with our master weavers today, or ask about our exclusive new arrivals!</p>
            </div>

            <p style="text-align: center; font-size: 15px;">If you love your experience with us, we would be incredibly honored if you could take a brief moment to <a href="https://www.google.com/search?gs_ssp=eJzj4tZP1zcsycjNKS8sMGC0UjWosLBMMk8yMkkzTUpMtkhMNrQyqDBLSrI0TkxMNk40NjUxMEz0kshNLErOVyjIz8lXyC_KTM0rScxRKCpNLwYAs7cZHQ&q=marco+polo+oriental+rugs&rlz=1C1ONGR_enUS1146US1146&oq=ma&gs_lcrp=EgZjaHJvbWUqFQgBEC4YJxivARjHARiABBiKBRiOBTIPCAAQIxgnGOMCGIAEGIoFMhUIARAuGCcYrwEYxwEYgAQYigUYjgUyBggCEEUYOzIGCAMQRRg5MgYIBBBFGDwyBggFEEUYPDIGCAYQRRg8MgYIBxBFGDzSAQgyNDU5ajBqN6gCALACAA&sourceid=chrome&ie=UTF-8" target="_blank" style="color: #8E7453; font-weight: bold; text-decoration: none;">leave a review on our Google profile</a>.</p>
            
            <p style="text-align: center; margin-top: 30px;">Thank you so much for choosing ${shopProfile?.name || 'Marco Polo Oriental Rugs'}. Your business means the world to us!</p>
            <div style="text-align: center; margin-top: 20px;">
              <p style="margin: 0; font-family: sans-serif; color: #666;">Warmest Regards,</p>
              <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 18px; color: #8E7453;">The ${shopProfile?.name || 'Marco Polo'} Team</p>
            </div>
          </div>
        `;

        const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            accessToken: EMAILJS_PRIVATE_KEY,
            template_params: {
              to_email: customerInfo.email,
              subject: subjectLine,
              message: emailHtml,
            }
          })
        });

        if (emailRes.ok) {
          results.email = 'sent';
        } else {
          const errText = await emailRes.text();
          console.error("Email delivery rejected by provider");
          results.email = 'failed';
        }
      } catch (err) {
        console.error("Email delivery failed");
        results.email = 'error';
      }
    }

    await ref.update({[`notifications.${type}`]:{status:results.email || 'not_sent',updatedAt:new Date().toISOString()}});
    return NextResponse.json({ success: results.email === 'sent', results }, {status:results.email === 'sent' ? 200 : 502});

  } catch (error) {
    console.error('Order notification failed');
    return NextResponse.json({ error: 'Failed to notify order' }, { status: 500 });
  }
}
