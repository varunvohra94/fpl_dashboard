import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return forwardRequest(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return forwardRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return forwardRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return forwardRequest(request, path);
}

async function forwardRequest(request: NextRequest, pathSegments: string[]) {
  const rawBackendUrl =
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8000/api/v1";

  // Ensure clean base without trailing slash
  const backendBase = rawBackendUrl.replace(/\/+$/, "");
  const subPath = pathSegments.join("/");
  const search = request.nextUrl.search;
  const targetUrl = `${backendBase}/${subPath}${search}`;

  try {
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const body = hasBody ? await request.text() : undefined;

    const headers: Record<string, string> = {};
    const contentType = request.headers.get("content-type");
    if (contentType) {
      headers["content-type"] = contentType;
    }

    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });

    const responseBody = await res.text();

    return new NextResponse(responseBody, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (error: any) {
    console.error(`[API Proxy Error] Failed to proxy to ${targetUrl}:`, error);
    return NextResponse.json(
      {
        error: "Failed to connect to backend service",
        details: error.message,
      },
      { status: 502 }
    );
  }
}
