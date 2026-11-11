import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Steve Control — ניהול מכשירי בית הספר",
  description: "לוח בקרה למורים לניהול שקוף ומאושר של מכשירי בית הספר.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="he" dir="rtl"><body>{children}</body></html>;
}
