import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { UIProvider } from "@/components/providers/ui-provider";
import { getSession } from "@/lib/auth";
import LayoutShell from "@/components/LayoutShell";
import { getUnreadNotificationCount } from "@/app/actions/notification";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "INASTA",
  description: "Share your moments",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  let unreadCount = 0;
  if (session?.id) {
    unreadCount = await getUnreadNotificationCount(session.id);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
          <UIProvider>
            <LayoutShell session={session} unreadCount={unreadCount}>
                {children}
            </LayoutShell>
          </UIProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
