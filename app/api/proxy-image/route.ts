import {NextResponse} from 'next/server';
export const dynamic = 'force-dynamic';
const hosts = new Set(['firebasestorage.googleapis.com','storage.googleapis.com','images.unsplash.com','www.marcopolorugs.com','marcopolorugs.com']);
const maximum = 12 * 1024 * 1024;
export async function GET(request: Request) {
  try {
    const raw = new URL(request.url).searchParams.get('url');
    if (!raw) return new NextResponse('Missing image URL', {status:400});
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !hosts.has(url.hostname) || url.pathname.startsWith('/api/'))
      return new NextResponse('Image source not permitted', {status:400});
    const response = await fetch(url, {redirect:'error', signal:AbortSignal.timeout(10000)});
    const type = response.headers.get('content-type')?.split(';')[0] || '';
    if (!response.ok || !['image/jpeg','image/png','image/webp','image/avif','image/gif'].includes(type))
      return new NextResponse('Image unavailable', {status:400});
    if (Number(response.headers.get('content-length') || 0) > maximum) return new NextResponse('Image too large', {status:413});
    const reader = response.body?.getReader();
    if (!reader) return new NextResponse('Image unavailable', {status:400});
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const part = await reader.read(); if (part.done) break;
      length += part.value.length;
      if (length > maximum) {await reader.cancel(); return new NextResponse('Image too large', {status:413});}
      chunks.push(part.value);
    }
    return new NextResponse(Buffer.concat(chunks), {headers:{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=86400'}});
  } catch { return new NextResponse('Image unavailable', {status:400}); }
}
