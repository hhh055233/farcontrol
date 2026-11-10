import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type Mode = "signup" | "signin";
type EntryRole = "choose" | "parent" | "child";
type Family = {
  id: string; name: string; status: string;
  children: Array<{ id: string; nickname: string; devices: Array<{ id: string; device_label: string; status: string }> }>;
  activity?: Array<{ id: number; event_type: string; created_at: string; details: Record<string, unknown> }>;
};

const C = {
  bg: "#080D1B", panel: "#111A2D", panel2: "#17233A", line: "#263550",
  text: "#F4F7FF", muted: "#91A0BA", blue: "#6C8CFF", mint: "#5ED6B0",
  amber: "#F5C36A", red: "#FF8C8C",
};

export default function Home() {
  const [entryRole, setEntryRole] = useState<EntryRole>("choose");
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [childName, setChildName] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loadingOverview, setLoadingOverview] = useState(false);

  const loadOverview = useCallback(async () => {
    if (!supabase) return;
    setLoadingOverview(true);
    const { data, error } = await supabase.functions.invoke("family-api", {
      body: { action: "overview" },
    });
    if (!error && data?.families) setFamilies(data.families as Family[]);
    else if (error) setMessage("לא הצלחנו לטעון את נתוני המשפחה. נסו לרענן.");
    setLoadingOverview(false);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (alive && !error) {
        setUserEmail(data.session?.user.email ?? null);
        if (data.session) void loadOverview();
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setUserEmail(session?.user.email ?? null);
      if (session) {
        setTimeout(() => { if (alive) void loadOverview(); }, 0);
      } else {
        setFamilies([]);
      }
    });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, [loadOverview]);

  async function submitAuth() {
    if (!supabase) return setMessage("השרת לא הוגדר בבנייה הזו.");
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return setMessage("נא להזין אימייל תקין.");
    if (password.length < 8) return setMessage("הסיסמה חייבת להכיל לפחות 8 תווים.");
    setBusy(true); setMessage("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password });
        if (error) throw error;
        setMessage(data.session
          ? "החשבון נוצר. אפשר להקים עכשיו את המשפחה."
          : "נשלח אימייל אישור. אשרו את הכתובת ואז התחברו.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
        setMessage("התחברתם בהצלחה.");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "הפעולה נכשלה.");
    } finally { setBusy(false); }
  }

  async function createFamily() {
    if (!supabase) return;
    if (!familyName.trim() || !displayName.trim()) return setMessage("יש למלא שם משפחה ושם הורה.");
    setBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("family-api", {
        body: { action: "create_family", name: familyName.trim(), displayName: displayName.trim() },
      });
      if (error) throw error;
      setMessage("המשפחה נוצרה בהצלחה.");
      await loadOverview();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "לא הצלחנו ליצור משפחה.");
    } finally { setBusy(false); }
  }

  async function createChild() {
    if (!supabase) return;
    if (!childName.trim()) return setMessage("יש להזין שם לילד.");
    setBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("family-api", {
        body: { action: "create_child", nickname: childName.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setChildName("");
      setMessage("פרופיל הילד נוצר. צימוד מכשיר יתווסף בשלב הבא.");
      await loadOverview();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "לא הצלחנו ליצור פרופיל.");
    } finally { setBusy(false); }
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setMessage(error ? "ההתנתקות נכשלה." : "התנתקתם.");
    setBusy(false);
  }

  const family = families[0];

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <View style={s.logo}><Text style={s.logoText}>S</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.brand}>steve<Text style={{ color: C.blue }}>family</Text></Text>
              <Text style={s.tag}>מרחב משפחתי בטוח ושקוף</Text>
            </View>
            <Text style={s.platform}>ANDROID</Text>
          </View>

          <View style={s.hero}>
            <Text style={s.eyebrow}>ניהול משפחתי חכם</Text>
            <Text style={s.title}>{userEmail ? "המשפחה שלכם" : "מתחילים ביחד"}</Text>
            <Text style={s.subtitle}>
              {userEmail ? "ניהול המשפחה והפרופילים דרך חיבור מאובטח." : "יוצרים חשבון הורה מאובטח כדי להתחיל."}
            </Text>
          </View>

          {!isSupabaseConfigured ? (
            <Panel>
              <Text style={s.warningTitle}>נדרשת הגדרת חיבור</Text>
              <Text style={s.body}>כתובת Supabase והמפתח הציבורי צריכים להיות מוגדרים בבניית האפליקציה. לא נשלחים נתונים כשאין חיבור.</Text>
            </Panel>
          ) : null}

          {!userEmail && entryRole === "choose" ? (
            <Panel>
              <Text style={s.sectionTitle}>איך תרצו להיכנס?</Text>
              <Pressable style={s.roleCard} onPress={() => setEntryRole("parent")}>
                <View style={s.roleIcon}><Text style={s.roleEmoji}>👨‍👩‍👧</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.roleTitle}>כניסת הורה</Text>
                  <Text style={s.small}>ניהול המשפחה, הגדרות ודוחות פעילות</Text>
                </View>
                <Text style={s.roleArrow}>‹</Text>
              </Pressable>
              <Pressable style={s.roleCard} onPress={() => setEntryRole("child")}>
                <View style={s.roleIcon}><Text style={s.roleEmoji}>🧒</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.roleTitle}>כניסת ילד</Text>
                  <Text style={s.small}>כניסה למכשיר שצורף על ידי ההורה</Text>
                </View>
                <Text style={s.roleArrow}>‹</Text>
              </Pressable>
            </Panel>
          ) : !userEmail && entryRole === "child" ? (
            <Panel>
              <Text style={s.sectionTitle}>חיבור מכשיר ילד</Text>
              <Text style={s.body}>כדי להיכנס, ההורה ייצור קוד צימוד מתוך החשבון שלו. לאחר שהצימוד המאובטח יושלם, המכשיר יופיע בלוח ההורה.</Text>
              <View style={s.notice}>
                <Text style={s.noticeText}>צימוד מכשיר וקוד כניסה עדיין לא פעילים בגרסה הזו. לא נבקש מכם להזין קוד שלא ניתן לאמת.</Text>
              </View>
              <Button title="חזרה לבחירת כניסה" onPress={() => setEntryRole("choose")} />
            </Panel>
          ) : !userEmail ? (
            <Panel>
              <View style={s.tabs}>
                <Pressable onPress={() => setMode("signup")} style={[s.tab, mode === "signup" && s.activeTab]}><Text style={s.tabText}>יצירת חשבון</Text></Pressable>
                <Pressable onPress={() => setMode("signin")} style={[s.tab, mode === "signin" && s.activeTab]}><Text style={s.tabText}>התחברות</Text></Pressable>
              </View>
              <Field label="אימייל" value={email} onChangeText={setEmail} placeholder="name@example.com" />
              <Field label="סיסמה" value={password} onChangeText={setPassword} placeholder="לפחות 8 תווים" secure />
              <Button title={mode === "signup" ? "יצירת חשבון הורה" : "התחברות"} onPress={submitAuth} disabled={busy || !isSupabaseConfigured} busy={busy} />
            </Panel>
          ) : loadingOverview ? (
            <Panel><ActivityIndicator color={C.mint} /><Text style={s.body}>טוענים את המשפחה...</Text></Panel>
          ) : !family ? (
            <Panel>
              <Text style={s.sectionTitle}>הקמת המשפחה הראשונה</Text>
              <Field label="שם המשפחה" value={familyName} onChangeText={setFamilyName} placeholder="משפחת ישראלי" />
              <Field label="השם שיוצג להורה" value={displayName} onChangeText={setDisplayName} placeholder="שם ההורה" />
              <Button title="יצירת משפחה" onPress={createFamily} disabled={busy} busy={busy} />
              <Text style={s.small}>המשפחה תיווצר בחשבון ההורה המחובר. הזמנת הורה נוסף תתווסף בהמשך.</Text>
            </Panel>
          ) : (
            <>
              <Panel>
                <Text style={s.sectionTitle}>{family.name}</Text>
                <Text style={s.small}>המשפחה פעילה · חשבון: {userEmail}</Text>
                <View style={s.divider} />
                <Text style={s.sectionTitle}>ילדים</Text>
                {family.children.length === 0 ? <Text style={s.body}>עדיין לא נוצרו פרופילי ילדים.</Text> : family.children.map((child) => (
                  <View key={child.id} style={s.childRow}>
                    <View style={s.childIcon}><Text style={{ color: C.mint, fontWeight: "900" }}>●</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.childName}>{child.nickname}</Text>
                      <Text style={s.small}>{child.devices.length ? child.devices.length + " מכשירים" : "עדיין לא צורף מכשיר"}</Text>
                    </View>
                  </View>
                ))}
              </Panel>
              <Panel>
                <Text style={s.sectionTitle}>הוספת פרופיל ילד</Text>
                <Field label="שם או כינוי" value={childName} onChangeText={setChildName} placeholder="שם הילד" />
                <Button title="הוספת ילד" onPress={createChild} disabled={busy} busy={busy} />
              </Panel>
              <Panel>
                <Text style={s.sectionTitle}>השלבים הבאים</Text>
                <Text style={s.body}>• הזמנת הורה נוסף בהרשאות שוות</Text>
                <Text style={s.body}>• צימוד מאובטח של מכשיר הילד</Text>
                <Text style={s.body}>• סנכרון מדיניות ודוחות לאחר בדיקות</Text>
              </Panel>
            </>
          )}

          {message ? <View style={s.message}><Text style={s.messageText}>{message}</Text></View> : null}
          {userEmail ? <Pressable style={s.signOut} onPress={signOut} disabled={busy}><Text style={s.signOutText}>התנתקות מהחשבון</Text></Pressable> : null}
          {!userEmail && entryRole === "parent" ? <Pressable style={s.signOut} onPress={() => setEntryRole("choose")}><Text style={s.signOutText}>חזרה לבחירת כניסה</Text></Pressable> : null}
          <Text style={s.footer}>STEVE FAMILY · הצגת מידע שקוף בלבד; הגבלות מכשיר יופעלו רק לאחר צימוד והרשאות מתאימות.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <View style={s.panel}>{children}</View>;
}
function Field({ label, value, onChangeText, placeholder, secure }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder: string; secure?: boolean;
}) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#697995" style={s.input} secureTextEntry={secure} autoCapitalize="none" autoCorrect={false} /></View>;
}
function Button({ title, onPress, disabled, busy }: { title: string; onPress: () => void; disabled?: boolean; busy?: boolean }) {
  return <Pressable style={[s.button, disabled && s.disabled]} onPress={onPress} disabled={disabled}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>{title}</Text>}</Pressable>;
}

