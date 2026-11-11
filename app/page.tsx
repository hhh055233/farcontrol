"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient, type Session } from "@supabase/supabase-js";

type Device = {
  id: string;
  device_label: string;
  platform: string;
  status: string;
  last_seen_at: string | null;
};
type Group = { id: string; nickname: string; devices: Device[] };
type Classroom = {
  id: string;
  name: string;
  status: string;
  currentTeacher?: { displayName: string };
  children: Group[];
};
type Pairing = { code: string; expiresAt: string };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://gjopwszrjdcxhtflhbkj.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_tr5FzKUMed8SPLkClIfUiA_dG8PIOUD";
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [joinStatus, setJoinStatus] = useState("");
  const [joinRequests, setJoinRequests] = useState<Array<{id:string;email:string;display_name:string|null;status:string;requested_at:string;admin_note?:string|null}>>([]);
  const [noticeDrafts, setNoticeDrafts] = useState<Record<string, string>>({});
  const [pairings, setPairings] = useState<Record<string, Pairing>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const callApi = useCallback(async (body: Record<string, unknown>) => {
    if (!supabase) throw new Error("החיבור לשרת עדיין לא הוגדר.");
    const { data, error: invokeError } = await supabase.functions.invoke("family-api", { body });
    if (invokeError) throw new Error("לא הצלחנו להשלים את הבקשה. בדקו את החיבור ונסו שוב.");
    if (data?.error) {
      const messages: Record<string, string> = {
        teacher_family_required: "לחשבון הזה אין הרשאת מורה פעילה.",
        teacher_required: "רק מורה מורשה יכול לבצע את הפעולה.",
        no_active_devices: "עדיין לא צורפו מכשירים פעילים לקבוצה.",
        active_pairing_code_exists: "כבר קיים קוד צימוד פעיל לקבוצה.",
      };
      throw new Error(messages[data.error] ?? "השרת דחה את הבקשה.");
    }
    return data;
  }, []);

  const loadOverview = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");
    try {
      const data = await callApi({ action: "overview" });
      setClassrooms(Array.isArray(data?.families) ? data.families : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "טעינת הנתונים נכשלה.");
    } finally {
      setLoading(false);
    }
  }, [callApi]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data: auth } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });
    return () => {
      active = false;
      auth.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) void refreshAccess(session);
    else {
      setClassrooms([]);
      setIsAdmin(false);
      setJoinStatus("");
      setJoinRequests([]);
    }
  }, [session]);

  const deviceCount = useMemo(
    () => classrooms.reduce((sum, room) => sum + room.children.reduce((n, group) => n + group.devices.length, 0), 0),
    [classrooms],
  );

  async function signInWithGoogle() {
    if (!supabase) return setError("החיבור לשרת עדיין לא הוגדר.");
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin, queryParams: { prompt: "select_account" } },
      });
      if (authError) throw authError;
    } catch (e) {
      setError(e instanceof Error ? e.message : "התחברות Google נכשלה.");
      setBusy(false);
    }
  }

  async function refreshAccess(currentSession: Session) {
    if (!supabase) return;
    const providers = currentSession.user.app_metadata?.providers;
    const isGoogle = currentSession.user.app_metadata?.provider === "google" ||
      (Array.isArray(providers) && providers.includes("google"));
    if (!isGoogle) {
      setIsAdmin(false);
      setJoinStatus("");
      await loadOverview();
      return;
    }
    setLoading(true); setError("");
    try {
      const { data: adminData, error: adminError } = await supabase.functions.invoke("teacher-access-api", {
        body: { action: "list_requests" },
      });
      if (!adminError && Array.isArray(adminData?.requests)) {
        setIsAdmin(true);
        setJoinStatus("");
        setJoinRequests(adminData.requests);
        setClassrooms([]);
        return;
      }
      const { data: requestData, error: requestError } = await supabase.functions.invoke("teacher-access-api", {
        body: { action: "submit_request", displayName: String(currentSession.user.user_metadata?.full_name ?? "") },
      });
      if (requestError || requestData?.error) throw new Error("לא הצלחנו לשלוח בקשת הצטרפות. ודאו שהתחברתם דרך Google ונסו שוב.");
      const status = String(requestData?.request?.status ?? "pending");
      setIsAdmin(false);
      setJoinStatus(status);
      setClassrooms([]);
      if (status === "approved") await loadOverview();
    } catch (e) {
      setJoinStatus("error");
      setError(e instanceof Error ? e.message : "בדיקת ההרשאה נכשלה.");
    } finally {
      setLoading(false);
    }
  }

  async function reviewTeacherRequest(requestId: string, status: "approved" | "rejected" | "revoked") {
    if (!supabase) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("teacher-access-api", {
        body: { action: "review_request", requestId, status },
      });
      if (invokeError || data?.error) throw new Error("לא ניתן לעדכן את בקשת המורה.");
      const { data: refreshed, error: refreshError } = await supabase.functions.invoke("teacher-access-api", {
        body: { action: "list_requests" },
      });
      if (refreshError || refreshed?.error) throw new Error("העדכון בוצע, אך רענון הרשימה נכשל.");
      setJoinRequests(Array.isArray(refreshed?.requests) ? refreshed.requests : []);
      setMessage(status === "approved" ? "המורה אושר/ה בהצלחה." : status === "rejected" ? "הבקשה נדחתה." : "הרשאת המורה בוטלה.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "עדכון ההרשאה נכשל.");
    } finally { setBusy(false); }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return setError("החיבור לשרת עדיין לא הוגדר.");
    setBusy(true); setError(""); setMessage("");
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError || !data.session) throw new Error("פרטי ההתחברות לא אומתו. בדקו אימייל וסיסמה.");
      setSession(data.session);
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ההתחברות נכשלה.");
    } finally {
      setBusy(false);
    }
  }

  async function createGroup() {
    const name = window.prompt("שם הקבוצה או הכיתה:");
    if (!name?.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await callApi({ action: "create_child", nickname: name.trim() });
      setMessage("הקבוצה נוצרה.");
      await loadOverview();
    } catch (e) {
      setError(e instanceof Error ? e.message : "יצירת הקבוצה נכשלה.");
    } finally { setBusy(false); }
  }

  async function createPairing(groupId: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await callApi({ action: "create_pairing_code", childId: groupId, deviceLabel: "טאבלט בית ספר" });
      setPairings(current => ({ ...current, [groupId]: { code: data.code, expiresAt: data.expiresAt } }));
      setMessage("נוצר קוד צימוד חד-פעמי. הוא תקף לעשר דקות.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "יצירת קוד הצימוד נכשלה.");
    } finally { setBusy(false); }
  }

  async function sendNotice(groupId: string) {
    const text = (noticeDrafts[groupId] ?? "").trim();
    if (!text) return setError("כתבו הודעה קצרה לפני השליחה.");
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await callApi({ action: "send_notice", childId: groupId, message: text });
      setNoticeDrafts(current => ({ ...current, [groupId]: "" }));
      setMessage(`ההודעה נכנסה לתור עבור ${data.queued} מכשירים. היא תוצג כשהאפליקציה במכשיר פעילה ומקבלת פקודות.`);
      await loadOverview();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שליחת ההודעה נכשלה.");
    } finally { setBusy(false); }
  }

  async function revokeDevice(deviceId: string) {
    if (!window.confirm("לבטל את צימוד המכשיר? הוא לא יוכל לקבל עוד הודעות מהמורה.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await callApi({ action: "revoke_device", deviceId });
      setMessage("צימוד המכשיר בוטל והגישה שלו לשרת נחסמה.");
      await loadOverview();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ביטול הצימוד נכשל.");
    } finally { setBusy(false); }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null); setClassrooms([]); setPairings({}); setMessage("התנתקתם בהצלחה.");
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">S</span><div><strong>Steve Control</strong><small>ניהול מכשירי בית הספר</small></div></div>
        {session && <div className="account"><span>{session.user.email}</span><button className="button button-quiet" onClick={signOut}>התנתקות</button></div>}
      </header>

      {!supabase ? (
        <section className="auth-card"><h1>הגדרת השרת נדרשת</h1><p>חסרים משתני החיבור הציבוריים של Supabase בשרת Render. לא הוצגו נתוני הדגמה.</p></section>
      ) : !session ? (
        <section className="auth-card">
          <div className="eyebrow">כניסה מאובטחת למורה</div>
          <h1>שלום, ברוכים הבאים לסטיב קונטרול</h1>
          <p>מורים מתחברים עם חשבון Google. לאחר ההתחברות נשלחת בקשת הצטרפות שממתינה לאישור המנהל.</p>
          <button type="button" className="button button-primary" disabled={busy} onClick={() => void signInWithGoogle()}>{busy ? "מתחברים…" : "המשך עם Google"}</button>
          <p className="fine-print">התחברות Google תופעל לאחר הגדרת פרטי OAuth בפרויקט Supabase.</p>
          <details>
            <summary>כניסה לחשבונות קיימים</summary>
          <form onSubmit={signIn} className="login-form">
            <label>כתובת אימייל<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
            <label>סיסמה<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
            <button className="button button-primary" disabled={busy}>{busy ? "מתחברים…" : "כניסה לחשבון המורה"}</button>
          </form>
          <p className="fine-print">חשבונות קיימים שאושרו מראש יכולים להמשיך להשתמש בכניסה הישנה.</p>
          </details>
        </section>
      ) : isAdmin ? (
        <div className="dashboard">
          <section className="welcome"><div><div className="eyebrow">ניהול הרשאות</div><h1>בקשות הצטרפות למורים</h1><p>רק חשבון המנהל המוגדר יכול לאשר או לבטל הרשאות.</p></div><button className="button button-secondary" onClick={() => void refreshAccess(session)} disabled={loading}>רענון</button></section>
          <section className="classroom">
            {joinRequests.length === 0 ? <div className="empty"><h2>אין בקשות עדיין</h2><p>בקשות חדשות ממורים יופיעו כאן לאחר התחברות Google.</p></div> : joinRequests.map(request => (
              <article className="group-card" key={request.id}>
                <div className="group-head"><div><h3>{request.display_name || "מורה ללא שם"}</h3><span>{request.email}</span><small>נשלחה: {new Date(request.requested_at).toLocaleString("he-IL")}</small></div><strong>{request.status === "pending" ? "ממתין לאישור" : request.status === "approved" ? "מאושר" : request.status === "rejected" ? "נדחה" : "בוטל"}</strong></div>
                <div className="actions">
                  {request.status !== "approved" && <button className="button button-primary" disabled={busy} onClick={() => void reviewTeacherRequest(request.id, "approved")}>אישור מורה</button>}
                  {request.status === "pending" && <button className="button button-secondary" disabled={busy} onClick={() => void reviewTeacherRequest(request.id, "rejected")}>דחיית בקשה</button>}
                  {request.status === "approved" && <button className="button button-secondary" disabled={busy} onClick={() => void reviewTeacherRequest(request.id, "revoked")}>ביטול הרשאה</button>}
                </div>
              </article>
            ))}
          </section>
          <section className="limits"><strong>הגנת מנהל</strong><p>האישור מתבצע בשרת בלבד. התחברות Google לבדה אינה מעניקה הרשאת מורה; רק חשבון המנהל יכול לשנות את מצב הבקשה.</p></section>
        </div>
      ) : joinStatus && joinStatus !== "approved" ? (
        <section className="auth-card">
          <div className="eyebrow">בקשת הצטרפות</div>
          <h1>{joinStatus === "pending" ? "הבקשה ממתינה לאישור" : joinStatus === "rejected" ? "הבקשה נדחתה" : "לא ניתן לבדוק את ההרשאה"}</h1>
          <p>{joinStatus === "pending" ? "חשבון Google זוהה והבקשה נשלחה למנהל Steve Control. עד לאישור לא תהיה גישה לניהול מכשירים." : "פנו למנהל בית הספר לבירור ההרשאה."}</p>
        </section>
      ) : (
        <div className="dashboard">
          <section className="welcome">
            <div><div className="eyebrow">מרחב המורה</div><h1>לוח הבקרה של המורה</h1><p>ניהול קבוצות ומכשירים שאושרו ושויכו לחשבון המורה.</p></div>
            <button className="button button-secondary" onClick={() => void loadOverview()} disabled={loading}>{loading ? "מרעננים…" : "רענון נתונים"}</button>
          </section>

          <section className="stats">
            <article><span>כיתות / מרחבים</span><strong>{classrooms.length}</strong></article>
            <article><span>קבוצות תלמידים</span><strong>{classrooms.reduce((n, room) => n + room.children.length, 0)}</strong></article>
            <article><span>מכשירים משויכים</span><strong>{deviceCount}</strong></article>
          </section>

          {classrooms.length === 0 && !loading ? (
            <section className="empty"><h2>לא נמצאה הרשאת מורה פעילה</h2><p>החשבון מחובר, אך עדיין אין לו מרחב מורה מאושר. אין אפשרות לשלוט במכשירים מחשבון ללא הרשאה.</p></section>
          ) : classrooms.map(room => (
            <section className="classroom" key={room.id}>
              <div className="classroom-head"><div><span className="eyebrow">מרחב בית ספרי</span><h2>{room.name}</h2><small>מורה אחראי: {room.currentTeacher?.displayName ?? session.user.email}</small></div><button className="button button-secondary" disabled={busy} onClick={() => void createGroup()}>＋ הוספת קבוצה</button></div>
              {room.children.length === 0 ? <p className="empty-inline">עדיין לא נוצרו קבוצות במרחב הזה.</p> : room.children.map(group => (
                <article className="group-card" key={group.id}>
                  <div className="group-head"><div><h3>{group.nickname}</h3><span>{group.devices.length} מכשירים משויכים</span></div><button className="button button-primary" disabled={busy} onClick={() => void createPairing(group.id)}>יצירת קוד צימוד</button></div>
                  {pairings[group.id] && <div className="pairing"><div><small>קוד חד-פעמי · בתוקף עד {new Date(pairings[group.id].expiresAt).toLocaleTimeString("he-IL")}</small><strong>{pairings[group.id].code}</strong></div><button className="button button-quiet" onClick={() => void navigator.clipboard?.writeText(pairings[group.id].code)}>העתקה</button></div>}
                  <div className="devices">
                    {group.devices.length === 0 ? <p className="empty-inline">אין עדיין מכשירים משויכים. צרו קוד והזינו אותו באפליקציית Steve Control שעל הטאבלט.</p> : group.devices.map(device => (
                      <div className="device" key={device.id}><span className={`status-dot ${device.status === "active" ? "status-active" : ""}`} /><div><strong>{device.device_label || "מכשיר"}</strong><small>{device.status === "active" ? "רשום ומורשה" : device.status === "revoked" ? "הצימוד בוטל" : "לא פעיל"} · {device.last_seen_at ? `נראה לאחרונה ${new Date(device.last_seen_at).toLocaleString("he-IL")}` : "טרם נרשם חיבור"}</small></div>{device.status === "active" && <button className="button button-quiet" disabled={busy} onClick={() => void revokeDevice(device.id)}>ביטול צימוד</button>}</div>
                    ))}
                  </div>
                  <div className="notice-form"><label>הודעה שתוצג בטאבלטים בקבוצה<textarea maxLength={200} value={noticeDrafts[group.id] ?? ""} onChange={e => setNoticeDrafts(current => ({ ...current, [group.id]: e.target.value }))} placeholder="הודעה קצרה מהמורה" /></label><button className="button button-secondary" disabled={busy || !group.devices.some(d => d.status === "active")} onClick={() => void sendNotice(group.id)}>שליחת הודעה לכל המכשירים הפעילים</button></div>
                </article>
              ))}
            </section>
          ))}

          <section className="limits"><strong>מה זמין כרגע</strong><p>צימוד מאושר, הצגת סטטוס אחרון ושליחת הודעות גלויות. קבלת פקודות תלויה בכך שאפליקציית המכשיר פועלת. צפייה במסך, נעילת מכשיר, הפעלת אפליקציות וניהול Android Enterprise עדיין אינם זמינים בממשק הזה.</p></section>
        </div>
      )}

      {(message || error) && <div className={`toast ${error ? "toast-error" : ""}`} role="status">{error || message}<button onClick={() => { setError(""); setMessage(""); }}>×</button></div>}
      <footer className="footer">Steve Control · ניהול שקוף ומאושר של מכשירי בית הספר</footer>
    </main>
  );
}
