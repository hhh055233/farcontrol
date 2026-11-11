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

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });

  // Device commands are deliberately small. Read the body once so the limit
  // still applies when a client omits or falsifies Content-Length.
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return reply(400, { error: "invalid_request" });
  }
  if (new TextEncoder().encode(rawBody).byteLength > 2048) {
    return reply(413, { error: "payload_too_large" });
  }

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token.length < 32 || token.length > 256) {
    return reply(401, { error: "unauthorized" });
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return reply(400, { error: "invalid_request" });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return reply(400, { error: "invalid_json" });
  }

  if (body.action !== "poll" && body.action !== "acknowledge") {
    return reply(400, { error: "unknown_action" });
  }
  const allowedKeys = body.action === "poll"
    ? new Set(["action"])
    : new Set(["action", "commandId", "result"]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    return reply(400, { error: "unexpected_field" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return reply(503, { error: "service_unavailable" });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const credentialHash = await sha256(token);
    const { data: device, error: deviceError } = await admin
      .from("devices")
      .select("id,family_id,status")
      .eq("credential_hash", credentialHash)
      .maybeSingle();
    if (deviceError) throw deviceError;
    if (!device || device.status !== "active") {
      return reply(401, { error: "device_not_active" });
    }

    if (body.action === "poll") {
      const now = new Date().toISOString();
      const { data: pending, error } = await admin
        .from("device_commands")
        .select("id,command_type,payload,created_at,expires_at")
        .eq("device_id", device.id)
        .eq("status", "queued")
        .gt("expires_at", now)
        .order("created_at", { ascending: true })
        .limit(1);
      if (error) throw error;

      const candidate = pending?.[0];
      let commands: typeof pending = [];
      if (candidate) {
        // Return a command only if this request successfully claimed it.
        // This prevents concurrent polls from both acting on the same command.
        const { data: claimed, error: claimError } = await admin
          .from("device_commands")
          .update({ status: "delivered", delivered_at: now })
          .eq("id", candidate.id)
          .eq("device_id", device.id)
          .eq("status", "queued")
          .select("id");
        if (claimError) throw claimError;
        if (claimed?.some((row) => row.id === candidate.id)) {
          commands = [candidate];
        }
      }

      const { error: heartbeatError } = await admin
        .from("devices")
        .update({ last_seen_at: now })
        .eq("id", device.id)
        .eq("status", "active");
      if (heartbeatError) throw heartbeatError;
      return reply(200, { commands, serverTime: now });
    }

    const commandId = typeof body.commandId === "string" ? body.commandId : "";
    const result = body.result === undefined ? "acknowledged" : body.result;
    if (!/^[0-9a-f-]{36}$/i.test(commandId)) {
      return reply(400, { error: "invalid_command_id" });
    }
    if (result !== "acknowledged" && result !== "failed") {
      return reply(400, { error: "invalid_result" });
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from("device_commands")
      .update({ status: result, acknowledged_at: now })
      .eq("id", commandId)
      .eq("device_id", device.id)
      .eq("status", "delivered")
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return reply(404, { error: "command_not_found" });
    return reply(200, { acknowledged: true });
  } catch (error) {
    console.error("device command request failed", error instanceof Error ? error.message : "unknown");
    return reply(500, { error: "internal_error" });
  }
});
