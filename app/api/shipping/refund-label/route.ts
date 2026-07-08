import { NextResponse } from "next/server";
import { Shippo } from "shippo";

export async function POST(request: Request) {
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
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json({ error: "Transaction ID is required for refund" }, { status: 400 });
    }

    const refund = await shippo.refunds.create({
      transaction: transactionId
    });

    if (refund.status === "QUEUED" || refund.status === "SUCCESS") {
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
