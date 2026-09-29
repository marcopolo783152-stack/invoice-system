import { NextResponse } from "next/server";
import { Shippo } from "shippo";

export const dynamic = "force-dynamic";

const FROM = {
  name: "Marco Polo Oriental Rugs",
  street1: "3260 Duke Street",
  city: "Alexandria",
  state: "VA",
  zip: "22314",
  country: "US",
  phone: "(703) 461-0207",
  email: "support@marcopolorugs.com",
};

export async function POST(request: Request) {
  try {
    let apiKey = (process.env.SHIPPO_API_KEY || "").trim();
    if (apiKey.startsWith("ShippoToken ")) apiKey = apiKey.slice("ShippoToken ".length).trim();
    if (!apiKey) {
      return NextResponse.json({ error: "Shipping service is not configured." }, { status: 503 });
    }

    const body = await request.json();
    const address = body?.address || {};
    const street1 = String(address.street1 || "").trim();
    const street2 = String(address.street2 || "").trim();
    const city = String(address.city || "").trim();
    const state = String(address.state || "").trim().toUpperCase();
    const zip = String(address.zip || "").trim();

    if (!street1 || !city || !state || !zip) {
      return NextResponse.json({ error: "Complete shipping address required." }, { status: 400 });
    }

    const shippo = new Shippo({ apiKeyHeader: apiKey });
    const shipment = await shippo.shipments.create({
      addressFrom: FROM as any,
      addressTo: {
        name: String(body?.name || "Customer").trim() || "Customer",
        street1,
        street2,
        city,
        state,
        zip,
        country: "US",
      } as any,
      parcels: [{
        length: "26",
        width: "6",
        height: "6",
        distanceUnit: "in",
        weight: "8",
        massUnit: "lb",
      } as any],
      async: false,
    });

    const rates = Array.isArray(shipment.rates) ? shipment.rates : [];
    const valid = rates
      .filter((rate: any) => Number.isFinite(Number(rate.amount)) && Number(rate.amount) > 0)
      .sort((a: any, b: any) => Number(a.amount) - Number(b.amount));

    if (!valid.length) {
      const details = Array.isArray(shipment.messages)
        ? shipment.messages.map((m: any) => m?.text).filter(Boolean).join(" | ")
        : "";
      return NextResponse.json(
        { error: details || "No shipping rate is available for this address." },
        { status: 422 },
      );
    }

    const rate: any = valid[0];
    const response = NextResponse.json({
      amount: Number(Number(rate.amount).toFixed(2)),
      provider: rate.provider || "",
      service: rate.servicelevel?.name || rate.servicelevel?.token || "",
      estimatedDays: rate.estimatedDays ?? null,
      rateId: rate.objectId || rate.object_id || "",
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Shippo rate lookup failed:", error);
    return NextResponse.json({ error: "Unable to calculate shipping right now." }, { status: 500 });
  }
}
