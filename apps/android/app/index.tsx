import { useState } from "react";
import { SafeAreaView, ScrollView, View, Text, Pressable, TextInput, StyleSheet, Switch } from "react-native";

type Role = "parent" | "child";
const C = { bg: "#080D1B", panel: "#111A2D", panel2: "#17233A", line: "#263550", text: "#F4F7FF", muted: "#91A0BA", blue: "#6C8CFF", mint: "#5ED6B0", amber: "#F5C36A" };

export default function Home() {
  const [role, setRole] = useState<Role>("parent");
  const [familyName, setFamilyName] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [bedtime, setBedtime] = useState(true);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container}>
        <View style={s.top}>
          <View style={s.logo}><Text style={s.logoText}>S</Text></View>
          <View style={{ flex: 1 }}><Text style={s.brand}>steve<Text style={{ color: C.blue }}>family</Text></Text><Text style={s.tag}>מרחב משפחתי בטוח</Text></View>
          <View style={s.status}><View style={s.dot} /><Text style={s.statusText}>Android</Text></View>
        </View>

        <View style={s.hero}>
          <Text style={s.eyebrow}>ניהול משפחתי חכם ושקוף</Text>
          <Text style={s.title}>שלום, ברוכים הבאים</Text>
          <Text style={s.subtitle}>מקום אחד להורים ולילדים, עם כללים ברורים ושיתוף פעולה.</Text>
        </View>

        <View style={s.roleSwitch}>
          <Pressable onPress={() => setRole("parent")} style={[s.roleButton, role === "parent" && s.roleActive]}><Text style={[s.roleText, role === "parent" && s.roleTextActive]}>אזור הורים</Text></Pressable>
          <Pressable onPress={() => setRole("child")} style={[s.roleButton, role === "child" && s.roleActive]}><Text style={[s.roleText, role === "child" && s.roleTextActive]}>אזור ילד/ה</Text></Pressable>
        </View>

        {role === "parent" ? (
          <>
            <View style={s.sectionHead}><Text style={s.h2}>הקמת המרחב המשפחתי</Text><Text style={s.small}>שלב ראשון · חשבון משפחה</Text></View>
            <View style={s.card}>
              <Text style={s.label}>שם המשפחה או המרחב</Text>
              <TextInput value={familyName} onChangeText={setFamilyName} placeholder="לדוגמה: משפחת כהן" placeholderTextColor="#697995" style={s.input} />
              <Text style={s.help}>בהמשך ניתן להזמין הורה נוסף עם אותן הרשאות ניהול.</Text>
              <Pressable style={s.primary} onPress={() => setShowInfo(true)}><Text style={s.primaryText}>המשך להגדרת המשפחה</Text></Pressable>
            </View>
            <View style={s.sectionHead}><Text style={s.h2}>מה יהיה אפשר לנהל?</Text></View>
            <View style={s.feature}><Text style={s.featureIcon}>◷</Text><View style={s.featureBody}><Text style={s.featureTitle}>זמן מסך ולוחות זמנים</Text><Text style={s.featureDesc}>כללים ברורים לפי ימים ושעות, בכפוף ליכולות Android.</Text></View></View>
            <View style={s.feature}><Text style={s.featureIcon}>✓</Text><View style={s.featureBody}><Text style={s.featureTitle}>בקשות ואישורים</Text><Text style={s.featureDesc}>תהליך שקוף לאישור פעולות והגדרות משפחתיות.</Text></View></View>
            <View style={s.feature}><Text style={s.featureIcon}>⌖</Text><View style={s.featureBody}><Text style={s.featureTitle}>שיתוף מיקום בהסכמה</Text><Text style={s.featureDesc}>רק בהרשאה מפורשת, ניתנת לביטול ועם חיווי ברור.</Text></View></View>
            <View style={s.feature}><Text style={s.featureIcon}>▣</Text><View style={s.featureBody}><Text style={s.featureTitle}>חיבור מכשיר Android</Text><Text style={s.featureDesc}>צירוף מאובטח באמצעות קוד חד־פעמי שייווצר בשרת.</Text></View></View>
          </>
        ) : (
          <>
            <View style={s.sectionHead}><Text style={s.h2}>הצטרפות למרחב המשפחתי</Text><Text style={s.small}>המכשיר נשאר בשליטת המשתמש</Text></View>
            <View style={s.card}>
              <Text style={s.label}>קוד הצירוף שקיבלת מההורה</Text>
              <TextInput keyboardType="number-pad" maxLength={8} placeholder="הקלדת קוד" placeholderTextColor="#697995" style={[s.input, { textAlign: "center", letterSpacing: 8, fontSize: 20 }]} />
              <Text style={s.help}>לפני חיבור אמיתי יוצגו שם המשפחה, ההרשאות והנתונים שישותפו.</Text>
              <Pressable style={s.primary} onPress={() => setShowInfo(true)}><Text style={s.primaryText}>בדיקת קוד והצגת פרטים</Text></Pressable>
            </View>
            <View style={s.notice}><Text style={s.noticeTitle}>חשוב לדעת</Text><Text style={s.noticeText}>אין כאן מעקב נסתר. כל שיתוף מידע והרשאה יוצגו בצורה ברורה וניתן יהיה לבדוק אותם.</Text></View>
          </>
        )}

        <View style={s.demo}><Text style={s.demoTitle}>אב־טיפוס בפיתוח</Text><Text style={s.demoText}>המסכים עובדים מקומית בלבד. חשבונות, קודי צירוף, סנכרון והגבלות מכשיר עדיין לא מחוברים לשרת.</Text></View>
        <View style={s.footer}><Text style={s.footerText}>STEVE FAMILY · ANDROID FIRST</Text></View>
      </ScrollView>

      {showInfo && (
        <View style={s.overlay}>
          <View style={s.dialog}>
            <Text style={s.dialogTitle}>השלב הבא עדיין בפיתוח</Text>
            <Text style={s.dialogText}>המסך הזה הוא אב־טיפוס בלבד. לא נוצר חשבון ולא נשלח קוד לשרת. החיבור האמיתי יתווסף אחרי הקמת אימות משתמשים ושרת מאובטח.</Text>
            <Pressable style={s.primary} onPress={() => setShowInfo(false)}><Text style={s.primaryText}>הבנתי</Text></Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: 20, paddingBottom: 42 },
  top: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 30, marginTop: 8 },
  logo: { width: 44, height: 44, borderRadius: 15, backgroundColor: C.blue, alignItems: "center", justifyContent: "center" },
  logoText: { color: "white", fontSize: 24, fontWeight: "900" },
  brand: { color: C.text, fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  tag: { color: C.muted, fontSize: 11, marginTop: 2 },
  status: { flexDirection: "row", gap: 6, alignItems: "center", borderWidth: 1, borderColor: C.line, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 },
  dot: { width: 7, height: 7, borderRadius: 5, backgroundColor: C.mint },
  statusText: { color: C.muted, fontSize: 11 },
  hero: { marginBottom: 22 },
  eyebrow: { color: C.mint, fontSize: 12, fontWeight: "700", marginBottom: 9 },
  title: { color: C.text, fontSize: 28, fontWeight: "900", textAlign: "right" },
  subtitle: { color: C.muted, fontSize: 14, lineHeight: 22, textAlign: "right", marginTop: 9 },
  roleSwitch: { flexDirection: "row", backgroundColor: C.panel, borderRadius: 14, padding: 5, marginBottom: 26, borderWidth: 1, borderColor: C.line },
  roleButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  roleActive: { backgroundColor: C.panel2 },
  roleText: { color: C.muted, fontWeight: "700" },
  roleTextActive: { color: C.text },
  sectionHead: { marginBottom: 13, marginTop: 4, alignItems: "flex-end" },
  h2: { color: C.text, fontSize: 18, fontWeight: "800" },
  small: { color: C.muted, fontSize: 11, marginTop: 4 },
  card: { backgroundColor: C.panel, borderColor: C.line, borderWidth: 1, borderRadius: 18, padding: 17, marginBottom: 24 },
  label: { color: C.text, fontSize: 13, fontWeight: "700", textAlign: "right", marginBottom: 9 },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 11, color: C.text, padding: 14, textAlign: "right", fontSize: 14 },
  help: { color: C.muted, textAlign: "right", fontSize: 11, lineHeight: 18, marginTop: 9, marginBottom: 14 },
  primary: { backgroundColor: C.blue, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  primaryText: { color: "white", fontWeight: "800", fontSize: 14 },
  feature: { flexDirection: "row-reverse", alignItems: "center", backgroundColor: C.panel, borderColor: C.line, borderWidth: 1, borderRadius: 15, padding: 14, marginBottom: 9, gap: 12 },
  featureIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.panel2, color: C.blue, fontSize: 20, textAlign: "center", textAlignVertical: "center", overflow: "hidden", paddingTop: 6 },
  featureBody: { flex: 1, alignItems: "flex-end" },
  featureTitle: { color: C.text, fontSize: 13, fontWeight: "800" },
  featureDesc: { color: C.muted, fontSize: 11, textAlign: "right", lineHeight: 17, marginTop: 3 },
  notice: { backgroundColor: "#102A2A", borderColor: "#24504B", borderWidth: 1, padding: 15, borderRadius: 14, marginBottom: 20 },
  noticeTitle: { color: C.mint, textAlign: "right", fontWeight: "800", marginBottom: 5 },
  noticeText: { color: "#B6D8D1", textAlign: "right", fontSize: 12, lineHeight: 19 },
  demo: { borderWidth: 1, borderColor: "#594B2E", backgroundColor: "#251F15", borderRadius: 14, padding: 14, marginTop: 12 },
  demoTitle: { color: C.amber, textAlign: "right", fontWeight: "800", marginBottom: 5 },
  demoText: { color: "#D5C6A7", textAlign: "right", fontSize: 11, lineHeight: 18 },
  footer: { alignItems: "center", marginTop: 26 },
  footerText: { color: "#596783", fontSize: 9, letterSpacing: 2, fontWeight: "800" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0009", alignItems: "center", justifyContent: "center", padding: 22 },
  dialog: { width: "100%", backgroundColor: C.panel, borderColor: C.line, borderWidth: 1, borderRadius: 20, padding: 20 },
  dialogTitle: { color: C.text, fontSize: 18, fontWeight: "900", textAlign: "right", marginBottom: 10 },
  dialogText: { color: C.muted, fontSize: 13, textAlign: "right", lineHeight: 21, marginBottom: 18 }
});