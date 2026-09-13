import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Prepare form data for Photoroom API
    const photoroomFormData = new FormData();
    photoroomFormData.append('image_file', image);

    const response = await fetch('https://sdk.photoroom.com/v1/segment', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.PHOTOROOM_API_KEY || 'sk_pr_default_bab251d4eeaee5e8afc5f8bc8ef64ae03218fd4b'
      },
      body: photoroomFormData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Photoroom API error:', errText);
      return NextResponse.json({ error: 'Failed to process image' }, { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const foreground = `data:image/png;base64,${base64}`;

    return NextResponse.json({ foreground });
  } catch (error) {
    console.error('Photoroom internal error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
