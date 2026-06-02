import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:8080';

async function proxy(req: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join('/');
  const url = `${BACKEND_URL}/api/${path}${req.nextUrl.search}`;

  const headers = new Headers();
  const auth = req.headers.get('authorization');
  const contentType = req.headers.get('content-type');
  if (auth) headers.set('authorization', auth);
  if (contentType) headers.set('content-type', contentType);

  const cookie = req.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);

  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);
  else if (realIp) headers.set('x-forwarded-for', realIp);

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }

  const res = await fetch(url, init);
  const body = await res.text();

  const responseHeaders = new Headers();
  const resContentType = res.headers.get('content-type');
  if (resContentType) responseHeaders.set('content-type', resContentType);

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) responseHeaders.set('set-cookie', setCookie);

  return new NextResponse(body, {
    status: res.status,
    headers: responseHeaders,
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
