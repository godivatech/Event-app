import { NextRequest, NextResponse } from 'next/server';

const API_TARGET = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function handleRequest(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params?.path ? params.path.join('/') : '';
  const search = req.nextUrl.search || '';
  const targetUrl = `${API_TARGET}/api/${path}${search}`;

  const hopByHopHeaders = new Set([
    'host',
    'connection',
    'content-length',
    'transfer-encoding',
    'keep-alive',
    'te',
    'trailer',
    'upgrade',
    'expect',
  ]);

  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (!hopByHopHeaders.has(k)) {
      forwardHeaders.set(key, value);
    }
  });

  // Enforce a strict 15-second upstream timeout to prevent serverless function hangs
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    let body: any = undefined;
    if (!['GET', 'HEAD'].includes(req.method)) {
      const text = await req.text();
      if (text && text.length > 0) {
        body = text;
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
      cache: 'no-store',
      signal: controller.signal,
      // @ts-ignore
      duplex: body ? 'half' : undefined,
    });

    clearTimeout(timeoutId);

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k !== 'content-encoding' && k !== 'content-length' && k !== 'transfer-encoding') {
        responseHeaders.append(key, value);
      }
    });

    // Buffer response body safely as arrayBuffer to prevent stream lockups
    const responseBuffer = await response.arrayBuffer();

    return new NextResponse(responseBuffer, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'GATEWAY_TIMEOUT',
            message: `The upstream API server at ${API_TARGET} did not respond within 15 seconds. Please retry shortly.`,
          },
        },
        { status: 504 }
      );
    }

    console.error(`[Next.js API Proxy Error] ${req.method} ${targetUrl}:`, err?.message, err?.cause || '');
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PROXY_CONNECTION_FAILED',
          message: `Unable to reach backend API at ${API_TARGET}. Details: ${err?.message || 'Connection refused'}`,
        },
      },
      { status: 502 }
    );
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
export const dynamic = 'force-dynamic';
