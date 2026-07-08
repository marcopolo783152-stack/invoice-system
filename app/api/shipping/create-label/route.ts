import { NextResponse } from "next/server";
import { Shippo } from "shippo";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export async function POST(request: Request) {
  // Clean up the API key to prevent any trailing spaces or duplicate prefixes
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
    const { orderId, customerAddress, dimensions } = body;

    if (!orderId || !customerAddress || !dimensions) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Create a shipment
    const addressFrom = {
      name: "Marco Polo Oriental Rugs",
      street1: "3260 Duke Street",
      city: "Alexandria",
      state: "VA",
      zip: "22314",
      country: "US",
      phone: "(703) 461-0207",
      email: "support@marcopolorugs.com",
    };

    // Parse the shipping address string (e.g. "123 Main St, New York, NY 10001")
    let parsedStreet = customerAddress.address1 || customerAddress.street || "";
    let parsedCity = customerAddress.city || "";
    let parsedState = customerAddress.state || "";
    let parsedZip = customerAddress.zip || customerAddress.zipCode || "";

    if (customerAddress.shippingAddress) {
      const parts = customerAddress.shippingAddress.split(',');
      if (parts.length >= 3) {
        parsedStreet = parts[0].trim();
        parsedCity = parts[1].trim();
        const stateZip = parts[2].trim().split(' ');
        parsedState = stateZip[0] || "";
        parsedZip = stateZip[1] || "";
      } else {
        // Fallback if no commas
        parsedStreet = customerAddress.shippingAddress;
      }
    }

    const addressTo = {
      name: customerAddress.name || "Customer",
      street1: parsedStreet,
      street2: customerAddress.address2 || "",
      city: parsedCity,
      state: parsedState,
      zip: parsedZip,
      country: customerAddress.country || "US",
    };

    if (!parsedCity || !parsedState || !parsedZip) {
      return NextResponse.json(
        { error: `Address could not be parsed correctly. Please ensure the customer's address is formatted with commas like this: "123 Main St, City, State Zip". Current parsed values -> Street: ${parsedStreet}, City: ${parsedCity}, State: ${parsedState}, Zip: ${parsedZip}` },
        { status: 400 }
      );
    }

    const parcel = {
      length: dimensions.length.toString(),
      width: dimensions.width.toString(),
      height: dimensions.height.toString(),
      distanceUnit: "in",
      weight: dimensions.weight.toString(),
      massUnit: "lb",
    };

    console.log("Creating shipment with Shippo...");
    
    // Create the shipment
    const shipment = await shippo.shipments.create({
      addressFrom: addressFrom as any,
      addressTo: addressTo as any,
      parcels: [parcel as any],
      async: false,
    });

    if (!shipment.rates || shipment.rates.length === 0) {
      const shippoMessages = shipment.messages ? shipment.messages.map((m: any) => m.text).join(" | ") : "Unknown reason";
      return NextResponse.json(
        { error: `No shipping rates available for this destination/package. Carrier says: ${shippoMessages}` },
        { status: 400 }
      );
    }

    // 2. Find the cheapest rate
    const sortedRates = shipment.rates.sort(
      (a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount)
    );
    const cheapestRate = sortedRates[0];

    console.log(`Purchasing label for cheapest rate: $${cheapestRate.amount} (${cheapestRate.provider})`);

    // 3. Purchase the label (Transaction)
    const transaction = await shippo.transactions.create({
      rate: cheapestRate.objectId,
      labelFileType: "PDF",
      async: false,
    });

    if (transaction.status !== "SUCCESS") {
      const messages = transaction.messages?.map((m: any) => m.text).join(", ") || "Unknown error";
      return NextResponse.json(
        { error: `Failed to purchase label: ${messages}` },
        { status: 400 }
      );
    }

    // 4. Get tracking info and label URL
    const trackingNumber = transaction.trackingNumber;
    const labelUrl = transaction.labelUrl;
    const trackingUrl = transaction.trackingUrlProvider;

    // 5. Update Firebase order status
    try {
      if (!db) throw new Error("Firebase DB not initialized");
      const orderRef = doc(db, "showroom_orders", orderId);
      await updateDoc(orderRef, {
        status: "Shipped",
        shippingDetails: {
          trackingNumber: trackingNumber,
          labelUrl: labelUrl,
          trackingUrl: trackingUrl,
          carrier: cheapestRate.provider,
          cost: cheapestRate.amount,
          shippedAt: new Date().toISOString()
        }
      });
      console.log(`Successfully updated order ${orderId} in Firebase.`);
    } catch (fbError) {
      console.error("Firebase update failed, but label was created:", fbError);
    }

    return NextResponse.json({
      success: true,
      trackingNumber,
      labelUrl,
      trackingUrl,
      carrier: cheapestRate.provider,
      cost: cheapestRate.amount
    });

  } catch (error: any) {
    console.error("Shipping error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process shipping" },
      { status: 500 }
    );
  }
}
