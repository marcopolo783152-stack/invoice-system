import { NextResponse } from "next/server";
import { db } from "@/lib/firebase"; // Note: this uses the client SDK on the server, which can be flaky but we'll try it
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Check if this is a tracking update event
    if (payload.event === "track_updated" && payload.data) {
      const trackingNumber = payload.data.tracking_number;
      const shippoStatus = payload.data.tracking_status?.status; // e.g., TRANSIT, DELIVERED, RETURNED, FAILURE

      if (!trackingNumber || !shippoStatus) {
        return NextResponse.json({ message: "Ignored: Missing tracking number or status" });
      }

      // Map Shippo status to our OrderStatus
      let newOrderStatus = "";
      if (shippoStatus === "DELIVERED") {
        newOrderStatus = "Delivered";
      } else if (shippoStatus === "TRANSIT") {
        // Already "Shipped", but we could update estimated delivery if we wanted
        newOrderStatus = "Shipped";
      } else if (shippoStatus === "RETURNED") {
        newOrderStatus = "Returned";
      } else {
        // Ignore other statuses like UNKNOWN, PRE_TRANSIT for now
        return NextResponse.json({ message: `Ignored status: ${shippoStatus}` });
      }

      // If we need to update the status to Delivered or Returned
      if (newOrderStatus === "Delivered" || newOrderStatus === "Returned") {
        if (!db) throw new Error("Firebase DB not initialized");

        // Find the order with this tracking number
        const q = query(
          collection(db!, "showroom_orders"),
          where("shippingDetails.trackingNumber", "==", trackingNumber)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          console.log("No order found for tracking number:", trackingNumber);
          return NextResponse.json({ message: "Order not found for tracking number" });
        }

        // Update all matching orders (should only be one)
        const updatePromises = snapshot.docs.map(async (orderDoc) => {
          const currentStatus = orderDoc.data().status;
          
          // Only update if it's currently "Shipped", to prevent overriding manual admin changes
          if (currentStatus === "Shipped") {
            const docRef = doc(db!, "showroom_orders", orderDoc.id);
            await updateDoc(docRef, {
              status: newOrderStatus,
              "shippingDetails.estimatedDelivery": payload.data.tracking_status?.status_details || ""
            });
            console.log(`Order ${orderDoc.id} automatically updated to ${newOrderStatus} via Shippo webhook`);
          }
        });

        await Promise.all(updatePromises);
      }

      return NextResponse.json({ success: true, message: "Webhook processed" });
    }

    // Ignore other events
    return NextResponse.json({ message: "Ignored event type" });

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
