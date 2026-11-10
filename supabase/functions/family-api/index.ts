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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return reply(401, { error: "unauthorized" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return reply(503, { error: "service_unavailable" });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user) return reply(401, { error: "unauthorized" });

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > 8192) return reply(413, { error: "payload_too_large" });

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return reply(400, { error: "invalid_request" });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return reply(400, { error: "invalid_json" });
  }

  const cleanText = (value: unknown, max = 80) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";

  try {
    if (body.action === "create_family") {
      const name = cleanText(body.name);
      const displayName = cleanText(body.displayName);
      if (!name || !displayName) return reply(400, { error: "invalid_request" });

      const { data, error } = await admin.rpc("create_family_for_user", {
        p_user_id: user.id,
        p_family_name: name,
        p_display_name: displayName,
      });
      if (error) {
        if (error.code === "23505") return reply(409, { error: "family_already_exists" });
        if (error.code === "22023") return reply(400, { error: "invalid_request" });
        throw error;
      }
      return reply(201, data);
    }

    if (body.action === "create_child") {
      const nickname = cleanText(body.nickname);
      if (!nickname) return reply(400, { error: "invalid_request" });

      const { data, error } = await admin.rpc("create_child_for_parent", {
        p_user_id: user.id,
        p_nickname: nickname,
      });
      if (error) {
        if (error.code === "P0002") return reply(403, { error: "parent_family_required" });
        if (error.code === "22023") return reply(400, { error: "invalid_request" });
        throw error;
      }
      return reply(201, data);
    }

    if (body.action === "create_pairing_code") {
      const childId = cleanText(body.childId, 64);
      const deviceLabel = cleanText(body.deviceLabel, 80) || "מכשיר Android";
      if (!/^[0-9a-f-]{36}$/i.test(childId)) return reply(400, { error: "invalid_request" });

      const { data: memberships, error: membershipError } = await admin
        .from("family_members")
        .select("id,family_id")
        .eq("auth_user_id", user.id)
        .eq("role", "parent")
        .eq("is_active", true);
      if (membershipError) throw membershipError;
      if (!memberships?.length) return reply(403, { error: "parent_family_required" });

      const { data: child, error: childError } = await admin
        .from("child_profiles")
        .select("id,family_id")
        .eq("id", childId)
        .in("family_id", memberships.map((m) => m.family_id))
        .maybeSingle();
      if (childError) throw childError;
      if (!child) return reply(404, { error: "child_not_found" });
      const parent = memberships.find((m) => m.family_id === child.family_id);
      if (!parent) return reply(403, { error: "parent_family_required" });

      const { data: recent, error: recentError } = await admin
        .from("pairing_codes")
        .select("id")
        .eq("child_profile_id", childId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .limit(1);
      if (recentError) throw recentError;
      if (recent?.length) return reply(409, { error: "active_pairing_code_exists" });

      const range = 1n << 64n;
      const ceiling = range - (range % 10_000_000_000n);
      let code = "";
      while (!code) {
        const bytes = new Uint8Array(8);
        crypto.getRandomValues(bytes);
        let value = 0n;
        for (const byte of bytes) value = (value << 8n) | BigInt(byte);
        if (value < ceiling) code = String(value % 10_000_000_000n).padStart(10, "0");
      }
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
      const codeHash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: insertError } = await admin.from("pairing_codes").insert({
        family_id: parent.family_id,
        child_profile_id: childId,
        code_hash: codeHash,
        expires_at: expiresAt,
        created_by_member_id: parent.id,
      });
      if (insertError) throw insertError;

      const { error: auditError } = await admin.from("audit_events").insert({
        family_id: parent.family_id,
        actor_member_id: parent.id,
        subject_child_id: childId,
        event_type: "device.pairing_code_created",
        details: { deviceLabel, expiresAt },
      });
      if (auditError) throw auditError;
      return reply(201, { code, expiresAt, childId });
    }

    if (body.action === "overview") {
      const { data: memberships, error: memberError } = await admin
        .from("family_members")
        .select("id,family_id,display_name,role")
        .eq("auth_user_id", user.id)
        .eq("role", "parent")
        .eq("is_active", true);
      if (memberError) throw memberError;

      const families = [];
      for (const membership of memberships ?? []) {
        const { data: family, error: familyError } = await admin
          .from("families")
          .select("id,name,status,created_at")
          .eq("id", membership.family_id)
          .maybeSingle();
        if (familyError) throw familyError;
        if (!family) continue;

        const { data: children, error: childError } = await admin
          .from("child_profiles")
          .select("id,nickname,created_at")
          .eq("family_id", family.id);
        if (childError) throw childError;

        const { data: activity, error: activityError } = await admin
          .from("audit_events")
          .select("id,event_type,created_at,details")
          .eq("family_id", family.id)
          .order("created_at", { ascending: false })
          .limit(25);
        if (activityError) throw activityError;

        const childIds = (children ?? []).map((child) => child.id);
        let devices: unknown[] = [];
        if (childIds.length) {
          const { data, error } = await admin
            .from("devices")
            .select("id,child_profile_id,device_label,platform,status,last_seen_at,app_version,policy_version")
            .in("child_profile_id", childIds);
          if (error) throw error;
          devices = data ?? [];
        }

        families.push({
          ...family,
          currentParent: { id: membership.id, displayName: membership.display_name },
          activity: activity ?? [],
          children: (children ?? []).map((child) => ({
            ...child,
            devices: devices.filter((device: any) => device.child_profile_id === child.id),
          })),
        });
      }
      return reply(200, { families });
    }

    return reply(400, { error: "unknown_action" });
  } catch (error) {
    console.error("family-api request failed", error instanceof Error ? error.message : "unknown");
    return reply(500, { error: "internal_error" });
  }
});
