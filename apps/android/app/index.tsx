import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator, Alert, AppState, KeyboardAvoidingView, Platform, Pressable,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type Mode = "signup" | "signin";
type EntryRole = "choose" | "teacher" | "device";
type Family = {
  id: string;
  name: string;
  status: string;
  children: Array<{
    id: string;
    nickname: string;
    devices: Array<{
      id: string;
      device_label: string;
      status: string;
      platform?: string;
      last_seen_at?: string | null;
    }>;
  }>;
  activity?: Array<{
    id: string;
    event_type: string;
    created_at: string;
    details: Record<string, unknown>;
  }>;
  commands?: Array<{
    id: string;
    device_id: string;
    command_type: string;
    status: string;
    created_at: string;
    delivered_at?: string | null;
    acknowledged_at?: string | null;
  }>;
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
  const [noticeDraft, setNoticeDraft] = useState("");
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [pairingCodes, setPairingCodes] = useState<Record<string, { code: string; expiresAt: string }>>({});
  const [pairingCodeInput, setPairingCodeInput] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("");
  const [childDevice, setChildDevice] = useState<{ deviceId: string; childName: string; familyName: string } | null>(null);
  const [hasSavedChildToken, setHasSavedChildToken] = useState(false);

  const loadOverview = useCallback(async () => {
    if (!supabase) return;
    setLoadingOverview(true);
    const { data, error } = await supabase.functions.invoke("family-api", {
      body: { action: "overview" },
    });
    if (!error && data?.families) {
      const nextFamilies = data.families as Family[];
      setFamilies(nextFamilies);
      const activeIds = new Set(nextFamilies.flatMap((item) => item.children.flatMap((group) =>
        group.devices.filter((device) => device.status === "active").map((device) => device.id)
      )));
      setSelectedDeviceIds((current) => current.filter((id) => activeIds.has(id)));
    } else if (error) {
      setFamilies([]);
      setMessage("אין לחשבון הזה הרשאת מורה. הגישה ניתנת רק לכתובות אימייל שאושרו מראש על ידי בית הספר.");
    }
    setLoadingOverview(false);
  }, []);

  useEffect(() => {
    let alive = true;
    SecureStore.getItemAsync("steve-family-device-credential").then((stored) => {
      if (!alive || !stored) return;
      try {
        const parsed = JSON.parse(stored);
        if (typeof parsed?.token === "string" && typeof parsed?.deviceId === "string") {
          setChildDevice({ deviceId: parsed.deviceId, childName: String(parsed.childName ?? "מכשיר"), familyName: String(parsed.familyName ?? "הכיתה") });
          setHasSavedChildToken(true);
          setEntryRole("device");
        }
      } catch { void SecureStore.deleteItemAsync("steve-family-device-credential"); }
    }).catch(() => { if (alive) setMessage("לא ניתן לקרוא את פרטי הצימוד המאובטחים במכשיר."); });
    return () => { alive = false; };
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

  useEffect(() => {
    if (!userEmail) return;
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void loadOverview();
    }, 30000);
    return () => clearInterval(timer);
  }, [userEmail, loadOverview]);

  async function resendVerification() {
    if (!supabase) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return setMessage("הזינו קודם כתובת אימייל תקינה.");
    setBusy(true); setMessage("");
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: cleanEmail });
      if (error) throw error;
      setMessage("נשלח שוב אימייל אימות לכתובת שהזנתם.");
    } catch {
      setMessage("לא הצלחנו לשלוח אימות חוזר. נסו שוב מאוחר יותר.");
    } finally {
      setBusy(false);
    }
  }

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
          ? "החשבון נוצר. לאחר אימות האימייל, הגישה תתאפשר רק אם הכתובת אושרה על ידי בית הספר."
          : "נשלח אימייל אישור. לאחר האישור, רק כתובות שאושרו על ידי בית הספר יוכלו להשתמש במערכת.");
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
    if (!familyName.trim() || !displayName.trim()) return setMessage("יש למלא שם כיתה ושם מורה.");
    setBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("family-api", {
        body: { action: "create_family", name: familyName.trim(), displayName: displayName.trim() },
      });
      if (error) throw error;
      setMessage("סביבת המורה נוצרה בהצלחה.");
      await loadOverview();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "לא הצלחנו ליצור סביבת מורה.");
    } finally { setBusy(false); }
  }

  async function createChild() {
    if (!supabase) return;
    if (!childName.trim()) return setMessage("יש להזין שם למכשיר.");
    setBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("family-api", {
        body: { action: "create_child", nickname: childName.trim() },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error === "teacher_family_required") throw new Error("נדרשת התחברות לחשבון מורה מאומת.");
        throw new Error("לא הצלחנו ליצור את קבוצת המכשירים.");
      }
      setChildName("");
      setMessage("הקבוצה נוצרה. אפשר ליצור עבורה קוד צימוד.");
      await loadOverview();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "לא הצלחנו ליצור קבוצה.");
    } finally { setBusy(false); }
  }

  async function createPairingCode(childId: string) {
    if (!supabase) return;
    setBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("family-api", {
        body: { action: "create_pairing_code", childId, deviceLabel: "מכשיר Android" },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error === "active_pairing_code_exists") throw new Error("כבר קיים קוד צימוד פעיל למכשיר הזה. המתינו עד שיפוג.");
        if (data.error === "teacher_family_required") throw new Error("נדרשת הרשאת מורה בכיתה.");
        throw new Error("לא הצלחנו ליצור קוד צימוד.");
      }
      setPairingCodes((current) => ({ ...current, [childId]: { code: data.code, expiresAt: data.expiresAt } }));
      setMessage("נוצר קוד צימוד חד־פעמי. הציגו אותו למכשיר באופן אישי.");
      await loadOverview();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "יצירת קוד הצימוד נכשלה.");
    } finally { setBusy(false); }
  }


  function toggleDeviceSelection(deviceId: string) {
    setSelectedDeviceIds((current) => current.includes(deviceId)
      ? current.filter((id) => id !== deviceId)
      : [...current, deviceId].slice(0, 50));
  }

  function toggleGroupSelection(devices: Family["children"][number]["devices"]) {
    const activeIds = devices.filter((device) => device.status === "active").map((device) => device.id);
    const allSelected = activeIds.length > 0 && activeIds.every((id) => selectedDeviceIds.includes(id));
    setSelectedDeviceIds((current) => allSelected
      ? current.filter((id) => !activeIds.includes(id))
      : [...new Set([...current, ...activeIds])].slice(0, 50));
  }

  async function sendNotice(childId: string, deviceIds?: string[]) {
    if (!supabase) return;
    const messageText = noticeDraft.trim();
    if (!messageText || messageText.length > 200) return setMessage("יש לכתוב הודעה קצרה של עד 200 תווים.");
    setBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("family-api", {
        body: { action: "send_notice", childId, message: messageText, ...(deviceIds?.length ? { deviceIds } : {}) },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error === "no_active_devices") throw new Error("אין כרגע מכשירים פעילים בקבוצה.");
        throw new Error("לא ניתן לשלוח את ההודעה לקבוצה.");
      }
      setMessage(`ההודעה הוכנסה לתור עבור ${data.queued} מכשירים. היא תוצג כשהאפליקציה תהיה פתוחה.`);
      if (deviceIds?.length) setSelectedDeviceIds((current) => current.filter((id) => !deviceIds.includes(id)));
      setNoticeDraft("");
      await loadOverview();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "שליחת ההודעה נכשלה.");
    } finally { setBusy(false); }
  }

  async function redeemChildPairing() {
    if (!supabase) return setMessage("השרת לא הוגדר בבנייה הזו.");
    const code = pairingCodeInput.replace(/\s/g, "");
    if (!/^\d{10}$/.test(code)) return setMessage("יש להזין קוד צימוד בן 10 ספרות.");
    setBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("redeem-pairing", {
        body: { code, deviceLabel: deviceLabel.trim() || "מכשיר Android" },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error === "too_many_attempts") throw new Error("בוצעו יותר מדי ניסיונות. המתינו 15 דקות ונסו שוב.");
        if (data.error === "invalid_or_expired_code" || data.error === "invalid_code_format") throw new Error("הקוד שגוי או שפג תוקפו. בקשו מהמורה קוד חדש.");
        throw new Error("לא הצלחנו לצמד את המכשיר כרגע.");
      }
      if (!data?.paired || typeof data.deviceToken !== "string" || typeof data.deviceId !== "string") {
        throw new Error("השרת לא החזיר אישור צימוד תקין.");
      }
      const stored = {
        token: data.deviceToken,
        deviceId: data.deviceId,
        childName: String(data.childName ?? "מכשיר"),
        familyName: String(data.familyName ?? "הכיתה"),
      };
      await SecureStore.setItemAsync("steve-family-device-credential", JSON.stringify(stored));
      setChildDevice({ deviceId: stored.deviceId, childName: stored.childName, familyName: stored.familyName });
      setHasSavedChildToken(true);
      setPairingCodeInput("");
      setMessage("המכשיר צורף בהצלחה לכיתה. פרטי הגישה נשמרו באחסון המאובטח של Android.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "צימוד המכשיר נכשל.");
    } finally { setBusy(false); }
  }


  useEffect(() => {
    if (entryRole !== "device" || !hasSavedChildToken || !childDevice) return;
    let alive = true;
    let polling = false;
    let token = "";
    const poll = async () => {
      if (!alive || polling || !token || AppState.currentState !== "active") return;
      polling = true;
      try {
        const { data, error } = await supabase!.functions.invoke("device-command-api", {
          headers: { Authorization: `Bearer ${token}` },
          body: { action: "poll" },
        });
        if (!alive || error || !Array.isArray(data?.commands) || !data.commands.length) return;
        const command = data.commands[0];
        if (command?.command_type !== "show_notice" || typeof command?.id !== "string") return;
        const text = typeof command.payload?.message === "string" ? command.payload.message.slice(0, 200) : "נשלחה הודעה מהמורה.";
        Alert.alert("הודעה מהמורה", text, [{
          text: "הבנתי",
          onPress: () => {
            void supabase!.functions.invoke("device-command-api", {
              headers: { Authorization: `Bearer ${token}` },
              body: { action: "acknowledge", commandId: command.id, result: "acknowledged" },
            });
          },
        }], { cancelable: false });
      } catch {
        // The device retries on the next foreground poll.
      } finally {
        polling = false;
      }
    };
    SecureStore.getItemAsync("steve-family-device-credential").then((stored) => {
      if (!alive || !stored) return;
      try {
        token = JSON.parse(stored).token;
        if (typeof token === "string" && token.length >= 32) void poll();
      } catch { /* Invalid local credentials are handled by the pairing screen. */ }
    });
    const timer = setInterval(() => { void poll(); }, 12000);
    return () => { alive = false; clearInterval(timer); };
  }, [entryRole, hasSavedChildToken, childDevice]);

  async function signOut() {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setMessage(error ? "ההתנתקות נכשלה." : "התנתקתם.");
    setBusy(false);
  }

  const family = families[0];
  const totalDevices = family?.children.reduce((sum, group) => sum + group.devices.length, 0) ?? 0;
  const activeDevices = family?.children.reduce((sum, group) => sum + group.devices.filter((device) => device.status === "active").length, 0) ?? 0;

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <View style={s.logo}><Text style={s.logoText}>S</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.brand}>Steve<Text style={{ color: C.blue }}> Control</Text></Text>
              <Text style={s.tag}>ניהול גלוי ומאובטח של מכשירים</Text>
            </View>
            <Text style={s.platform}>ANDROID</Text>
          </View>

          <View style={s.hero}>
            <Text style={s.eyebrow}>ניהול חכם של מכשירים</Text>
            <Text style={s.title}>{userEmail ? "לוח הבקרה של המורה" : entryRole === "choose" ? "ברוכים הבאים" : entryRole === "device" ? "כניסת מכשיר" : "כניסת מורה"}</Text>
            <Text style={s.subtitle}>
              {userEmail ? "הניהול נשמר בחשבון המורה ומסתנכרן אוטומטית." : entryRole === "choose" ? "המורה מתחבר פעם אחת. מכשירים מצטרפים באמצעות קוד צימוד." : entryRole === "device" ? "רישום מכשיר שאושר על ידי המורה." : "יוצרים חשבון מורה או מתחברים לחשבון קיים."}
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
              <Text style={s.sectionTitle}>ברוכים הבאים ל‑Steve Control</Text>
              <Pressable style={s.roleCard} onPress={() => setEntryRole("teacher")}>
                <View style={s.roleIcon}><Text style={s.roleEmoji}>👩‍🏫</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.roleTitle}>כניסת מורה</Text>
                  <Text style={s.small}>ניהול כיתות, מכשירים והרשאות</Text>
                </View>
                <Text style={s.roleArrow}>‹</Text>
              </Pressable>
              <Pressable style={s.roleCard} onPress={() => setEntryRole("device")}>
                <View style={s.roleIcon}><Text style={s.roleEmoji}>📱</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.roleTitle}>כניסת מכשיר</Text>
                  <Text style={s.small}>רישום מכשיר לכיתה באמצעות קוד</Text>
                </View>
                <Text style={s.roleArrow}>‹</Text>
              </Pressable>
            </Panel>
          ) : !userEmail && entryRole === "device" ? (
            <Panel>
              {hasSavedChildToken && childDevice ? (
                <>
                  <Text style={s.sectionTitle}>המכשיר מחובר לכיתה</Text>
                  <Text style={s.body}>המכשיר צורף לקבוצה {childDevice.childName} בכיתה {childDevice.familyName} בהצלחה.</Text>
                  <View style={s.notice}><Text style={s.noticeText}>פרטי הצימוד נשמרים באחסון המאובטח של Android. המורה יכול לראות שהמכשיר צורף ביומן הפעילות.</Text></View>
                  <Text style={s.small}>מזהה מכשיר: {childDevice.deviceId.slice(0, 8)}…</Text>
                </>
              ) : (
                <>
                  <Text style={s.sectionTitle}>חיבור מכשיר</Text>
                  <Text style={s.body}>בקשו מהמורה ליצור קוד צימוד במסך שלו, והזינו כאן את הקוד בן 10 הספרות. הקוד תקף ל־10 דקות ומשמש פעם אחת בלבד.</Text>
                  <Field label="שם המכשיר" value={deviceLabel} onChangeText={setDeviceLabel} placeholder="לדוגמה: טאבלט 1" />
                  <Field label="קוד צימוד" value={pairingCodeInput} onChangeText={(v) => setPairingCodeInput(v.replace(/\D/g, "").slice(0, 10))} placeholder="0000000000" keyboardType="numeric" maxLength={10} />
                  <Button title="צימוד המכשיר" onPress={redeemChildPairing} disabled={busy || pairingCodeInput.length !== 10} busy={busy} />
                  <Text style={s.small}>לאחר הצימוד, אסימון המכשיר נשמר באחסון המאובטח של Android.</Text>
                </>
              )}
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
              <Button title={mode === "signup" ? "יצירת חשבון מורה" : "התחברות"} onPress={submitAuth} disabled={busy || !isSupabaseConfigured} busy={busy} />
              {mode === "signup" ? <Pressable style={s.selectAll} onPress={resendVerification} disabled={busy}><Text style={s.selectAllText}>שליחה חוזרת של אימייל אימות</Text></Pressable> : null}
            </Panel>
          ) : loadingOverview ? (
            <Panel><ActivityIndicator color={C.mint} /><Text style={s.body}>טוענים את הכיתה...</Text></Panel>
          ) : !family ? (
            <Panel>
              <Text style={s.sectionTitle}>הקמת סביבת ההוראה</Text>
              <Field label="שם הכיתה או בית הספר" value={familyName} onChangeText={setFamilyName} placeholder="כיתה ז׳1" />
              <Field label="שם המורה" value={displayName} onChangeText={setDisplayName} placeholder="שם המורה" />
              <Button title="יצירת כיתה" onPress={createFamily} disabled={busy} busy={busy} />
              <Text style={s.small}>סביבת הניהול תישמר בחשבון המורה. ההתחברות נשמרת במכשיר באופן אוטומטי.</Text>
            </Panel>
          ) : (
            <>
              <Panel>
                <Text style={s.sectionTitle}>{family.name}</Text>
                <Text style={s.small}>סביבת המורה פעילה · חשבון: {userEmail}</Text>
                <View style={s.divider} />
                <View style={s.sectionHeader}><Text style={s.sectionTitle}>מכשירים וקבוצות</Text><Pressable onPress={() => void loadOverview()} disabled={loadingOverview}><Text style={s.selectAllText}>{loadingOverview ? "מרענן..." : "רענון"}</Text></Pressable></View>
                <Text style={s.small}>{totalDevices} מכשירים רשומים · {activeDevices} פעילים</Text>
                {family.children.length === 0 ? <Text style={s.body}>עדיין לא נוספו מכשירים או קבוצות.</Text> : family.children.map((child) => (
                  <View key={child.id} style={s.childRow}>
                    <View style={s.childIcon}><Text style={{ color: C.mint, fontWeight: "900" }}>●</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.childName}>{child.nickname}</Text>
                      <Text style={s.small}>{child.devices.length ? child.devices.length + " מכשירים" : "עדיין לא צורף מכשיר"}</Text>
                      {child.devices.length > 0 ? (
                        <View style={{ marginTop: 10, gap: 8 }}>
                          <Text style={s.small}>מכשירים בקבוצה · עד 50 מכשירים</Text>
                          {child.devices.map((device) => {
                            const selected = selectedDeviceIds.includes(device.id);
                            const seenAt = device.last_seen_at ? Date.parse(device.last_seen_at) : 0;
                            const online = device.status === "active" && seenAt > 0 && Date.now() - seenAt < 90000;
                            return (
                              <Pressable key={device.id} disabled={device.status !== "active"} style={[s.deviceRow, selected && s.deviceRowSelected, device.status !== "active" && { opacity: 0.55 }]} onPress={() => toggleDeviceSelection(device.id)}>
                                <View style={{ flex: 1 }}>
                                  <Text style={s.deviceName}>{device.device_label || "מכשיר Android"}</Text>
                                  <Text style={s.small}>{device.platform === "android" ? "Android" : device.platform || "מכשיר"} · {online ? "פעיל עכשיו" : device.status === "revoked" ? "הגישה בוטלה" : device.status === "pending" ? "ממתין לצימוד" : "לא מחובר כרגע"}</Text>
                                </View>
                                <View style={[s.selectMark, selected && s.selectMarkActive]}><Text style={s.selectMarkText}>{selected ? "✓" : "+"}</Text></View>
                              </Pressable>
                            );
                          })}
                          <Pressable style={s.selectAll} onPress={() => toggleGroupSelection(child.devices)}>
                            <Text style={s.selectAllText}>{child.devices.filter((device) => device.status === "active").every((device) => selectedDeviceIds.includes(device.id)) ? "בטל בחירת כל הקבוצה" : "בחר את כל המכשירים הפעילים בקבוצה"}</Text>
                          </Pressable>
                          <Field label="הודעה גלויה למכשירים" value={noticeDraft} onChangeText={setNoticeDraft} placeholder="הודעה קצרה מהמורה" maxLength={200} />
                          {(() => {
                            const selectedInGroup = child.devices.filter((device) => selectedDeviceIds.includes(device.id)).map((device) => device.id);
                            return <Button title={selectedInGroup.length ? `שליחה ל־${selectedInGroup.length} מכשירים שנבחרו` : "שליחה לכל המכשירים הפעילים"} onPress={() => sendNotice(child.id, selectedInGroup)} disabled={busy || !noticeDraft.trim()} busy={busy} />;
                          })()}
                        </View>
                      ) : null}
                      {pairingCodes[child.id] ? (
                        <View style={s.pairCode}>
                          <Text style={s.pairCodeLabel}>קוד צימוד חד־פעמי · 10 ספרות · 10 דקות</Text>
                          <Text selectable style={s.pairCodeValue}>{pairingCodes[child.id].code}</Text>
                          <Text style={s.small}>תוקף עד {new Date(pairingCodes[child.id].expiresAt).toLocaleTimeString("he-IL")}</Text>
                          <Pressable style={s.pairButton} onPress={() => createPairingCode(child.id)} disabled={busy}><Text style={s.pairButtonText}>הפקת קוד למכשיר הבא</Text></Pressable>
                        </View>
                      ) : (
                        <Pressable style={s.pairButton} onPress={() => createPairingCode(child.id)} disabled={busy}>
                          <Text style={s.pairButtonText}>יצירת קוד צימוד למכשיר</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}
              </Panel>
              <Panel>
                <Text style={s.sectionTitle}>הוספת מכשיר לקבוצה</Text>
                <Field label="שם הקבוצה" value={childName} onChangeText={setChildName} placeholder="טאבלטים כיתה ז׳1" />
                <Button title="הוספת מכשיר" onPress={createChild} disabled={busy} busy={busy} />
              </Panel>
              <Panel>
                <Text style={s.sectionTitle}>פעילות אחרונה</Text>
                {family.activity?.length ? family.activity.map((event) => (
                  <View key={event.id} style={s.activityRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.activityTitle}>{event.event_type === "family.created" ? "נוצרה כיתה" : event.event_type === "device_group.created" ? "נוצרה קבוצת מכשירים" : event.event_type === "device.paired" ? "מכשיר צורף לכיתה" : event.event_type.replaceAll(".", " ").replaceAll("_", " ")}</Text>
                      <Text style={s.small}>{new Date(event.created_at).toLocaleString("he-IL")}</Text>
                    </View>
                    <View style={s.activityDot} />
                  </View>
                )) : <Text style={s.body}>עדיין אין אירועי פעילות להצגה. אירועים חדשים יופיעו כאן כאשר פעולות נתמכות יתועדו בשרת.</Text>}
                <Text style={s.small}>היומן מציג אירועים שהאפליקציה מתעדת, ולא תוכן פרטי מתוך אפליקציות אחרות.</Text>
              </Panel>
              <Panel>
                <Text style={s.sectionTitle}>סטטוס הודעות אחרונות</Text>
                {family.commands?.length ? family.commands.slice(0, 10).map((command) => {
                  const device = family.children.flatMap((group) => group.devices).find((item) => item.id === command.device_id);
                  const statusText = command.status === "queued" ? "ממתינה למסירה" : command.status === "delivered" ? "הוצגה במכשיר · ממתינה לאישור" : command.status === "acknowledged" ? "המכשיר אישר קבלה" : command.status === "failed" ? "המסירה נכשלה" : command.status === "expired" ? "פג תוקף" : command.status === "cancelled" ? "בוטלה" : command.status;
                  return (
                    <View key={command.id} style={s.commandRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.activityTitle}>{device?.device_label ?? "מכשיר"}</Text>
                        <Text style={s.small}>{statusText}</Text>
                        <Text style={s.small}>{new Date(command.created_at).toLocaleString("he-IL")}</Text>
                      </View>
                      <View style={s.activityDot} />
                    </View>
                  );
                }) : <Text style={s.body}>הודעות חדשות וסטטוס המסירה שלהן יופיעו כאן.</Text>}
                <Text style={s.small}>המסירה מתבצעת כשהאפליקציה פתוחה במכשיר. ברקע, קבלת הודעות עדיין אינה מובטחת.</Text>
              </Panel>
              <Panel>
                <Text style={s.sectionTitle}>הרחבות לשלב הבא</Text>
                <Text style={s.body}>• הודעות גם כשהאפליקציה סגורה — דורש הגדרת התראות Push.</Text>
                <Text style={s.body}>• פעולות ניהול נוספות רק בהתאם להרשאות Android ולאישור גלוי במכשיר.</Text>
                <Text style={s.body}>• תמיכה במחשבים תתווסף בשלב נפרד.</Text>
              </Panel>
            </>
          )}

          {message ? <View style={s.message}><Text style={s.messageText}>{message}</Text></View> : null}
          {userEmail ? <Pressable style={s.signOut} onPress={signOut} disabled={busy}><Text style={s.signOutText}>התנתקות מהחשבון</Text></Pressable> : null}
          {!userEmail && entryRole === "teacher" ? <Pressable style={s.signOut} onPress={() => setEntryRole("choose")}><Text style={s.signOutText}>חזרה לבחירת כניסה</Text></Pressable> : null}
          <Text style={s.footer}>STEVE CONTROL · השליטה גלויה ומופעלת רק במכשירים שנרשמו ואושרו מראש.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <View style={s.panel}>{children}</View>;
}
function Field({ label, value, onChangeText, placeholder, secure, keyboardType, maxLength }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder: string; secure?: boolean; keyboardType?: "numeric"; maxLength?: number;
}) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#697995" style={s.input} secureTextEntry={secure} keyboardType={keyboardType} maxLength={maxLength} autoCapitalize="none" autoCorrect={false} /></View>;
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
  sectionHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  childRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12, padding: 12, backgroundColor: C.panel2, borderRadius: 13 },
  deviceRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 11, padding: 10 },
  deviceRowSelected: { borderColor: C.blue, backgroundColor: "#1B2A49" },
  deviceName: { color: C.text, fontSize: 12, fontWeight: "800", textAlign: "right" },
  selectMark: { width: 28, height: 28, borderRadius: 9, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  selectMarkActive: { backgroundColor: C.blue, borderColor: C.blue },
  selectMarkText: { color: C.text, fontWeight: "900" },
  selectAll: { alignSelf: "flex-end", paddingVertical: 7, paddingHorizontal: 10 },
  selectAllText: { color: "#B8C8FF", fontSize: 11, fontWeight: "800" },
  childIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  childName: { color: C.text, fontSize: 14, fontWeight: "800", textAlign: "right" },
  roleCard: { flexDirection: "row-reverse", alignItems: "center", gap: 12, padding: 14, backgroundColor: C.panel2, borderRadius: 14, borderWidth: 1, borderColor: C.line },
  roleIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  roleEmoji: { fontSize: 23 }, roleTitle: { color: C.text, fontSize: 15, fontWeight: "900", textAlign: "right" },
  roleArrow: { color: C.blue, fontSize: 25, fontWeight: "900" },
  notice: { backgroundColor: "#302A1B", borderColor: "#6A5630", borderWidth: 1, borderRadius: 12, padding: 12 },
  noticeText: { color: C.amber, fontSize: 12, lineHeight: 19, textAlign: "right" },
  pairButton: { alignSelf: "flex-end", backgroundColor: "#24365B", borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9, marginTop: 8 },
  pairButtonText: { color: "#B8C8FF", fontSize: 11, fontWeight: "800" },
  pairCode: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.mint, borderRadius: 11, padding: 10, marginTop: 9, alignItems: "flex-end" },
  pairCodeLabel: { color: C.mint, fontSize: 10, fontWeight: "800" },
  pairCodeValue: { color: C.text, fontSize: 25, fontWeight: "900", letterSpacing: 5, marginVertical: 4 },
  activityRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line },
  commandRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line },
  activityTitle: { color: C.text, fontSize: 13, fontWeight: "800", textAlign: "right" },
  activityDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.mint },
  message: { backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line, borderRadius: 13, padding: 13, marginBottom: 12 },
  messageText: { color: C.text, fontSize: 12, lineHeight: 19, textAlign: "right" },
  signOut: { padding: 14, alignItems: "center" }, signOutText: { color: C.red, fontSize: 12, fontWeight: "800" },
  footer: { color: "#71809B", fontSize: 10, textAlign: "center", marginTop: 22, lineHeight: 17 },
});
