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
  if (!user.email_confirmed_at) return reply(403, { error: "email_not_verified" });

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

      const { data, error } = await admin.rpc("create_device_group_for_teacher", {
        p_user_id: user.id,
        p_group_name: nickname,
      });
      if (error) {
        if (error.code === "P0002") return reply(403, { error: "teacher_family_required" });
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
        .eq("role", "teacher")
        .eq("is_active", true);
      if (membershipError) throw membershipError;
      if (!memberships?.length) return reply(403, { error: "teacher_family_required" });

      const { data: child, error: childError } = await admin
        .from("child_profiles")
        .select("id,family_id")
        .eq("id", childId)
        .in("family_id", memberships.map((m) => m.family_id))
        .maybeSingle();
      if (childError) throw childError;
      if (!child) return reply(404, { error: "child_not_found" });
      const teacher = memberships.find((m) => m.family_id === child.family_id);
      if (!teacher) return reply(403, { error: "teacher_family_required" });

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
        family_id: teacher.family_id,
        child_profile_id: childId,
        code_hash: codeHash,
        expires_at: expiresAt,
        created_by_member_id: teacher.id,
      });
      if (insertError) throw insertError;

      const { error: auditError } = await admin.from("audit_events").insert({
        family_id: teacher.family_id,
        actor_member_id: teacher.id,
        subject_child_id: childId,
        event_type: "device.pairing_code_created",
        event_data: { deviceLabel, expiresAt },
      });
      if (auditError) throw auditError;
      return reply(201, { code, expiresAt, childId });
    }

    if (body.action === "send_notice") {
      const childId = cleanText(body.childId, 64);
      const message = cleanText(body.message, 200);
      if (!/^[0-9a-f-]{36}$/i.test(childId) || !message) {
        return reply(400, { error: "invalid_request" });
      }

      const { data: memberships, error: membershipError } = await admin
        .from("family_members")
        .select("id,family_id")
        .eq("auth_user_id", user.id)
        .eq("role", "teacher")
        .eq("is_active", true);
      if (membershipError) throw membershipError;
      if (!memberships?.length) return reply(403, { error: "teacher_required" });

      const { data: child, error: childError } = await admin
        .from("child_profiles")
        .select("id,family_id")
        .eq("id", childId)
        .in("family_id", memberships.map((m) => m.family_id))
        .maybeSingle();
      if (childError) throw childError;
      if (!child) return reply(404, { error: "device_group_not_found" });

      const member = memberships.find((m) => m.family_id === child.family_id);
      if (!member) return reply(403, { error: "teacher_required" });

      const requestedDeviceIds = Array.isArray(body.deviceIds) ? body.deviceIds : null;
      if (requestedDeviceIds && (
        requestedDeviceIds.length < 1 ||
        requestedDeviceIds.length > 50 ||
        requestedDeviceIds.some((id) => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) ||
        new Set(requestedDeviceIds).size !== requestedDeviceIds.length
      )) return reply(400, { error: "invalid_device_selection" });

      let devicesQuery = admin
        .from("devices")
        .select("id")
        .eq("child_profile_id", childId)
        .eq("family_id", child.family_id)
        .eq("status", "active");
      if (requestedDeviceIds) devicesQuery = devicesQuery.in("id", requestedDeviceIds);
      const { data: devices, error: deviceError } = await devicesQuery.limit(50);
      if (deviceError) throw deviceError;
      if (!devices?.length) return reply(409, { error: "no_active_devices" });
      if (requestedDeviceIds && devices.length !== requestedDeviceIds.length) {
        return reply(403, { error: "device_selection_invalid" });
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error: commandError } = await admin.from("device_commands").insert(
        devices.map((device) => ({
          family_id: child.family_id,
          device_id: device.id,
          created_by_member_id: member.id,
          command_type: "show_notice",
          payload: { message },
          expires_at: expiresAt,
        })),
      );
      if (commandError) throw commandError;

      const { error: auditError } = await admin.from("audit_events").insert({
        family_id: child.family_id,
        actor_member_id: member.id,
        subject_child_id: childId,
        event_type: "device.notice_queued",
        event_data: { deviceCount: devices.length, targetedSelection: Boolean(requestedDeviceIds) },
      });
      if (auditError) throw auditError;

      return reply(201, { queued: devices.length, expiresAt });
    }

    if (body.action === "overview") {
      const { data: memberships, error: memberError } = await admin
        .from("family_members")
        .select("id,family_id,display_name,role")
        .eq("auth_user_id", user.id)
        .eq("role", "teacher")
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
          .select("id,nickname:display_name,created_at")
          .eq("family_id", family.id);
        if (childError) throw childError;

        const { data: activity, error: activityError } = await admin
          .from("audit_events")
          .select("id,event_type,created_at,details:event_data")
          .eq("family_id", family.id)
          .order("created_at", { ascending: false })
          .limit(25);
        if (activityError) throw activityError;

        const { data: commands, error: commandsError } = await admin
          .from("device_commands")
          .select("id,device_id,command_type,status,created_at,delivered_at,acknowledged_at")
          .eq("family_id", family.id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (commandsError) throw commandsError;

        const childIds = (children ?? []).map((child) => child.id);
        let devices: unknown[] = [];
        if (childIds.length) {
          const { data, error } = await admin
            .from("devices")
            .select("id,child_profile_id,device_label:device_name,platform,status,last_seen_at")
            .in("child_profile_id", childIds);
          if (error) throw error;
          devices = data ?? [];
        }

        families.push({
          ...family,
          currentTeacher: { id: membership.id, displayName: membership.display_name },
          activity: activity ?? [],
          commands: commands ?? [],
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
