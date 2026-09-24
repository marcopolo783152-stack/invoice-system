import {serverDb} from '@/lib/server/firebase-admin';
import {requireStaff} from '@/lib/server/staff-permission';
import { NextResponse } from "next/server";
import { Shippo } from "shippo";

export async function POST(request: Request) {
  try { await requireStaff(request, 'orders'); }
  catch { return NextResponse.json({error:'Staff permission required.'}, {status:403}); }

  let rawKey = process.env.SHIPPO_API_KEY || "";
  rawKey = rawKey.trim();
  if (rawKey.startsWith("ShippoToken ")) {
    rawKey = rawKey.replace("ShippoToken ", "");
  }

  const shippo = new Shippo({
    apiKeyHeader: rawKey,
  });

  try {
    const body = await request.json();
    const { transactionId, orderId } = body;
    if (typeof orderId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(orderId)) return NextResponse.json({error:'Invalid order'}, {status:400});
    const ref = serverDb().collection('showroom_orders').doc(orderId);
    const saved = (await ref.get()).data();
    if (!saved || saved.shippingDetails?.transactionId !== transactionId) return NextResponse.json({error:'Label does not match this order'}, {status:400});
    if (saved.shippingDetails?.refundRequestedAt) return NextResponse.json({success:true,message:'Refund already requested'});

    if (!transactionId) {
      return NextResponse.json({ error: "Transaction ID is required for refund" }, { status: 400 });
    }

    const refund = await shippo.refunds.create({
      transaction: transactionId
    });

    if (refund.status === "QUEUED" || refund.status === "SUCCESS" || refund.status === "PENDING") {
      await ref.update({"shippingDetails.refundRequestedAt":new Date().toISOString(), "shippingDetails.refundStatus":refund.status});
      return NextResponse.json({ success: true, message: "Refund requested successfully" });
    } else {
      return NextResponse.json({ error: `Refund failed. Status: ${refund.status}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Refund error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process refund" },
      { status: 500 }
    );
  }
}
