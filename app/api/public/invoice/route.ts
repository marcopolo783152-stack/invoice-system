import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { serverDb } from "@/lib/server/firebase-admin";

export const dynamic = "force-dynamic";

function noStore(body: any, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = (url.searchParams.get("id") || "").trim();
    if (!/^[A-Za-z0-9_-]{10,128}$/.test(id)) {
      return noStore({ error: "Invalid invoice link." }, { status: 400 });
    }

    const snap = await serverDb().collection("invoices").doc(id).get();
    if (!snap.exists) {
      return noStore({ error: "Invoice not found." }, { status: 404 });
    }

    const record = snap.data() || {};
    const data = record.data || {};
    return noStore({
      invoice: {
        id: snap.id,
        data,
        documentType: data.documentType || "INVOICE",
        createdAt: record.createdAt?.toDate?.()?.toISOString?.() || null,
        updatedAt: (record.updatedAt || record.createdAt)?.toDate?.()?.toISOString?.() || null,
      },
    });
  } catch (error) {
    console.error("Public invoice GET failed:", error);
    return noStore({ error: "Unable to open invoice." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const url = new URL(request.url);
    const id = (url.searchParams.get("id") || "").trim();
    if (!/^[A-Za-z0-9_-]{10,128}$/.test(id)) {
      return noStore({ error: "Invalid invoice link." }, { status: 400 });
    }

    const body = await request.json();
    const signature = typeof body?.signature === "string" ? body.signature : "";
    if (!signature.startsWith("data:image/") || signature.length > 1_500_000) {
      return noStore({ error: "Invalid signature." }, { status: 400 });
    }

    const ref = serverDb().collection("invoices").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return noStore({ error: "Invoice not found." }, { status: 404 });
    }

    const record = snap.data() || {};
    const data = record.data || {};
    if (data.signature) {
      return noStore({ error: "Invoice is already signed." }, { status: 409 });
    }

    const updatedData = {
      ...data,
      signature,
      signatureDate: new Date().toISOString(),
    };

    await ref.update({
      data: updatedData,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return noStore({ ok: true, data: updatedData });
  } catch (error) {
    console.error("Public invoice PATCH failed:", error);
    return noStore({ error: "Unable to save signature." }, { status: 500 });
  }
}
