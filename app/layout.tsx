import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "INASTA",
  description: "Share your moments",
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
            <LayoutShell session={session} unreadCount={unreadCount} isAdmin={isAdmin} isRoleManager={isRoleManager}>
                {children}
            </LayoutShell>
          </UIProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
