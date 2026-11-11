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

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token.length < 32 || token.length > 256) return reply(401, { error: "unauthorized" });

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
    if (!device || device.status !== "active") return reply(401, { error: "device_not_active" });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply(400, { error: "invalid_request" });

    if (body.action === "poll") {
      const now = new Date().toISOString();
      const { data: commands, error } = await admin
        .from("device_commands")
        .select("id,command_type,payload,created_at,expires_at")
        .eq("device_id", device.id)
        .eq("status", "queued")
        .gt("expires_at", now)
        .order("created_at", { ascending: true })
        .limit(1);
      if (error) throw error;

      const ids = (commands ?? []).map((c) => c.id);
      if (ids.length) {
        const { error: updateError } = await admin
          .from("device_commands")
          .update({ status: "delivered", delivered_at: now })
          .in("id", ids)
          .eq("device_id", device.id)
          .eq("status", "queued");
        if (updateError) throw updateError;
      }
      await admin.from("devices").update({ last_seen_at: now }).eq("id", device.id);
      return reply(200, { commands: commands ?? [], serverTime: now });
    }

    if (body.action === "acknowledge") {
      const commandId = typeof body.commandId === "string" ? body.commandId : "";
      const result = body.result === "failed" ? "failed" : "acknowledged";
      if (!/^[0-9a-f-]{36}$/i.test(commandId)) return reply(400, { error: "invalid_request" });
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
    }

    return reply(400, { error: "unknown_action" });
  } catch (error) {
    console.error("device command request failed", error instanceof Error ? error.message : "unknown");
    return reply(500, { error: "internal_error" });
  }
});
