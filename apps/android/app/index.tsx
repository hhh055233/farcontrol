import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
} from "react-native";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type Mode = "signin" | "signup";

const C = {
  bg: "#080D1B",
  panel: "#111A2D",
  panel2: "#17233A",
  line: "#263550",
  text: "#F4F7FF",
  muted: "#91A0BA",
  blue: "#6C8CFF",
  mint: "#5ED6B0",
  amber: "#F5C36A",
};

export default function Home() {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let alive = true;
    client.auth.getSession().then(({ data, error }) => {
      if (alive && !error) setUserEmail(data.session?.user.email ?? null);
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (alive) setUserEmail(session?.user.email ?? null);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function submitAuth() {
    const client = supabase;
    if (!client) {
      setMessage("החיבור לשרת עדיין לא הוגדר. לא נשלח מידע.");
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setMessage("נא להזין כתובת אימייל תקינה.");
      return;
    }
    if (password.length < 8) {
      setMessage("הסיסמה חייבת להכיל לפחות 8 תווים.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (mode === "signup") {
        const { data, error } = await client.auth.signUp({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        if (!data.session) {
          setMessage("נשלח אימייל אישור. יש לאשר את הכתובת ואז להתחבר.");
        } else {
          setMessage("החשבון נוצר ואומת. שלב הקמת המשפחה עדיין בפיתוח.");
        }
      } else {
        const { error } = await client.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        setMessage("התחברת בהצלחה. מסך המשפחה יתווסף לאחר הפעלת השרת.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "הפעולה נכשלה. נסו שוב.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setMessage(error ? error.message : "התנתקת מהחשבון.");
    setBusy(false);
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <View style={s.top}>
            <View style={s.logo}><Text style={s.logoText}>S</Text></View>
            <View style={s.brandBlock}>
              <Text style={s.brand}>steve<Text style={s.brandAccent}>family</Text></Text>
              <Text style={s.tag}>מרחב משפחתי בטוח ושקוף</Text>
            </View>
            <View style={s.platform}><View style={s.dot} /><Text style={s.platformText}>ANDROID</Text></View>
          </View>

          <View style={s.hero}>
            <Text style={s.eyebrow}>ניהול משפחתי חכם</Text>
            <Text style={s.title}>{userEmail ? "החשבון מחובר" : "מתחילים ביחד"}</Text>
            <Text style={s.subtitle}>
              {userEmail
                ? "אימות המשתמש פעיל. הקמת המשפחה והזמנת ההורה השני יופעלו אחרי חיבור השרת."
                : "חשבון הורה מאובטח הוא הצעד הראשון להקמת המרחב המשפחתי."}
            </Text>
          </View>

          {!isSupabaseConfigured ? (
            <View style={s.warning}>
              <Text style={s.warningTitle}>השרת עדיין לא הוגדר</Text>
              <Text style={s.warningText}>
                לא ניתן ליצור חשבון כרגע. פרויקט Supabase שנמצא בחשבון מסומן כלא פעיל,
                ולכן לא נשלחת בקשה ולא מוצגים נתונים מדומים.
              </Text>
            </View>
          ) : null}

          {userEmail ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>מחובר בתור</Text>
              <Text style={s.emailValue}>{userEmail}</Text>
              <View style={s.pendingRow}>
                <View style={s.pendingDot} />
                <Text style={s.pendingText}>הגדרת המשפחה עדיין לא זמינה</Text>
              </View>
              <Pressable style={[s.secondaryButton, busy && s.disabled]} onPress={signOut} disabled={busy}>
                {busy ? <ActivityIndicator color={C.text} /> : <Text style={s.secondaryText}>התנתקות</Text>}
              </Pressable>
            </View>
          ) : (
            <View style={s.card}>
              <View style={s.tabs}>
                <Pressable onPress={() => { setMode("signup"); setMessage(""); }} style={[s.tab, mode === "signup" && s.tabActive]}>
                  <Text style={[s.tabText, mode === "signup" && s.tabTextActive]}>יצירת חשבון</Text>
                </Pressable>
                <Pressable onPress={() => { setMode("signin"); setMessage(""); }} style={[s.tab, mode === "signin" && s.tabActive]}>
                  <Text style={[s.tabText, mode === "signin" && s.tabTextActive]}>כבר יש חשבון</Text>
                </Pressable>
              </View>

              <Text style={s.label}>כתובת אימייל</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor="#697995"
                style={s.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
              />

              <Text style={[s.label, s.passwordLabel]}>סיסמה</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="לפחות 8 תווים"
                placeholderTextColor="#697995"
                style={s.input}
                secureTextEntry
                autoCapitalize="none"
                textContentType={mode === "signup" ? "newPassword" : "password"}
              />

              <Text style={s.helper}>
                {mode === "signup"
                  ? "לאחר ההרשמה ייתכן שתידרש לאשר את כתובת האימייל."
                  : "התחבר עם פרטי החשבון שכבר יצרת."}
              </Text>

              <Pressable
                style={[s.primary, (busy || !isSupabaseConfigured) && s.disabled]}
                onPress={submitAuth}
                disabled={busy || !isSupabaseConfigured}
              >
                {busy
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={s.primaryText}>{mode === "signup" ? "יצירת חשבון הורה" : "התחברות"}</Text>}
              </Pressable>
            </View>
          )}

          {message ? <View style={s.message}><Text style={s.messageText}>{message}</Text></View> : null}

          <View style={s.steps}>
            <Text style={s.stepsTitle}>מה יתווסף בהמשך</Text>
            <Step number="01" title="מרחב משפחתי" detail="יצירת משפחה והוספת שני הורים בעלי הרשאות שוות." />
            <Step number="02" title="פרופיל ילד ומכשיר" detail="קוד צירוף חד־פעמי והסבר ברור על ההרשאות." />
            <Step number="03" title="סנכרון מאובטח" detail="כללים ודוחות רק אחרי בדיקות Android אמיתיות." />
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>STEVE FAMILY · ANDROID FIRST</Text>
            <Text style={s.footerSub}>אין מעקב נסתר ואין הגבלות מכשיר פעילות בשלב זה.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Step({ number, title, detail }: { number: string; title: string; detail: string }) {
  return (
    <View style={s.step}>
      <Text style={s.stepNumber}>{number}</Text>
      <View style={s.stepBody}>
        <Text style={s.stepTitle}>{title}</Text>
        <Text style={s.stepDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: 20, paddingBottom: 42 },
  top: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8, marginBottom: 34 },
  logo: { width: 46, height: 46, borderRadius: 16, backgroundColor: C.blue, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#FFFFFF", fontSize: 25, fontWeight: "900" },
  brandBlock: { flex: 1 },
  brand: { color: C.text, fontSize: 21, fontWeight: "900", letterSpacing: -0.5 },
  brandAccent: { color: C.blue },
  tag: { color: C.muted, fontSize: 11, marginTop: 3 },
  platform: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: C.line, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 },
  dot: { width: 7, height: 7, borderRadius: 5, backgroundColor: C.mint },
  platformText: { color: C.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  hero: { marginBottom: 24, alignItems: "flex-end" },
  eyebrow: { color: C.mint, fontSize: 12, fontWeight: "800", marginBottom: 9 },
  title: { color: C.text, fontSize: 29, fontWeight: "900", textAlign: "right" },
  subtitle: { color: C.muted, fontSize: 14, lineHeight: 22, textAlign: "right", marginTop: 9 },
  card: { backgroundColor: C.panel, borderColor: C.line, borderWidth: 1, borderRadius: 20, padding: 17, marginBottom: 18 },
  tabs: { flexDirection: "row", backgroundColor: C.bg, borderRadius: 12, padding: 4, marginBottom: 22 },
  tab: { flex: 1, paddingVertical: 11, borderRadius: 9, alignItems: "center" },
  tabActive: { backgroundColor: C.panel2 },
  tabText: { color: C.muted, fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: C.text },
  label: { color: C.text, fontSize: 13, fontWeight: "700", textAlign: "right", marginBottom: 8 },
  passwordLabel: { marginTop: 17 },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 12, color: C.text, padding: 14, fontSize: 14, textAlign: "left" },
  helper: { color: C.muted, textAlign: "right", fontSize: 11, lineHeight: 18, marginTop: 10, marginBottom: 16 },
  primary: { backgroundColor: C.blue, paddingVertical: 15, borderRadius: 12, alignItems: "center", minHeight: 50, justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 14 },
  secondaryButton: { backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line, paddingVertical: 13, borderRadius: 12, alignItems: "center", marginTop: 18 },
  secondaryText: { color: C.text, fontWeight: "800" },
  disabled: { opacity: 0.45 },
  warning: { backgroundColor: "#2A2115", borderColor: "#6B542E", borderWidth: 1, borderRadius: 15, padding: 15, marginBottom: 18 },
  warningTitle: { color: C.amber, fontSize: 14, fontWeight: "900", textAlign: "right", marginBottom: 6 },
  warningText: { color: "#E0D0AE", fontSize: 12, lineHeight: 19, textAlign: "right" },
  message: { backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line, borderRadius: 13, padding: 13, marginBottom: 18 },
  messageText: { color: C.text, fontSize: 12, lineHeight: 19, textAlign: "right" },
  cardTitle: { color: C.muted, textAlign: "right", fontSize: 12, fontWeight: "700" },
  emailValue: { color: C.text, fontSize: 16, fontWeight: "800", textAlign: "right", marginTop: 7 },
  pendingRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginTop: 18 },
  pendingDot: { width: 8, height: 8, borderRadius: 5, backgroundColor: C.amber },
  pendingText: { color: C.amber, fontSize: 12 },
  steps: { marginTop: 12, marginBottom: 16 },
  stepsTitle: { color: C.text, fontSize: 17, fontWeight: "900", textAlign: "right", marginBottom: 13 },
  step: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 12, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 13, marginBottom: 9 },
  stepNumber: { color: C.blue, fontSize: 12, fontWeight: "900", paddingTop: 2 },
  stepBody: { flex: 1, alignItems: "flex-end" },
  stepTitle: { color: C.text, fontSize: 13, fontWeight: "800" },
  stepDetail: { color: C.muted, fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 3 },
  footer: { alignItems: "center", marginTop: 20 },
  footerText: { color: "#596783", fontSize: 9, letterSpacing: 2, fontWeight: "800" },
  footerSub: { color: "#71809B", fontSize: 10, marginTop: 8, textAlign: "center" },
});
