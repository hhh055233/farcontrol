"use client";

import { useState } from "react";

type Device = { id: number; name: string; type: string; status: string; lastSeen: string };
const initialDevices: Device[] = [
  { id: 1, name: "טאבלט כיתה 1", type: "Android", status: "מחובר", lastSeen: "פעיל עכשיו" },
  { id: 2, name: "טלפון תלמיד 2", type: "Android", status: "ממתין לאישור", lastSeen: "טרם התחבר" },
];

export default function Home() {
  const [devices, setDevices] = useState(initialDevices);
  const [showPair, setShowPair] = useState(false);
  const [pairCode, setPairCode] = useState("");
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState("הכול");

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }
  function createDemoCode() {
    setPairCode(String(Math.floor(100000 + Math.random() * 900000)));
  }
  function toggleDevice(id: number) {
    setDevices(current => current.map(d => d.id === id ? { ...d, status: d.status === "מחובר" ? "מושהה בתצוגה" : "מחובר" } : d));
    notify("השינוי הוא בהדגמה בלבד — לא נשלחה פקודה למכשיר");
  }
  const visibleDevices = filter === "הכול" ? devices : devices.filter(d => d.status === filter);

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">S</div><div><strong>steve<span>control</span></strong><small>ניהול מכשירי בית הספר</small></div></div>
        <div className="workspace"><span className="workspace-dot" /> מרחב בית הספר <span className="chevron">⌄</span></div>
        <div className="nav-label">ניהול מורה</div>
        <nav>
          <a className="nav-item active" href="#overview"><span>▦</span> סקירה כללית</a>
          <a className="nav-item" href="#devices"><span>▣</span> מכשירים מנוהלים <b>{devices.length}</b></a>
          <a className="nav-item" href="#policies"><span>◷</span> כללי שימוש</a>
          <a className="nav-item" href="#requests"><span>✓</span> בקשות ואישורים <b>1</b></a>
          <a className="nav-item" href="#security"><span>⬡</span> אבטחה והרשאות</a>
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><div className="help-icon">✦</div><strong>שקיפות והרשאה</strong><p>כל מכשיר מצטרף באישור גלוי ובהרשאות שמוצגות למשתמש.</p><a href="#security">עקרונות האבטחה ←</a></div><div className="profile"><div className="avatar">מ</div><div><strong>חשבון מורה</strong><small>מנהל יחיד של המרחב</small></div><span className="dots">•••</span></div></div>
      </aside>

      <section className="content" id="overview">
        <header className="topbar"><div className="crumb">בית הספר <span>/</span> <b>סקירה כללית</b></div><div className="top-actions"><span className="secure-pill"><i /> סביבת הדגמה</span><button className="icon-btn" aria-label="התראות">♧<em /></button><div className="top-avatar">מ</div></div></header>
        <div className="page-wrap">
          <section className="welcome-row"><div><div className="eyebrow">מרחב מורה · ניהול מכשירי תלמידים</div><h1>שלום, המורה.</h1><p className="subhead">ניהול מרוכז של מכשירי הכיתה, עם הרשאות ברורות ותיעוד פעולות.</p></div><button className="primary-btn" onClick={() => { setShowPair(true); setPairCode(""); }}>＋ צירוף מכשיר</button></section>

          <section className="stats-grid">
            <article className="stat-card"><div className="stat-top"><span>מכשירים רשומים</span><span className="stat-icon blue-bg">▣</span></div><div className="stat-number">{String(devices.length).padStart(2,"0")} <small>מכשירים</small></div><div className="stat-foot">במרחב הכיתה</div></article>
            <article className="stat-card"><div className="stat-top"><span>מחוברים כעת</span><span className="stat-icon mint-bg">●</span></div><div className="stat-number">{String(devices.filter(d => d.status === "מחובר").length).padStart(2,"0")} <small>פעילים</small></div><div className="stat-foot">לפי נתוני ההדגמה</div></article>
            <article className="stat-card"><div className="stat-top"><span>ממתינים לאישור</span><span className="stat-icon gold-bg">◷</span></div><div className="stat-number">{String(devices.filter(d => d.status === "ממתין לאישור").length).padStart(2,"0")} <small>בקשות</small></div><div className="stat-foot">נדרש אישור במכשיר עצמו</div></article>
            <article className="stat-card"><div className="stat-top"><span>כללי שימוש</span><span className="stat-icon purple-bg">◇</span></div><div className="stat-number">02 <small>טיוטות</small></div><div className="stat-foot">לא נאכפים במכשירים</div></article>
          </section>

          <section className="section-block" id="devices"><div className="section-heading"><div><h2>מכשירים מנוהלים</h2><p>טלפונים וטאבלטים שנרשמו למרחב המורה</p></div><button className="text-btn" onClick={() => setShowPair(true)}>צירוף מכשיר ←</button></div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>{["הכול","מחובר","ממתין לאישור","מושהה בתצוגה"].map(v=><button key={v} className="outline-btn" onClick={()=>setFilter(v)} style={filter===v?{borderColor:"#6475ec",color:"#5368e8",background:"#f3f5ff"}:{}}>{v}</button>)}</div>
            <div className="device-grid">{visibleDevices.map(device=><article className="device-card" key={device.id}><div className="device-head"><div className="device-icon blue">◈</div><div className="device-title"><strong>{device.name}</strong><small>{device.type} · {device.lastSeen}</small></div><button className="more-btn" aria-label="אפשרויות">•••</button></div><div className="device-data"><div><small>סוג מכשיר</small><strong>{device.type}</strong></div><div><small>סטטוס</small><strong className={device.status === "מחובר" ? "connected" : "paused"}><i />{device.status}</strong></div></div><div className="device-actions"><button className="outline-btn" onClick={() => toggleDevice(device.id)}>שינוי סטטוס בהדגמה</button><span className="device-note">ללא שליטה בפועל</span></div></article>)}</div>
          </section>

          <section className="lower-grid">
            <div className="panel" id="policies"><div className="section-heading compact"><div><h2>כללי שימוש</h2><p>הגדרות מוצעות לכיתה</p></div><button className="plus-btn" onClick={() => notify("עורך כללים יתווסף לאחר חיבור השרת")} aria-label="הוסף כלל">＋</button></div><div className="schedule-row"><div className="schedule-symbol bedtime">◷</div><div className="schedule-info"><strong>שעות לימודים</strong><small>א׳–ה׳ · 08:00–13:30</small></div><span className="secure-pill">טיוטה</span></div><div className="schedule-row"><div className="schedule-symbol school">▤</div><div className="schedule-info"><strong>שימוש באפליקציות לימוד</strong><small>רשימת אפליקציות מאושרות</small></div><span className="secure-pill">טיוטה</span></div><div className="schedule-foot">הכללים מוצגים לתכנון בלבד. אין אכיפה או חסימה במכשירים בשלב זה.</div></div>

            <div className="panel" id="requests"><div className="section-heading compact"><div><h2>בקשת הצטרפות</h2><p>תהליך אישור לדוגמה</p></div><span className="secure-pill">הדגמה</span></div><div className="activity-row"><div className="activity-icon blue">＋</div><div><strong>טאבלט חדש מבקש להצטרף</strong><small>האישור הסופי מתבצע במכשיר עצמו</small></div></div><div className="schedule-foot" style={{marginTop:16}}>אישור מורה אינו מחליף את הסכמת המשתמש והרשאות Android.</div></div>
          </section>

          <section className="panel" style={{marginTop:20}}><div className="section-heading compact"><div><h2>מנהל המרחב</h2><p>חשבון יחיד בעל הרשאות ניהול</p></div><span className="secure-pill">מורה · מנהל</span></div><div className="device-head"><div className="top-avatar">מ</div><div className="device-title"><strong>חשבון המורה</strong><small>ניהול מכשירים, כללים, צירוף וביטול הרשאות</small></div><span className="connected">פעיל</span></div><div className="schedule-foot">בגרסה זו אין תפקידי הורה או מנהלים נוספים. הרשאות מכשיר ניתנות בנפרד ובאופן גלוי.</div></section>

          <section className="security-banner" id="security"><div className="security-symbol">⬡</div><div><strong>אבטחה ושקיפות לפני הכול</strong><p>אין מעקב נסתר. כל מכשיר מציג למשתמש את תהליך ההצטרפות, המידע המשותף וההרשאות המבוקשות.</p></div><a href="#security">עקרונות האבטחה ←</a></section>
          <footer>Steve Control <span>·</span> אבטיפוס לניהול מכשירי בית ספר · נתוני המחשה בלבד · ללא שליטה אמיתית במכשירים</footer>
        </div>
      </section>

      {showPair && <div className="modal-backdrop" onClick={() => setShowPair(false)}><div className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowPair(false)}>×</button><div className="modal-mark">＋</div><h2>צירוף מכשיר למרחב המורה</h2><p>בגרסה המלאה, המורה יפיק הזמנה. במכשיר התלמיד יוצגו פרטי בית הספר, ההרשאות והמידע שישותף, והמשתמש יאשר במפורש.</p>{pairCode ? <div className="pair-code"><small>קוד הדגמה בלבד — אינו מחבר מכשיר</small><strong>{pairCode}</strong></div> : <div className="pair-steps"><div><b>1</b><span>התקנת Steve Control במכשיר</span></div><div><b>2</b><span>הצגת ההרשאות והמידע שישותף</span></div><div><b>3</b><span>אישור גלוי במכשיר עצמו</span></div></div>}<button className="primary-btn modal-action" onClick={createDemoCode}>{pairCode ? "יצירת קוד הדגמה חדש" : "הצגת קוד הדגמה"}</button><small className="modal-disclaimer">קוד מקומי להמחשה בלבד. צימוד מאובטח עדיין לא מחובר לשרת.</small></div></div>}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
