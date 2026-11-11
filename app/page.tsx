"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
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
    if (session) void loadOverview();
    else setClassrooms([]);
  }, [session, loadOverview]);

  const deviceCount = useMemo(
    () => classrooms.reduce((sum, room) => sum + room.children.reduce((n, group) => n + group.devices.length, 0), 0),
    [classrooms],
  );

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
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

  async function createGroup(classroomId: string) {
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
          <p>התחברו עם חשבון מורה קיים. אין כאן הרשמה פתוחה או יצירת חשבון מנהל אוטומטית.</p>
          <form onSubmit={signIn} className="login-form">
            <label>כתובת אימייל<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
            <label>סיסמה<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
            <button className="button button-primary" disabled={busy}>{busy ? "מתחברים…" : "כניסה לחשבון המורה"}</button>
          </form>
          <p className="fine-print">יצירת חשבון ואישור הרשאת מורה יתבצעו בתהליך ההרשמה המאושר של בית הספר.</p>
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
              <div className="classroom-head"><div><span className="eyebrow">מרחב בית ספרי</span><h2>{room.name}</h2><small>מורה אחראי: {room.currentTeacher?.displayName ?? session.user.email}</small></div><button className="button button-secondary" disabled={busy} onClick={() => void createGroup(room.id)}>＋ הוספת קבוצה</button></div>
              {room.children.length === 0 ? <p className="empty-inline">עדיין לא נוצרו קבוצות במרחב הזה.</p> : room.children.map(group => (
                <article className="group-card" key={group.id}>
                  <div className="group-head"><div><h3>{group.nickname}</h3><span>{group.devices.length} מכשירים משויכים</span></div><button className="button button-primary" disabled={busy} onClick={() => void createPairing(group.id)}>יצירת קוד צימוד</button></div>
                  {pairings[group.id] && <div className="pairing"><div><small>קוד חד-פעמי · בתוקף עד {new Date(pairings[group.id].expiresAt).toLocaleTimeString("he-IL")}</small><strong>{pairings[group.id].code}</strong></div><button className="button button-quiet" onClick={() => void navigator.clipboard?.writeText(pairings[group.id].code)}>העתקה</button></div>}
                  <div className="devices">
                    {group.devices.length === 0 ? <p className="empty-inline">אין עדיין מכשירים משויכים. צרו קוד והזינו אותו באפליקציית Steve Control שעל הטאבלט.</p> : group.devices.map(device => (
                      <div className="device" key={device.id}><span className={`status-dot ${device.status === "active" ? "status-active" : ""}`} /><div><strong>{device.device_label || "טאבלט"}</strong><small>{device.status === "active" ? "רשום ומורשה" : "לא פעיל"} · {device.last_seen_at ? `נראה לאחרונה ${new Date(device.last_seen_at).toLocaleString("he-IL")}` : "טרם נרשם חיבור"}</small></div></div>
                    ))}
                  </div>
                  <div className="notice-form"><label>הודעה שתוצג בטאבלטים בקבוצה<textarea maxLength={200} value={noticeDrafts[group.id] ?? ""} onChange={e => setNoticeDrafts(current => ({ ...current, [group.id]: e.target.value }))} placeholder="לדוגמה: פתחו את סביבת הלמידה לשיעור" /></label><button className="button button-secondary" disabled={busy || !group.devices.some(d => d.status === "active")} onClick={() => void sendNotice(group.id)}>שליחת הודעה לכל המכשירים הפעילים</button></div>
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
