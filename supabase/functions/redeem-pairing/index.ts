import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

function randomHex(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

function randomTenDigitCode() {
  const range = 1n << 64n;
  const ceiling = range - (range % 10_000_000_000n);
  while (true) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    let value = 0n;
    for (const byte of bytes) value = (value << 8n) | BigInt(byte);
    if (value < ceiling) return String(value % 10_000_000_000n).padStart(10, "0");
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > 2048) return reply(413, { error: "payload_too_large" });

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return reply(400, { error: "invalid_request" });
    body = parsed as Record<string, unknown>;
  } catch {
    return reply(400, { error: "invalid_json" });
  }

  const code = typeof body.code === "string" ? body.code.replace(/\s/g, "") : "";
  const deviceLabel = typeof body.deviceLabel === "string" ? body.deviceLabel.trim().slice(0, 80) : "מכשיר Android";
  if (!/^\d{10}$/.test(code)) return reply(400, { error: "invalid_code_format" });

  // Supabase's edge gateway supplies the client address. Do not trust a caller-provided custom IP field.
  const forwarded = req.headers.get("x-forwarded-for");
  const clientIp = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? forwarded?.split(",").at(-1)?.trim();
  if (!clientIp) return reply(503, { error: "rate_limit_unavailable" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return reply(503, { error: "service_unavailable" });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const credential = randomHex(32);
    const [codeHash, ipHash, credentialHash] = await Promise.all([
      sha256(code), sha256(clientIp), sha256(credential),
    ]);
    const { data, error } = await admin.rpc("redeem_device_pairing", {
      p_code_hash: codeHash,
      p_ip_hash: ipHash,
      p_credential_hash: credentialHash,
      p_device_label: deviceLabel || "מכשיר Android",
    });
    if (error) throw error;

    if (data?.status === "rate_limited") return reply(429, { error: "too_many_attempts" });
    if (data?.status !== "paired") return reply(400, { error: "invalid_or_expired_code" });

    return reply(200, {
      paired: true,
      deviceToken: credential,
      deviceId: data.deviceId,
      childId: data.childId,
      childName: data.childName,
      familyName: data.familyName,
    });
  } catch (error) {
    console.error("pairing redemption failed", error instanceof Error ? error.message : "unknown");
    return reply(500, { error: "pairing_unavailable" });
  }
});
