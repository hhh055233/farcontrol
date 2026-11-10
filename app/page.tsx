"use client";

import { useState } from "react";

type Device = { id: number; name: string; type: string; status: string; lastSeen: string; usage: string; color: string };

const initialDevices: Device[] = [
  { id: 1, name: "המכשיר של נועם", type: "Android", status: "מחובר", lastSeen: "פעיל עכשיו", usage: "2ש׳ 14ד׳", color: "blue" },
];

const initialActivities = [
  { icon: "⏱", title: "זמן מסך עודכן", detail: "המסגרת היומית נבדקה · היום, 09:42", tone: "blue" },
  { icon: "✓", title: "מכשיר צורף למשפחה", detail: "המכשיר של נועם · אתמול", tone: "green" },
  { icon: "◷", title: "לוח שעת שינה הופעל", detail: "כל יום · 21:00", tone: "violet" },
];

export default function Home() {
  const [devices, setDevices] = useState(initialDevices);
  const [bedtime, setBedtime] = useState(true);
  const [school, setSchool] = useState(false);
  const [showPair, setShowPair] = useState(false);
  const [pairCode, setPairCode] = useState("");
  const [toast, setToast] = useState("");
  const [requestStatus, setRequestStatus] = useState<"pending" | "approved" | "denied">("pending");

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  function createDemoCode() {
    setPairCode(String(Math.floor(100000 + Math.random() * 900000)));
  }

  function toggleDevice(id: number) {
    setDevices(current => current.map(d => d.id === id ? { ...d, status: d.status === "מחובר" ? "מושהה" : "מחובר" } : d));
    notify("הסטטוס השתנה בתצוגת ההדגמה בלבד");
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">S</div><div><strong>steve<span>family</span></strong><small>מרחב משפחתי בטוח</small></div></div>
        <div className="workspace"><span className="workspace-dot" /> משפחת ישראלי <span className="chevron">⌄</span></div>
        <div className="nav-label">תפריט ראשי</div>
        <nav>
          <a className="nav-item active" href="#overview"><span>▦</span> סקירה כללית</a>
          <a className="nav-item" href="#devices"><span>▣</span> המכשיר של נועם <b>1</b></a>
          <a className="nav-item" href="#schedules"><span>◷</span> לוחות זמנים</a>
          <a className="nav-item" href="#requests"><span>✓</span> בקשות ואישורים <b>1</b></a>
          <a className="nav-item" href="#parents"><span>♧</span> הורים והרשאות</a>
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><div className="help-icon">✦</div><strong>פרטיות לפני הכול</strong><p>כל הצטרפות ושיתוף מידע דורשים אישור גלוי.</p><a href="#security">עקרונות האבטחה ←</a></div><div className="profile"><div className="avatar">ה</div><div><strong>הורי המשפחה</strong><small>2 מנהלים שווים</small></div><span className="dots">•••</span></div></div>
      </aside>

      <section className="content" id="overview">
        <header className="topbar"><div className="crumb">משפחת ישראלי <span>/</span> <b>סקירה כללית</b></div><div className="top-actions"><span className="secure-pill"><i /> סביבת הדגמה</span><button className="icon-btn" aria-label="התראות">♧<em /></button><div className="top-avatar">ה</div></div></header>
        <div className="page-wrap">
          <section className="welcome-row"><div><div className="eyebrow">מרחב משפחתי · ילד אחד · שני הורים</div><h1>שלום למשפחת ישראלי.</h1><p className="subhead">כל המידע המשפחתי במקום אחד, עם הרשאות שוות לשני ההורים ושקיפות מול הילד.</p></div><button className="primary-btn" onClick={() => { setShowPair(true); setPairCode(""); }}>＋ צירוף מכשיר</button></section>

          <section className="stats-grid">
            <article className="stat-card"><div className="stat-top"><span>ילדים במרחב</span><span className="stat-icon blue-bg">♙</span></div><div className="stat-number">01 <small>ילד</small></div><div className="stat-foot">נועם · פרופיל משפחתי אחד</div></article>
            <article className="stat-card"><div className="stat-top"><span>זמן מסך היום</span><span className="stat-icon purple-bg">◷</span></div><div className="stat-number">2:14 <small>שעות</small></div><div className="stat-foot">נתון המחשה בלבד</div></article>
            <article className="stat-card"><div className="stat-top"><span>הורים מנהלים</span><span className="stat-icon mint-bg">♧</span></div><div className="stat-number">02 <small>שווים</small></div><div className="stat-foot">אותן הרשאות ניהול</div></article>
            <article className="stat-card"><div className="stat-top"><span>כללים לדוגמה</span><span className="stat-icon gold-bg">◇</span></div><div className="stat-number">02 <small>פעילים</small></div><div className="stat-foot">המתגים משנים תצוגה בלבד</div></article>
          </section>

          <section className="section-block" id="devices"><div className="section-heading"><div><h2>המכשיר של נועם</h2><p>מכשיר Android המשויך לפרופיל הילד</p></div><button className="text-btn" onClick={() => setShowPair(true)}>פרטי צירוף ←</button></div>
            <div className="device-grid"><article className="device-card"><div className="device-head"><div className="device-icon blue">◈</div><div className="device-title"><strong>Samsung Android</strong><small>נועם · נראה פעיל בהדגמה</small></div><button className="more-btn" aria-label="אפשרויות">•••</button></div><div className="device-data"><div><small>זמן מסך היום</small><strong>2ש׳ 14ד׳</strong></div><div><small>סטטוס תצוגה</small><strong className={devices[0].status === "מחובר" ? "connected" : "paused"}><i />{devices[0].status}</strong></div></div><div className="device-actions"><button className="outline-btn" onClick={() => toggleDevice(1)}>{devices[0].status === "מחובר" ? "השהיית תצוגה" : "סימון כמחובר"}</button><span className="device-note">לא משנה את המכשיר בפועל</span></div></article></div>
          </section>

          <section className="lower-grid">
            <div className="panel" id="schedules"><div className="section-heading compact"><div><h2>לוחות זמנים</h2><p>כללים משפחתיים לדוגמה</p></div><button className="plus-btn" onClick={() => notify("יצירת לוח זמנים תתווסף בגרסה הבאה")} aria-label="הוסף לוח זמנים">＋</button></div><div className="schedule-row"><div className="schedule-symbol bedtime">☾</div><div className="schedule-info"><strong>שעת שינה</strong><small>כל יום · 21:00–07:00</small></div><button className={`switch ${bedtime ? "on" : ""}`} onClick={() => { setBedtime(!bedtime); notify("המתג עודכן בהדגמה בלבד"); }} aria-label="הפעלת שעת שינה"><i /></button></div><div className="schedule-row"><div className="schedule-symbol school">▤</div><div className="schedule-info"><strong>שעות לימודים</strong><small>א׳–ה׳ · 08:00–13:30</small></div><button className={`switch ${school ? "on" : ""}`} onClick={() => { setSchool(!school); notify("המתג עודכן בהדגמה בלבד"); }} aria-label="הפעלת שעות לימודים"><i /></button></div><div className="schedule-foot">המתגים משנים את התצוגה בלבד. עדיין אין אכיפה במכשיר.</div></div>

            <div className="panel" id="requests"><div className="section-heading compact"><div><h2>בקשה מנועם</h2><p>תהליך אישור לדוגמה</p></div><span className="secure-pill">בקשת הדגמה</span></div><div className="activity-row"><div className="activity-icon blue">＋</div><div><strong>בקשת זמן נוסף</strong><small>נועם מבקש 30 דקות נוספות להיום</small></div></div>{requestStatus === "pending" ? <div style={{ display: "flex", gap: 8, marginTop: 18 }}><button className="primary-btn" style={{ flex: 1 }} onClick={() => { setRequestStatus("approved"); notify("הבקשה אושרה בתצוגת ההדגמה"); }}>אישור</button><button className="outline-btn" style={{ flex: 1 }} onClick={() => { setRequestStatus("denied"); notify("הבקשה נדחתה בתצוגת ההדגמה"); }}>דחייה</button></div> : <div className="schedule-foot" style={{ marginTop: 16 }}>סטטוס הבקשה: {requestStatus === "approved" ? "אושרה" : "נדחתה"} · ניתן לרענן כדי לאפס את ההדגמה</div>}</div>
          </section>

          <section className="panel" id="parents" style={{ marginTop: 20 }}><div className="section-heading compact"><div><h2>הורים והרשאות</h2><p>לשני ההורים אותן הרשאות ניהול</p></div><span className="secure-pill">2 מנהלים</span></div><div className="device-grid"><article className="device-card"><div className="device-head"><div className="top-avatar">א</div><div className="device-title"><strong>הורה א׳</strong><small>מנהל משפחה · הרשאות מלאות</small></div><span className="connected">פעיל</span></div></article><article className="device-card"><div className="device-head"><div className="top-avatar">ב</div><div className="device-title"><strong>הורה ב׳</strong><small>מנהל משפחה · הרשאות מלאות</small></div><span className="connected">פעיל</span></div></article></div><div className="schedule-foot">באבטיפוס שני החשבונות מוצגים כשווים. הזמנות והתחברות אמיתיות יתווספו לאחר חיבור מערכת משתמשים.</div></section>

          <section className="security-banner" id="security"><div className="security-symbol">⬡</div><div><strong>פרטיות ובטיחות לפני הכול</strong><p>אין מעקב נסתר. צירוף מכשיר ושיתוף מידע ידרשו אישור והרשאות ברורות.</p></div><a href="#security">עקרונות האבטחה ←</a></section>
          <footer>Steve Family <span>·</span> אבטיפוס למשפחה אחת · נתוני המחשה בלבד · ללא שליטה אמיתית במכשירים</footer>
        </div>
      </section>

      {showPair && <div className="modal-backdrop" onClick={() => setShowPair(false)}><div className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowPair(false)}>×</button><div className="modal-mark">＋</div><h2>צירוף מכשיר למשפחה</h2><p>בגרסה המלאה, מתקינים את אפליקציית הילד, מציגים את ההרשאות ומאשרים את החיבור מהמכשיר עצמו.</p>{pairCode ? <div className="pair-code"><small>קוד הדגמה בלבד — לא מחבר מכשיר</small><strong>{pairCode}</strong></div> : <div className="pair-steps"><div><b>1</b><span>התקנת אפליקציית Steve Family</span></div><div><b>2</b><span>אישור גלוי במכשיר הילד</span></div><div><b>3</b><span>בחירת הרשאות ושיתוף מידע</span></div></div>}<button className="primary-btn modal-action" onClick={createDemoCode}>{pairCode ? "יצירת קוד הדגמה חדש" : "הצגת קוד הדגמה"}</button><small className="modal-disclaimer">זהו קוד המחשה מקומי בלבד. צימוד מאובטח עדיין לא מחובר לשרת.</small></div></div>}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
