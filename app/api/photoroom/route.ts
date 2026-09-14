import { NextResponse } from 'next/server';

// Intentionally disabled until provider billing and credentials are verified.
// Never accept uploads or spend provider credits while this feature is paused.
export async function POST() {
  return NextResponse.json(
    { error: 'AI room layering is temporarily unavailable. Please use the standard room visualizer.' },
    { status: 503 }
  );
}
