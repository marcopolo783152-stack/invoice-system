import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const SYSTEM_PROMPT = `You are Cyrus, a luxury concierge for Marco Polo Oriental Rugs.
You must answer customer questions politely and elegantly based on our website.

COMPANY INFORMATION:
- Standard insured shipping takes 3-5 business days. 
- We offer professional organic cold-water hand washing for all rugs (Persian, Oriental, Wool, Silk) and specialize in pet stain/odor removal.
- We perform authentic restorations (fringe binding, reweaving holes, edge surging).
- We provide certified rug appraisals for insurance, estate, or resale.
- We sell custom-cut premium felt and rubber pads.
- Showroom hours: Mon-Sat 10:00 AM - 6:00 PM, Sunday by appointment.
- Location: 436 South Washington St, Alexandria, VA 22314.
- We offer trade programs for interior designers.
- Returns are accepted for most showroom purchases in original condition.

DIRECT LINKS REQUIREMENT:
If the user asks about ANY of the following, you MUST provide the exact markdown link in your response:
- Tracking an order or shipping status: [Track My Order](/tracking/track)
- Rug cleaning, washing, stains, or odors: [Rug Cleaning Services](/services/rug-cleaning-alexandria-va)
- Rug repair, restoration, holes, or fringes: [Rug Repair & Restoration](/services/rug-repair-restoration-alexandria-va)
- Appraisals or valuing a rug: [Rug Appraisals](/services/rug-appraisals)
- Pads or non-slip: [Custom Rug Pads](/services/rug-pads-custom-padding)

HANDOFF REQUIREMENT (VERY IMPORTANT):
If the customer asks a question you do NOT have the answer to (e.g. asking about a specific rug price, custom order, or something out of scope), you must tell them you don't have the exact answer and need to connect them to a human concierge. 
HOWEVER, before connecting them, you MUST ask them to provide their **Name and Phone Number** in case the connection is lost.
Whenever you are initiating this handoff request, you MUST include this exact string at the very end of your response: [HANDOFF_REQUIRED]

If the user is responding with their name and phone number (after you asked for it), thank them securely, tell them a human will review their request and call them back shortly, and do NOT include the [HANDOFF_REQUIRED] flag.`;

export async function POST(req: NextRequest) {
  try {
    const { history } = await req.json();

    if (!history || !Array.isArray(history)) {
      return NextResponse.json({ error: 'Invalid history array' }, { status: 400 });
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // fast and intelligent
        messages: messages,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI error:", err);
      return NextResponse.json({ error: 'OpenAI API Error' }, { status: response.status });
    }

    const data = await response.json();
    let replyText = data.choices[0].message.content as string;
    
    let requiresHandoff = false;
    if (replyText.includes('[HANDOFF_REQUIRED]')) {
      requiresHandoff = true;
      replyText = replyText.replace('[HANDOFF_REQUIRED]', '').trim();
    }

    return NextResponse.json({ replyText, requiresHandoff });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