const s = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: 20, paddingBottom: 44 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8, marginBottom: 34 },
  logo: { width: 46, height: 46, borderRadius: 16, backgroundColor: C.blue, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontSize: 25, fontWeight: "900" }, brand: { color: C.text, fontSize: 21, fontWeight: "900" },
  tag: { color: C.muted, fontSize: 11, marginTop: 3 }, platform: { color: C.muted, fontSize: 9, letterSpacing: 1, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 8 },
  hero: { alignItems: "flex-end", marginBottom: 22 }, eyebrow: { color: C.mint, fontSize: 12, fontWeight: "800", marginBottom: 8 },
  title: { color: C.text, fontSize: 29, fontWeight: "900", textAlign: "right" }, subtitle: { color: C.muted, fontSize: 14, lineHeight: 22, textAlign: "right", marginTop: 8 },
  panel: { backgroundColor: C.panel, borderColor: C.line, borderWidth: 1, borderRadius: 20, padding: 17, marginBottom: 14, gap: 10 },
  tabs: { flexDirection: "row", backgroundColor: C.bg, borderRadius: 12, padding: 4, marginBottom: 10 },
  tab: { flex: 1, padding: 11, alignItems: "center", borderRadius: 9 }, activeTab: { backgroundColor: C.panel2 },
  tabText: { color: C.text, fontWeight: "700", fontSize: 12 }, field: { gap: 7, marginBottom: 6 },
  label: { color: C.text, fontSize: 13, fontWeight: "700", textAlign: "right" },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 12, color: C.text, padding: 14, fontSize: 14, textAlign: "right" },
  button: { backgroundColor: C.blue, padding: 15, borderRadius: 12, alignItems: "center", minHeight: 50, justifyContent: "center", marginTop: 4 },
  buttonText: { color: "#fff", fontWeight: "900", fontSize: 14 }, disabled: { opacity: 0.45 },
  sectionTitle: { color: C.text, fontSize: 17, fontWeight: "900", textAlign: "right" },
  body: { color: C.muted, fontSize: 13, lineHeight: 21, textAlign: "right" },
  small: { color: C.muted, fontSize: 11, lineHeight: 18, textAlign: "right" },
  warningTitle: { color: C.amber, fontSize: 14, fontWeight: "900", textAlign: "right" },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 7 },
  childRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12, padding: 12, backgroundColor: C.panel2, borderRadius: 13 },
  childIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  childName: { color: C.text, fontSize: 14, fontWeight: "800", textAlign: "right" },
  roleCard: { flexDirection: "row-reverse", alignItems: "center", gap: 12, padding: 14, backgroundColor: C.panel2, borderRadius: 14, borderWidth: 1, borderColor: C.line },
  roleIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  roleEmoji: { fontSize: 23 }, roleTitle: { color: C.text, fontSize: 15, fontWeight: "900", textAlign: "right" },
  roleArrow: { color: C.blue, fontSize: 25, fontWeight: "900" },
  notice: { backgroundColor: "#302A1B", borderColor: "#6A5630", borderWidth: 1, borderRadius: 12, padding: 12 },
  noticeText: { color: C.amber, fontSize: 12, lineHeight: 19, textAlign: "right" },
  message: { backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line, borderRadius: 13, padding: 13, marginBottom: 12 },
  messageText: { color: C.text, fontSize: 12, lineHeight: 19, textAlign: "right" },
  signOut: { padding: 14, alignItems: "center" }, signOutText: { color: C.red, fontSize: 12, fontWeight: "800" },
  footer: { color: "#71809B", fontSize: 10, textAlign: "center", marginTop: 22, lineHeight: 17 },
});
