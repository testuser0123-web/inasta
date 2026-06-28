import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_JP, Noto_Sans, Noto_Sans_Symbols, Noto_Sans_Symbols_2 } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { UIProvider } from "@/components/providers/ui-provider";
import { getSession } from "@/lib/auth";
import LayoutShell from "@/components/LayoutShell";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import { db as prisma } from "@/lib/db";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  weight: ["400", "500", "700"],
  preload: false,
});

const notoSansSymbols = Noto_Sans_Symbols({
  variable: "--font-noto-sans-symbols",
  weight: ["400", "700"],
  preload: false,
});

const notoSansSymbols2 = Noto_Sans_Symbols_2({
  variable: "--font-noto-sans-symbols-2",
  weight: ["400"],
  preload: false,
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: "INASTA",
  description: "Share your moments",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "INASTA",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming which makes it feel more like an app
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  let unreadCount = 0;
  let isRoleManager = false;

  const adminUserId = process.env.ADMIN_USER_ID;
  const isAdmin = !!(session?.id && adminUserId && String(session.id) === adminUserId);

  if (session?.id) {
    unreadCount = await getUnreadNotificationCount(session.id);

    if (isAdmin) {
      isRoleManager = true;
    } else {
        const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: { roles: true },
        });
        if (user && user.roles.includes('role_manager')) {
        isRoleManager = true;
        }
    }
  }

  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansJP.variable} ${notoSans.variable} ${notoSansSymbols.variable} ${notoSansSymbols2.variable} font-sans antialiased`}
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
          <UIProvider>
            <LayoutShell session={session} unreadCount={unreadCount} isAdmin={isAdmin} isRoleManager={isRoleManager}>
                {children}
            </LayoutShell>
          </UIProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
