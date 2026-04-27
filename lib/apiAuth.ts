import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

/**
 * Guards internal API routes (make-call, patients, alert, parse-call).
 * Callers must include:  Authorization: Bearer <INTERNAL_API_SECRET>
 * Returns a 401 response if the check fails, or null if the request is allowed.
 */
export function requireInternalSecret(req: NextRequest): NextResponse | null {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    console.error("INTERNAL_API_SECRET is not set — rejecting all internal API calls");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Validates that an incoming request is genuinely from Twilio.
 * Uses TWILIO_AUTH_TOKEN env var and the X-Twilio-Signature header.
 * Returns a 403 response if validation fails, or null if valid.
 */
export async function requireTwilioSignature(req: NextRequest): Promise<NextResponse | null> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error("TWILIO_AUTH_TOKEN is not set — cannot validate Twilio signature");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const signature = req.headers.get("X-Twilio-Signature") ?? "";

  // Build the URL as Twilio signed it: use the configured app URL as base
  // (req.url has an internal Vercel hostname that doesn't match Twilio's signed URL)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const { pathname, search } = new URL(req.url);
  const url = `${appUrl}${pathname}${search}`;

  // Collect POST body params for form-encoded requests
  const params: Record<string, string> = {};
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.clone().text();
    new URLSearchParams(text).forEach((value, key) => { params[key] = value; });
  }

  const valid = twilio.validateRequest(authToken, signature, url, params);
  if (!valid) {
    console.warn("Twilio signature validation failed for", url);
    return new NextResponse("Forbidden", { status: 403 });
  }
  return null;
}
