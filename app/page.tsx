"use client";

export default function Home() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">S</div><div><strong>steve<span>control</span></strong><small>ניהול מכשירי בית הספר</small></div></div>
        <div className="workspace"><span className="workspace-dot" /> מרחב בית הספר</div>
        <div className="nav-label">ניהול מורה</div>
        <nav>
          <a className="nav-item active" href="#overview"><span>▦</span> סקירה כללית</a>
          <a className="nav-item" href="#devices"><span>▣</span> מכשירים מנוהלים</a>
          <a className="nav-item" href="#policies"><span>◷</span> כללי שימוש</a>
          <a className="nav-item" href="#security"><span>⬡</span> אבטחה והרשאות</a>
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><div className="help-icon">✦</div><strong>שקיפות והרשאה</strong><p>כל מכשיר חייב להצטרף באישור גלוי ובהרשאות נפרדות.</p><a href="#security">עקרונות האבטחה ←</a></div></div>
      </aside>

      <section className="content" id="overview">
        <header className="topbar"><div className="crumb">בית הספר <span>/</span> <b>סקירה כללית</b></div><div className="top-actions"><span className="secure-pill">המערכת עדיין לא מחוברת לשרת</span></div></header>
        <div className="page-wrap">
          <section className="welcome-row"><div><div className="eyebrow">מרחב מורה · ניהול מכשירי תלמידים</div><h1>ניהול מכשירי בית הספר</h1><p className="subhead">מקום מרכזי לניהול מכשירים שנרשמו ואושרו למרחב המורה.</p></div></section>

          <section className="stats-grid">
            <article className="stat-card"><div className="stat-top"><span>מכשירים רשומים</span><span className="stat-icon blue-bg">▣</span></div><div className="stat-number">—</div><div className="stat-foot">יתעדכן לאחר חיבור מסד הנתונים</div></article>
            <article className="stat-card"><div className="stat-top"><span>מכשירים מחוברים</span><span className="stat-icon mint-bg">●</span></div><div className="stat-number">—</div><div className="stat-foot">אין עדיין דיווחי מכשירים</div></article>
            <article className="stat-card"><div className="stat-top"><span>בקשות הצטרפות</span><span className="stat-icon gold-bg">◷</span></div><div className="stat-number">—</div><div className="stat-foot">ממתין להפעלת שירות ההזמנות</div></article>
            <article className="stat-card"><div className="stat-top"><span>כללי שימוש</span><span className="stat-icon purple-bg">◇</span></div><div className="stat-number">—</div><div className="stat-foot">טרם נשמרו כללים</div></article>
          </section>

          <section className="section-block" id="devices">
            <div className="section-heading"><div><h2>מכשירים מנוהלים</h2><p>יופיעו כאן רק מכשירים שהצטרפו ואושרו בפועל</p></div></div>
            <div className="panel" style={{textAlign:"center",padding:"42px 20px"}}>
              <div className="device-icon blue" style={{margin:"0 auto 14px"}}>▣</div>
              <h2 style={{fontSize:16,margin:"0 0 8px"}}>עדיין לא חוברו מכשירים</h2>
              <p style={{fontSize:12,color:"#929caf",margin:"0 auto",maxWidth:430,lineHeight:1.8}}>כדי לצרף מכשירים נדרש להפעיל תחילה התחברות מאובטחת למורה, שרת הזמנות חד־פעמיות ואישור הצטרפות מתוך אפליקציית המכשיר. לא יוצגו כאן מכשירים מדומים ולא ייווצרו קודי הזמנה מקומיים.</p>
              <button className="primary-btn" disabled style={{marginTop:20,opacity:.5,cursor:"not-allowed"}}>צירוף מכשיר — יופעל לאחר חיבור השרת</button>
            </div>
          </section>

          <section className="lower-grid">
            <div className="panel" id="policies"><div className="section-heading compact"><div><h2>כללי שימוש</h2><p>כללים יישמרו ויופצו רק לאחר חיבור השרת</p></div></div><div className="schedule-foot">אין כרגע כללים פעילים. לא מתבצעת חסימה או אכיפה במכשירים.</div></div>
            <div className="panel"><div className="section-heading compact"><div><h2>חשבון המורה</h2><p>מנהל יחיד של מרחב בית הספר</p></div></div><div className="schedule-foot">התחברות והרשאות מנהל טרם חוברו. אין עדיין משתמש מחובר.</div></div>
          </section>

          <section className="security-banner" id="security"><div className="security-symbol">⬡</div><div><strong>אבטחה ושקיפות לפני הכול</strong><p>אין מעקב נסתר. כל מכשיר יציג את זהות המורה, המידע שישותף וההרשאות המבוקשות לפני אישור ההצטרפות.</p></div></section>
          <footer>Steve Control <span>·</span> מערכת ניהול מכשירי בית ספר</footer>
        </div>
      </section>
    </main>
  );
}
