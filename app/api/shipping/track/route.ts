export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const trackingNumber = searchParams.get("trackingNumber");
    const carrier = searchParams.get("carrier");

    if (!trackingNumber || !carrier) {
      return NextResponse.json({ error: "Missing trackingNumber or carrier" }, { status: 400 });
    }

    const apiKey = process.env.SHIPPO_API_KEY;
    if (!apiKey) {
      throw new Error("Missing SHIPPO_API_KEY");
    }

    // Shippo Tracking API
    // GET https://api.goshippo.com/tracks/{carrier}/{tracking_number}
    const response = await fetch(`https://api.goshippo.com/tracks/${carrier}/${trackingNumber}`, {
      method: 'GET',
      headers: {
        'Authorization': `ShippoToken ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shippo API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Live tracking error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
