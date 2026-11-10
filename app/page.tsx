"use client";

import { useState } from "react";

type Device = { id: number; name: string; type: string; status: string; lastSeen: string; usage: string; color: string };

const initialDevices: Device[] = [
  { id: 1, name: "המכשיר של נועם", type: "Android", status: "מחובר", lastSeen: "פעיל עכשיו", usage: "2ש׳ 14ד׳", color: "blue" },
  { id: 2, name: "האייפון המשפחתי", type: "iPhone", status: "לא מחובר", lastSeen: "נראה לאחרונה לפני 18 דק׳", usage: "1ש׳ 42ד׳", color: "violet" },
];

const activities = [
  { icon: "⏱", title: "זמן מסך עודכן", detail: "הוגדרה מסגרת יומית חדשה · היום, 09:42", tone: "blue" },
  { icon: "✓", title: "מכשיר אושר", detail: "המכשיר של נועם אושר על ידי ההורה · אתמול", tone: "green" },
  { icon: "◷", title: "לוח זמנים הופעל", detail: "מצב שעת שינה · אתמול, 21:00", tone: "violet" },
];

export default function Home() {
  const [devices, setDevices] = useState(initialDevices);
  const [bedtime, setBedtime] = useState(true);
  const [school, setSchool] = useState(false);
  const [showPair, setShowPair] = useState(false);
  const [pairCode, setPairCode] = useState("");
  const [toast, setToast] = useState("");

  function createDemoCode() {
    setPairCode(String(Math.floor(100000 + Math.random() * 900000)));
  }
  function toggleDevice(id: number) {
    setDevices(current => current.map(d => d.id === id ? { ...d, status: d.status === "מחובר" ? "מושהה" : "מחובר" } : d));
    setToast("עודכן בתצוגת ההדגמה בלבד");
    window.setTimeout(() => setToast(""), 2600);
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">S</div><div><strong>steve<span>family</span></strong><small>מרחב משפחתי בטוח</small></div></div>
        <div className="workspace"><span className="workspace-dot" /> המרחב המשפחתי שלי <span className="chevron">⌄</span></div>
        <div className="nav-label">תפריט ראשי</div>
        <nav>
          <a className="nav-item active" href="#overview"><span>▦</span> סקירה כללית</a>
          <a className="nav-item" href="#devices"><span>▣</span> המכשירים שלי <b>2</b></a>
          <a className="nav-item" href="#schedules"><span>◷</span> לוחות זמנים</a>
          <a className="nav-item" href="#activity"><span>↗</span> היסטוריית פעילות</a>
          <a className="nav-item" href="#security"><span>⬡</span> אבטחה והרשאות</a>
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><div className="help-icon">✦</div><strong>צריכים עזרה?</strong><p>מדריכים וטיפים להגדרה בטוחה של המכשירים.</p><a href="#security">מרכז העזרה ←</a></div><div className="profile"><div className="avatar">ה</div><div><strong>מנהל המשפחה</strong><small>חשבון הורה</small></div><span className="dots">•••</span></div></div>
      </aside>

      <section className="content" id="overview">
        <header className="topbar"><div className="crumb">המרחב המשפחתי <span>/</span> <b>סקירה כללית</b></div><div className="top-actions"><span className="secure-pill"><i /> החיבור מאובטח</span><button className="icon-btn" aria-label="התראות">♧<em /></button><div className="top-avatar">ה</div></div></header>
        <div className="page-wrap">
          <section className="welcome-row"><div><div className="eyebrow">יום שלישי · מרחב המשפחה שלך</div><h1>הכול בשליטה. <span>בצורה בטוחה.</span></h1><p className="subhead">שלום! הנה תמונת המצב של המכשירים וההרגלים הדיגיטליים בבית.</p></div><button className="primary-btn" onClick={() => { setShowPair(true); setPairCode(""); }}>＋ הוספת מכשיר</button></section>

          <section className="stats-grid">
            <article className="stat-card"><div className="stat-top"><span>מכשירים במרחב</span><span className="stat-icon blue-bg">▣</span></div><div className="stat-number">02 <small>מכשירים</small></div><div className="stat-foot"><span className="tiny-dot green-dot" /> 1 מחובר כרגע</div></article>
            <article className="stat-card"><div className="stat-top"><span>זמן מסך היום</span><span className="stat-icon purple-bg">◷</span></div><div className="stat-number">3:56 <small>שעות</small></div><div className="stat-foot">בשני המכשירים יחד · נתוני הדגמה</div></article>
            <article className="stat-card"><div className="stat-top"><span>כללים פעילים</span><span className="stat-icon mint-bg">◇</span></div><div className="stat-number">04 <small>כללים</small></div><div className="stat-foot">לוחות זמנים והרגלים</div></article>
            <article className="stat-card"><div className="stat-top"><span>מצב אבטחה</span><span className="stat-icon gold-bg">⬡</span></div><div className="stat-number status-good">תקין</div><div className="stat-foot"><span className="tiny-dot green-dot" /> אין התראות אבטחה בהדגמה</div></article>
          </section>

          <section className="section-block" id="devices"><div className="section-heading"><div><h2>המכשירים שלי</h2><p>ניהול המכשירים המשויכים למרחב המשפחתי</p></div><button className="text-btn" onClick={() => setShowPair(true)}>ניהול מכשירים ←</button></div>
            <div className="device-grid">{devices.map(device => <article className="device-card" key={device.id}><div className="device-head"><div className={`device-icon ${device.color}`}>{device.type === "Android" ? "◈" : "▯"}</div><div className="device-title"><strong>{device.name}</strong><small>{device.type} · {device.lastSeen}</small></div><button className="more-btn" aria-label="אפשרויות">•••</button></div><div className="device-data"><div><small>זמן מסך היום</small><strong>{device.usage}</strong></div><div><small>סטטוס</small><strong className={device.status === "מחובר" ? "connected" : "paused"}><i />{device.status}</strong></div></div><div className="device-actions"><button className="outline-btn" onClick={() => toggleDevice(device.id)}>{device.status === "מחובר" ? "השהיה (הדגמה)" : "סימון כמחובר"}</button><span className="device-note">פעולות הדגמה בלבד</span></div></article>)}</div>
          </section>

          <section className="lower-grid"><div className="panel" id="schedules"><div className="section-heading compact"><div><h2>לוחות זמנים</h2><p>כללים והרגלים משפחתיים</p></div><button className="plus-btn" aria-label="הוסף לוח זמנים">＋</button></div><div className="schedule-row"><div className="schedule-symbol bedtime">☾</div><div className="schedule-info"><strong>שעת שינה</strong><small>כל יום · 21:00–07:00</small></div><button className={`switch ${bedtime ? "on" : ""}`} onClick={() => setBedtime(!bedtime)} aria-label="הפעלת שעת שינה"><i /></button></div><div className="schedule-row"><div className="schedule-symbol school">▤</div><div className="schedule-info"><strong>שעות לימודים</strong><small>א׳–ה׳ · 08:00–13:30</small></div><button className={`switch ${school ? "on" : ""}`} onClick={() => setSchool(!school)} aria-label="הפעלת שעות לימודים"><i /></button></div><div className="schedule-foot">שינוי המתגים נשמר בתצוגה המקומית בלבד.</div></div>
            <div className="panel" id="activity"><div className="section-heading compact"><div><h2>פעילות אחרונה</h2><p>עדכונים מהמרחב המשפחתי</p></div><a className="text-btn" href="#activity">הכול ←</a></div><div className="activity-list">{activities.map((item, index) => <div className="activity-row" key={index}><div className={`activity-icon ${item.tone}`}>{item.icon}</div><div><strong>{item.title}</strong><small>{item.detail}</small></div></div>)}</div></div></section>

          <section className="security-banner" id="security"><div className="security-symbol">⬡</div><div><strong>פרטיות ובטיחות לפני הכול</strong><p>כל מכשיר מצטרף רק לאחר אישור מפורש. הרשאות ופעולות יהיו גלויות וניתנות לבדיקה.</p></div><a href="#security">עקרונות האבטחה ←</a></section>
          <footer>Steve Family <span>·</span> סביבת אבטיפוס ראשונית · עדיין לא מחובר למכשירים אמיתיים</footer>
        </div>
      </section>

      {showPair && <div className="modal-backdrop" onClick={() => setShowPair(false)}><div className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowPair(false)}>×</button><div className="modal-mark">＋</div><h2>הוספת מכשיר למרחב</h2><p>השלב הבא יהיה התקנת Steve Family במכשיר ואישור החיבור מתוך המכשיר עצמו.</p>{pairCode ? <div className="pair-code"><small>קוד הדגמה בלבד — אינו מחבר מכשיר</small><strong>{pairCode}</strong></div> : <div className="pair-steps"><div><b>1</b><span>מתקינים את האפליקציה במכשיר</span></div><div><b>2</b><span>בעל המכשיר מאשר את השיוך</span></div><div><b>3</b><span>בוחרים הרשאות באופן שקוף</span></div></div>}<button className="primary-btn modal-action" onClick={createDemoCode}>{pairCode ? "יצירת קוד חדש" : "הצגת קוד הדגמה"}</button><small className="modal-disclaimer">החיבור האמיתי יתווסף לאחר פיתוח האפליקציות המקוריות ל־Android ול־iOS.</small></div></div>}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
