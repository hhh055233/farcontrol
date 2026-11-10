import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Steve Family — ניהול משפחתי חכם",
  description: "מרכז משפחתי לניהול זמן מסך והרשאות מכשירים בשקיפות ובבטחה.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="he" dir="rtl"><body>{children}</body></html>;
}
