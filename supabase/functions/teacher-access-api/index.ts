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
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply(503, { error: "service_unavailable" });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user || !user.email_confirmed_at) return reply(401, { error: "verified_google_account_required" });
  const providers = Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : (user.identities ?? []).map((identity) => identity.provider);
  if (!providers.includes("google")) return reply(403, { error: "google_sign_in_required" });
  let rawBody = "";
  try { rawBody = await req.text(); } catch { return reply(400, { error: "invalid_request" }); }
  if (new TextEncoder().encode(rawBody).byteLength > 4096) return reply(413, { error: "payload_too_large" });
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return reply(400, { error: "invalid_request" });
    body = parsed as Record<string, unknown>;
  } catch { return reply(400, { error: "invalid_json" }); }
  const action = typeof body.action === "string" ? body.action : "";
  const email = (user.email ?? "").trim().toLowerCase();
  if (!email) return reply(403, { error: "email_required" });
  if (action === "submit_request") {
    if (Object.keys(body).some((key) => !["action","displayName"].includes(key))) return reply(400, { error: "unexpected_field" });
    const displayName = typeof body.displayName === "string" ? body.displayName.trim().slice(0,120) : "";
    const { data, error } = await admin.rpc("steve_submit_teacher_request", { p_auth_user_id:user.id,p_email:email,p_display_name:displayName||null });
    if (error) { console.error("teacher request submission failed",error.message); return reply(503,{error:"request_unavailable"}); }
    return reply(200,{request:data});
  }
  const { data: isAdmin, error: adminCheckError } = await admin.rpc("steve_is_teacher_admin",{p_email:email});
  if (adminCheckError) { console.error("admin check failed",adminCheckError.message); return reply(503,{error:"authorization_unavailable"}); }
  if (isAdmin !== true) return reply(403,{error:"admin_required"});
  if (action === "list_requests") {
    if (Object.keys(body).length !== 1) return reply(400,{error:"unexpected_field"});
    const { data,error } = await admin.rpc("steve_admin_list_teacher_requests");
    if (error) { console.error("admin list failed",error.message); return reply(503,{error:"requests_unavailable"}); }
    return reply(200,{requests:Array.isArray(data)?data:[]});
  }
  if (action === "review_request") {
    if (Object.keys(body).some((key)=>!["action","requestId","status","note"].includes(key))) return reply(400,{error:"unexpected_field"});
    const requestId = typeof body.requestId==="string"?body.requestId:"";
    const status = typeof body.status==="string"?body.status:"";
    const note = typeof body.note==="string"?body.note.trim().slice(0,500):"";
    if (!/^[0-9a-f-]{36}$/i.test(requestId)||!["approved","rejected","revoked"].includes(status)) return reply(400,{error:"invalid_request"});
    const {data,error}=await admin.rpc("steve_admin_review_teacher_request",{p_request_id:requestId,p_status:status,p_admin_user_id:user.id,p_admin_note:note||null});
    if(error){if(error.code==="P0002")return reply(404,{error:"request_not_found"});console.error("admin review failed",error.message);return reply(503,{error:"review_unavailable"});}
    return reply(200,{result:data});
  }
  return reply(400,{error:"unknown_action"});
});
