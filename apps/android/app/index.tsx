import { useState } from "react";
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet } from "react-native";

const C = { bg: "#080D1B", panel: "#111A2D", panel2: "#17233A", line: "#263550", text: "#F4F7FF", muted: "#91A0BA", blue: "#6C8CFF", mint: "#5ED6B0", amber: "#F5C36A" };

export default function Home() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container}>
        <View style={s.top}>
          <View style={s.logo}><Text style={s.logoText}>S</Text></View>
          <View style={{ flex: 1 }}><Text style={s.brand}>steve<Text style={{ color: C.blue }}>control</Text></Text><Text style={s.tag}>אפליקציית מכשיר בית ספר</Text></View>
          <View style={s.status}><View style={s.dot} /><Text style={s.statusText}>Android</Text></View>
        </View>

        <View style={s.hero}>
          <Text style={s.eyebrow}>Steve Control · מכשיר מנוהל</Text>
          <Text style={s.title}>הצטרפות למרחב בית הספר</Text>
          <Text style={s.subtitle}>כאן יוצגו פרטי בית הספר, זהות המורה, המידע שישותף וההרשאות המבוקשות. הצטרפות תתאפשר רק לאחר חיבור מאובטח לשרת ואישור מפורש במכשיר הזה.</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>ההצטרפות עדיין אינה זמינה</Text>
          <Text style={s.cardText}>שירות ההזמנות והאימות של Steve Control טרם חובר. לא ניתן להירשם או לשלוח נתוני מכשיר בשלב זה.</Text>
          <View style={s.separator} />
          <Text style={s.label}>מה ייבדק לפני הצטרפות?</Text>
          <View style={s.point}><Text style={s.pointMark}>✓</Text><Text style={s.pointText}>זהות בית הספר והמורה שמזמינים את המכשיר</Text></View>
          <View style={s.point}><Text style={s.pointMark}>✓</Text><Text style={s.pointText}>המידע שיישלח למרחב המורה ולמה הוא נדרש</Text></View>
          <View style={s.point}><Text style={s.pointMark}>✓</Text><Text style={s.pointText}>כל הרשאת Android בנפרד ואפשרות לבטל אותה</Text></View>
          <Pressable style={s.secondary} onPress={() => setShowInfo(true)}><Text style={s.secondaryText}>מידע על פרטיות והרשאות</Text></Pressable>
        </View>

        <View style={s.notice}><Text style={s.noticeTitle}>הגנה על המשתמש</Text><Text style={s.noticeText}>אין מעקב נסתר, אין שליטה בלתי מוגבלת ואין עקיפת הגנות Android. המכשיר לא יישלח לניהול ללא תהליך הצטרפות גלוי ומאושר.</Text></View>
        <View style={s.footer}><Text style={s.footerText}>STEVE CONTROL · DEVICE ENROLLMENT</Text></View>
      </ScrollView>

      {showInfo && <View style={s.overlay}><View style={s.dialog}><Text style={s.dialogTitle}>פרטיות והרשאות</Text><Text style={s.dialogText}>לא נשלח כרגע מידע מהמכשיר. כאשר שירות ההצטרפות יופעל, יוצגו כאן פרטי המורה ובית הספר, סוגי המידע המבוקשים, מטרת השימוש, ההרשאות הנדרשות ואופן ביטול ההצטרפות.</Text><Pressable style={s.primary} onPress={() => setShowInfo(false)}><Text style={s.primaryText}>סגירה</Text></Pressable></View></View>}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},container:{padding:20,paddingBottom:42},top:{flexDirection:"row",alignItems:"center",gap:12,marginBottom:30,marginTop:8},logo:{width:44,height:44,borderRadius:15,backgroundColor:C.blue,alignItems:"center",justifyContent:"center"},logoText:{color:"white",fontSize:24,fontWeight:"900"},brand:{color:C.text,fontSize:20,fontWeight:"900",letterSpacing:-0.5},tag:{color:C.muted,fontSize:11,marginTop:2},status:{flexDirection:"row",gap:6,alignItems:"center",borderWidth:1,borderColor:C.line,borderRadius:20,paddingHorizontal:10,paddingVertical:7},dot:{width:7,height:7,borderRadius:5,backgroundColor:C.mint},statusText:{color:C.muted,fontSize:11},hero:{marginBottom:22},eyebrow:{color:C.mint,fontSize:12,fontWeight:"700",marginBottom:9},title:{color:C.text,fontSize:26,fontWeight:"900",textAlign:"right"},subtitle:{color:C.muted,fontSize:14,lineHeight:22,textAlign:"right",marginTop:9},card:{backgroundColor:C.panel,borderColor:C.line,borderWidth:1,borderRadius:18,padding:18,marginBottom:20},cardTitle:{color:C.amber,fontSize:16,fontWeight:"900",textAlign:"right"},cardText:{color:C.muted,fontSize:13,lineHeight:21,textAlign:"right",marginTop:8},separator:{height:1,backgroundColor:C.line,marginVertical:18},label:{color:C.text,fontSize:13,fontWeight:"800",textAlign:"right",marginBottom:12},point:{flexDirection:"row-reverse",gap:10,alignItems:"center",marginBottom:11},pointMark:{color:C.mint,fontWeight:"900"},pointText:{color:C.muted,fontSize:12,textAlign:"right",flex:1},secondary:{borderWidth:1,borderColor:C.line,borderRadius:12,padding:13,alignItems:"center",marginTop:10},secondaryText:{color:C.text,fontWeight:"700",fontSize:13},primary:{backgroundColor:C.blue,paddingVertical:14,borderRadius:12,alignItems:"center",marginTop:10},primaryText:{color:"white",fontWeight:"800",fontSize:14},notice:{backgroundColor:"#102A2A",borderColor:"#24504B",borderWidth:1,padding:15,borderRadius:14},noticeTitle:{color:C.mint,textAlign:"right",fontWeight:"800",marginBottom:5},noticeText:{color:"#B6D8D1",textAlign:"right",fontSize:12,lineHeight:19},footer:{alignItems:"center",marginTop:26},footerText:{color:"#596783",fontSize:9,letterSpacing:2,fontWeight:"800"},overlay:{...StyleSheet.absoluteFillObject,backgroundColor:"#0009",alignItems:"center",justifyContent:"center",padding:22},dialog:{width:"100%",backgroundColor:C.panel,borderColor:C.line,borderWidth:1,borderRadius:20,padding:20},dialogTitle:{color:C.text,fontSize:18,fontWeight:"900",textAlign:"right",marginBottom:10},dialogText:{color:C.muted,fontSize:13,textAlign:"right",lineHeight:21,marginBottom:10}
});
